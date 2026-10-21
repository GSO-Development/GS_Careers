<?php
require_once __DIR__ . '/../backend/config.php';
$db = getDB();

echo "--- SETTINGS ---\n";
$settings = $db->query("SELECT * FROM settings")->fetchAll(PDO::FETCH_ASSOC);
print_r($settings);

echo "\n--- LATEST APPLICATIONS ---\n";
$apps = $db->query("SELECT id, first_name, last_name, email, applied_at, cv_path, extraction_status, is_manual_extracted FROM applications ORDER BY id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
print_r($apps);
