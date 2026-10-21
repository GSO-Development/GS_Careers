<?php
try {
    echo "Connecting to 127.0.0.1...\n";
    $pdo = new PDO("mysql:host=127.0.0.1", "root", "", [
        PDO::ATTR_TIMEOUT => 2, // 2 seconds timeout
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    echo "Connected successfully to host 127.0.0.1\n";
    
    // Check if gs_jobs exists
    $stmt = $pdo->query("SHOW DATABASES LIKE 'gs_jobs'");
    $dbExists = $stmt->fetch();
    if ($dbExists) {
        echo "Database gs_jobs exists\n";
        $pdo->query("USE gs_jobs");
        $stmt = $pdo->query("SELECT COUNT(*) FROM admins");
        echo "Admin count: " . $stmt->fetchColumn() . "\n";
        
        $stmt = $pdo->query("SELECT id, username, email, password FROM admins");
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        echo "Database gs_jobs does NOT exist\n";
    }
} catch (Exception $e) {
    echo "Connection error: " . $e->getMessage() . "\n";
}
