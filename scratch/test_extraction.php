<?php
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$files = glob(__DIR__ . '/../backend/uploads/cv/*.pdf');
echo "Checking " . count($files) . " PDFs for issues...\n\n";

foreach ($files as $f) {
    $txt = PdfExtractor::extractTextFromFile($f);
    $len = is_string($txt) ? strlen(trim($txt)) : 0;
    $basename = basename($f);
    $size = filesize($f);

    $hasQMark = strpos($txt, '?') !== false;
    $isFailed = !$txt || $txt === 'Candidate resume text extracted from document.' || $len < 30;

    if ($isFailed || $hasQMark) {
        $qCount = substr_count($txt, '?');
        echo "ISSUE in {$basename} (Size: {$size}b, Len: {$len}, QMarks: {$qCount}):\n";
        echo "   Snippet: " . substr(preg_replace('/\s+/', ' ', $txt), 0, 200) . "\n\n";
    }
}
