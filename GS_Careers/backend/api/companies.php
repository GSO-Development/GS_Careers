<?php
// ============================================
// Companies API - CRUD
// ============================================
require_once __DIR__ . '/../config.php';

define('LOGOS_UPLOAD_DIR', __DIR__ . '/../uploads/logos/');

// Ensure logos directory exists
if (!is_dir(LOGOS_UPLOAD_DIR)) {
    mkdir(LOGOS_UPLOAD_DIR, 0755, true);
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        listCompanies();
        break;
    case 'create':
        createCompany();
        break;
    case 'update':
        updateCompany();
        break;
    case 'delete':
        deleteCompany();
        break;
    default:
        jsonResponse(400, 'Invalid action');
}

function listCompanies()
{
    $db = getDB();
    $stmt = $db->prepare("
        SELECT 
            c.*, 
            COALESCE(cl.total_locations, 0) AS total_locations,
            cl.locations_list
        FROM companies c
        LEFT JOIN (
            SELECT 
                company_id, 
                COUNT(*) AS total_locations,
                GROUP_CONCAT(location ORDER BY location ASC SEPARATOR ', ') AS locations_list
            FROM company_locations
            GROUP BY company_id
        ) cl ON c.id = cl.company_id
        ORDER BY c.id ASC
    ");
    $stmt->execute();
    $companies = $stmt->fetchAll();
    jsonResponse(200, 'Companies retrieved', $companies);
}

function createCompany()
{
    $auth = verifyToken();
    if (!in_array($auth['role'], ['admin', 'super_admin'])) {
        jsonResponse(403, 'Global admin access required to register new companies');
    }

    $name = sanitize($_POST['name'] ?? '');
    $location = sanitize($_POST['location'] ?? '');
    $description = sanitize($_POST['description'] ?? '');

    if (empty($name) || empty($location)) {
        jsonResponse(400, 'Company Name and Location are required');
    }

    // Auto-generate slug
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
    $slug = trim($slug, '-');

    $db = getDB();

    // Check if slug/name already exists
    $stmt = $db->prepare("SELECT id FROM companies WHERE slug = ?");
    $stmt->execute([$slug]);
    if ($stmt->fetch()) {
        // Append a unique suffix if slug conflicts
        $slug = $slug . '-' . time();
    }

    // Handle logo upload if provided
    $logoFileName = null;
    if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
        $logo = $_FILES['logo'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

        if (!in_array($logo['type'], $allowedTypes)) {
            jsonResponse(400, 'Only JPG, PNG, GIF, WEBP, and SVG logo images are allowed');
        }

        $ext = pathinfo($logo['name'], PATHINFO_EXTENSION);
        $logoFileName = 'logo_' . time() . '_' . uniqid() . '.' . $ext;
        $logoPath = LOGOS_UPLOAD_DIR . $logoFileName;

        if (!move_uploaded_file($logo['tmp_name'], $logoPath)) {
            jsonResponse(500, 'Failed to upload logo image');
        }
    }

    $stmt = $db->prepare("INSERT INTO companies (name, slug, logo, location, description) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$name, $slug, $logoFileName, $location, $description]);

    jsonResponse(201, 'Company created successfully', ['id' => $db->lastInsertId()]);
}

function updateCompany()
{
    $auth = verifyToken();
    $isAdmin = in_array($auth['role'], ['admin', 'super_admin']);
    $isSubAdmin = in_array($auth['role'], ['sub_admin1', 'sub_admin2', 'sub_admin']);

    if (!$isAdmin && !$isSubAdmin) {
        jsonResponse(403, 'Admin access required to update company details');
    }

    $id = (int)($_POST['id'] ?? 0);
    $name = sanitize($_POST['name'] ?? '');
    $location = sanitize($_POST['location'] ?? '');
    $description = sanitize($_POST['description'] ?? '');

    if ($id <= 0 || empty($name) || empty($location)) {
        jsonResponse(400, 'Company ID, Name, and Location are required');
    }

    // Subadmins can only update their own subsidiary
    if ($isSubAdmin && (int)$auth['company_id'] !== $id) {
        jsonResponse(403, 'You can only update details for your own subsidiary');
    }

    $db = getDB();

    // Verify company exists
    $stmt = $db->prepare("SELECT logo FROM companies WHERE id = ?");
    $stmt->execute([$id]);
    $company = $stmt->fetch();
    if (!$company) {
        jsonResponse(404, 'Company not found');
    }

    // Auto-generate slug
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
    $slug = trim($slug, '-');

    // Check if slug conflicts with another company
    $stmt = $db->prepare("SELECT id FROM companies WHERE slug = ? AND id != ?");
    $stmt->execute([$slug, $id]);
    if ($stmt->fetch()) {
        $slug = $slug . '-' . time();
    }

    // Handle logo upload if provided
    $logoFileName = $company['logo'];
    if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
        $logo = $_FILES['logo'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

        if (!in_array($logo['type'], $allowedTypes)) {
            jsonResponse(400, 'Only JPG, PNG, GIF, WEBP, and SVG logo images are allowed');
        }

        $ext = pathinfo($logo['name'], PATHINFO_EXTENSION);
        $logoFileName = 'logo_' . time() . '_' . uniqid() . '.' . $ext;
        $logoPath = LOGOS_UPLOAD_DIR . $logoFileName;

        if (move_uploaded_file($logo['tmp_name'], $logoPath)) {
            // Delete old logo file if it exists
            if (!empty($company['logo'])) {
                $oldLogoPath = LOGOS_UPLOAD_DIR . $company['logo'];
                if (file_exists($oldLogoPath)) {
                    unlink($oldLogoPath);
                }
            }
        } else {
            jsonResponse(500, 'Failed to upload new logo image');
        }
    }

    $stmt = $db->prepare("UPDATE companies SET name = ?, slug = ?, logo = ?, location = ?, description = ? WHERE id = ?");
    $stmt->execute([$name, $slug, $logoFileName, $location, $description, $id]);

    jsonResponse(200, 'Company updated successfully');
}

function deleteCompany()
{
    $auth = verifyToken();
    if (!in_array($auth['role'], ['admin', 'super_admin'])) {
        jsonResponse(403, 'Global admin access required to delete companies');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);

    if ($id <= 0) {
        jsonResponse(400, 'Invalid company ID');
    }

    $db = getDB();

    // Fetch company info to delete logo file
    $stmt = $db->prepare("SELECT logo FROM companies WHERE id = ?");
    $stmt->execute([$id]);
    $company = $stmt->fetch();
    if (!$company) {
        jsonResponse(404, 'Company not found');
    }

    // Delete associated logo if it exists
    if (!empty($company['logo'])) {
        $logoPath = LOGOS_UPLOAD_DIR . $company['logo'];
        if (file_exists($logoPath)) {
            unlink($logoPath);
        }
    }

    try {
        // Set hired_application_id to NULL on all vacancies of this company to avoid circular foreign key cascade issues
        $stmt = $db->prepare("UPDATE vacancies SET hired_application_id = NULL WHERE company_id = ?");
        $stmt->execute([$id]);

        // Delete company (will cascade delete vacancies and applications in InnoDB if constraints are set)
        $stmt = $db->prepare("DELETE FROM companies WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(200, 'Company and all associated records deleted successfully');
    } catch (Exception $e) {
        jsonResponse(500, 'Failed to delete company: ' . $e->getMessage());
    }
}
