<?php
require_once __DIR__ . '/test_new_extractor.php';

$file = __DIR__ . '/../backend/uploads/cv/cv_71_1790837917_6abe049d2abf2.pdf';

$refPdf = new ReflectionMethod('TestPdfExtractor', 'extractFromPdf');
$refPdf->setAccessible(true);

// Get extractedLines before cleaning & isGarbledText check
$rawPdf = file_get_contents($file);

preg_match_all('/(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/i', $rawPdf, $objMatches, PREG_SET_ORDER);

$streamObjects = [];
$fontCMaps = [];
$fontEncodings = [];
$globalCMap = [];

$refDecomp = new ReflectionMethod('TestPdfExtractor', 'decompressStream');
$refDecomp->setAccessible(true);
$refParseCMap = new ReflectionMethod('TestPdfExtractor', 'parseToUnicodeCMap');
$refParseCMap->setAccessible(true);
$refBt = new ReflectionMethod('TestPdfExtractor', 'parseBtBlock');
$refBt->setAccessible(true);

foreach ($objMatches as $match) {
    $objId = (int)$match[1];
    $objContent = $match[3];

    if (preg_match('/stream[\r\n]+([\s\S]*?)endstream/i', $objContent, $sMatch)) {
        $rawStream = $sMatch[1];
        $decompressed = $refDecomp->invoke(null, $rawStream, $objContent);

        $isFontFile = (bool)preg_match('/\/FontFile[23]?\b/i', $objContent) || (bool)preg_match('/\/Subtype\s*\/Image\b/i', $objContent);
        $isCMap = strpos($decompressed, 'begincmap') !== false || strpos($decompressed, 'CIDInit') !== false;

        if ($isCMap) {
            $cMapData = $refParseCMap->invoke(null, $decompressed);
            $fontCMaps[$objId] = $cMapData;
            foreach ($cMapData['map'] as $k => $v) {
                $globalCMap[$k] = $v;
            }
        } else if (!$isFontFile) {
            $streamObjects[$objId] = [
                'header' => $objContent,
                'content' => $decompressed
            ];
        }
    }
}

$textStreams = [];
foreach ($streamObjects as $objId => $stream) {
    $c = $stream['content'];
    if (strpos($c, 'BT') !== false || strpos($c, 'Tj') !== false || strpos($c, 'TJ') !== false) {
        $textStreams[] = $c;
    }
}

$fullContent = implode("\n", $textStreams);

$extractedLines = [];
preg_match_all('/BT[\s\r\n][\s\S]*?[\s\r\n]ET/s', $fullContent, $btBlocks);
if (!empty($btBlocks[0])) {
    foreach ($btBlocks[0] as $block) {
        $linesInBlock = $refBt->invoke(null, $block, $fontCMaps, $globalCMap, $fontEncodings);
        foreach ($linesInBlock as $l) {
            $cleanedLine = trim($l);
            $isG = TestPdfExtractor::isGarbledText($cleanedLine);
            echo "Line: " . var_export($cleanedLine, true) . " -> isGarbled: " . var_export($isG, true) . "\n";
            if (strlen($cleanedLine) > 0 && !$isG) {
                $extractedLines[] = $cleanedLine;
            }
        }
    }
}

$text = TestPdfExtractor::cleanExtractedCvText(implode("\n", $extractedLines));
echo "Final text len: " . strlen($text) . "\n";
echo "Final text isGarbled: " . var_export(TestPdfExtractor::isGarbledText($text), true) . "\n";
