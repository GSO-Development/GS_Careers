<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$file = __DIR__ . '/../backend/uploads/cv/cv_71_1790837917_6abe049d2abf2.pdf';

if (!file_exists($file)) {
    echo "File cv_71 does not exist!\n";
    exit;
}

$text = PdfExtractor::extractTextFromFile($file);

echo "=== EXTRACTED TEXT FROM CV_71 ===\n";
echo $text . "\n\n";

echo "=== QUALIFICATIONS FOUND (BEFORE FIX) ===\n";
print_r(PdfExtractor::extractQualificationsFromCVText($text));

echo "\n=== CERTIFICATIONS FOUND (BEFORE FIX) ===\n";
print_r(PdfExtractor::extractCertificationsFromCVText($text));

echo "\n=== FALLBACK STRUCTURED DATA ===\n";
print_r(PdfExtractor::extractStructuredData($text, 'Junior Network Administrator', 'ollama'));
