<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    $counts = $db->query("SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN future_consent = 1 THEN 1 END) as consented,
        COUNT(CASE WHEN future_consent = 0 THEN 1 END) as not_consented,
        COUNT(CASE WHEN future_consent IS NULL THEN 1 END) as null_consent
    FROM applications")->fetch(PDO::FETCH_ASSOC);

    echo json_encode($counts, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
