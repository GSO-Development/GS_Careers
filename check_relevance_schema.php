<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    echo "--- VACANCIES COLUMNS ---\n";
    $cols = $db->query("DESCRIBE vacancies")->fetchAll(PDO::FETCH_ASSOC);
    foreach($cols as $c) echo "V: " . $c['Field'] . " -> " . $c['Type'] . "\n";

    echo "\n--- APPLICATIONS COLUMNS ---\n";
    $cols2 = $db->query("DESCRIBE applications")->fetchAll(PDO::FETCH_ASSOC);
    foreach($cols2 as $c) echo "A: " . $c['Field'] . " -> " . $c['Type'] . "\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
