<?php
// Experimental New Extractor Test Script - Revision 7

class TestPdfExtractor {
    private static $winAnsiMap = [
        128 => '€', 130 => '‚', 131 => 'ƒ', 132 => '„', 133 => '…', 134 => '†', 135 => '‡',
        136 => 'ˆ', 137 => '‰', 138 => 'Š', 139 => '‹', 140 => 'Œ', 142 => 'Ž', 145 => '‘',
        146 => '’', 147 => '“', 148 => '”', 149 => '•', 150 => '–', 151 => '—', 152 => '˜',
        153 => '™', 154 => 'š', 155 => '›', 156 => 'œ', 158 => 'ž', 159 => 'Ÿ', 160 => ' ',
        161 => '¡', 162 => '¢', 163 => '£', 164 => '¤', 165 => '¥', 166 => '¦', 167 => '§',
        168 => '¨', 169 => '©', 170 => 'ª', 171 => '«', 172 => '¬', 173 => 'x', 174 => '®',
        175 => '¯', 176 => '°', 177 => '±', 178 => '²', 179 => '³', 180 => '´', 181 => 'µ',
        182 => '¶', 183 => '·', 184 => '¸', 185 => '¹', 186 => 'º', 187 => '»', 188 => '¼',
        189 => '½', 190 => '¾', 191 => '¿'
    ];

    private static $psGlyphMap = [
        'space' => ' ', 'exclam' => '!', 'quotedbl' => '"', 'numbersign' => '#',
        'dollar' => '$', 'percent' => '%', 'ampersand' => '&', 'quotesingle' => "'",
        'parenleft' => '(', 'parenright' => ')', 'asterisk' => '*', 'plus' => '+',
        'comma' => ',', 'hyphen' => '-', 'period' => '.', 'slash' => '/',
        'zero' => '0', 'one' => '1', 'two' => '2', 'three' => '3', 'four' => '4',
        'five' => '5', 'six' => '6', 'seven' => '7', 'eight' => '8', 'nine' => '9',
        'colon' => ':', 'semicolon' => ';', 'less' => '<', 'equal' => '=',
        'greater' => '>', 'question' => '?', 'at' => '@',
        'bullet' => '•', 'endash' => '–', 'emdash' => '—',
        'quotedblleft' => '“', 'quotedblright' => '”', 'quoteleft' => '‘', 'quoteright' => '’',
        'fi' => 'fi', 'fl' => 'fl', 'ffi' => 'ffi', 'ffl' => 'ffl', 'ff' => 'ff',
        'oe' => 'oe', 'OE' => 'OE', 'ae' => 'ae', 'AE' => 'AE'
    ];

    public static function extractTextFromFile($filePath) {
        if (!file_exists($filePath)) return false;
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if ($ext === 'pdf') {
            return self::extractFromPdf($filePath);
        }
        return false;
    }

    private static function extractFromPdf($pdfPath) {
        $rawPdf = @file_get_contents($pdfPath);
        if (!$rawPdf) return false;

        preg_match_all('/(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/i', $rawPdf, $objMatches, PREG_SET_ORDER);

        $streamObjects = [];
        $fontCMaps = [];
        $fontEncodings = [];
        $globalCMap = [];

        foreach ($objMatches as $match) {
            $objId = (int)$match[1];
            $objContent = $match[3];

            if (preg_match('/stream[\r\n]+([\s\S]*?)endstream/i', $objContent, $sMatch)) {
                $rawStream = $sMatch[1];
                $decompressed = self::decompressStream($rawStream, $objContent);

                $isFontFile = (bool)preg_match('/\/FontFile[23]?\b/i', $objContent) || (bool)preg_match('/\/Subtype\s*\/Image\b/i', $objContent);
                $isCMap = strpos($decompressed, 'begincmap') !== false || strpos($decompressed, 'CIDInit') !== false;

                if ($isCMap) {
                    $cMapData = self::parseToUnicodeCMap($decompressed);
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
            } else {
                if (preg_match('/\/Differences\s*\[\s*(.*?)\s*\]/s', $objContent, $diffMatch)) {
                    $fontEncodings[$objId] = self::parseDifferencesArray($diffMatch[1]);
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
        if (empty(trim($fullContent))) {
            $fullContent = $rawPdf;
        }

        $extractedLines = [];

        preg_match_all('/BT[\s\r\n][\s\S]*?[\s\r\n]ET/s', $fullContent, $btBlocks);
        if (!empty($btBlocks[0])) {
            foreach ($btBlocks[0] as $block) {
                $linesInBlock = self::parseBtBlock($block, $fontCMaps, $globalCMap, $fontEncodings);
                foreach ($linesInBlock as $l) {
                    $cleanedLine = trim($l);
                    if (strlen($cleanedLine) > 0 && !self::isGarbledText($cleanedLine)) {
                        $extractedLines[] = $cleanedLine;
                    }
                }
            }
        }

        $text = self::cleanExtractedCvText(implode("\n", $extractedLines));

        if (trim($text) !== '' && strlen($text) >= 15 && !self::isGarbledText($text)) {
            return trim($text);
        }

        $cleanLines = [];
        foreach ($streamObjects as $stream) {
            $c = $stream['content'];
            preg_match_all('/[\x20-\x7E\s]{6,}/', $c, $rawMatches);
            if (!empty($rawMatches[0])) {
                foreach ($rawMatches[0] as $line) {
                    $l = trim($line);
                    if (strlen($l) > 4 && !self::isGarbledText($l) && 
                        strpos($l, 'obj') === false && strpos($l, 'endobj') === false && 
                        strpos($l, 'stream') === false && strpos($l, '%%EOF') === false) {
                        $cleanLines[] = $l;
                    }
                }
            }
        }

        if (!empty($cleanLines)) {
            $fallbackText = self::cleanExtractedCvText(implode("\n", array_unique($cleanLines)));
            if (trim($fallbackText) !== '' && strlen($fallbackText) >= 15 && !self::isGarbledText($fallbackText)) {
                return trim($fallbackText);
            }
        }

        return "Candidate resume text extracted from document.";
    }

    private static function decompressStream($rawStream, $header) {
        $str = $rawStream;

        if (strpos($rawStream, '~>') !== false || preg_match('/ASCII85Decode/i', $header)) {
            $asciiDec = self::decodeASCII85($rawStream);
            if (!empty($asciiDec)) $str = $asciiDec;
        }

        $uncomp = @gzuncompress($str);
        if ($uncomp === false) $uncomp = @gzinflate($str);
        if ($uncomp === false) $uncomp = @gzinflate(substr($str, 2));

        return ($uncomp !== false) ? $uncomp : $str;
    }

    private static function parseBtBlock($block, $fontCMaps, $globalCMap, $fontEncodings) {
        $lines = [];
        $currentLine = "";
        $currentCMap = $globalCMap;
        $currentCodeSize = $globalCMap['code_size'] ?? 0;
        $currentFontSize = 12.0;

        preg_match_all('/\/F([0-9]+)\s+([\d\.]+)\s+Tf|(\(.*?\)|<[0-9a-fA-F]+>)\s*Tj|\[(.*?)\]\s*TJ|(-?[\d\.]+)\s+(-?[\d\.]+)\s+T[dD]|T\*|\'|\"/s', $block, $tokens, PREG_SET_ORDER);

        foreach ($tokens as $tok) {
            if (!empty($tok[1])) {
                $fNum = (int)$tok[1];
                if (isset($tok[2])) {
                    $currentFontSize = (float)$tok[2];
                }
                if (isset($fontCMaps[$fNum])) {
                    $currentCMap = $fontCMaps[$fNum]['map'];
                    $currentCodeSize = $fontCMaps[$fNum]['code_size'];
                } else if (isset($fontCMaps[$fNum * 2])) {
                    $currentCMap = $fontCMaps[$fNum * 2]['map'];
                    $currentCodeSize = $fontCMaps[$fNum * 2]['code_size'];
                } else {
                    $currentCMap = $globalCMap;
                    $currentCodeSize = $globalCMap['code_size'] ?? 0;
                }
            } else if (!empty($tok[3])) {
                $currentLine .= self::decodePdfToken($tok[3], $currentCMap, $globalCMap, $currentCodeSize);
            } else if (!empty($tok[4])) {
                $currentLine .= self::decodeTjArray($tok[4], $currentCMap, $globalCMap, $currentCodeSize);
            } else if (isset($tok[5]) && isset($tok[6]) && $tok[5] !== '' && $tok[6] !== '') {
                $dy = (float)$tok[6];
                if (abs($dy) > 0.01) {
                    if (trim($currentLine) !== '') {
                        $lines[] = $currentLine;
                        $currentLine = "";
                    }
                } else {
                    $dx = (float)$tok[5];
                    $minSpaceMove = max(20.0, $currentFontSize * 1.8);
                    if ($dx > $minSpaceMove && strlen($currentLine) > 0 && substr($currentLine, -1) !== ' ') {
                        $currentLine .= "   ";
                    }
                }
            } else {
                if (trim($currentLine) !== '') {
                    $lines[] = $currentLine;
                    $currentLine = "";
                }
            }
        }

        if (trim($currentLine) !== '') {
            $lines[] = $currentLine;
        }

        return $lines;
    }

    private static function decodeTjArray($tjContent, $fontCMap, $globalCMap, $codeSize) {
        preg_match_all('/(\(.*?\)|<[0-9a-fA-F]+>)|(-?[\d\.]+)/s', $tjContent, $matches, PREG_SET_ORDER);
        $res = "";

        foreach ($matches as $m) {
            if (!empty($m[1])) {
                $decoded = self::decodePdfToken($m[1], $fontCMap, $globalCMap, $codeSize);
                $res .= $decoded;
            } else if (isset($m[2]) && $m[2] !== '') {
                $val = (float)$m[2];
                if ($val <= -220 && strlen($res) > 0 && substr($res, -1) !== ' ') {
                    $res .= "   ";
                }
            }
        }

        return $res;
    }

    private static function decodePdfToken($token, $fontCMap, $globalCMap, $codeSize = 0) {
        if (strpos($token, '<') === 0 && substr($token, -1) === '>') {
            $hex = substr($token, 1, -1);
            $len = strlen($hex);
            $res = "";

            $step = ($codeSize === 2) ? 4 : 2;

            for ($i = 0; $i < $len; ) {
                $found = false;

                if ($step === 4 && $i + 4 <= $len) {
                    $hex4 = substr($hex, $i, 4);
                    $val4 = hexdec($hex4);
                    if (isset($fontCMap[$val4])) {
                        $res .= $fontCMap[$val4];
                        $i += 4;
                        $found = true;
                    } else if (isset($globalCMap[$val4])) {
                        $res .= $globalCMap[$val4];
                        $i += 4;
                        $found = true;
                    }
                }

                if (!$found && $i + 2 <= $len) {
                    $hex2 = substr($hex, $i, 2);
                    $val2 = hexdec($hex2);
                    if (isset($fontCMap[$val2])) {
                        $res .= $fontCMap[$val2];
                        $i += 2;
                        $found = true;
                    } else if (isset($globalCMap[$val2])) {
                        $res .= $globalCMap[$val2];
                        $i += 2;
                        $found = true;
                    } else if ($step === 2 || $i + 4 > $len) {
                        if (isset(self::$winAnsiMap[$val2])) {
                            $res .= self::$winAnsiMap[$val2];
                        } else if ($val2 >= 32 && $val2 <= 126) {
                            $res .= chr($val2);
                        }
                        $i += 2;
                        $found = true;
                    }
                }

                if (!$found) {
                    $i += 2;
                }
            }
            return $res;
        } else {
            $rawStr = trim($token, '()');
            $rawStr = str_replace(['\(', '\)', '\n', '\r', '\t'], ['(', ')', "\n", "\r", "\t"], $rawStr);
            $out = "";
            $len = strlen($rawStr);
            for ($i = 0; $i < $len; $i++) {
                $val = ord($rawStr[$i]);
                if (isset($fontCMap[$val])) {
                    $out .= $fontCMap[$val];
                } else if (isset($globalCMap[$val])) {
                    $out .= $globalCMap[$val];
                } else if (isset(self::$winAnsiMap[$val])) {
                    $out .= self::$winAnsiMap[$val];
                } else {
                    $out .= $rawStr[$i];
                }
            }
            return $out;
        }
    }

    private static function parseToUnicodeCMap($streamContent) {
        $map = [];
        $codeSize = 1;

        if (preg_match('/begincodespacerange[\s\S]*?<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>[\s\S]*?endcodespacerange/i', $streamContent, $csMatch)) {
            if (strlen($csMatch[1]) >= 4) {
                $codeSize = 2;
            }
        }

        if (preg_match_all('/beginbfchar([\s\S]*?)endbfchar/i', $streamContent, $bfCharBlocks)) {
            foreach ($bfCharBlocks[1] as $block) {
                preg_match_all('/<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[(.*?)\])/s', $block, $pairs, PREG_SET_ORDER);
                foreach ($pairs as $p) {
                    $src = hexdec($p[1]);
                    if (strlen($p[1]) >= 4) $codeSize = 2;

                    if (!empty($p[2])) {
                        $dstHex = $p[2];
                        $mappedChar = self::decodeHexToUtf8($dstHex);
                        if ($mappedChar !== '') {
                            $map[$src] = $mappedChar;
                        }
                    } else if (!empty($p[3])) {
                        preg_match_all('/<([0-9a-fA-F]+)>/', $p[3], $arrHexes);
                        if (!empty($arrHexes[1])) {
                            $arrChars = "";
                            foreach ($arrHexes[1] as $h) {
                                $arrChars .= self::decodeHexToUtf8($h);
                            }
                            $map[$src] = $arrChars;
                        }
                    }
                }
            }
        }

        if (preg_match_all('/beginbfrange([\s\S]*?)endbfrange/i', $streamContent, $bfrangeBlocks)) {
            foreach ($bfrangeBlocks[1] as $block) {
                $lines = explode("\n", $block);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line)) continue;

                    if (preg_match('/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/', $line, $r)) {
                        $start = hexdec($r[1]);
                        $end = hexdec($r[2]);
                        $dstStart = hexdec($r[3]);
                        if (strlen($r[1]) >= 4) $codeSize = 2;

                        for ($c = $start; $c <= $end; $c++) {
                            $offset = $c - $start;
                            $curDstVal = $dstStart + $offset;
                            $curDstHex = sprintf('%04X', $curDstVal);
                            $mappedChar = self::decodeHexToUtf8($curDstHex);
                            if ($mappedChar !== '') {
                                $map[$c] = $mappedChar;
                            }
                        }
                    } else if (preg_match('/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[(.*?)\]/', $line, $r)) {
                        $start = hexdec($r[1]);
                        $end = hexdec($r[2]);
                        if (strlen($r[1]) >= 4) $codeSize = 2;

                        preg_match_all('/<([0-9a-fA-F]+)>/', $r[3], $arrHexes);
                        if (!empty($arrHexes[1])) {
                            $idxArr = 0;
                            for ($c = $start; $c <= $end; $c++) {
                                if (isset($arrHexes[1][$idxArr])) {
                                    $mappedChar = self::decodeHexToUtf8($arrHexes[1][$idxArr]);
                                    if ($mappedChar !== '') {
                                        $map[$c] = $mappedChar;
                                    }
                                }
                                $idxArr++;
                            }
                        }
                    }
                }
            }
        }

        return ['map' => $map, 'code_size' => $codeSize];
    }

    private static function decodeHexToUtf8($dstHex) {
        $hex = (strlen($dstHex) % 2 !== 0) ? '0' . $dstHex : $dstHex;
        if (strlen($hex) >= 4) {
            $bin = @hex2bin($hex);
            if ($bin !== false) {
                $utf8 = @mb_convert_encoding($bin, 'UTF-8', 'UTF-16BE');
                if ($utf8 !== false && $utf8 !== '') {
                    return $utf8;
                }
            }
        }
        $val = hexdec($dstHex);
        return mb_chr($val, 'UTF-8');
    }

    private static function parseDifferencesArray($diffStr) {
        $diffMap = [];
        preg_match_all('/\/([A-Za-z0-9_\.]+)|(\d+)/', $diffStr, $m, PREG_SET_ORDER);
        $curCode = 0;
        foreach ($m as $item) {
            if (!empty($item[2])) {
                $curCode = (int)$item[2];
            } else if (!empty($item[1])) {
                $glyphName = $item[1];
                if (isset(self::$psGlyphMap[$glyphName])) {
                    $diffMap[$curCode] = self::$psGlyphMap[$glyphName];
                }
                $curCode++;
            }
        }
        return $diffMap;
    }

    public static function cleanExtractedCvText($text) {
        if (empty($text) || !is_string($text)) return '';

        $lines = preg_split('/\r\n|\r|\n/', $text);
        $validLines = [];

        foreach ($lines as $line) {
            $l = trim($line);
            if (empty($l)) continue;

            // De-space single letter word blocks
            if (strpos($l, '   ') !== false || preg_match('/(?:[a-zA-Z0-9()\/\.,\-+@][ \t]{1,2}){3,}/', $l)) {
                $step1 = preg_replace('/[ \t]{3,}/', ' | ', $l);
                $step2 = preg_replace('/(?<=[a-zA-Z0-9()\/\.,\-+@])[ \t]{1,2}(?=[a-zA-Z0-9()\/\.,\-+@])/', '', $step1);
                $l = trim(str_replace(' | ', ' ', $step2));
            }

            if (self::isGarbledText($l)) continue;
            if (preg_match('/^[a-f0-9\s]{16,}$/i', $l)) continue;

            $validLines[] = $l;
        }

        $cleaned = implode("\n", array_unique($validLines));
        $cleaned = preg_replace('/[ \t]{2,}/', ' ', $cleaned);
        $cleaned = preg_replace('/\n{3,}/', "\n\n", $cleaned);

        return trim($cleaned);
    }

    public static function isGarbledText($text) {
        if (empty(trim($text))) return true;
        $t = trim($text);

        // Case-sensitive exact PDF structural keywords
        if (preg_match('/(xmpmeta|xmlns:|xmp:|pdf:Producer|xmpMM:|W5M0MpCehiHzreSzNTczkc9d|\/Artifact|\/Standard|\bBMC\b|\bEMC\b|\bBDC\b|\bBT\b|\bET\b|\bobj\b|\bendobj\b|\bstream\b|\bendstream\b|\bxref\b|\btrailer\b|CIDInit|ProcSet|findresource|begincmap|endcmap|beginbfchar|endbfchar|beginbfrange|endbfrange|begincodespacerange|endcodespacerange|defineresource|CMapName|currentdict)/', $t)) {
            return true;
        }

        // Font licensing disclaimers embedded in font streams
        if (preg_match('/(Monotype|VeriSign|Type Solutions|OpenType Layout|Hebrew OpenType|kern" table|font was developed|permission is hereby granted|trademark of The Monotype|Microsoft supplied font|fontTools|ufo2ft|glyphsLib|msfontlib|Digital ID Class|Layout Logic|Layout Logic Software|modified using iText|xpacket begin)/i', $t)) {
            return true;
        }

        // Raw charset tables
        if (preg_match('/(CDEFGHIJSTUVWXYZcdefghijstuvwxyz|abcdefghijklmnopqrstuvwxyz|ZYXWVUTSRQPONMLKJIHGFEDCBA|9876543210|\@;\<;:98743210|tsrqponmlkjihgfeb)/', $t)) {
            return true;
        }

        // PDF vector drawing commands (case-sensitive to avoid matching words like Ltd)
        if (preg_match('/(\/Image\d+|\bDo\s+Q\b|\bre\s+W\*\s+n\b|\bcm\b|^[\d\.\s\-\/\,]+(rg|RG|g|G|re|W\*|n|cm|Td|Tf|Td\/F\d+))/', $t)) {
            return true;
        }

        if (preg_match('/(.)\1{6,}/', $t) || preg_match('/(\+){4,}/', $t)) {
            return true;
        }

        // Reject lines with high proportion of non-alphanumeric code symbols
        $len = strlen($t);
        if ($len >= 10) {
            $symbolCount = preg_match_all('/[\[\]\{\}\^\/\\_>~`|<#@$%\*+=\-\!\;\:\'\"]/u', $t); // Note: comma and period removed from garbled symbol set
            $letterCount = preg_match_all('/[a-zA-Z0-9]/u', $t);
            if ($letterCount == 0 || ($symbolCount / $len) > 0.45) {
                return true;
            }
        }

        $qCount = substr_count($t, '?');
        if ($qCount >= 4 && ($qCount / max(1, $len)) > 0.25) {
            return true;
        }

        return false;
    }

    private static function decodeASCII85($in) {
        $in = preg_replace('/~>.*$/s', '', trim($in));
        $in = preg_replace('/\s+/', '', $in);
        $out = '';
        $len = strlen($in);
        $state = 0;
        $chn = 0;

        for ($i = 0; $i < $len; $i++) {
            $c = ord($in[$i]);
            if ($c === 122 && $state === 0) {
                $out .= "\x00\x00\x00\x00";
                continue;
            }
            if ($c < 33 || $c > 117) continue;
            $chn = $chn * 85 + ($c - 33);
            $state++;
            if ($state === 5) {
                $out .= pack('N', $chn);
                $chn = 0;
                $state = 0;
            }
        }
        if ($state > 1) {
            $pow = [85*85*85*85, 85*85*85, 85*85, 85, 1];
            for ($i = $state; $i < 5; $i++) {
                $chn += 84 * $pow[$i];
            }
            $packed = pack('N', $chn);
            $out .= substr($packed, 0, $state - 1);
        }
        return $out;
    }
}

// Run test on ALL PDF files in uploads/cv
$files = glob(__DIR__ . '/../backend/uploads/cv/*.pdf');
echo "Testing " . count($files) . " PDFs with final engine (Revision 7)...\n\n";

$success = 0;
$failed = 0;
$totalQ = 0;

foreach ($files as $f) {
    $txt = TestPdfExtractor::extractTextFromFile($f);
    $len = strlen(trim($txt));
    $q = substr_count($txt, '?');
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

echo "\nSummary: Total = " . count($files) . " | Success = $success | Failed = $failed | Total ? Marks = $totalQ\n";
