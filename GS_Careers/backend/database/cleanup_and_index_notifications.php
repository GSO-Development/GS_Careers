<?php
require_once __DIR__ . '/../config.php';

try {
    $db = getDB();
    echo "Starting Notifications Deduplication and Indexing...\n";

    // 1. Delete duplicate notifications where (application_id, type) is identical, keeping MAX(id)
    $stmt = $db->query("
        SELECT application_id, type, MAX(id) as keep_id, GROUP_CONCAT(id) as all_ids
        FROM notifications
        WHERE application_id IS NOT NULL
        GROUP BY application_id, type
        HAVING COUNT(*) > 1
    ");
    $dupes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $deletedCount = 0;
    foreach ($dupes as $d) {
        $allIds = array_map('intval', explode(',', $d['all_ids']));
        $keepId = (int)$d['keep_id'];
        $toDelete = array_filter($allIds, fn($id) => $id !== $keepId);

        if (!empty($toDelete)) {
            $inList = implode(',', $toDelete);
            $db->exec("DELETE FROM notification_reads WHERE notification_id IN ($inList)");
            $del = $db->exec("DELETE FROM notifications WHERE id IN ($inList)");
            $deletedCount += $del;
            echo "Cleaned duplicate {$d['type']} for Application {$d['application_id']}: kept ID {$keepId}, deleted: $inList\n";
        }
    }
    echo "Total duplicate notifications deleted: $deletedCount\n";

    // 2. Resolve applications with both confirmed AND declined response notifications
    $conflictStmt = $db->query("
        SELECT n.application_id, a.interview_confirmed,
               GROUP_CONCAT(CONCAT(n.id, ':', n.type) ORDER BY n.id DESC) as responses
        FROM notifications n
        JOIN applications a ON n.application_id = a.id
        WHERE n.type IN ('interview_confirmed', 'interview_declined')
        GROUP BY n.application_id
        HAVING COUNT(DISTINCT n.type) > 1
    ");
    $conflicts = $conflictStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($conflicts as $c) {
        $appId = (int)$c['application_id'];
        $actualResp = $c['interview_confirmed']; // 'yes' or 'no'
        $expectedType = ($actualResp === 'no') ? 'interview_declined' : 'interview_confirmed';

        // Delete any notification for this app that doesn't match the current actual status
        $wrongType = ($expectedType === 'interview_confirmed') ? 'interview_declined' : 'interview_confirmed';
        $getWrong = $db->query("SELECT id FROM notifications WHERE application_id = $appId AND type = '$wrongType'");
        $wrongIds = $getWrong->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($wrongIds)) {
            $inList = implode(',', array_map('intval', $wrongIds));
            $db->exec("DELETE FROM notification_reads WHERE notification_id IN ($inList)");
            $db->exec("DELETE FROM notifications WHERE id IN ($inList)");
            echo "Resolved conflict for Application $appId: kept $expectedType, removed $wrongType (IDs: $inList)\n";
        }
    }

    // 3. Add UNIQUE INDEX idx_uniq_app_type on notifications (application_id, type)
    // First check if index already exists
    $idxCheck = $db->query("
        SHOW INDEX FROM notifications WHERE Key_name = 'idx_uniq_app_type'
    ");
    if (!$idxCheck->fetch()) {
        $db->exec("
            ALTER TABLE notifications 
            ADD UNIQUE INDEX idx_uniq_app_type (application_id, type)
        ");
        echo "Created UNIQUE INDEX `idx_uniq_app_type` on `notifications(application_id, type)` successfully!\n";
    } else {
        echo "UNIQUE INDEX `idx_uniq_app_type` already exists.\n";
    }

    echo "Deduplication and indexing completed successfully!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
