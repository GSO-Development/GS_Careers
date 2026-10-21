<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=gs_jobs', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "UPDATE applications a
            JOIN (
                SELECT email, MAX(block_reason) as reason
                FROM applications
                WHERE is_blocked = 1
                GROUP BY email
            ) b ON a.email = b.email
            SET a.is_blocked = 1, a.block_reason = b.reason
            WHERE a.is_blocked = 0";
    
    $affected = $pdo->exec($sql);
    echo "Synchronized $affected records.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
