<?php
require_once __DIR__ . '/config.php';
$db = getDB();

$stmt = $db->query("SELECT id, first_name, last_name, extraction_status, is_manual_extracted, cv_text, extracted_data, skills_metadata, tags FROM applications");
$apps = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($apps as $app) {
    echo "ID: {$app['id']} | Name: {$app['first_name']} {$app['last_name']} | extraction_status: {$app['extraction_status']} | is_manual: {$app['is_manual_extracted']}\n";
    echo "  cv_text: " . (empty($app['cv_text']) ? 'EMPTY/NULL' : substr($app['cv_text'], 0, 50)) . "\n";
    echo "  extracted_data: " . (empty($app['extracted_data']) ? 'EMPTY/NULL' : substr($app['extracted_data'], 0, 80)) . "\n";
    echo "  skills_metadata: " . (empty($app['skills_metadata']) ? 'EMPTY/NULL' : substr($app['skills_metadata'], 0, 80)) . "\n";
    echo "  tags: " . ($app['tags'] ?? 'NONE') . "\n";
    echo "---------------------------------------------------------\n";
}
