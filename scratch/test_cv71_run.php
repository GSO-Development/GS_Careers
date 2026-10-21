<?php
require_once __DIR__ . '/test_new_extractor.php';

$file = __DIR__ . '/../backend/uploads/cv/cv_71_1790837917_6abe049d2abf2.pdf';
$txt = TestPdfExtractor::extractTextFromFile($file);

echo "Length: " . strlen($txt) . "\n";
echo "Text:\n";
echo $txt . "\n";
