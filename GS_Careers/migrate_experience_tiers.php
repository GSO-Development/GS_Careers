<?php
/**
 * Migration: Update experience tiers in the database
 *
 * Old tiers: '0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'
 * New tiers: '0 years', '0-1 years', '1-2 years', '3-4 years', '5-7 years', '8-10 years', '10+ years'
 *
 * Run this ONCE from your browser: http://localhost/gs-Job/migrate_experience_tiers.php
 */

require_once __DIR__ . '/backend/config.php';

$db = getDB();
$results = [];

// ─── NEW ENUM DEFINITION ─────────────────────────────────────────────────────
$newEnum = "ENUM('0 years','0-1 years','1-2 years','3-4 years','5-7 years','8-10 years','10+ years')";

// ─── DATA MIGRATION MAP (old → new) ──────────────────────────────────────────
$dataMap = [
    '0-1 years'  => '0-1 years',   // kept the same
    '1-3 years'  => '1-2 years',   // closest match
    '3-5 years'  => '3-4 years',   // closest match
    '5-10 years' => '5-7 years',   // closest match (conservative)
    '10+ years'  => '10+ years',   // kept the same
];

try {
    // 1. Migrate data in applications table (overall_experience)
    foreach ($dataMap as $old => $new) {
        $stmt = $db->prepare("UPDATE applications SET overall_experience = ? WHERE overall_experience = ?");
        $stmt->execute([$new, $old]);
        $rows = $stmt->rowCount();
        $results[] = "[applications.overall_experience] '$old' → '$new' : $rows rows updated";
    }

    // 2. Migrate data in applications table (relevant_experience)
    foreach ($dataMap as $old => $new) {
        $stmt = $db->prepare("UPDATE applications SET relevant_experience = ? WHERE relevant_experience = ?");
        $stmt->execute([$new, $old]);
        $rows = $stmt->rowCount();
        $results[] = "[applications.relevant_experience] '$old' → '$new' : $rows rows updated";
    }

    // 3. Migrate data in vacancies table (min_experience)
    foreach ($dataMap as $old => $new) {
        $stmt = $db->prepare("UPDATE vacancies SET min_experience = ? WHERE min_experience = ?");
        $stmt->execute([$new, $old]);
        $rows = $stmt->rowCount();
        $results[] = "[vacancies.min_experience] '$old' → '$new' : $rows rows updated";
    }

    // 4. Migrate data in vacancies table (min_relevant_experience)
    foreach ($dataMap as $old => $new) {
        $stmt = $db->prepare("UPDATE vacancies SET min_relevant_experience = ? WHERE min_relevant_experience = ?");
        $stmt->execute([$new, $old]);
        $rows = $stmt->rowCount();
        $results[] = "[vacancies.min_relevant_experience] '$old' → '$new' : $rows rows updated";
    }

    // 5. Alter columns to use new ENUM (must be done AFTER data migration)
    $db->exec("ALTER TABLE applications MODIFY COLUMN overall_experience $newEnum NOT NULL");
    $results[] = "[ALTER] applications.overall_experience → new ENUM ✓";

    $db->exec("ALTER TABLE applications MODIFY COLUMN relevant_experience $newEnum NOT NULL");
    $results[] = "[ALTER] applications.relevant_experience → new ENUM ✓";

    $db->exec("ALTER TABLE vacancies MODIFY COLUMN min_experience $newEnum NOT NULL DEFAULT '0 years'");
    $results[] = "[ALTER] vacancies.min_experience → new ENUM ✓";

    $db->exec("ALTER TABLE vacancies MODIFY COLUMN min_relevant_experience $newEnum NOT NULL DEFAULT '0 years'");
    $results[] = "[ALTER] vacancies.min_relevant_experience → new ENUM ✓";

    $status = 'SUCCESS';
} catch (Exception $e) {
    $results[] = "ERROR: " . $e->getMessage();
    $status = 'FAILED';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Experience Migration</title>
    <style>
        body { font-family: monospace; background: #0f0f1a; color: #e2e8f0; padding: 40px; }
        h1   { color: <?= $status === 'SUCCESS' ? '#10b981' : '#ef4444' ?>; }
        ul   { line-height: 2; }
        li   { padding: 4px 0; border-bottom: 1px solid #1e293b; }
        .ok  { color: #10b981; }
        .err { color: #ef4444; }
    </style>
</head>
<body>
    <h1>Migration: <?= $status ?></h1>
    <ul>
        <?php foreach ($results as $r): ?>
            <li class="<?= str_contains($r, 'ERROR') ? 'err' : 'ok' ?>"><?= htmlspecialchars($r) ?></li>
        <?php endforeach; ?>
    </ul>
    <p style="margin-top:30px;color:#64748b">
        ✅ Migration complete. You can now delete this file: <code>migrate_experience_tiers.php</code>
    </p>
</body>
</html>
