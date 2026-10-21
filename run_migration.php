<?php
require 'backend/config.php';
try {
    $db = getDB();
    $db->exec("ALTER TABLE applications MODIFY COLUMN status ENUM('pending', 'under_review', 'shortlisted', 'rejected') DEFAULT 'pending'");
    echo 'Migration successful';
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
