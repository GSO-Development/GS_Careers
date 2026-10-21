<?php
require_once __DIR__ . '/../backend/config.php';

$pdo = getDB();
$stmt = $pdo->query("SELECT id, first_name, last_name, email, cv_path, qualification, skills_metadata FROM applications WHERE first_name LIKE '%Nethmini%' OR last_name LIKE '%Rajamanthri%' OR email LIKE '%nethmini%'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($rows)) {
    echo "No candidate found in DB matching Nethmini.\n";
    // Let's list recent applications
    $stmt2 = $pdo->query("SELECT id, first_name, last_name, email, cv_path FROM applications ORDER BY id DESC LIMIT 10");
    echo "Latest 10 applications:\n";
    print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));
} else {
    foreach ($rows as $row) {
        echo "ID: {$row['id']} | Name: {$row['first_name']} {$row['last_name']} | Email: {$row['email']} | CV: {$row['cv_path']}\n";
        echo "Qualification column: {$row['qualification']}\n";
        echo "Skills Metadata:\n";
        $meta = json_decode($row['skills_metadata'], true);
        print_r($meta);
    }
}
