<?php
require_once __DIR__ . '/config.php';
$db = getDB();
$email = 'nnp@maildrop.cc';
$stmt = $db->prepare("SELECT * FROM admins WHERE email=?");
$stmt->execute([$email]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);
if ($admin) {
    echo "ADMIN_FOUND: " . json_encode($admin) . "\n";
} else {
    echo "ADMIN_NOT_FOUND: " . $email . "\n";
}
