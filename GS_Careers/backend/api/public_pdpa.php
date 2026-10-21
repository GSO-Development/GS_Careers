<?php
// ============================================
// Public PDPA Settings API (Unauthenticated Access)
// ============================================
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET') {
    jsonResponse(405, 'Method not allowed');
}

$db = getDB();
$stmt = $db->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'pdpa_%'");
$stmt->execute();
$results = $stmt->fetchAll();

$settings = [];
foreach ($results as $row) {
    $settings[$row['setting_key']] = $row['setting_value'];
}

// Default fallback values for PDPA settings
$pdpaDefaults = [
    'pdpa_title' => 'Personal Data Protection Act (PDPA) Compliance',
    'pdpa_description' => 'In accordance with the Personal Data Protection Act (PDPA), we require your explicit consent to store, process, and retain your CV and personal information for future job openings.',
    'pdpa_purpose' => 'Your details will be accessed by our HR team to match you with suitable future career opportunities.',
    'pdpa_retention' => 'If consented, your data will be securely stored in our Talent Pool for a maximum duration of 1 year.',
    'pdpa_security' => 'All personal data is processed under strict confidentiality and industry-standard security measures.',
    'pdpa_rights' => 'You can withdraw your consent at any time by contacting our HR department.'
];

foreach ($pdpaDefaults as $key => $defaultVal) {
    if (!isset($settings[$key]) || $settings[$key] === '') {
        $settings[$key] = $defaultVal;
    }
}

jsonResponse(200, 'PDPA guidelines retrieved', $settings);
?>
