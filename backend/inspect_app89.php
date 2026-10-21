<?php
require_once 'c:/Users/nadumi/OneDrive - George Steuart Optimize Pvt Ltd/Documents/GS Careers CV/GS_Careers/backend/config.php';
$db = getDB();
$stmt = $db->query("SELECT a.id, a.first_name, a.last_name, a.cv_text, a.tags, a.skills_metadata, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.id = 89");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($row, JSON_PRETTY_PRINT);
