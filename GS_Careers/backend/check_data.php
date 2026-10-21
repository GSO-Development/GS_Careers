<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$stmt = $db->query("SELECT a.email, a.future_consent, v.title FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE v.title LIKE '%Senior Electrical Engineer%'");
$res = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($res as $r) {
    echo $r['email'] . ' | ' . $r['future_consent'] . ' \n';
}
?>
