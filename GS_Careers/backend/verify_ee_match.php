<?php
require_once __DIR__ . '/config.php';
$db = getDB();

$newTitle = "Electrical Engineer";
$oldTitle = "Senior Electrical Engineer";

echo "Checking matches for '$newTitle' based on '$oldTitle'...\n";

// 1. Find the old vacancy applicants with future_consent
$stmt = $db->prepare("SELECT a.email, a.first_name, a.last_name, a.future_consent, v.title as prev_vacancy
                      FROM applications a
                      JOIN vacancies v ON a.vacancy_id = v.id
                      WHERE v.title LIKE ?");
$stmt->execute(["%$oldTitle%"]);
$applicants = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total previous applicants: " . count($applicants) . "\n";
foreach ($applicants as $app) {
    $status = $app['future_consent'] ? "OPTED IN" : "NO CONSENT";
    echo " - {$app['first_name']} {$app['last_name']} ({$app['email']}): $status\n";
}

// 2. Simulate the new matching logic
$titleKeywords = array_filter(explode(' ', strtolower($newTitle)), function($word) {
    return strlen($word) > 2 && !in_array($word, ['and', 'the', 'for', 'with', 'job', 'vacancy']);
});

$titleConditions = [];
foreach ($titleKeywords as $keyword) {
    $titleConditions[] = "v.title LIKE ?";
}
$titleMatchSql = " OR (" . implode(" AND ", $titleConditions) . ")";

$sql = "SELECT DISTINCT a.email, v.title as prev_title
        FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        WHERE a.future_consent = 1
          AND ($titleMatchSql)";

$params = [];
foreach ($titleKeywords as $keyword) {
    $params[] = "%$keyword%";
}

$stmt = $db->prepare($sql);
$stmt->execute($params);
$matches = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "\n--- SUGGESTION ENGINE RESULTS ---\n";
echo "Candidates suggested for '$newTitle': " . count($matches) . "\n";
foreach ($matches as $m) {
    echo " - Match found: {$m['email']} (from '{$m['prev_title']}')\n";
}
?>
