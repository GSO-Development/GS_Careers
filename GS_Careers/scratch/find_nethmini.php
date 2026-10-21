<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$uploadDir = __DIR__ . '/../backend/uploads/cv/';
$files = glob($uploadDir . '*.pdf');

echo "Scanning " . count($files) . " files...\n";

foreach ($files as $f) {
    $text = PdfExtractor::extractTextFromFile($f);
    if ($text && (stripos($text, 'Nethmini') !== false || stripos($text, 'Rajamanthri') !== false || stripos($text, 'Horizon Campus') !== false || stripos($text, '0718787015') !== false)) {
        echo "MATCHED FILE: " . basename($f) . "\n";
        echo "=== EXTRACTED TEXT ===\n";
        echo $text . "\n";
        echo "======================\n";
    }
}
