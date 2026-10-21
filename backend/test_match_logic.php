<?php
require_once __DIR__ . '/config.php';
$db = getDB();

try {
    // 1. Setup - Create a mock vacancy and an application with future_consent
    $db->exec("INSERT INTO companies (name) VALUES ('Test Company') ON DUPLICATE KEY UPDATE id=id");
    $companyId = $db->lastInsertId() ?: 1;

    $db->exec("INSERT INTO vacancies (company_id, title, designation, description, publish_date, expire_date) 
               VALUES ($companyId, 'Project Manager', 'Management', 'Test', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))");
    $oldVacancyId = $db->lastInsertId();

    $db->exec("INSERT INTO applications (vacancy_id, first_name, last_name, email, contact_number, overall_experience, relevant_experience, qualification, cv_path, future_consent) 
               VALUES ($oldVacancyId, 'John', 'Tester', 'john@example.com', '123456', '5-10 years', '3-5 years', 'Bachelors Degree', 'uploads/cv/test.pdf', 1)");
    $appId = $db->lastInsertId();

    echo "Mock data created. App ID: $appId, Old Vacancy ID: $oldVacancyId\n";

    // 2. Test - Logic for a NEW "Senior Project Manager" vacancy
    $newTitle = "Senior Project Manager";
    $newDesignation = "Management";
    
    echo "Testing match for new vacancy: '$newTitle' ($newDesignation)\n";

    $titleKeywords = array_filter(explode(' ', strtolower($newTitle)), function($word) {
        return strlen($word) > 2 && !in_array($word, ['and', 'the', 'for', 'with', 'job', 'vacancy']);
    });
    
    $titleConditions = [];
    $params = [$newDesignation];
    foreach ($titleKeywords as $keyword) {
        $titleConditions[] = "v.title LIKE ?";
        $params[] = "%$keyword%";
    }
    $titleMatchSql = " OR (" . implode(" AND ", $titleConditions) . ")";

    $sql = "SELECT DISTINCT a.email, v.title as prev_title
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            WHERE a.future_consent = 1
              AND (v.designation = ? $titleMatchSql)";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Results found: " . count($results) . "\n";
    foreach ($results as $r) {
        echo " - Match: {$r['email']} (Previous Role: {$r['prev_title']})\n";
    }

    // 3. Cleanup
    $db->exec("DELETE FROM applications WHERE email = 'john@example.com'");
    $db->exec("DELETE FROM vacancies WHERE title = 'Project Manager'");
    echo "Cleanup done.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
