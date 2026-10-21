<?php
require_once __DIR__ . '/../backend/config.php';
$db = getDB();
$stmt = $db->query("SELECT setting_key, setting_value FROM settings");
foreach ($stmt->fetchAll(PDO::FETCH_KEY_PAIR) as $k => $v) {
    echo "$k => $v\n";
}
