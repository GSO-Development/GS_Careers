<?php
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    
    // Step 1: Alter role ENUM in admins table to allow ('super_admin', 'admin', 'sub_admin')
    $sqlAlter = "ALTER TABLE admins MODIFY COLUMN role ENUM('super_admin', 'admin', 'sub_admin') NOT NULL DEFAULT 'sub_admin'";
    $db->exec($sqlAlter);
    echo "ENUM migration successful: role enum modified in admins table.\n";
    
    // Step 2: Migrate existing sub_admin records to admin so their permissions do not break
    $sqlUpdate = "UPDATE admins SET role = 'admin' WHERE role = 'sub_admin'";
    $db->exec($sqlUpdate);
    echo "Record migration successful: existing sub_admins migrated to admin role.\n";
    
} catch (Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
}
?>
