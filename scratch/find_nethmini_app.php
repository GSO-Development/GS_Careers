<?php
require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$stmt = $db->query("SELECT id, first_name, last_name, email, cv_path, qualification, skills_metadata FROM applications");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total Applications in DB: " . count($rows) . "\n\n";

foreach ($rows as $r) {
    echo "ID: {$r['id']} | Name: {$r['first_name']} {$r['last_name']} | Email: {$r['email']} | CV: {$r['cv_path']}\n";
    $meta = json_decode($r['skills_metadata'], true);
    echo "  Quals Found: " . json_encode($meta['qualifications_found'] ?? []) . "\n";
    echo "  Certs Found: " . json_encode($meta['certifications_found'] ?? []) . "\n\n";
}
