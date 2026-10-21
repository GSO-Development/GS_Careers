<?php
$_GET['action'] = 'dummy';
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';
require_once __DIR__ . '/../backend/api/applications.php';

$db = getDB();
$app = $db->query("SELECT a.*, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.designation, c.name as company_name FROM applications a JOIN vacancies v ON a.vacancy_id = v.id LEFT JOIN companies c ON v.company_id = c.id WHERE a.id = 97")->fetch(PDO::FETCH_ASSOC);

$score = computeCandidateMatchScore($app, $app['qualification'], $app['overall_experience'], $app['relevant_experience'], $app['cv_text'], $app['tags'], $app['skills_metadata']);

echo "Candidate: " . $app['first_name'] . " " . $app['last_name'] . "\n";
echo "Computed Score in PHP: $score%\n";
echo "DB extraction_status: " . $app['extraction_status'] . "\n";
echo "DB cv_text length: " . strlen($app['cv_text'] ?? '') . "\n";
