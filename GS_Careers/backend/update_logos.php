<?php
require_once __DIR__ . '/config.php';
$db = getDB();

$mappings = [
    11 => 'gs_optimize.jpg',
    12 => 'gs_solutions.jpg',
    13 => 'heladiv.jpg',
    6 => 'gs_investments.jpg',
    5 => 'gs_aviation.jpg'
];

foreach ($mappings as $id => $logo) {
    $stmt = $db->prepare("UPDATE companies SET logo = ? WHERE id = ?");
    $stmt->execute([$logo, $id]);
    echo "Updated company ID $id with logo $logo\n";
}
?>
