<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$code = '943932';
$stmt = $db->prepare("SELECT * FROM password_resets WHERE token=?");
$stmt->execute([$code]);
$reset = $stmt->fetch(PDO::FETCH_ASSOC);
if ($reset) {
    echo "CODE_FOUND: " . json_encode($reset) . "\n";
} else {
    echo "CODE_NOT_FOUND: " . $code . "\n";
}
echo "SERVER_TIME: " . date('Y-m-d H:i:s') . "\n";
$db_time = $db->query("SELECT NOW()")->fetchColumn();
echo "DB_TIME: " . $db_time . "\n";
