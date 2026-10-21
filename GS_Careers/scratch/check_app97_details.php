<?php
$_GET['action'] = 'cli';
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';
require_once __DIR__ . '/../backend/api/applications.php';

$db = getDB();
$app = $db->query("SELECT a.*, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.designation, c.name as company_name FROM applications a JOIN vacancies v ON a.vacancy_id = v.id LEFT JOIN companies c ON v.company_id = c.id WHERE a.id = 97")->fetch(PDO::FETCH_ASSOC);

echo "--- APPLICATION 97 DETAILS ---\n";
echo "Vacancy Title: " . $app['vacancy_title'] . "\n";
echo "Vacancy ID: " . $app['vacancy_id'] . "\n";
echo "Qualification: " . $app['qualification'] . "\n";
echo "Overall Exp: " . $app['overall_experience'] . "\n";
echo "Relevant Exp: " . $app['relevant_experience'] . "\n";
echo "Salary Exp: " . $app['salary_expectation'] . "\n";
echo "Tags: " . $app['tags'] . "\n";

$cvFilePath = UPLOAD_DIR . $app['cv_path'];
$rawCvText = file_exists($cvFilePath) ? PdfExtractor::extractTextFromFile($cvFilePath) : '';

echo "\nCV Text Snippet:\n" . substr($rawCvText, 0, 300) . "\n";
