<?php
require_once __DIR__ . '/backend/config.php';
$db = getDB();
$stmt = $db->query("SELECT DISTINCT v.designation FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.future_consent = 1");
$rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Designations: " . implode(', ', $rows) . "\n";
