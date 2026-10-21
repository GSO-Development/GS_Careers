<?php
// Simple PHP router for built-in server
// Run: php -S 0.0.0.0:8000 router.php

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Serve static files
if ($path !== '/' && file_exists(__DIR__ . $path)) {
    return false;
}

// API routes
if (strpos($path, '/api/') === 0) {
    $apiFile = __DIR__ . $path;
    if (file_exists($apiFile)) {
        require $apiFile;
        return true;
    }
}

// Default
http_response_code(404);
echo json_encode(['message' => 'Not found']);
