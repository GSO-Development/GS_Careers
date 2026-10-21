<?php
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$file = __DIR__ . '/../backend/uploads/cv/cv_85_1791458943_6ac77e7f6335b.pdf';
$text = PdfExtractor::extractTextFromFile($file);

echo "=== EXTRACTED TEXT FROM SHAYANI'S CV ===\n";
echo $text . "\n\n";

echo "=== QUALIFICATIONS EXTRACTED ===\n";
print_r(PdfExtractor::extractQualificationsFromCVText($text));

echo "\n=== CERTIFICATIONS EXTRACTED ===\n";
print_r(PdfExtractor::extractCertificationsFromCVText($text));
