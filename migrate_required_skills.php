<?php
require_once __DIR__ . '/backend/config.php';
$db = getDB();

// Add required_skills column to vacancies table
try {
    $check = $db->query("SHOW COLUMNS FROM vacancies LIKE 'required_skills'")->fetch();
    if ($check) {
        echo "Column 'required_skills' already exists.\n";
    } else {
        $db->exec("ALTER TABLE vacancies ADD COLUMN required_skills TEXT NULL AFTER requirements");
        echo "SUCCESS: Column 'required_skills' added to vacancies table.\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
