<?php
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    
    echo "Starting schema migration for vacancy approvals enhancements...\n";
    
    // 1. Modify approval_status ENUM to include 'draft'
    echo "Modifying approval_status ENUM...\n";
    $db->exec("ALTER TABLE vacancies MODIFY COLUMN approval_status ENUM('draft', 'pending_subadmin1', 'pending_global', 'approved', 'rejected') NOT NULL DEFAULT 'draft'");
    echo "SUCCESS: approval_status ENUM modified to include 'draft'.\n";

    // Helper function to add column if it does not exist
    function addColumnIfNotExists($db, $tableName, $columnName, $definition) {
        $stmt = $db->query("SHOW COLUMNS FROM `$tableName` LIKE '$columnName'");
        $col = $stmt->fetch();
        if (!$col) {
            $db->exec("ALTER TABLE `$tableName` ADD COLUMN `$columnName` $definition");
            echo "SUCCESS: Added column '$columnName' to table '$tableName'.\n";
        } else {
            echo "INFO: Column '$columnName' already exists in table '$tableName'.\n";
        }
    }

    // 2. Add history columns
    addColumnIfNotExists($db, 'vacancies', 'sub1_approved_by', 'INT NULL DEFAULT NULL AFTER rejection_reason');
    addColumnIfNotExists($db, 'vacancies', 'sub1_approved_at', 'TIMESTAMP NULL DEFAULT NULL AFTER sub1_approved_by');
    
    addColumnIfNotExists($db, 'vacancies', 'global_approved_by', 'INT NULL DEFAULT NULL AFTER sub1_approved_at');
    addColumnIfNotExists($db, 'vacancies', 'global_approved_at', 'TIMESTAMP NULL DEFAULT NULL AFTER global_approved_by');
    
    addColumnIfNotExists($db, 'vacancies', 'rejected_by', 'INT NULL DEFAULT NULL AFTER global_approved_at');
    addColumnIfNotExists($db, 'vacancies', 'rejected_at', 'TIMESTAMP NULL DEFAULT NULL AFTER rejected_by');

    echo "Migration completed successfully!\n";

} catch (Exception $e) {
    echo "ERROR running migration: " . $e->getMessage() . "\n";
}
?>
