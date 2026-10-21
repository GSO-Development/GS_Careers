<?php
require_once __DIR__ . '/../backend/config.php';
$db = getDB();

echo "--- VACANCIES ---\n";
$vacs = $db->query("SELECT id, title, min_salary, max_salary FROM vacancies")->fetchAll(PDO::FETCH_ASSOC);
print_r($vacs);

echo "\n--- NETHMINI APPLICATION ---\n";
$apps = $db->query("SELECT a.id, a.first_name, a.last_name, a.salary_expectation, a.vacancy_id, v.title, v.min_salary, v.max_salary FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.first_name LIKE '%Nethmini%' OR a.last_name LIKE '%Rajamanthri%'")->fetchAll(PDO::FETCH_ASSOC);
print_r($apps);
