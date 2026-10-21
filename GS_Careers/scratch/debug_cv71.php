<?php
require_once __DIR__ . '/test_new_extractor.php';

$rawPdf = file_get_contents(__DIR__ . '/../backend/uploads/cv/cv_71_1790837917_6abe049d2abf2.pdf');
preg_match_all('/stream[\r\n]+([\s\S]*?)endstream/i', $rawPdf, $sm);

$raw0 = $sm[1][0];

$ref = new ReflectionMethod('TestPdfExtractor', 'decodeASCII85');
$ref->setAccessible(true);
$a85 = $ref->invoke(null, $raw0);

$decomp = @gzinflate(substr($a85, 2));
echo "Decompressed length: " . strlen($decomp) . "\n";
echo "Decompressed snippet:\n" . substr($decomp, 0, 1000) . "\n";
