<?php
$pdo = new PDO('mysql:host=localhost;dbname=gs_jobs', 'root', '');
foreach($pdo->query('DESCRIBE applications')->fetchAll(PDO::FETCH_ASSOC) as $col) {
    echo $col['Field'] . " (" . $col['Type'] . ")\n";
}
