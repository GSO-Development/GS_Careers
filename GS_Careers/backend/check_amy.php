<?php
$pdo = new PDO('mysql:host=localhost;dbname=gs_jobs', 'root', '');
print_r($pdo->query("SELECT id, email, is_blocked FROM applications WHERE email = 'amy@gmail.com'")->fetchAll(PDO::FETCH_ASSOC));
