<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=gs_jobs', 'root', '');
    $stmt = $pdo->query('DESCRIBE vacancies');
    foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        echo $row['Field'] . PHP_EOL;
    }
} catch (Exception $e) {
    echo $e->getMessage();
}
