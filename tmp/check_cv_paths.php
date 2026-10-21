<?php
require_once __DIR__ . '/../backend/config.php';
$db = getDB();
$apps = $db->query("SELECT id, first_name, last_name, cv_path FROM applications")->fetchAll(PDO::FETCH_ASSOC);
file_put_contents(__DIR__ . '/cv_paths.json', json_encode($apps, JSON_PRETTY_PRINT));
echo "Done\n";
