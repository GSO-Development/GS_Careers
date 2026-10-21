<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->prepare("SELECT * FROM password_resets WHERE email=? ORDER BY id DESC LIMIT 10");
$stmt->execute(['nnp@maildrop.cc']);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "NNP_RESETS_START\n";
foreach ($rows as $row) {
    echo "ID: {$row['id']} | CODE: {$row['token']} | TYPE: {$row['type']} | CREATED: {$row['created_at']}\n";
}
echo "NNP_RESETS_END\n";
