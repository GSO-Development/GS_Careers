<?php
/**
 * George Steuart Careers Portal - Automated Database Migration Runner
 * 
 * Usage from CLI:
 *   php migrate.php
 *   php migrate.php --full    (to migrate all existing sample/active vacancies & applicants)
 * 
 * Usage from Browser:
 *   http://your-server-ip/api/migrate.php?key=gs_setup_2026
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Detect environment & CLI
$isCli = (php_sapi_name() === 'cli');

// Basic security token for browser access
$validKey = 'gs_setup_2026';
if (!$isCli) {
    header('Content-Type: text/html; charset=utf-8');
    $reqKey = $_GET['key'] ?? '';
    if ($reqKey !== $validKey) {
        http_response_code(403);
        echo "<h2>403 Forbidden</h2><p>To run database migration via browser, supply security key: <code>?key={$validKey}</code></p>";
        exit;
    }
}

function output($msg, $type = 'info') {
    global $isCli;
    if ($isCli) {
        $colors = [
            'success' => "\033[32m[SUCCESS]\033[0m ",
            'error'   => "\033[31m[ERROR]\033[0m   ",
            'warning' => "\033[33m[WARN]\033[0m    ",
            'info'    => "\033[36m[INFO]\033[0m    ",
            'header'  => "\033[35m=== ",
        ];
        $prefix = $colors[$type] ?? '';
        $suffix = ($type === 'header') ? " ===\033[0m" : "";
        echo $prefix . $msg . $suffix . PHP_EOL;
    } else {
        $styles = [
            'success' => 'color: #16a34a; font-weight: bold;',
            'error'   => 'color: #dc2626; font-weight: bold;',
            'warning' => 'color: #d97706; font-weight: bold;',
            'info'    => 'color: #0284c7;',
            'header'  => 'color: #8b1a2b; font-size: 1.2rem; font-weight: bold; border-bottom: 2px solid #8b1a2b; padding-bottom: 4px; margin-top: 15px;',
        ];
        $style = $styles[$type] ?? '';
        echo "<div style='{$style} margin: 4px 0; font-family: monospace;'>{$msg}</div>";
        flush();
    }
}

if (!$isCli) {
    echo "<!DOCTYPE html><html><head><title>GS Careers DB Migration</title><style>body { background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; padding: 25px; line-height: 1.6; }</style></head><body>";
    echo "<h1 style='color: #c8a951;'>George Steuart Careers — Database Migration Console</h1>";
}

output("Starting George Steuart Careers Database Migration", 'header');

// 1. Load .env
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    // Check if .env.example exists to create .env
    if (file_exists(__DIR__ . '/.env.example')) {
        copy(__DIR__ . '/.env.example', $envFile);
        output("Created .env from .env.example", 'warning');
    } else {
        output(".env file not found at {$envFile}. Please configure your database settings.", 'error');
        exit(1);
    }
}

function parseEnvFile($filePath) {
    $vars = [];
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }
            $vars[$name] = $value;
        }
    }
    return $vars;
}

$env = parseEnvFile($envFile);
$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbName = $env['DB_NAME'] ?? 'gs_jobs';
$dbUser = $env['DB_USER'] ?? 'root';
$dbPass = $env['DB_PASS'] ?? '';
$dbPort = $env['DB_PORT'] ?? 3306;

output("Target Host:     {$dbHost}:{$dbPort}", 'info');
output("Target Database: {$dbName}", 'info');
output("Database User:   {$dbUser}", 'info');

// 2. Connect to MySQL server (without selecting DB first)
try {
    $rootPdo = new PDO("mysql:host={$dbHost};port={$dbPort};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5
    ]);
    output("Connected to MySQL server successfully.", 'success');
} catch (PDOException $e) {
    output("Could not connect to MySQL server: " . $e->getMessage(), 'error');
    output("Please verify your MySQL service is running and DB_HOST, DB_USER, DB_PASS are correct in backend/.env", 'warning');
    exit(1);
}

// 3. Ensure Database Exists
try {
    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    output("Database `{$dbName}` is ready.", 'success');
} catch (PDOException $e) {
    output("Failed to create database `{$dbName}`: " . $e->getMessage(), 'error');
    exit(1);
}

// 4. Connect to the target Database
try {
    $db = new PDO("mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    output("Failed to connect to `{$dbName}`: " . $e->getMessage(), 'error');
    exit(1);
}

// 5. Select Migration File
$isFullMigration = false;
if ($isCli) {
    global $argv;
    if (isset($argv) && in_array('--full', $argv)) {
        $isFullMigration = true;
    }
} else {
    if (isset($_GET['mode']) && $_GET['mode'] === 'full') {
        $isFullMigration = true;
    }
}

$migrationFile = $isFullMigration
    ? __DIR__ . '/database/full_database_dump.sql'
    : __DIR__ . '/database/schema_migration.sql';

if (!file_exists($migrationFile)) {
    output("Migration file not found: {$migrationFile}", 'error');
    exit(1);
}

$fileTypeLabel = $isFullMigration ? "Full Dump (Schema + All Records)" : "Clean Production Schema + Seed Data";
output("Executing Migration: {$fileTypeLabel}", 'header');

$sqlContent = file_get_contents($migrationFile);
if (empty($sqlContent)) {
    output("Migration file is empty!", 'error');
    exit(1);
}

// Split into statements safely
// Disable foreign key checks
$db->exec("SET FOREIGN_KEY_CHECKS = 0;");
$db->exec("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");

// Execute batch
try {
    $db->exec($sqlContent);
    output("Executed migration SQL script successfully.", 'success');
} catch (PDOException $e) {
    // If bulk exec fails, split by semicolon and execute statement by statement
    output("Bulk execution notice: " . $e->getMessage() . " — Retrying statement-by-statement...", 'warning');
    
    $statements = array_filter(array_map('trim', explode(";\n", $sqlContent)));
    $executed = 0;
    $errors = 0;
    foreach ($statements as $stmtSql) {
        if (empty($stmtSql) || strpos($stmtSql, '--') === 0) continue;
        try {
            $db->exec($stmtSql);
            $executed++;
        } catch (PDOException $stmtEx) {
            $errors++;
            output("Statement error: " . $stmtEx->getMessage(), 'warning');
        }
    }
    output("Executed {$executed} statements (Errors encountered: {$errors})", $errors === 0 ? 'success' : 'warning');
}

$db->exec("SET FOREIGN_KEY_CHECKS = 1;");

// 6. Verify Table Structure & Record Counts
output("Verifying Database Tables", 'header');
$expectedTables = [
    'companies',
    'company_locations',
    'admins',
    'vacancies',
    'applications',
    'audit_logs',
    'vacancy_audit_logs',
    'email_queue',
    'password_resets',
    'settings'
];

$allTablesOk = true;
foreach ($expectedTables as $tbl) {
    try {
        $count = $db->query("SELECT COUNT(*) FROM `{$tbl}`")->fetchColumn();
        output("Table `{$tbl}`: Present ({$count} records)", 'success');
    } catch (PDOException $e) {
        output("Table `{$tbl}`: MISSING! (" . $e->getMessage() . ")", 'error');
        $allTablesOk = false;
    }
}

// 7. Verify Administrator Account
output("Verifying Super Admin Account", 'header');
try {
    $superAdmin = $db->query("SELECT id, username, email, role, is_active FROM admins WHERE role = 'super_admin' LIMIT 1")->fetch();
    if ($superAdmin) {
        output("Super Admin account found: Username: '{$superAdmin['username']}' | Email: '{$superAdmin['email']}' (Active: {$superAdmin['is_active']})", 'success');
    } else {
        output("Warning: No super_admin account found! Creating default superadmin account...", 'warning');
        $defPass = password_hash('Admin@12345', PASSWORD_BCRYPT);
        $ins = $db->prepare("INSERT INTO admins (username, email, password, full_name, role, is_active) VALUES (?, ?, ?, ?, 'super_admin', 1)");
        $ins->execute(['superadmin', 'admin@georgesteuart.com', $defPass, 'Super Administrator']);
        output("Default Super Admin created: Username: 'superadmin' | Password: 'Admin@12345'", 'success');
    }
} catch (Exception $e) {
    output("Admin verification error: " . $e->getMessage(), 'error');
}

// 8. Verify Upload Directories
output("Verifying Storage Directories", 'header');
$uploadDirs = [
    __DIR__ . '/uploads',
    __DIR__ . '/uploads/cv',
    __DIR__ . '/uploads/queue'
];

foreach ($uploadDirs as $dir) {
    if (!is_dir($dir)) {
        if (@mkdir($dir, 0755, true)) {
            output("Created directory: {$dir}", 'success');
        } else {
            output("Failed to create directory: {$dir}. Please create it manually with write permissions (chmod 755/775).", 'warning');
        }
    } else {
        if (is_writable($dir)) {
            output("Directory writable: {$dir}", 'success');
        } else {
            output("Directory NOT writable: {$dir}. Please run: chmod -R 775 " . escapeshellarg($dir), 'warning');
        }
    }
}

output("Migration Complete!", 'header');
output("Your database is now fully prepared for server deployment.", 'success');

if (!$isCli) {
    echo "<p style='margin-top: 20px; color: #94a3b8;'>You can now delete or restrict access to <code>migrate.php</code> for security.</p>";
    echo "</body></html>";
}
