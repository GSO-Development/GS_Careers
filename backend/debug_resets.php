<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT * FROM password_resets ORDER BY id DESC LIMIT 10");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "RESETS_START\n";
foreach ($rows as $row) {
    echo "ID: {$row['id']} | EMAIL: {$row['email']} | TOKEN: {$row['token']} | TYPE: {$row['type']} | CREATED: {$row['created_at']}\n";
}
echo "RESETS_END\n";
