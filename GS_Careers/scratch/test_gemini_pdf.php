<?php
require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key'");
$stmt->execute();
$apiKey = $stmt->fetchColumn();

$pdfPath = __DIR__ . '/../backend/uploads/cv/cv_85_1791454894_6ac76eaed1df2.pdf';
$pdfData = base64_encode(file_get_contents($pdfPath));

$payload = [
    'contents' => [
        [
            'parts' => [
                [
                    'inlineData' => [
                        'mimeType' => 'application/pdf',
                        'data' => $pdfData
                    ]
                ],
                [
                    'text' => 'Extract all text content from this resume PDF. Output plain text.'
                ]
            ]
        ]
    ]
];

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}";
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 45
]);

$res = curl_exec($ch);
echo "Response: " . $res . "\n";
