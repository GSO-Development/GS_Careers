<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT id, username, email FROM admins");
$admins = $stmt->fetchAll();
header('Content-Type: text/plain');
print_r($admins);
