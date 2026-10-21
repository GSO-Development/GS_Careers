<?php
require_once __DIR__ . '/test_new_extractor.php';

$rawPdf = file_get_contents(__DIR__ . '/../backend/uploads/cv/cv_71_1790837917_6abe049d2abf2.pdf');

$refDecomp = new ReflectionMethod('TestPdfExtractor', 'decompressStream');
$refDecomp->setAccessible(true);

preg_match_all('/(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/i', $rawPdf, $objMatches, PREG_SET_ORDER);

foreach ($objMatches as $match) {
    $objId = (int)$match[1];
    $objContent = $match[3];
    if (preg_match('/stream[\r\n]+([\s\S]*?)endstream/i', $objContent, $sMatch)) {
        $rawStream = $sMatch[1];
        $dec = $refDecomp->invoke(null, $rawStream, $objContent);
        echo "Obj $objId decompressed len: " . strlen($dec) . ", BT found: " . var_export(strpos($dec, 'BT'), true) . "\n";
    }
}
