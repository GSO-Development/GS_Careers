<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=gs_jobs', 'root', '');
    $stmt = $pdo->query('DESCRIBE applications');
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo $e->getMessage();
}
