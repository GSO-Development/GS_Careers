<?php
require_once __DIR__ . '/../backend/config.php';
$db = getDB();

$db->exec("UPDATE vacancies SET min_salary = 30000.00, max_salary = 35000.00 WHERE id = 85");
echo "Updated Vacancy 85 min_salary to 30000 and max_salary to 35000.\n";
