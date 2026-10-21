<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    echo "--- Testing Dashboard Stats ---\n";
    $interval = "INTERVAL 1 YEAR";
    
    $totalVacancies = $db->query("SELECT COUNT(*) FROM vacancies")->fetchColumn();
    $activeVacancies = $db->query("SELECT COUNT(*) FROM vacancies WHERE is_active = 1 AND expire_date >= CURDATE()")->fetchColumn();
    $talentPoolCount = $db->query("SELECT COUNT(DISTINCT email) FROM applications WHERE future_consent = 1 AND applied_at >= DATE_SUB(NOW(), $interval)")->fetchColumn();
    $totalMatches = $db->query("SELECT COUNT(DISTINCT a.email) 
                               FROM applications a 
                               JOIN vacancies v_pool ON a.vacancy_id = v_pool.id
                               WHERE a.future_consent = 1 
                                 AND a.applied_at >= DATE_SUB(NOW(), $interval)
                                 AND v_pool.designation IN (SELECT designation FROM vacancies WHERE is_active = 1 AND expire_date >= CURDATE())")->fetchColumn();

    echo "Total Vacancies: $totalVacancies\n";
    echo "Active Vacancies: $activeVacancies\n";
    echo "Talent Pool Size: $talentPoolCount\n";
    echo "Total Potential Matches: $totalMatches\n\n";

    echo "--- Testing Vacancy Match Counts ---\n";
    $sql = "SELECT v.title, v.designation,
            (SELECT COUNT(DISTINCT a2.email) 
             FROM applications a2 
             JOIN vacancies v2 ON a2.vacancy_id = v2.id 
             WHERE a2.future_consent = 1 
               AND a2.applied_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
               AND v2.designation = v.designation
               AND a2.email NOT IN (SELECT email FROM applications WHERE vacancy_id = v.id)) as match_count
            FROM vacancies v 
            LIMIT 5";
    $stmt = $db->query($sql);
    while($row = $stmt->fetch()) {
        echo "Job: {$row['title']} ({$row['designation']}) -> Matches: {$row['match_count']}\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
