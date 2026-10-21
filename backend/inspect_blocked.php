<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=gs_jobs', 'root', '');
    $stmt = $pdo->query('SELECT email, future_consent, applied_at, is_blocked FROM applications WHERE is_blocked = 1');
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo $e->getMessage();
}
