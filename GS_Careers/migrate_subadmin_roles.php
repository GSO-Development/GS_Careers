<?php
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    
    // Step 1: Alter role ENUM in admins table to allow ('super_admin', 'admin', 'sub_admin', 'sub_admin1', 'sub_admin2')
    $sqlAlter = "ALTER TABLE admins MODIFY COLUMN role ENUM('super_admin', 'admin', 'sub_admin', 'sub_admin1', 'sub_admin2') NOT NULL DEFAULT 'sub_admin2'";
    $db->exec($sqlAlter);
    echo "ENUM migration successful: role enum modified in admins table.\n";
    
    // Step 2: Migrate existing sub_admin records to sub_admin2
    $sqlUpdate = "UPDATE admins SET role = 'sub_admin2' WHERE role = 'sub_admin'";
    $db->exec($sqlUpdate);
    echo "Record migration successful: existing sub_admins migrated to sub_admin2.\n";
    
} catch (Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
}
?>
