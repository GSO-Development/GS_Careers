<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT id, first_name, last_name, cv_text, skills_metadata, extracted_data FROM applications WHERE first_name LIKE '%Nadumi%' OR id IN (93,95,100)");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "=== ID: {$row['id']} ({$row['first_name']} {$row['last_name']}) ===\n";
    echo "CV TEXT:\n" . $row['cv_text'] . "\n\n";
    echo "SKILLS METADATA:\n" . $row['skills_metadata'] . "\n\n";
    echo "EXTRACTED DATA:\n" . $row['extracted_data'] . "\n\n";
}
