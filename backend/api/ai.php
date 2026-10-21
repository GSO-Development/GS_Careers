<?php
// ============================================
// AI API - Local Ollama Proxy
// ============================================
require_once __DIR__ . '/../config.php';
set_time_limit(360);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'parse':
        handleParse();
        break;
    case 'quota_status':
    case 'test_key':
        handleQuotaStatus();
        break;
    default:
        jsonResponse(400, 'Invalid action');
}

function handleParse()
{
    // Ensure request is POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(405, 'Method not allowed');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $prompt = $input['prompt'] ?? '';

    if (empty($prompt)) {
        jsonResponse(400, 'Prompt is required');
    }

    // Retrieve settings from database
    $db = getDB();
    $stmt = $db->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('ai_provider', 'gemini_api_key', 'gemini_api_key_backup', 'gemini_model', 'ollama_server', 'ollama_model')");
    $stmt->execute();
    
    $settings = [];
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $settings[$row[0]] = $row[1];
    }

    $aiProvider = $settings['ai_provider'] ?? 'ollama';
    $geminiApiKey = !empty($settings['gemini_api_key']) ? trim($settings['gemini_api_key']) : (defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '');
    $geminiApiKeyBackup = !empty($settings['gemini_api_key_backup']) ? trim($settings['gemini_api_key_backup']) : '';
    $geminiModel = $settings['gemini_model'] ?? 'gemini-2.5-flash';
    
    // Fall back to config.php constants if not found in database settings
    $defaultOllamaServer = defined('OLLAMA_SERVER') ? OLLAMA_SERVER : 'http://172.16.7.21:11434';
    $defaultOllamaModel = defined('OLLAMA_MODEL') ? OLLAMA_MODEL : 'qwen2.5:7b';
    
    $ollamaServer = !empty($settings['ollama_server']) ? $settings['ollama_server'] : $defaultOllamaServer;
    $ollamaModel = !empty($settings['ollama_model']) ? $settings['ollama_model'] : $defaultOllamaModel;

    if ($aiProvider === 'gemini') {
        if (empty($geminiApiKey) && empty($geminiApiKeyBackup)) {
            jsonResponse(400, 'Google Gemini API Key is not configured. Please define it in your portal settings.');
        }

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt]
                    ]
                ]
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json'
            ]
        ];

        $keysToTry = [];
        if (!empty($geminiApiKey)) $keysToTry[] = ['key' => $geminiApiKey, 'type' => 'Primary'];
        if (!empty($geminiApiKeyBackup) && $geminiApiKeyBackup !== $geminiApiKey) $keysToTry[] = ['key' => $geminiApiKeyBackup, 'type' => 'Backup'];

        $lastError = '';
        $textResponse = '';

        foreach ($keysToTry as $kIdx => $kObj) {
            $currentKey = $kObj['key'];
            $keyType = $kObj['type'];

            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$geminiModel}:generateContent?key={$currentKey}";
            $ch = curl_init($url);
            if ($ch === false) {
                $lastError = "Failed to initialize curl for Google Gemini API connection ({$keyType} Key).";
                continue;
            }

            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                $lastError = "Gemini API connection failed ({$keyType} Key): $error";
                continue;
            }

            if ($httpCode === 200) {
                $data = json_decode($response, true);
                $textResponse = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
                if (!empty($textResponse)) {
                    // Success!
                    break;
                }
            } else {
                $errData = json_decode($response, true);
                $errMessage = $errData['error']['message'] ?? $response;
                $lastError = "Gemini {$keyType} Key returned HTTP {$httpCode}: {$errMessage}";
                error_log("Gemini {$keyType} Key failed (HTTP {$httpCode}). Trying backup if available...");
            }
        }

        if (empty($textResponse)) {
            jsonResponse(500, "Gemini API error (All configured keys exhausted): " . $lastError);
        }

        jsonResponse(200, 'Success', [
            'response' => $textResponse
        ]);

    } else {
        $payload = [
            'model' => $ollamaModel,
            'prompt' => $prompt,
            'stream' => false,
            'format' => 'json'
        ];

        $ch = curl_init("$ollamaServer/api/generate");
        if ($ch === false) {
            jsonResponse(500, "Failed to initialize curl for Ollama server connection.");
        }

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 300);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            jsonResponse(500, "Ollama server connection failed: $error");
        }

        if ($httpCode !== 200) {
            jsonResponse(500, "Ollama server returned HTTP code $httpCode: $response");
        }

        $data = json_decode($response, true);
        if (!isset($data['response'])) {
            jsonResponse(500, "Invalid response structure from Ollama server", $data);
        }

        jsonResponse(200, 'Success', [
            'response' => $data['response']
        ]);
    }
}

function handleQuotaStatus()
{
    $db = getDB();
    $inputData = json_decode(file_get_contents('php://input'), true) ?? [];

    $stmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('gemini_api_key', 'gemini_model', 'ai_provider')");
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $apiKey = !empty($inputData['apiKey']) ? trim($inputData['apiKey']) : ($settings['gemini_api_key'] ?? '');
    $model = $settings['gemini_model'] ?? 'gemini-2.5-flash';
    $aiProvider = $settings['ai_provider'] ?? 'gemini';

    if (empty($apiKey)) {
        jsonResponse(200, 'Success', [
            'status' => 'no_key',
            'message' => 'No Gemini API Key configured in Settings.',
            'provider' => $aiProvider,
            'used_today' => 0,
            'daily_limit' => 1500,
            'remaining_today' => 1500,
            'percentage' => 0,
            'is_warning' => false,
            'is_exhausted' => false
        ]);
    }

    // Ping Gemini API
    $url = "https://generativelanguage.googleapis.com/v1beta/models?key={$apiKey}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']
    ]);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $status = 'healthy';
    $message = 'Gemini API Key is Active & Healthy.';
    $isExhausted = false;
    $isWarning = false;

    if ($httpCode === 200) {
        $status = 'healthy';
        $message = 'Gemini API Key is Active & Healthy.';
    } else if ($httpCode === 429) {
        $status = 'quota_exceeded';
        $message = 'Rate Limit / Quota Exceeded (HTTP 429). Requests are currently blocked by Google.';
        $isExhausted = true;
    } else if ($httpCode === 403) {
        $status = 'quota_exhausted';
        $message = 'Forbidden / Resource Exhausted (HTTP 403). Check API billing or quota limits.';
        $isExhausted = true;
    } else if ($httpCode === 400) {
        $status = 'invalid_key';
        $message = 'Invalid API Key format or key has been revoked by Google.';
        $isExhausted = true;
    } else {
        $status = 'error';
        $message = "API Test Error (HTTP {$httpCode}): " . ($curlError ?: 'Unexpected response');
    }

    // Extraction Counts & API Usage
    $usedToday = 0;
    try {
        $stmtToday = $db->query("SELECT COUNT(*) FROM applications WHERE (extraction_status = 'extracted' OR extracted_data IS NOT NULL) AND (DATE(extracted_at) = CURDATE() OR (extracted_at IS NULL AND DATE(applied_at) = CURDATE()))");
        $appCountToday = (int)$stmtToday->fetchColumn();

        // Also check tracked gemini calls for today
        $todayStr = date('Y-m-d');
        $stmtDate = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'gemini_calls_date'");
        $storedDate = $stmtDate ? $stmtDate->fetchColumn() : null;
        $trackedCalls = 0;
        if ($storedDate === $todayStr) {
            $stmtCalls = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'gemini_calls_today'");
            $trackedCalls = (int)($stmtCalls ? $stmtCalls->fetchColumn() : 0);
        }

        $usedToday = max($appCountToday, $trackedCalls);
    } catch (\Exception $e) {
        $usedToday = 0;
    }

    $totalExtracted = 0;
    try {
        $stmtTotal = $db->query("SELECT COUNT(*) FROM applications WHERE extraction_status = 'extracted' OR extracted_data IS NOT NULL");
        $totalExtracted = (int)$stmtTotal->fetchColumn();
    } catch (\Exception $e) {
        $totalExtracted = 0;
    }

    $dailyLimit = 1500;
    $remainingToday = max(0, $dailyLimit - $usedToday);
    $percentage = min(100, round(($usedToday / $dailyLimit) * 100, 1));

    if ($percentage >= 85 || $remainingToday <= 200) {
        $isWarning = true;
    }

    // Time until UTC midnight reset
    $now = new DateTime('now', new DateTimeZone('UTC'));
    $midnight = new DateTime('tomorrow midnight', new DateTimeZone('UTC'));
    $diff = $now->diff($midnight);
    $resetIn = sprintf('%dh %dm', $diff->h, $diff->i);

    $keyMasked = strlen($apiKey) > 12 
        ? substr($apiKey, 0, 8) . '...' . substr($apiKey, -4) 
        : '***';

    jsonResponse(200, 'Success', [
        'status' => $status,
        'message' => $message,
        'http_code' => $httpCode,
        'provider' => $aiProvider,
        'key_masked' => $keyMasked,
        'used_today' => $usedToday,
        'daily_limit' => $dailyLimit,
        'remaining_today' => $remainingToday,
        'percentage' => $percentage,
        'total_extracted' => $totalExtracted,
        'reset_in' => $resetIn,
        'is_warning' => $isWarning,
        'is_exhausted' => $isExhausted
    ]);
}

