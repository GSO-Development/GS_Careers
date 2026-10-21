<?php
$rawPdf = file_get_contents(__DIR__ . '/../backend/uploads/cv/cv_71_1790837917_6abe049d2abf2.pdf');

preg_match_all('/(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/i', $rawPdf, $objMatches, PREG_SET_ORDER);

foreach ($objMatches as $match) {
    $objId = (int)$match[1];
    $objContent = $match[3];
    if (preg_match('/stream[\r\n]+([\s\S]*?)endstream/i', $objContent, $sMatch)) {
        $isFontFile = (bool)preg_match('/\/FontFile[23]?\b/i', $objContent) || (bool)preg_match('/\/Subtype\s*\/Image\b/i', $objContent);
        echo "Obj $objId isFontFile: " . var_export($isFontFile, true) . "\n";
    }
}
