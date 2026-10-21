<?php
require_once 'c:/Users/nadumi/OneDrive - George Steuart Optimize Pvt Ltd/Documents/GS Careers CV/GS_Careers/backend/config.php';
$db = getDB();
$stmt = $db->prepare("SELECT a.*, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.first_name LIKE '%Kavindi%' OR a.last_name LIKE '%Senanayake%' OR a.email LIKE '%kavindi%'");
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $r) {
    echo "=== Application ID: " . $r['id'] . " ===\n";
    echo "Name: " . $r['first_name'] . " " . $r['last_name'] . "\n";
    echo "Email: " . $r['email'] . "\n";
    echo "Job Applied: " . $r['vacancy_title'] . "\n";
    echo "Qualification: " . $r['qualification'] . "\n";
    echo "Overall Exp: " . $r['overall_experience'] . "\n";
    echo "Relevant Exp: " . $r['relevant_experience'] . "\n";
    echo "CV Text snippet (first 500 chars):\n" . substr($r['cv_text'] ?? '', 0, 500) . "\n";
    echo "Tags: " . ($r['tags'] ?? 'none') . "\n";
    echo "Skills Metadata: " . ($r['skills_metadata'] ?? 'none') . "\n\n";
}
