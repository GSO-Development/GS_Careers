<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$file = __DIR__ . '/../backend/uploads/cv/cv_85_1791458943_6ac77e7f6335b.pdf';
$text = PdfExtractor::extractTextFromFile($file);

echo "=== SHAYANI CV FULL TEXT ===\n";
$lines = explode("\n", $text);
foreach ($lines as $idx => $line) {
    echo sprintf("[%03d] %s\n", $idx + 1, $line);
}
