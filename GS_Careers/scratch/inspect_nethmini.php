<?php
require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$stmt = $db->query("SELECT id, first_name, last_name, email, cv_path, cv_text, extracted_data, skills_metadata FROM applications WHERE first_name LIKE '%Nethmini%' OR last_name LIKE '%Rajamanthri%' OR cv_text LIKE '%Rajamanthri%' OR email LIKE '%nethmini%'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($rows) . " rows.\n\n";

foreach ($rows as $r) {
    echo "ID: " . $r['id'] . "\n";
    echo "Name: " . $r['first_name'] . " " . $r['last_name'] . "\n";
    echo "Email: " . $r['email'] . "\n";
    echo "CV Path: " . $r['cv_path'] . "\n";
    echo "CV Text length: " . strlen($r['cv_text'] ?? '') . "\n";
    echo "CV Text snippet:\n" . substr($r['cv_text'] ?? '', 0, 500) . "\n\n";
    echo "Extracted Data:\n" . var_export(json_decode($r['extracted_data'] ?? '', true), true) . "\n\n";
    echo "Skills Metadata:\n" . var_export(json_decode($r['skills_metadata'] ?? '', true), true) . "\n\n";
}
