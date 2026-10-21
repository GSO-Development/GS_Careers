<?php
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    
    // Add require_password_change column to admins table if not exists
    $db->exec("
        ALTER TABLE admins 
        ADD COLUMN IF NOT EXISTS require_password_change TINYINT(1) DEFAULT 0 AFTER is_active;
    ");
    
    echo "Migration successful: require_password_change column verified/added to admins table.\n";
} catch (Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
}
