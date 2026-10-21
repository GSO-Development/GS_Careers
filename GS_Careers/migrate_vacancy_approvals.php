<?php
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    
    // Step 1: Add approval_status and rejection_reason columns if they do not exist
    echo "Checking schema for vacancies table...\n";
    
    // Check if approval_status already exists
    $stmt = $db->query("SHOW COLUMNS FROM vacancies LIKE 'approval_status'");
    $statusCol = $stmt->fetch();
    
    if (!$statusCol) {
        $db->exec("ALTER TABLE vacancies ADD COLUMN approval_status ENUM('pending_subadmin1', 'pending_global', 'approved', 'rejected') NOT NULL DEFAULT 'approved' AFTER is_active");
        echo "SUCCESS: Added 'approval_status' column to vacancies table.\n";
    } else {
        echo "INFO: 'approval_status' column already exists.\n";
    }
    
    // Check if rejection_reason already exists
    $stmt = $db->query("SHOW COLUMNS FROM vacancies LIKE 'rejection_reason'");
    $reasonCol = $stmt->fetch();
    
    if (!$reasonCol) {
        $db->exec("ALTER TABLE vacancies ADD COLUMN rejection_reason TEXT DEFAULT NULL AFTER approval_status");
        echo "SUCCESS: Added 'rejection_reason' column to vacancies table.\n";
    } else {
        echo "INFO: 'rejection_reason' column already exists.\n";
    }
    
    // Step 2: Ensure all existing active/inactive vacancies are marked as 'approved' (back-compatibility)
    $db->exec("UPDATE vacancies SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = ''");
    echo "SUCCESS: Legacy vacancies updated to 'approved'.\n";

} catch (Exception $e) {
    echo "ERROR running migration: " . $e->getMessage() . "\n";
}
?>
