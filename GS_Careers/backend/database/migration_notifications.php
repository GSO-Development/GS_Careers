<?php
// ============================================
// Migration: Create Notifications Tables & Backfill
// ============================================
require_once __DIR__ . '/../config.php';

try {
    $db = getDB();
    echo "Starting Notifications Migration...\n";

    // 1. Create notifications table
    $db->exec("
        CREATE TABLE IF NOT EXISTS `notifications` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `type` varchar(50) NOT NULL,
            `title` varchar(255) NOT NULL,
            `message` text NOT NULL,
            `application_id` int(11) DEFAULT NULL,
            `vacancy_id` int(11) DEFAULT NULL,
            `company_id` int(11) DEFAULT NULL,
            `candidate_name` varchar(255) NOT NULL,
            `candidate_email` varchar(255) DEFAULT NULL,
            `candidate_phone` varchar(50) DEFAULT NULL,
            `vacancy_title` varchar(255) DEFAULT NULL,
            `vacancy_ref` varchar(100) DEFAULT NULL,
            `company_name` varchar(255) DEFAULT NULL,
            `interview_type` varchar(50) DEFAULT NULL,
            `interview_date` date DEFAULT NULL,
            `interview_time` varchar(50) DEFAULT NULL,
            `interview_location` text DEFAULT NULL,
            `response_status` varchar(50) NOT NULL,
            `is_read` tinyint(1) DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_company_id` (`company_id`),
            KEY `idx_vacancy_id` (`vacancy_id`),
            KEY `idx_application_id` (`application_id`),
            KEY `idx_type` (`type`),
            KEY `idx_response_status` (`response_status`),
            KEY `idx_created_at` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Created table `notifications` (or already exists).\n";

    // 2. Create notification_reads table for per-admin read tracking
    $db->exec("
        CREATE TABLE IF NOT EXISTS `notification_reads` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `notification_id` int(11) NOT NULL,
            `admin_id` int(11) NOT NULL,
            `read_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `idx_user_notification` (`notification_id`, `admin_id`),
            KEY `idx_admin_id` (`admin_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Created table `notification_reads` (or already exists).\n";

    // 3. Backfill from audit_logs and applications if notifications is empty
    $count = $db->query("SELECT COUNT(*) FROM notifications")->fetchColumn();
    echo "Current notifications count: $count\n";

    if ($count == 0) {
        echo "Backfilling existing candidate interview events...\n";

        // A. From audit_logs with interview_confirmed_yes or interview_confirmed_no
        $auditStmt = $db->query("
            SELECT al.*, a.id as app_id, a.first_name, a.last_name, a.email, a.contact_number, 
                   a.interview_type, a.interview_date, a.interview_time, a.interview_location,
                   v.id as vac_id, v.title as vac_title, v.reference_number as vac_ref, v.company_id as vac_comp_id,
                   c.name as comp_name
            FROM audit_logs al
            LEFT JOIN vacancies v ON al.entity_id = v.id
            LEFT JOIN companies c ON (al.company_id = c.id OR v.company_id = c.id)
            LEFT JOIN applications a ON (a.vacancy_id = v.id AND (al.details LIKE CONCAT('%', a.first_name, '%') OR al.entity_name LIKE CONCAT('%', a.first_name, '%')))
            WHERE al.action IN ('interview_confirmed_yes', 'interview_confirmed_no', 'interview_scheduled')
            ORDER BY al.id ASC
        ");
        $auditRows = $auditStmt->fetchAll(PDO::FETCH_ASSOC);

        $inserted = 0;
        foreach ($auditRows as $row) {
            $isYes = $row['action'] === 'interview_confirmed_yes';
            $isNo = $row['action'] === 'interview_confirmed_no';
            $isSched = $row['action'] === 'interview_scheduled';

            $candidateName = '';
            if (preg_match('/Candidate:\s*([^|\n]+)/i', $row['details'] ?? '', $m)) {
                $candidateName = trim(explode('responded', $m[1])[0]);
            }
            if (empty($candidateName) && !empty($row['first_name'])) {
                $candidateName = $row['first_name'] . ' ' . $row['last_name'];
            }
            if (empty($candidateName)) {
                $candidateName = 'Candidate';
            }

            $vacTitle = $row['vac_title'] ?: 'Job Position';
            $vacRef = $row['vac_ref'] ?: '';
            $compName = $row['comp_name'] ?: 'George Steuart';
            $compId = $row['vac_comp_id'] ?: $row['company_id'];

            if ($isYes) {
                $type = 'interview_confirmed';
                $title = 'Interview Confirmed';
                $respStatus = 'confirmed';
                $message = "Candidate {$candidateName} has CONFIRMED the interview for {$vacTitle}.";
            } else if ($isNo) {
                $type = 'interview_declined';
                $title = 'Interview Declined';
                $respStatus = 'declined';
                $message = "Candidate {$candidateName} has DECLINED the interview for {$vacTitle}.";
            } else {
                $type = 'interview_invited';
                $title = 'Interview Invitation Sent';
                $respStatus = 'invited';
                $message = "Interview invitation scheduled for {$candidateName} for {$vacTitle}.";
            }

            $ins = $db->prepare("
                INSERT INTO notifications 
                (type, title, message, application_id, vacancy_id, company_id, candidate_name, candidate_email, candidate_phone, vacancy_title, vacancy_ref, company_name, interview_type, interview_date, interview_time, interview_location, response_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $ins->execute([
                $type,
                $title,
                $message,
                $row['app_id'] ?: null,
                $row['vac_id'] ?: null,
                $compId,
                $candidateName,
                $row['email'] ?: null,
                $row['contact_number'] ?: null,
                $vacTitle,
                $vacRef,
                $compName,
                $row['interview_type'] ?: 'Online',
                $row['interview_date'] ?: null,
                $row['interview_time'] ?: null,
                $row['interview_location'] ?: null,
                $respStatus,
                $row['created_at']
            ]);
            $inserted++;
        }
        echo "Backfilled $inserted records from audit logs.\n";

        // B. Also check applications where interview_confirmed in ('yes', 'no') or interview_date is not null
        // and ensure each application has at least its latest state recorded
        $appStmt = $db->query("
            SELECT a.id, a.first_name, a.last_name, a.email, a.contact_number, 
                   a.interview_type, a.interview_date, a.interview_time, a.interview_location,
                   a.interview_confirmed, a.applied_at,
                   v.id as vac_id, v.title as vac_title, v.reference_number as vac_ref, v.company_id,
                   c.name as comp_name
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            LEFT JOIN companies c ON v.company_id = c.id
            WHERE a.interview_confirmed IN ('yes', 'no') OR a.interview_date IS NOT NULL
        ");
        $apps = $appStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($apps as $app) {
            $candName = $app['first_name'] . ' ' . $app['last_name'];
            $isConfirmed = $app['interview_confirmed'] === 'yes';
            $isDeclined = $app['interview_confirmed'] === 'no';

            if ($isConfirmed || $isDeclined) {
                // Check if already in notifications
                $check = $db->prepare("SELECT id FROM notifications WHERE application_id = ? AND response_status = ?");
                $check->execute([$app['id'], $isConfirmed ? 'confirmed' : 'declined']);
                if (!$check->fetch()) {
                    $type = $isConfirmed ? 'interview_confirmed' : 'interview_declined';
                    $title = $isConfirmed ? 'Interview Confirmed' : 'Interview Declined';
                    $resp = $isConfirmed ? 'confirmed' : 'declined';
                    $msg = $isConfirmed 
                        ? "Candidate {$candName} has CONFIRMED the interview for {$app['vac_title']}."
                        : "Candidate {$candName} has DECLINED the interview for {$app['vac_title']}.";

                    $db->prepare("
                        INSERT INTO notifications 
                        (type, title, message, application_id, vacancy_id, company_id, candidate_name, candidate_email, candidate_phone, vacancy_title, vacancy_ref, company_name, interview_type, interview_date, interview_time, interview_location, response_status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ")->execute([
                        $type, $title, $msg, $app['id'], $app['vac_id'], $app['company_id'],
                        $candName, $app['email'], $app['contact_number'], $app['vac_title'],
                        $app['vac_ref'], $app['comp_name'], $app['interview_type'],
                        $app['interview_date'], $app['interview_time'], $app['interview_location'],
                        $resp, date('Y-m-d H:i:s')
                    ]);
                    echo "Added latest state notification for application #{$app['id']}.\n";
                }
            }
        }
    }

    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "Migration Error: " . $e->getMessage() . "\n";
}
