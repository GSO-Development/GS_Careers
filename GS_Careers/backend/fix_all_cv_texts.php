<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/libs/PdfExtractor.php';

$db = getDB();
$stmt = $db->query("SELECT id, first_name, last_name, email, contact_number, overall_experience, relevant_experience, qualification, salary_expectation, cv_path, cv_text, vacancy_id FROM applications");
$applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($applications) . " applications.\n\n";

foreach ($applications as $app) {
    $id = $app['id'];
    $name = $app['first_name'] . ' ' . $app['last_name'];
    $cvPath = UPLOAD_DIR . $app['cv_path'];
    $oldText = $app['cv_text'];

    echo "Processing Application ID #{$id} ({$name})...\n";

    // Fetch vacancy info
    $vStmt = $db->prepare("SELECT v.*, c.name as company_name FROM vacancies v JOIN companies c ON v.company_id = c.id WHERE v.id = ?");
    $vStmt->execute([$app['vacancy_id']]);
    $vacancy = $vStmt->fetch(PDO::FETCH_ASSOC);

    $newText = null;
    if (file_exists($cvPath)) {
        $extracted = PdfExtractor::extractTextFromFile($cvPath);
        if (!empty($extracted) && strlen(trim($extracted)) >= 20 && !PdfExtractor::isGarbledText($extracted)) {
            $newText = $extracted;
        }
    }

    if (empty($newText) || PdfExtractor::isGarbledText($newText)) {
        $vTitle = $vacancy['title'] ?? ($vacancy['vacancy_title'] ?? 'Position');
        $sal = !empty($app['salary_expectation']) ? "LKR {$app['salary_expectation']}" : 'Not specified';
        $newText = "CANDIDATE RESUME PROFILE\n"
                 . "Name: {$app['first_name']} {$app['last_name']}\n"
                 . "Email: {$app['email']}\n"
                 . "Contact Number: {$app['contact_number']}\n"
                 . "Qualification: {$app['qualification']}\n"
                 . "Overall Experience: {$app['overall_experience']}\n"
                 . "Relevant Experience: {$app['relevant_experience']}\n"
                 . "Target Vacancy: {$vTitle}\n"
                 . "Salary Expectation: {$sal}";
    }

    // Re-parse structured AI data
    $parsedData = PdfExtractor::parseCvDataWithAI($newText, $vacancy ?: 'Open Position');
    $extractedData = json_encode($parsedData);

    $skillsMetadataArr = [
        'ai_match_score' => $parsedData['ai_match_score'] ?? null,
        'ai_match_reason' => $parsedData['ai_match_reason'] ?? '',
        'ai_score_breakdown' => $parsedData['ai_score_breakdown'] ?? [],
        'skills_analysis' => $parsedData['skills_analysis'] ?? [],
        'fully_demonstrated_skills' => $parsedData['fully_demonstrated_skills'] ?? [],
        'partially_demonstrated_skills' => $parsedData['partially_demonstrated_skills'] ?? [],
        'requirements_without_evidence' => $parsedData['requirements_without_evidence'] ?? [],
        'additional_skills' => $parsedData['additional_skills'] ?? [],
        'qualifications_found' => $parsedData['qualifications_found'] ?? [],
        'certifications_found' => $parsedData['certifications_found'] ?? [],
        'experience_summary' => $parsedData['experience_summary'] ?? ($parsedData['profile_summary'] ?? 'Candidate profile evaluated from CV text.'),
        'recruiter_insights' => $parsedData['recruiter_insights'] ?? ['Candidate resume extracted and evaluated by Steuart AI Engine.']
    ];
    $skillsMetadata = json_encode($skillsMetadataArr);

    $allSkillsList = [];
    if (!empty($parsedData['skills_analysis']) && is_array($parsedData['skills_analysis'])) {
        foreach ($parsedData['skills_analysis'] as $sa) {
            if (!empty($sa['skill'])) $allSkillsList[] = $sa['skill'];
        }
    }
    $tags = !empty($allSkillsList) ? implode(', ', array_unique($allSkillsList)) : '';

    $upd = $db->prepare("UPDATE applications SET cv_text = ?, extracted_data = ?, skills_metadata = ?, tags = ? WHERE id = ?");
    $upd->execute([$newText, $extractedData, $skillsMetadata, $tags, $id]);

    echo " -> Updated ID #{$id}. Text length: " . strlen($newText) . " bytes. Preview: " . substr(str_replace("\n", " ", $newText), 0, 80) . "...\n\n";
}

echo "Database cleanup completed successfully!\n";
