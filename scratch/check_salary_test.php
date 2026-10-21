<?php
$_GET['action'] = 'cli';
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';
require_once __DIR__ . '/../backend/api/applications.php';

$salExp = "200000";
$minSal = "50000";
$maxSal = "80000";

$score = calculateSalaryMatchScorePHP($salExp, $minSal, $maxSal);
echo "Candidate Expectation: $salExp LKR\n";
echo "Job Budget Range: $minSal - $maxSal LKR\n";
echo "Salary Match Score: $score%\n";
