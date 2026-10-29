<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

$rows = $db->query("SELECT * FROM notification_reads WHERE admin_id = 994 ORDER BY read_at DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
echo "notification_reads for admin 994 (HR):\n";
print_r($rows);
