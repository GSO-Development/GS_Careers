<?php
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    
    // Create company_locations table
    $sql = "
        CREATE TABLE IF NOT EXISTS company_locations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT NOT NULL,
            location VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    $db->exec($sql);
    echo "Migration successful: company_locations table created.\n";
} catch (Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
}
