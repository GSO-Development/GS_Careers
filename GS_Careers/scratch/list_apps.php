<?php
require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$stmt = $db->query("SELECT a.id, a.first_name, a.last_name, a.vacancy_id, v.title as vacancy_title, a.extraction_status, a.is_manual_extracted, a.skills_metadata FROM applications a LEFT JOIN vacancies v ON a.vacancy_id = v.id ORDER BY a.id ASC");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "All applications:\n";
foreach ($rows as $r) {
    $meta = json_decode($r['skills_metadata'] ?? '', true);
    $aiScore = $meta['ai_match_score'] ?? 'NONE';
    $isUnext = ($meta['is_unextracted'] ?? false) ? 'YES' : 'NO';
    $hasBd = !empty($meta['ai_score_breakdown']) ? 'YES' : 'NO';
    echo "ID #{$r['id']}: {$r['first_name']} {$r['last_name']} | Vacancy: {$r['vacancy_title']} | Status: {$r['extraction_status']} | Manual: {$r['is_manual_extracted']} | AI Score: {$aiScore} | Unext: {$isUnext} | Breakdown: {$hasBd}\n";
}
