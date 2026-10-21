<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SHOW CREATE TABLE password_resets");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo "SCHEMA_START\n";
print_r($row);
echo "SCHEMA_END\n";
