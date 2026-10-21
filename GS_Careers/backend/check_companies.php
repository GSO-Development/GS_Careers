<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$q = $db->query("SELECT id, name FROM companies");
while($r = $q->fetch()) {
    echo $r['id'] . "| " . $r['name'] . "\n";
}
