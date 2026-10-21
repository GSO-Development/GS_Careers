<?php
$rawPdf = file_get_contents(__DIR__ . '/../backend/uploads/cv/cv_57_1782189372_6a3a0d3c029f8.pdf');

// Decompress all streams first
preg_match_all('/stream[\r\n]+([\s\S]*?)endstream/i', $rawPdf, $sm);
foreach ($sm[1] as $idx => $s) {
    $u = @gzuncompress($s);
    if ($u === false) $u = @gzinflate($s);
    if ($u === false) $u = @gzinflate(substr($s, 2));

    $content = ($u !== false) ? $u : $s;

    if (preg_match_all('/(?:\b|\s)BT\s+([\s\S]*?)\s+ET(?:\b|\s)/s', $content, $btMatches)) {
        echo "Stream $idx has " . count($btMatches[0]) . " REAL BT...ET blocks!\n";
        foreach ($btMatches[0] as $bIdx => $block) {
            echo "--- Block $bIdx ---\n";
            echo substr($block, 0, 400) . "\n";
        }
    }
}
