<?php
require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$stmt = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key'");
$key = $stmt->fetchColumn();

echo "Current Gemini API Key in DB: " . var_export($key, true) . "\n\n";

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $key;
$payload = [
    'contents' => [['parts' => [['text' => 'Respond in JSON: {"status": "ok"}']]]],
    'generationConfig' => ['responseMimeType' => 'application/json']
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 15
]);

$res = curl_exec($ch);
$err = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: {$code}\n";
echo "Curl Error: {$err}\n";
echo "Response Body:\n{$res}\n";
