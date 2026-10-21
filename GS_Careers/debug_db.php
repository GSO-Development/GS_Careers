<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/backend/config.php';

try {
    $db = getDB();
    echo "--- VACANCIES ---\n";
    $vs = $db->query("SELECT id, title, designation FROM vacancies")->fetchAll(PDO::FETCH_ASSOC);
    foreach($vs as $v) {
        $apps = $db->query("SELECT COUNT(*) FROM applications WHERE vacancy_id = {$v['id']}")->fetchColumn();
        echo "V[{$v['id']}]: {$v['title']} ({$v['designation']}) Apps: $apps\n";
    }

    echo "\n--- CONSENT DATA ---\n";
    $c = $db->query("SELECT future_consent, COUNT(*) as count FROM applications GROUP BY future_consent")->fetchAll(PDO::FETCH_ASSOC);
    print_r($c);

    echo "\n--- DUPLICATE EMAILS ---\n";
    $emails = $db->query("SELECT email, COUNT(*) as count FROM applications GROUP BY email HAVING count > 1")->fetchAll(PDO::FETCH_ASSOC);
    print_r($emails);

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
