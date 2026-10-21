<?php
require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$stmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('gemini_api_key', 'gemini_model', 'ai_provider')");
$settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$key = $settings['gemini_api_key'] ?? '';
$model = $settings['gemini_model'] ?? 'gemini-2.5-flash';

echo "Provider: " . ($settings['ai_provider'] ?? 'ollama') . "\n";
echo "Key: " . (empty($key) ? 'NONE' : substr($key, 0, 8) . '...' . substr($key, -4)) . "\n";
echo "Model: " . $model . "\n";

if (!empty($key)) {
    // 1. Ping Google AI Studio API for model endpoint
    $url = "https://generativelanguage.googleapis.com/v1beta/models?key={$key}";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo "HTTP Status Code: {$code}\n";
    if ($code === 200) {
        echo "Status: HEALTHY / ACTIVE\n";
    } else {
        echo "Status: ERROR ({$code})\n";
    }

    $todayStmt = $db->query("SELECT COUNT(*) FROM applications WHERE extraction_status = 'completed' AND DATE(extracted_at) = CURDATE()");
    $usedToday = (int)$todayStmt->fetchColumn();

    $totalStmt = $db->query("SELECT COUNT(*) FROM applications WHERE extraction_status = 'completed'");
    $totalExtracted = (int)$totalStmt->fetchColumn();

    $dailyLimit = 1500;
    $percent = round(($usedToday / $dailyLimit) * 100, 1);

    echo "Extractions Today: {$usedToday} / {$dailyLimit} ({$percent}%)\n";
    echo "Total Extractions All Time: {$totalExtracted}\n";

    $now = new DateTime('now', new DateTimeZone('UTC'));
    $midnight = new DateTime('tomorrow midnight', new DateTimeZone('UTC'));
    $interval = $now->diff($midnight);
    echo "Time until daily reset: {$interval->format('%h hours %i minutes')}\n";
}
