<?php
// Disable output of headers from config
ob_start();
require_once __DIR__ . '/backend/config.php';
ob_clean();

try {
    $db = getDB();
    $stmt = $db->query("DESCRIBE applications");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "COLUMNS:\n";
    foreach ($columns as $col) {
        echo $col['Field'] . " (" . $col['Type'] . ")\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
