<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$uploadDir = __DIR__ . '/../backend/uploads/cv/';
$files = glob($uploadDir . '*.pdf');
$foundFile = null;
$foundText = null;

foreach ($files as $f) {
    $text = PdfExtractor::extractTextFromFile($f);
    if (stripos($text, 'Nethmini') !== false) {
        $foundFile = $f;
        $foundText = $text;
        break;
    }
}

if (!$foundFile) {
    echo "Nethmini CV PDF not found in uploads directory.\n";
    // Check if there are other PDFs in uploads
    echo "Found " . count($files) . " PDFs total in uploads/cv/\n";
    exit;
}

echo "Found file: " . basename($foundFile) . "\n\n";
echo "=== EXTRACTED TEXT FROM PDF ===\n";
echo $foundText . "\n\n";

echo "=== EXTRACTED QUALIFICATIONS (BEFORE REGEX FIX) ===\n";
print_r(PdfExtractor::extractQualificationsFromCVText($foundText));

echo "=== EXTRACTED CERTIFICATIONS (BEFORE REGEX FIX) ===\n";
print_r(PdfExtractor::extractCertificationsFromCVText($foundText));
