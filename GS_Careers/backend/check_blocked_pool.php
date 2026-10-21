<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=gs_jobs', 'root', '');
    $sql = "SELECT COUNT(*) as count 
            FROM applications a
            JOIN (
                SELECT email, MAX(applied_at) as max_date
                FROM applications
                WHERE future_consent = 1
                GROUP BY email
            ) latest ON a.email = latest.email AND a.applied_at = latest.max_date
            WHERE a.future_consent = 1
              AND a.applied_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
              AND a.is_blocked = 1";
    $stmt = $pdo->query($sql);
    print_r($stmt->fetch(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo $e->getMessage();
}
