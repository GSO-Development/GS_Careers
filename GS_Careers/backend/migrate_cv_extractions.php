<?php
require_once __DIR__ . '/config.php';

try {
    $db = getDB();
    echo "Running CV Extractions Migration...\n";

    // 1. Add cv_text column
    $stmt = $db->query("SHOW COLUMNS FROM applications LIKE 'cv_text'");
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE applications ADD COLUMN cv_text LONGTEXT NULL AFTER cv_path");
        echo "Added column 'cv_text'\n";
    }

    // 2. Add extraction_status column
    $stmt = $db->query("SHOW COLUMNS FROM applications LIKE 'extraction_status'");
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE applications ADD COLUMN extraction_status ENUM('extracted', 'unextracted', 'pending', 'failed') NOT NULL DEFAULT 'unextracted' AFTER cv_text");
        echo "Added column 'extraction_status'\n";
    }

    // 3. Add extracted_at column
    $stmt = $db->query("SHOW COLUMNS FROM applications LIKE 'extracted_at'");
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE applications ADD COLUMN extracted_at DATETIME NULL DEFAULT NULL AFTER extraction_status");
        echo "Added column 'extracted_at'\n";
    }

    // 4. Add extracted_data column
    $stmt = $db->query("SHOW COLUMNS FROM applications LIKE 'extracted_data'");
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE applications ADD COLUMN extracted_data LONGTEXT NULL DEFAULT NULL AFTER extracted_at");
        echo "Added column 'extracted_data'\n";
    }

    // Update existing unextracted applications to have null skills_metadata and cv_text
    $db->exec("UPDATE applications SET skills_metadata = NULL, cv_text = NULL, extracted_data = NULL, tags = '' WHERE extraction_status = 'unextracted'");
    echo "Cleaned up skills_metadata for unextracted applications.\n";

    // 5. Ensure enable_cv_extraction exists in settings table
    $stmt = $db->prepare("SELECT COUNT(*) FROM settings WHERE setting_key = 'enable_cv_extraction'");
    $stmt->execute();
    if ((int)$stmt->fetchColumn() === 0) {
        $stmtInsert = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('enable_cv_extraction', '1')");
        $stmtInsert->execute();
        echo "Added setting 'enable_cv_extraction' = '1'\n";
    }

    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "Migration error: " . $e->getMessage() . "\n";
    exit(1);
}
