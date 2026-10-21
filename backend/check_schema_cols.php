<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("DESCRIBE applications");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $col) {
    printf("%-20s | %-30s | %-10s | %s\n", $col['Field'], $col['Type'], $col['Default'], $col['Null']);
}
