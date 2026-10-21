<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    $pool = $db->query("SELECT COUNT(DISTINCT email) FROM applications WHERE future_consent = 1")->fetchColumn();
    echo "--- FINAL COUNTS ---\n";
    echo "Talent Pool Size: $pool\n";
    
    $matches = $db->query("SELECT COUNT(DISTINCT a.email) 
                          FROM applications a 
                          JOIN vacancies v ON a.vacancy_id = v.id
                          WHERE a.future_consent = 1 
                          AND v.designation IN (SELECT designation FROM vacancies WHERE is_active = 1)")->fetchColumn();
    echo "Total Pool Matches: $matches\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
