<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT DISTINCT status FROM applications");
$statuses = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Current statuses in DB: " . implode(', ', array_map(function($s) { return $s === null ? 'NULL' : "'$s'"; }, $statuses)) . "\n";

$stmt = $db->query("SELECT COUNT(*) as count, status FROM applications GROUP BY status");
$counts = $stmt->fetchAll();
foreach ($counts as $row) {
    $s = $row['status'] === null ? 'NULL' : "'".$row['status']."'";
    echo "$s: " . $row['count'] . "\n";
}
