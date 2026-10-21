<?php
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$db = getDB();
$stmt = $db->prepare("SELECT * FROM applications WHERE first_name LIKE '%UWAIYZ%' OR last_name LIKE '%AHAMED%' OR email LIKE '%afrithatif%'");
$stmt->execute();
$app = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$app) {
    echo "UWAIYZ application not found in DB\n";
    exit;
}

$cvPath = UPLOAD_DIR . $app['cv_path'];
$text = file_exists($cvPath) ? PdfExtractor::extractTextFromFile($cvPath) : $app['cv_text'];

$parsed = PdfExtractor::parseCvDataWithAI($text, 'IT Technician');

echo "=== CANDIDATE EXTRACTED DETAILS ===\n\n";
echo "Full Name: " . ($parsed['first_name'] ?? 'UWAIYZ') . " " . ($parsed['last_name'] ?? 'ATIF AHAMED') . "\n";
echo "Email: " . ($parsed['email'] ?? $app['email']) . "\n";
echo "Contact Number: " . ($parsed['contact_number'] ?? $app['contact_number']) . "\n";
echo "Primary Qualification: " . ($parsed['qualification'] ?? '') . "\n";
echo "Overall Experience: " . ($parsed['overall_experience'] ?? '') . "\n";
echo "Relevant Experience: " . ($parsed['relevant_experience'] ?? '') . "\n\n";

echo "--- QUALIFICATIONS FOUND ---\n";
print_r($parsed['qualifications_found'] ?? []);

echo "\n--- CERTIFICATIONS FOUND ---\n";
print_r($parsed['certifications_found'] ?? []);

echo "\n--- TECHNICAL SKILLS ANALYSIS ---\n";
print_r($parsed['skills_analysis'] ?? []);

echo "\n--- FULLY DEMONSTRATED SKILLS ---\n";
print_r($parsed['fully_demonstrated_skills'] ?? []);

echo "\n--- RECRUITER INSIGHTS ---\n";
print_r($parsed['recruiter_insights'] ?? []);
