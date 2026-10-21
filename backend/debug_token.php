<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT token FROM password_resets ORDER BY id DESC LIMIT 1");
$token = $stmt->fetchColumn();
echo "FULL_TOKEN_START:" . $token . ":FULL_TOKEN_END\n";
