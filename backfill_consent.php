<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    $affected = $db->exec("UPDATE applications SET future_consent = 1 WHERE future_consent = 0 OR future_consent IS NULL");
    echo "SUCCESS: $affected applications added to Talent Pool.\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}

