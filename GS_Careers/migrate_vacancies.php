<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    
    // Add min_experience
    $db->exec("ALTER TABLE vacancies ADD COLUMN min_experience ENUM('0-1 years','1-3 years','3-5 years','5-10 years','10+ years') DEFAULT '0-1 years' AFTER employment_type");
    
    // Add min_relevant_experience
    $db->exec("ALTER TABLE vacancies ADD COLUMN min_relevant_experience ENUM('0-1 years','1-3 years','3-5 years','5-10 years','10+ years') DEFAULT '0-1 years' AFTER min_experience");
    
    echo "SUCCESS: Added experience columns to vacancies table.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "INFO: Columns already exist.\n";
    } else {
        echo "ERROR: " . $e->getMessage();
    }
}
