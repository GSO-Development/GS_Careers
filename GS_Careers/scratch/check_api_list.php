<?php
$_GET['action'] = 'cli';
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';
require_once __DIR__ . '/../backend/api/applications.php';

$db = getDB();

// Mock auth token or user for super_admin
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer dummy';
$_GET['status'] = 'all';
$_GET['page'] = 1;
$_GET['limit'] = 20;

// Let's run the logic of handleListExtractions manually for App 97
$stmt = $db->query("SELECT a.id, a.vacancy_id, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.designation, c.name as company_name,
               a.first_name, a.last_name, a.email, a.contact_number,
               a.overall_experience, a.relevant_experience, a.qualification, a.salary_expectation,
               a.cv_path, a.cv_text, a.extraction_status, a.is_manual_extracted, a.extracted_at, a.extracted_data,
               a.applied_at, a.status as application_status, a.skills_metadata, a.tags
        FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        LEFT JOIN companies c ON v.company_id = c.id
        WHERE a.id = 97");
$item = $stmt->fetch(PDO::FETCH_ASSOC);

$cvTextToUse = $item['cv_text'];
if (empty($cvTextToUse) && !empty($item['cv_path'])) {
    $fullPath = UPLOAD_DIR . $item['cv_path'];
    if (file_exists($fullPath)) {
        $extractedRaw = PdfExtractor::extractTextFromFile($fullPath);
        if ($extractedRaw) {
            $cvTextToUse = $extractedRaw;
        }
    }
}

$score = computeCandidateMatchScore(
    $item,
    $item['qualification'],
    $item['overall_experience'],
    $item['relevant_experience'],
    $cvTextToUse,
    $item['tags'],
    $item['skills_metadata']
);

$item['match_score'] = $score;
$item['score'] = $score;

echo "Item returned by API for App 97:\n";
echo "match_score: " . $item['match_score'] . "%\n";
echo "score: " . $item['score'] . "%\n";
echo "extraction_status: " . $item['extraction_status'] . "\n";
