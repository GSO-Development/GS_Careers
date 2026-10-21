<?php
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$userPdf = 'C:\Users\nadumi\.gemini\antigravity-ide\brain\6b816e62-d113-4c1f-9de6-956c33bd7f72\.user_uploaded\media_1791475647237.pdf';

if (!file_exists($userPdf)) {
    echo "User PDF not found at {$userPdf}\n";
    exit;
}

$text = PdfExtractor::extractTextFromFile($userPdf);

echo "=== EXTRACTED TEXT FROM NETHMINI USER PDF ===\n";
echo $text . "\n\n";

echo "=== EXTRACTED STRUCTURED DATA ===\n";
print_r(PdfExtractor::parseCvDataWithAI($text, 'Junior Network Administrator'));
