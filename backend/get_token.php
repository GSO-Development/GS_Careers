<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT token FROM password_resets ORDER BY id DESC LIMIT 1");
$token = $stmt->fetchColumn();
file_put_contents('full_token.txt', $token);
echo "Token written to full_token.txt: " . $token;
