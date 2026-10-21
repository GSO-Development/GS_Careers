<?php
require_once 'c:/Users/nadumi/OneDrive - George Steuart Optimize Pvt Ltd/Documents/GS Careers CV/GS_Careers/backend/config.php';
$db = getDB();
$stmt = $db->prepare("SELECT id, first_name, last_name, cv_text, tags, skills_metadata FROM applications WHERE id = 86 OR email LIKE '%nadumi%'");
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "ID: " . $r['id'] . "\n";
    echo "Name: " . $r['first_name'] . " " . $r['last_name'] . "\n";
    echo "Tags: " . $r['tags'] . "\n";
    echo "CV Text snippet: " . substr($r['cv_text'] ?? '', 0, 200) . "\n";
    echo "Skills Metadata snippet: " . substr($r['skills_metadata'] ?? '', 0, 300) . "\n";
}
