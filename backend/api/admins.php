<?php
// ============================================
// Admins Management API (Super Admin / Admin)
// ============================================
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        listAdmins();
        break;
    case 'create':
        createAdmin();
        break;
    case 'update':
        updateAdmin();
        break;
    case 'delete':
        deleteAdmin();
        break;
    case 'reset-password':
        resetPassword();
        break;
    default:
        jsonResponse(400, 'Invalid action');
}

function listAdmins()
{
    $auth = requireAdminOrSuperAdmin();
    $db = getDB();

    if ($auth['role'] === 'admin') {
        // admin can only see sub_admin1 and sub_admin2
        $stmt = $db->prepare("SELECT a.id, a.username, a.email, a.full_name, a.role, a.company_id, a.is_active, a.created_at, c.name as company_name FROM admins a LEFT JOIN companies c ON a.company_id = c.id WHERE a.role IN ('sub_admin1', 'sub_admin2') ORDER BY a.role DESC, a.created_at ASC");
    } else {
        // super_admin sees all
        $stmt = $db->prepare("SELECT a.id, a.username, a.email, a.full_name, a.role, a.company_id, a.is_active, a.created_at, c.name as company_name FROM admins a LEFT JOIN companies c ON a.company_id = c.id ORDER BY a.role DESC, a.created_at ASC");
    }
    $stmt->execute();
    $admins = $stmt->fetchAll();

    jsonResponse(200, 'Admins retrieved', $admins);
}

function createAdmin()
{
    $auth = requireAdminOrSuperAdmin();
    $input = json_decode(file_get_contents('php://input'), true);

    $username = sanitize($input['username'] ?? '');
    $email = sanitize($input['email'] ?? '');
    $fullName = sanitize($input['full_name'] ?? '');
    $role = $input['role'] ?? 'sub_admin1';

    // If logged in user is admin, they can only create sub_admin1 or sub_admin2
    if ($auth['role'] === 'admin' && !in_array($role, ['sub_admin1', 'sub_admin2'])) {
        jsonResponse(403, 'Admins can only create Sub Admin 1 and Sub Admin 2 roles');
    }

    if ($role === 'super_admin' || $role === 'admin') {
        $companyId = null;
    } else {
        $companyId = !empty($input['company_id']) ? (int)$input['company_id'] : null;
    }

    if (empty($username) || empty($email) || empty($fullName)) {
        jsonResponse(400, 'All fields are required');
    }

    if (($role === 'sub_admin1' || $role === 'sub_admin2') && empty($companyId)) {
        jsonResponse(400, 'Company is required for ' . ($role === 'sub_admin1' ? 'Sub Admin 1' : 'Sub Admin 2'));
    }

    $db = getDB();

    // Check uniqueness
    $stmt = $db->prepare("SELECT id FROM admins WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);
    if ($stmt->fetch()) {
        jsonResponse(409, 'Username or email already exists');
    }

    // Check if company already has an active sub admin of the selected role
    if (($role === 'sub_admin1' || $role === 'sub_admin2') && $companyId) {
        $stmt = $db->prepare("SELECT id FROM admins WHERE company_id = ? AND role = ? AND is_active = 1");
        $stmt->execute([$companyId, $role]);
        if ($stmt->fetch()) {
            jsonResponse(409, 'This company already has an active ' . ($role === 'sub_admin1' ? 'Sub Admin 1' : 'Sub Admin 2'));
        }
    }

    // Generate a secure random password (10 chars: letters and numbers)
    $tempPassword = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 10);
    $hashedPassword = password_hash($tempPassword, PASSWORD_DEFAULT);

    $stmt = $db->prepare("INSERT INTO admins (username, email, password, full_name, role, company_id, require_password_change) VALUES (?, ?, ?, ?, ?, ?, 1)");
    $stmt->execute([$username, $email, $hashedPassword, $fullName, $role, $companyId]);

    $newAdminId = $db->lastInsertId();

    // Log admin creation in audit trail
    logSystemAudit(
        $auth['admin_id'],
        'user_management',
        'create_admin',
        'admin',
        $newAdminId,
        "$fullName ($username)",
        "Created new administrative account with role: " . strtoupper(str_replace('_', ' ', $role)),
        null,
        ['username' => $username, 'role' => $role, 'email' => $email, 'company_id' => $companyId],
        $companyId
    );

    jsonResponse(201, 'Admin created successfully', [
        'id' => $newAdminId,
        'temp_password' => $tempPassword
    ]);
}

function updateAdmin()
{
    $auth = requireAdminOrSuperAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);

    if ($id <= 0)
        jsonResponse(400, 'Invalid admin ID');

    $db = getDB();

    // Fetch current admin profile to compare changes
    $stmt = $db->prepare("SELECT * FROM admins WHERE id = ?");
    $stmt->execute([$id]);
    $currentAdmin = $stmt->fetch();
    if (!$currentAdmin) {
        jsonResponse(404, 'Admin not found');
    }

    // If logged in user is admin, they can only manage sub_admin1 and sub_admin2 roles
    if ($auth['role'] === 'admin') {
        if ($currentAdmin['role'] !== 'sub_admin1' && $currentAdmin['role'] !== 'sub_admin2') {
            jsonResponse(403, 'Unauthorized to update this admin level');
        }
        if (isset($input['role']) && !in_array($input['role'], ['sub_admin1', 'sub_admin2'])) {
            jsonResponse(403, 'Admins can only assign Sub Admin 1 or Sub Admin 2 roles');
        }
    }

    $role = $input['role'] ?? $currentAdmin['role'];
    
    if ($role === 'super_admin' || $role === 'admin') {
        $companyId = null;
    } else {
        $companyId = isset($input['company_id']) ? (!empty($input['company_id']) ? (int)$input['company_id'] : null) : ($currentAdmin['company_id'] ? (int)$currentAdmin['company_id'] : null);
    }
    
    $isActive = isset($input['is_active']) ? (int)$input['is_active'] : (int)$currentAdmin['is_active'];

    // Protect the last remaining super administrator from being demoted or deactivated
    if ($currentAdmin['role'] === 'super_admin' && ($role !== 'super_admin' || $isActive === 0)) {
        $countStmt = $db->query("SELECT COUNT(*) FROM admins WHERE role = 'super_admin'");
        $superAdminCount = (int)$countStmt->fetchColumn();
        if ($superAdminCount <= 1) {
            jsonResponse(400, 'Cannot change role or deactivate the last remaining super administrator');
        }
    }

    if (($role === 'sub_admin1' || $role === 'sub_admin2') && empty($companyId)) {
        jsonResponse(400, 'Company is required for ' . ($role === 'sub_admin1' ? 'Sub Admin 1' : 'Sub Admin 2'));
    }

    // Check if company already has an active administrator of the selected role
    if (($role === 'sub_admin1' || $role === 'sub_admin2') && $companyId && $isActive === 1) {
        $stmt = $db->prepare("SELECT id FROM admins WHERE company_id = ? AND role = ? AND is_active = 1 AND id != ?");
        $stmt->execute([$companyId, $role, $id]);
        if ($stmt->fetch()) {
            jsonResponse(409, 'This company already has an active ' . ($role === 'sub_admin1' ? 'Sub Admin 1' : 'Sub Admin 2'));
        }
    }

    // Check email uniqueness if changed
    if (!empty($input['email']) && $input['email'] !== $currentAdmin['email']) {
        $stmt = $db->prepare("SELECT id FROM admins WHERE email = ? AND id != ?");
        $stmt->execute([sanitize($input['email']), $id]);
        if ($stmt->fetch()) {
            jsonResponse(409, 'Email address already exists');
        }
    }

    $fields = [];
    $params = [];

    if (!empty($input['full_name'])) {
        $fields[] = "full_name = ?";
        $params[] = sanitize($input['full_name']);
    }
    if (!empty($input['email'])) {
        $fields[] = "email = ?";
        $params[] = sanitize($input['email']);
    }
    
    $fields[] = "role = ?";
    $params[] = $role;
    
    $fields[] = "company_id = ?";
    $params[] = $companyId;

    if (isset($input['is_active'])) {
        $fields[] = "is_active = ?";
        $params[] = $isActive;
    }

    if (empty($fields)) {
        jsonResponse(400, 'No fields to update');
    }

    $params[] = $id;
    $sql = "UPDATE admins SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    // Audit log update
    $oldValues = [
        'full_name' => $currentAdmin['full_name'],
        'role' => $currentAdmin['role'],
        'is_active' => (int)$currentAdmin['is_active'],
        'company_id' => $currentAdmin['company_id']
    ];
    $newValues = [
        'full_name' => $fullName,
        'role' => $role,
        'is_active' => $isActive,
        'company_id' => $companyId
    ];
    $changes = [];
    if ($currentAdmin['role'] !== $role) $changes[] = "role ({$currentAdmin['role']} → $role)";
    if ((int)$currentAdmin['is_active'] !== $isActive) $changes[] = "status (" . ($isActive ? 'Active' : 'Deactivated') . ")";
    if ($currentAdmin['full_name'] !== $fullName) $changes[] = "name";
    if ($currentAdmin['company_id'] != $companyId) $changes[] = "subsidiary";
    $changeDesc = empty($changes) ? "Updated administrator profile" : "Updated admin: " . implode(', ', $changes);

    logSystemAudit(
        $auth['admin_id'],
        'user_management',
        'update_admin',
        'admin',
        $id,
        "$fullName ({$currentAdmin['username']})",
        $changeDesc,
        $oldValues,
        $newValues,
        $companyId
    );

    jsonResponse(200, 'Admin updated successfully');
}

function deleteAdmin()
{
    $auth = requireAdminOrSuperAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);

    if ($id <= 0)
        jsonResponse(400, 'Invalid admin ID');

    $db = getDB();
    
    // Fetch target admin role
    $stmt = $db->prepare("SELECT id, role, full_name, username, company_id FROM admins WHERE id = ?");
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if (!$target) {
        jsonResponse(404, 'Admin not found');
    }

    // If caller is admin, target must be sub_admin1 or sub_admin2
    if ($auth['role'] === 'admin' && !in_array($target['role'], ['sub_admin1', 'sub_admin2'])) {
        jsonResponse(403, 'Unauthorized to delete this admin level');
    }

    // If target is super_admin, caller must be super_admin and there must be more than one super_admin
    if ($target['role'] === 'super_admin') {
        if ($auth['role'] !== 'super_admin') {
            jsonResponse(403, 'Only super administrators can delete a super administrator account');
        }

        $countStmt = $db->query("SELECT COUNT(*) FROM admins WHERE role = 'super_admin'");
        $superAdminCount = (int)$countStmt->fetchColumn();
        if ($superAdminCount <= 1) {
            jsonResponse(400, 'Cannot delete the last super administrator account');
        }
    }

    // Prevent non-superadmin from deleting self
    if ($auth['role'] !== 'super_admin' && $id === (int)$auth['admin_id']) {
        jsonResponse(400, 'Cannot delete your own account');
    }

    $stmt = $db->prepare("DELETE FROM admins WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(400, 'Admin not found or could not be deleted');
    }

    logSystemAudit(
        $auth['admin_id'],
        'user_management',
        'delete_admin',
        'admin',
        $id,
        "{$target['full_name']} ({$target['username']})",
        "Permanently deleted {$target['role']} account",
        ['role' => $target['role'], 'full_name' => $target['full_name'], 'username' => $target['username']],
        null,
        $target['company_id']
    );

    $isSelf = ($id === (int)$auth['admin_id']);

    jsonResponse(200, 'Admin deleted successfully', ['is_self' => $isSelf]);
}

function resetPassword()
{
    $auth = requireAdminOrSuperAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);

    if ($id <= 0)
        jsonResponse(400, 'Invalid admin ID');

    $db = getDB();

    // Verify admin exists and is not the current super admin
    $stmt = $db->prepare("SELECT id, role FROM admins WHERE id = ?");
    $stmt->execute([$id]);
    $admin = $stmt->fetch();

    if (!$admin) {
        jsonResponse(404, 'Admin not found');
    }

    if ($admin['id'] === (int)$auth['admin_id']) {
        jsonResponse(400, 'Cannot reset your own password here. Use profile settings.');
    }

    // If caller is admin, target must be sub_admin1 or sub_admin2
    if ($auth['role'] === 'admin' && !in_array($admin['role'], ['sub_admin1', 'sub_admin2'])) {
        jsonResponse(403, 'Unauthorized to reset password for this admin level');
    }

    // Generate a secure random password
    $tempPassword = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 10);
    $hashedPassword = password_hash($tempPassword, PASSWORD_DEFAULT);

    $stmt = $db->prepare("UPDATE admins SET password = ?, require_password_change = 1 WHERE id = ?");
    $stmt->execute([$hashedPassword, $id]);

    jsonResponse(200, 'Password reset successfully', [
        'temp_password' => $tempPassword
    ]);
}
