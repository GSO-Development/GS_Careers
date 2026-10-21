<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$uploadDir = __DIR__ . '/../backend/uploads/cv/';
$files = glob($uploadDir . '*.pdf');

echo "Testing extraction on " . count($files) . " CV PDFs...\n\n";

$stats = [
    'total' => count($files),
    'qualifications_found' => 0,
    'certifications_found' => 0,
];

foreach ($files as $i => $f) {
    $text = PdfExtractor::extractTextFromFile($f);
    if (!$text) continue;

    $quals = PdfExtractor::extractQualificationsFromCVText($text);
    $certs = PdfExtractor::extractCertificationsFromCVText($text);

    if (!empty($quals)) $stats['qualifications_found']++;
    if (!empty($certs)) $stats['certifications_found']++;

    if ($i < 10 || stripos($text, 'Nethmini') !== false) {
        echo "[" . ($i + 1) . "] File: " . basename($f) . "\n";
        echo "   Quals: " . json_encode($quals, JSON_UNESCAPED_SLASHES) . "\n";
        echo "   Certs: " . json_encode($certs, JSON_UNESCAPED_SLASHES) . "\n\n";
    }
}

echo "Summary:\n";
print_r($stats);
