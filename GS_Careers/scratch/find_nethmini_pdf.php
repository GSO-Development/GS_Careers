<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$files = glob(__DIR__ . '/../backend/uploads/cv/*.pdf');
echo "Searching " . count($files) . " PDFs for Nethmini Rajamanthri...\n";

foreach ($files as $f) {
    $txt = PdfExtractor::extractTextFromFile($f);
    if (strpos($txt, 'Rajamanthri') !== false || strpos($txt, 'Nethmini') !== false || strpos($txt, 'Horizon Campus') !== false || strpos($txt, '0718787015') !== false || strpos($txt, 'Abans Group') !== false) {
        echo "MATCH FOUND in: " . basename($f) . "\n";
        echo "Extracted Text:\n" . substr($txt, 0, 1000) . "\n\n";
    }
}
