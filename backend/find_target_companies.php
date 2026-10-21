<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$names = ['George Steuart Optimize', 'George Steuart Solutions', 'Heladiv', 'George Steuart Investments', 'George Steuart Aviation', 'GS Optimize'];
foreach($names as $n) {
    $stmt = $db->prepare("SELECT id, name FROM companies WHERE name LIKE ?");
    $stmt->execute(["%$n%"]);
    while($r = $stmt->fetch()) {
        echo $r['id'] . ":" . $r['name'] . "\n";
    }
}
