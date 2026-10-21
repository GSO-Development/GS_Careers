<?php
require_once __DIR__ . '/config.php';

try {
    $db = getDB();
    echo "Connecting to database...\n";
    
    // Check if column already exists
    $stmt = $db->query("SHOW COLUMNS FROM vacancies LIKE 'hired_application_id'");
    $column = $stmt->fetch();
    
    if (!$column) {
        echo "Column 'hired_application_id' does not exist. Adding column 'hired_application_id' to 'vacancies' table...\n";
        $db->exec("ALTER TABLE vacancies ADD COLUMN hired_application_id INT DEFAULT NULL");
        $db->exec("ALTER TABLE vacancies ADD CONSTRAINT fk_hired_application FOREIGN KEY (hired_application_id) REFERENCES applications(id) ON DELETE SET NULL");
        echo "SUCCESS: Column 'hired_application_id' added successfully!\n";
    } else {
        echo "Column 'hired_application_id' already exists in vacancies table.\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
