<?php
require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$stmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE '%ai%' OR setting_key LIKE '%gemini%' OR setting_key LIKE '%provider%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
