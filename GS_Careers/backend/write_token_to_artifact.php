<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT token FROM password_resets ORDER BY id DESC LIMIT 1");
$token = $stmt->fetchColumn();

$artifactPath = 'C:\Users\nadumi\.gemini\antigravity\brain\f9c40794-57ee-430d-9332-d2cff46e0b6d\analysis_results.md';
$content = file_get_contents($artifactPath);
$content .= "\n\n## Recovery Token Debug\nToken: " . $token . "\n";
file_put_contents($artifactPath, $content);
echo "Token written to artifact.";
