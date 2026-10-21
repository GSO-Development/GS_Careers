<?php
// ============================================
// CV Cleanup Script - Enforce 1-Year Retention
// ============================================
require_once __DIR__ . '/../config.php';

echo "Starting CV cleanup process...\n";

$db = getDB();

try {
    // 1. Find applications older than 1 year
    $stmt = $db->prepare("SELECT id, cv_path FROM applications WHERE applied_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)");
    $stmt->execute();
    $expiredApplications = $stmt->fetchAll();

    if (empty($expiredApplications)) {
        echo "No expired applications found.\n";
        exit();
    }

    echo "Found " . count($expiredApplications) . " expired applications.\n";

    $deletedCount = 0;
    $fileDeletedCount = 0;

    foreach ($expiredApplications as $app) {
        $appId = $app['id'];
        $cvFile = $app['cv_path'];
        $fullPath = UPLOAD_DIR . $cvFile;

        // 2. Delete the CV file if it exists
        if (!empty($cvFile) && file_exists($fullPath)) {
            if (unlink($fullPath)) {
                $fileDeletedCount++;
            } else {
                echo "Warning: Failed to delete file: $fullPath\n";
            }
        }

        // 3. Delete the database record
        $delStmt = $db->prepare("DELETE FROM applications WHERE id = ?");
        if ($delStmt->execute([$appId])) {
            $deletedCount++;
        }
    }

    echo "Cleanup finished successfully.\n";
    echo "- Database records removed: $deletedCount\n";
    echo "- CV files deleted: $fileDeletedCount\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
