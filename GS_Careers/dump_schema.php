<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/backend/api/../config.php';

$db = getDB();
echo "VACANCIES:\n";
$stmt = $db->query("DESCRIBE vacancies");
while($row = $stmt->fetch()) {
    echo $row['Field'] . " (" . $row['Type'] . ")\n";
}

echo "\nAPPLICATIONS:\n";
$stmt = $db->query("DESCRIBE applications");
while($row = $stmt->fetch()) {
    echo $row['Field'] . " (" . $row['Type'] . ")\n";
}
