<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("DESCRIBE applications");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
$output = "";
foreach ($cols as $col) {
    $output .= sprintf("%-20s | %-30s | %-10s | %s\n", $col['Field'], $col['Type'], $col['Default'], $col['Null']);
}
file_put_contents('schema_output.txt', $output);
echo "Output written to schema_output.txt\n";
