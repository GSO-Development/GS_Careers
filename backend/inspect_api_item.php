<?php
require_once 'c:/Users/nadumi/OneDrive - George Steuart Optimize Pvt Ltd/Documents/GS Careers CV/GS_Careers/backend/config.php';
$db = getDB();
$sql = "SELECT a.id, a.vacancy_id, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.designation, c.name as company_name,
               a.first_name, a.last_name, a.email, a.contact_number,
               a.overall_experience, a.relevant_experience, a.qualification, a.salary_expectation,
               a.cv_path, a.cv_text, a.extraction_status, a.is_manual_extracted, a.extracted_at, a.extracted_data,
               a.applied_at, a.status as application_status, a.skills_metadata, a.tags
        FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        JOIN companies c ON v.company_id = c.id
        WHERE a.id = 86";
$stmt = $db->query($sql);
$item = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($item, JSON_PRETTY_PRINT);
