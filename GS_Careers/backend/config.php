<?php
// ============================================
// George Steuart Job Portal - Configuration
// ============================================

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Global Autoloader
require_once __DIR__ . '/libs/autoload.php';

// Load .env variables if present
function loadEnv($filePath) {
    if (!file_exists($filePath)) {
        return;
    }
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }
            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}
loadEnv(__DIR__ . '/.env');

// ---- DATABASE ----
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'gs_jobs1');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

// ---- OLLAMA SERVER ----
define('OLLAMA_SERVER', getenv('OLLAMA_SERVER') ?: 'http://localhost:11434');
define('OLLAMA_MODEL', getenv('OLLAMA_MODEL') ?: 'qwen2.5:3b');
define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ?: '');

// ---- JWT SECRET ----
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'default_jwt_secret_key');

// ---- EMAIL SETTINGS ----
define('EMAIL_ENABLED', getenv('EMAIL_ENABLED') !== false ? filter_var(getenv('EMAIL_ENABLED'), FILTER_VALIDATE_BOOLEAN) : true);
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', getenv('SMTP_PORT') ? (int)getenv('SMTP_PORT') : 587);
define('SMTP_SECURE', getenv('SMTP_SECURE') ?: 'tls');
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'George Steuart Careers');
define('SMTP_REPLY_TO', getenv('SMTP_REPLY_TO') ?: 'no-reply@georgesteuart.com');
define('SMTP_DEBUG', getenv('SMTP_DEBUG') !== false ? (int)getenv('SMTP_DEBUG') : 0);

// ---- FRONTEND URL ----
$reqHost = isset($_SERVER['HTTP_HOST']) ? explode(':', $_SERVER['HTTP_HOST'])[0] : 'localhost';
$reqProto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: "{$reqProto}://{$reqHost}:3000");

// ---- FILE UPLOADS ----
define('UPLOAD_DIR', __DIR__ . '/uploads/cv/');
define('MAX_CV_SIZE', 5 * 1024 * 1024); // 5MB

// ---- CORS Headers ----
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
// Only set JSON header if not viewing a CV
if (!isset($_GET['action']) || $_GET['action'] !== 'view_cv') {
    header('Content-Type: application/json; charset=UTF-8');
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ---- Database Connection ----
function getDB()
{
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            jsonResponse(500, 'Database connection failed');
        }
    }
    return $pdo;
}

// ---- Helper Functions ----
function jsonResponse($code, $message, $data = null, $continue = false)
{
    // Clear any previous output to ensure clean JSON response
    if (ob_get_level() > 0) {
        ob_clean();
    }

    http_response_code($code);
    $resp = ['message' => $message];
    if ($data !== null)
        $resp['data'] = $data;

    $output = json_encode($resp);

    if ($continue) {
        // For non-blocking response, we MUST set Content-Length accurately
        header('Connection: close');
        header('Content-Type: application/json; charset=UTF-8');
        header('Content-Length: ' . strlen($output));
        echo $output;
        if (ob_get_level() > 0) {
            ob_end_flush();
        }
        flush();
        // Script continues after this...
    } else {
        echo $output;
        exit();
    }
}

function sanitize($str)
{
    $decoded = trim($str);
    while (html_entity_decode($decoded, ENT_QUOTES, 'UTF-8') !== $decoded) {
        $decoded = html_entity_decode($decoded, ENT_QUOTES, 'UTF-8');
    }
    return $decoded;
}

function generateToken($adminId, $role, $companyId)
{
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64_encode(json_encode([
        'admin_id' => $adminId,
        'role' => $role,
        'company_id' => $companyId,
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ]));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

function verifyToken()
{
    $authHeader = '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
    }
    if (empty($authHeader)) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_AUTHORISATION'] ?? '';
    }

    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        jsonResponse(401, 'Authentication required');
    }

    $token = $matches[1];
    $parts = explode('.', $token);

    if (count($parts) !== 3) {
        jsonResponse(401, 'Invalid token');
    }

    $signature = base64_encode(hash_hmac('sha256', "$parts[0].$parts[1]", JWT_SECRET, true));

    if (!hash_equals($signature, $parts[2])) {
        jsonResponse(401, 'Invalid token');
    }

    $payload = json_decode(base64_decode($parts[1]), true);

    if ($payload['exp'] < time()) {
        jsonResponse(401, 'Token expired');
    }

    return $payload;
}

function requireSuperAdmin()
{
    $auth = verifyToken();
    if ($auth['role'] !== 'super_admin') {
        jsonResponse(403, 'Super admin access required');
    }
    return $auth;
}

function requireAdminOrSuperAdmin()
{
    $auth = verifyToken();
    if ($auth['role'] !== 'super_admin' && $auth['role'] !== 'admin') {
        jsonResponse(403, 'Admin or Super admin access required');
    }
    return $auth;
}

// Create upload directory if not exists
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// ---- EMAIL UTILITY ----
function isCandidateEmailEnabled()
{
    try {
        $db = getDB();
        $stmt = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'enable_candidate_emails'");
        $val = $stmt->fetchColumn();
        if ($val === '0' || $val === 'false' || $val === false) {
            return false;
        }
        return true;
    } catch (\Exception $e) {
        return true;
    }
}

function sendEmail($to, $toName, $subject, $body)
{
    if (!defined('EMAIL_ENABLED') || !EMAIL_ENABLED)
        return true;

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

    try {
        $smtp_host = SMTP_HOST;
        $smtp_port = SMTP_PORT;
        $smtp_secure = SMTP_SECURE;
        $smtp_user = SMTP_USER;
        $smtp_pass = SMTP_PASS;
        $smtp_from_name = SMTP_FROM_NAME;
        $system_email = SMTP_USER;

        try {
            $db = getDB();
            $stmt = $db->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from_name', 'system_email')");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

            if (!empty($results['smtp_host']))
                $smtp_host = $results['smtp_host'];
            if (!empty($results['smtp_port']))
                $smtp_port = (int) $results['smtp_port'];
            if (!empty($results['smtp_secure']))
                $smtp_secure = $results['smtp_secure'];
            if (!empty($results['smtp_user']))
                $smtp_user = $results['smtp_user'];
            if (!empty($results['smtp_pass']))
                $smtp_pass = $results['smtp_pass'];
            if (!empty($results['smtp_from_name']))
                $smtp_from_name = $results['smtp_from_name'];
            if (!empty($results['system_email']))
                $system_email = $results['system_email'];
            else if (!empty($smtp_user))
                $system_email = $smtp_user;
        } catch (\Exception $dbEx) {
            // Fallback to config constants on DB failure
        }

        // Server settings
        $mail->isSMTP();
        $mail->Host = $smtp_host;
        $mail->SMTPAuth = true;
        $mail->Username = $smtp_user;
        $mail->Password = $smtp_pass;
        $mail->SMTPSecure = $smtp_secure;
        $mail->Port = $smtp_port;

        // SSL Bypass for local environments
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );

        $mail->setFrom($system_email, $smtp_from_name);
        $mail->addAddress($to, $toName);
        $mail->addReplyTo(SMTP_REPLY_TO, 'Support');

        // Content
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->AltBody = strip_tags(str_replace('<br>', "\n", $body));

        $mail->send();
        return true;
    } catch (\Exception $e) {
        error_log("Mail Error: " . $mail->ErrorInfo);
        return false;
    }
}

function queueEmail($to, $toName, $subject, $body)
{
    if (!defined('EMAIL_ENABLED') || !EMAIL_ENABLED)
        return true;

    try {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO email_queue (recipient_email, recipient_name, subject, body, status, attempts) VALUES (?, ?, ?, ?, 'pending', 0)");
        $stmt->execute([$to, $toName, $subject, $body]);

        // Asynchronously trigger the email queue processor script
        $scriptPath = __DIR__ . '/scripts/process_queue.php';
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows background execution
            $cmd = "start /B php \"" . $scriptPath . "\" > NUL 2>&1";
            pclose(popen($cmd, "r"));
        } else {
            // Linux/macOS background execution
            $cmd = "php \"" . $scriptPath . "\" > /dev/null 2>&1 &";
            exec($cmd);
        }
        return true;
    } catch (\Exception $e) {
        error_log("Queue Email Error: " . $e->getMessage());
        return false;
    }
}

function logSystemAudit($adminId, $category, $action, $entityType, $entityId, $entityName, $details = '', $oldValues = null, $newValues = null, $companyId = null)
{
    try {
        $db = getDB();
        $adminName = null;
        $adminRole = null;
        if ($adminId) {
            $stmtA = $db->prepare("SELECT full_name, role, company_id FROM admins WHERE id = ?");
            $stmtA->execute([$adminId]);
            $admin = $stmtA->fetch();
            if ($admin) {
                $adminName = $admin['full_name'];
                $adminRole = $admin['role'];
                if (!$companyId && !empty($admin['company_id'])) {
                    $companyId = $admin['company_id'];
                }
            }
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

        $stmt = $db->prepare("
            INSERT INTO audit_logs 
            (admin_id, admin_name, admin_role, company_id, category, action, entity_type, entity_id, entity_name, old_values, new_values, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $adminId,
            $adminName,
            $adminRole,
            $companyId,
            $category,
            $action,
            $entityType,
            $entityId,
            $entityName,
            is_array($oldValues) ? json_encode($oldValues) : $oldValues,
            is_array($newValues) ? json_encode($newValues) : $newValues,
            $details,
            $ip,
            $userAgent
        ]);
    } catch (\Exception $e) {
        error_log("Failed to insert system audit log: " . $e->getMessage());
    }
}

function logVacancyAction($vacancyId, $adminId, $action, $oldStatus, $newStatus, $reason = null)
{
    try {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO vacancy_audit_logs (vacancy_id, admin_id, action, old_status, new_status, reason) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$vacancyId, $adminId, $action, $oldStatus, $newStatus, $reason]);

        // Dual write to unified audit_logs
        $isCandidate = strpos($action, 'candidate_') !== false || strpos($action, 'interview_') !== false;
        $category = $isCandidate ? 'candidate' : 'recruitment';
        $entityType = $isCandidate ? 'candidate' : 'vacancy';

        $vStmt = $db->prepare("SELECT title, reference_number, company_id FROM vacancies WHERE id = ?");
        $vStmt->execute([$vacancyId]);
        $vac = $vStmt->fetch();
        $entityName = $vac ? ($vac['title'] . ' (' . ($vac['reference_number'] ?? '') . ')') : 'Vacancy #' . $vacancyId;
        $companyId = $vac['company_id'] ?? null;

        if ($isCandidate && !empty($reason) && preg_match('/Candidate:\s*([^|\n]+)/i', $reason, $m)) {
            $entityName = trim($m[1]) . ' — ' . $entityName;
        }

        $oldVal = $oldStatus ? json_encode(['status' => $oldStatus]) : null;
        $newVal = $newStatus ? json_encode(['status' => $newStatus]) : null;

        logSystemAudit($adminId, $category, $action, $entityType, $vacancyId, $entityName, $reason, $oldVal, $newVal, $companyId);
    } catch (Exception $e) {
        error_log("Failed to insert audit log: " . $e->getMessage());
    }
}

// ---- EMAIL TEMPLATES HELPERS ----
function parseEmailTemplate($template, $variables)
{
    foreach ($variables as $key => $value) {
        $template = str_replace("{" . $key . "}", $value, $template);
    }
    return $template;
}

function getEmailTemplate($key, $default)
{
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();

        // Upgrade legacy non-HTML text templates to the new premium full HTML defaults
        if ($val !== false && $val !== null && $val !== '' && strpos($key, '_body') !== false && strpos($val, '<!DOCTYPE html>') === false) {
            return $default;
        }

        return ($val !== false && $val !== null && $val !== '') ? $val : $default;
    } catch (\Exception $e) {
        return $default;
    }
}

/**
 * Standardize any contact number to clean International Format with spaces:
 * Example: +94 77 123 4567
 */
function formatContactNumber($phone)
{
    if (empty($phone)) return '';
    $raw = trim((string)$phone);
    if ($raw === '' || strtolower($raw) === 'n/a' || strtolower($raw) === 'none') return '';

    // Remove brackets, dashes, dots, spaces to inspect
    $cleaned = preg_replace('/[^\d+]/', '', $raw);
    $digits = preg_replace('/\D/', '', $raw);

    // Sri Lanka prefix handling (+94, 0094, 94)
    if (strpos($cleaned, '+94') === 0 || strpos($digits, '0094') === 0 || (strpos($digits, '94') === 0 && strlen($digits) >= 11)) {
        if (strpos($digits, '0094') === 0) {
            $digits = substr($digits, 4);
        } elseif (strpos($digits, '94') === 0) {
            $digits = substr($digits, 2);
        }
        if (strpos($digits, '0') === 0) {
            $digits = substr($digits, 1);
        }
    } elseif (strpos($digits, '0') === 0 && strlen($digits) === 10) {
        $digits = substr($digits, 1);
    }

    if (strlen($digits) === 9) {
        $area = substr($digits, 0, 2);
        $mid = substr($digits, 2, 3);
        $last = substr($digits, 5, 4);
        return "+94 {$area} {$mid} {$last}";
    }

    if (strpos($raw, '+') === 0) {
        return trim(preg_replace('/\s+/', ' ', $raw));
    }

    if (strlen($digits) === 10 && strpos($digits, '0') === 0) {
        $sub = substr($digits, 1);
        return "+94 " . substr($sub, 0, 2) . " " . substr($sub, 2, 3) . " " . substr($sub, 5, 4);
    }

    return $raw;
}



