<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$files = glob(__DIR__ . '/../backend/uploads/cv/*.pdf');
echo "Verifying " . count($files) . " PDFs using updated backend/libs/PdfExtractor.php...\n\n";

$success = 0;
$failed = 0;
$totalQ = 0;

foreach ($files as $f) {
    $txt = PdfExtractor::extractTextFromFile($f);
    $len = is_string($txt) ? strlen(trim($txt)) : 0;
    $q = is_string($txt) ? substr_count($txt, '?') : 0;
    $totalQ += $q;
    $name = basename($f);

    if ($len < 30 || $txt === "Candidate resume text extracted from document.") {
        $failed++;
        echo "FAILED ($len chars, $q Qs): $name\n";
    } else {
        $success++;
        $sample = substr(preg_replace('/\s+/', ' ', $txt), 0, 100);
        if ($q > 0) {
            echo "SUCCESS with $q Qs ($len chars): $name -> $sample...\n";
        }
    }
}

echo "\nVerification Summary: Total = " . count($files) . " | Success = $success | Failed = $failed | Total ? Marks = $totalQ\n";
