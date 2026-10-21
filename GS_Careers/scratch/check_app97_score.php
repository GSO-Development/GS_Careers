<?php
$_GET['action'] = 'cli';
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';
require_once __DIR__ . '/../backend/api/applications.php';

$db = getDB();
$app = $db->query("SELECT a.*, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.designation, c.name as company_name FROM applications a JOIN vacancies v ON a.vacancy_id = v.id LEFT JOIN companies c ON v.company_id = c.id WHERE a.id = 97")->fetch(PDO::FETCH_ASSOC);

$cvFilePath = UPLOAD_DIR . $app['cv_path'];
$rawCvText = file_exists($cvFilePath) ? PdfExtractor::extractTextFromFile($cvFilePath) : '';

echo "Raw CV text length: " . strlen($rawCvText) . "\n";

$scoreAtSubmit = computeCandidateMatchScore(
    $app,
    $app['qualification'],
    $app['overall_experience'],
    $app['relevant_experience'],
    $rawCvText,
    '',
    null,
    $app['salary_expectation']
);

echo "Score computed at submission (PHP): " . $scoreAtSubmit . "%\n";

$stmtExtSetting = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'enable_cv_extraction'");
$enableCvExt = $stmtExtSetting ? $stmtExtSetting->fetchColumn() : '1';
echo "enable_cv_extraction setting in DB: " . var_export($enableCvExt, true) . "\n";

$stmtMinMed = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'min_medium_match_score'");
$minMedScore = $stmtMinMed ? (int)$stmtMinMed->fetchColumn() : 50;
echo "min_medium_match_score setting in DB: " . $minMedScore . "%\n";

$shouldAutoExtract = ($enableCvExt === '1' || $enableCvExt === 'true' || $enableCvExt === true || $enableCvExt === 1) && ($scoreAtSubmit >= $minMedScore);
echo "Should auto extract: " . var_export($shouldAutoExtract, true) . "\n";
