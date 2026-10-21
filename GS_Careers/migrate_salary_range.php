<?php
require_once __DIR__ . '/backend/config.php';

$db = getDB();

try {
    $stmt = $db->query("SHOW COLUMNS FROM vacancies LIKE 'min_salary'");
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE vacancies ADD COLUMN min_salary DECIMAL(12,2) DEFAULT NULL AFTER min_relevant_experience");
        echo "Added min_salary column to vacancies table.\n";
    } else {
        echo "min_salary column already exists.\n";
    }

    $stmt = $db->query("SHOW COLUMNS FROM vacancies LIKE 'max_salary'");
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE vacancies ADD COLUMN max_salary DECIMAL(12,2) DEFAULT NULL AFTER min_salary");
        echo "Added max_salary column to vacancies table.\n";
    } else {
        echo "max_salary column already exists.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
