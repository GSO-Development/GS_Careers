<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT token FROM password_resets WHERE id=15");
echo "ID15_TOKEN:" . $stmt->fetchColumn() . "\n";
