<?php
// ============================================
// Auth API - Admin Login
// ============================================
require_once __DIR__ . '/../config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'verify':
        handleVerify();
        break;
    case 'change-password':
        handleChangePassword();
        break;
    case 'register_superadmin':
        handleRegisterSuperadmin();
        break;
    case 'identify':
        handleIdentify();
        break;
    case 'send-recovery':
        handleSendRecovery();
        break;
    case 'verify-reset-token':
        handleVerifyResetToken();
        break;
    case 'reset-password-with-token':
        handleResetPasswordWithToken();
        break;
    default:
        jsonResponse(400, 'Invalid action');
}

function handleLogin()
{
    $input = json_decode(file_get_contents('php://input'), true);
    $username = sanitize($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        jsonResponse(400, 'Username and password are required');
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT a.*, c.name as company_name, c.logo as company_logo FROM admins a LEFT JOIN companies c ON a.company_id = c.id WHERE (a.username = ? OR a.email = ?) AND a.is_active = 1");
    $stmt->execute([$username, $username]);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($password, $admin['password'])) {
        jsonResponse(401, 'Invalid credentials');
    }

    $token = generateToken($admin['id'], $admin['role'], $admin['company_id']);

    // Record login in audit trail
    logSystemAudit(
        $admin['id'],
        'security',
        'admin_login',
        'auth',
        $admin['id'],
        $admin['full_name'] . ' (' . $admin['username'] . ')',
        "Authenticated successfully into portal as " . strtoupper(str_replace('_', ' ', $admin['role'])),
        null,
        ['role' => $admin['role']],
        $admin['company_id']
    );

    jsonResponse(200, 'Login successful', [
        'token' => $token,
        'admin' => [
            'id' => $admin['id'],
            'username' => $admin['username'],
            'email' => $admin['email'],
            'full_name' => $admin['full_name'],
            'role' => $admin['role'],
            'company_id' => $admin['company_id'],
            'company_name' => $admin['company_name'],
            'company_logo' => $admin['company_logo'],
            'require_password_change' => (bool)$admin['require_password_change']
        ]
    ]);
}

function handleVerify()
{
    $auth = verifyToken();
    $db = getDB();
    $stmt = $db->prepare("SELECT a.*, c.name as company_name, c.logo as company_logo FROM admins a LEFT JOIN companies c ON a.company_id = c.id WHERE a.id = ? AND a.is_active = 1");
    $stmt->execute([$auth['admin_id']]);
    $admin = $stmt->fetch();

    if (!$admin) {
        jsonResponse(401, 'Admin not found');
    }

    jsonResponse(200, 'Token valid', [
        'admin' => [
            'id' => $admin['id'],
            'username' => $admin['username'],
            'email' => $admin['email'],
            'full_name' => $admin['full_name'],
            'role' => $admin['role'],
            'company_id' => $admin['company_id'],
            'company_name' => $admin['company_name'],
            'company_logo' => $admin['company_logo'],
            'require_password_change' => (bool)$admin['require_password_change']
        ]
    ]);
}

function handleChangePassword()
{
    $auth = verifyToken();
    $input = json_decode(file_get_contents('php://input'), true);
    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        jsonResponse(400, 'Both current and new passwords are required');
    }

    if (strlen($newPassword) < 6) {
        jsonResponse(400, 'New password must be at least 6 characters');
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT password FROM admins WHERE id = ?");
    $stmt->execute([$auth['admin_id']]);
    $admin = $stmt->fetch();

    if (!password_verify($currentPassword, $admin['password'])) {
        jsonResponse(400, 'Current password is incorrect');
    }

    $hashed = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE admins SET password = ?, require_password_change = 0 WHERE id = ?");
    $stmt->execute([$hashed, $auth['admin_id']]);

    jsonResponse(200, 'Password changed successfully');
}

function handleRegisterSuperadmin()
{
    $input = json_decode(file_get_contents('php://input'), true);

    $username = sanitize($input['username'] ?? '');
    $email = sanitize($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $fullName = sanitize($input['full_name'] ?? '');

    if (empty($username) || empty($email) || empty($password) || empty($fullName)) {
        jsonResponse(400, 'All fields are required');
    }

    if (strlen($password) < 6) {
        jsonResponse(400, 'Password must be at least 6 characters');
    }

    $db = getDB();

    // Disallow public registration if a super admin already exists
    $count = (int)$db->query("SELECT COUNT(*) FROM admins WHERE role = 'super_admin'")->fetchColumn();
    if ($count > 0) {
        jsonResponse(403, 'Public Super Admin registration is disabled. Super Admins must be created by existing administrators.');
    }

    // Check if username or email already exists
    $stmt = $db->prepare("SELECT id FROM admins WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);
    if ($stmt->fetch()) {
        jsonResponse(409, 'Username or email already exists');
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $db->prepare("INSERT INTO admins (username, email, password, full_name, role, company_id, require_password_change) VALUES (?, ?, ?, ?, 'super_admin', NULL, 0)");
    $stmt->execute([$username, $email, $hashedPassword, $fullName]);

    jsonResponse(201, 'Super Admin registered successfully', ['id' => $db->lastInsertId()]);
}

function handleIdentify()
{
    $input = json_decode(file_get_contents('php://input'), true);
    $identifier = sanitize($input['username'] ?? $input['email'] ?? '');

    if (empty($identifier)) {
        jsonResponse(400, 'Username or email is required');
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT email FROM admins WHERE (username = ? OR email = ?) AND is_active = 1");
    $stmt->execute([$identifier, $identifier]);
    $admin = $stmt->fetch();

    if (!$admin) {
        jsonResponse(404, 'No account found with that username or email');
    }

    jsonResponse(200, 'Account identified', [
        'email' => $admin['email']
    ]);
}

function handleSendRecovery()
{
    $input = json_decode(file_get_contents('php://input'), true);
    $email = sanitize($input['email'] ?? '');
    $type = $input['type'] ?? 'link'; // 'link' or 'code'

    if (empty($email)) {
        jsonResponse(400, 'Email is required');
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id, full_name FROM admins WHERE email = ? AND is_active = 1");
    $stmt->execute([$email]);
    $admin = $stmt->fetch();

    if (!$admin) {
        // For security, don't reveal if email exists, but here we usually know from identify step
        jsonResponse(404, 'No account found with that email');
    }

    $token = ($type === 'link') ? bin2hex(random_bytes(32)) : str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // Save to database
    $stmt = $db->prepare("INSERT INTO password_resets (email, token, type) VALUES (?, ?, ?)");
    $stmt->execute([$email, $token, $type]);

    // Send Email
    $subject = $type === 'link' ? "Reset Your George Steuart Group Password" : "Your Password Reset Code";
    $body = $type === 'link' ? 
        "Hi {$admin['full_name']},<br><br>You requested a password reset. Click the link below to proceed:<br><br><a href='" . FRONTEND_URL . "/admin/reset-password?token={$token}' style='padding: 10px 20px; background: #2a050b; color: #fff; text-decoration: none; border-radius: 5px;'>Reset Password</a><br><br>If you didn't request this, please ignore." :
        "Hi {$admin['full_name']},<br><br>Your password reset security code is: <strong style='font-size: 24px; letter-spacing: 4px;'>{$token}</strong><br><br>Enter this code in the recovery screen to proceed.";

    if (sendEmail($email, $admin['full_name'], $subject, $body)) {
        jsonResponse(200, "Recovery information sent to your email.");
    } else {
        jsonResponse(500, "Failed to send recovery email. Please contact support.");
    }
}

function handleVerifyResetToken()
{
    $token = sanitize($_GET['token'] ?? $_GET['code'] ?? '');
    if (empty($token)) {
        jsonResponse(400, 'Token or code is required');
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT email, type FROM password_resets WHERE token = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    $stmt->execute([$token]);
    $reset = $stmt->fetch();

    if (!$reset) {
        jsonResponse(400, 'Invalid or expired credentials');
    }

    jsonResponse(200, 'Handshake verified', ['email' => $reset['email'], 'type' => $reset['type']]);
}

function handleResetPasswordWithToken()
{
    $input = json_decode(file_get_contents('php://input'), true);
    $token = sanitize($input['token'] ?? $input['code'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($token) || empty($password)) {
        jsonResponse(400, 'Credentials and password are required');
    }

    if (strlen($password) < 6) {
        jsonResponse(400, 'Password must be at least 6 characters');
    }

    $db = getDB();
    // Verify token/code again
    $stmt = $db->prepare("SELECT email FROM password_resets WHERE token = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    $stmt->execute([$token]);
    $reset = $stmt->fetch();

    if (!$reset) {
        jsonResponse(400, 'Invalid or expired session');
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE admins SET password = ?, require_password_change = 0 WHERE email = ?");
    $stmt->execute([$hashed, $reset['email']]);

    // Delete used tokens
    $stmt = $db->prepare("DELETE FROM password_resets WHERE email = ?");
    $stmt->execute([$reset['email']]);

    jsonResponse(200, 'Password updated successfully');
}
