<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT id, email, type, created_at FROM password_resets ORDER BY id DESC LIMIT 5");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "LATEST_RESETS_START\n";
foreach ($rows as $row) {
    echo "ID: {$row['id']} | EMAIL: {$row['email']} | TYPE: {$row['type']} | CREATED: {$row['created_at']}\n";
}
echo "LATEST_RESETS_END\n";
