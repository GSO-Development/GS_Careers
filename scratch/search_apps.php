<?php
require_once __DIR__ . '/../backend/config.php';

$pdo = getDB();
$stmt = $pdo->query("SELECT id, first_name, last_name, email, cv_path, skills_metadata FROM applications");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total applications: " . count($rows) . "\n";
foreach ($rows as $row) {
    if (stripos($row['first_name'], 'Neth') !== false || stripos($row['email'], 'neth') !== false || stripos($row['cv_path'], '71') !== false) {
        echo "ID: {$row['id']} | Name: {$row['first_name']} {$row['last_name']} | Email: {$row['email']} | CV: {$row['cv_path']}\n";
    }
}
