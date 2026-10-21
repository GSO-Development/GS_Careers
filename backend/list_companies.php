<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$q = $db->query("SELECT id, name, logo FROM companies");
$results = $q->fetchAll();
header('Content-Type: application/json');
echo json_encode($results, JSON_PRETTY_PRINT);
