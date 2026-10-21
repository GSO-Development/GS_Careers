<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$file = __DIR__ . '/../backend/uploads/cv/cv_85_1791458943_6ac77e7f6335b.pdf';
$text = PdfExtractor::extractTextFromFile($file);

echo "=== EXTRACTED TEXT OF APPLICATION 104 (cv_85_1791458943_6ac77e7f6335b.pdf) ===\n";
echo $text . "\n";
