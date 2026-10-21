<?php
require_once __DIR__ . '/backend/config.php';
$db = getDB();
$stmt = $db->query("DESCRIBE applications");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($columns, JSON_PRETTY_PRINT);
?>
