<?php
// ============================================
// Email Queue Processor - Background Execution
// ============================================

// Adjust path to config
require_once __DIR__ . '/../config.php';

// Prevent concurrent runs using a lock file
$lockFile = __DIR__ . '/queue.lock';
$lock = fopen($lockFile, 'w');

if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
    // Already running, exit silently
    exit();
}

$db = getDB();

try {
    // Retrieve up to 20 emails that are either pending or failed with less than 3 attempts
    $stmt = $db->prepare("SELECT * FROM email_queue WHERE status = 'pending' OR (status = 'failed' AND attempts < 3) ORDER BY created_at ASC LIMIT 20");
    $stmt->execute();
    $queuedEmails = $stmt->fetchAll();

    if (empty($queuedEmails)) {
        // Nothing to process
        flock($lock, LOCK_UN);
        fclose($lock);
        unlink($lockFile);
        exit();
    }

    foreach ($queuedEmails as $email) {
        $id = $email['id'];
        $recipientEmail = $email['recipient_email'];
        $recipientName = $email['recipient_name'];
        $subject = $email['subject'];
        $body = $email['body'];
        $attempts = $email['attempts'] + 1;

        // Update attempts and set to failed initially to prevent infinite loop on failure/crash
        $updateStmt = $db->prepare("UPDATE email_queue SET status = 'failed', attempts = ? WHERE id = ?");
        $updateStmt->execute([$attempts, $id]);

        // Attempt to send email
        $sent = sendEmail($recipientEmail, $recipientName, $subject, $body);

        if ($sent) {
            $successStmt = $db->prepare("UPDATE email_queue SET status = 'sent', last_error = NULL WHERE id = ?");
            $successStmt->execute([$id]);
        } else {
            // Log error
            global $mail; // PHPMailer object from sendEmail, but config.php sendEmail creates a local instance
            // We can fetch the last php error or mail error if possible
            $errorMsg = "SMTP sending failed. Check SMTP settings in config.php.";
            $failStmt = $db->prepare("UPDATE email_queue SET status = 'failed', last_error = ? WHERE id = ?");
            $failStmt->execute([$errorMsg, $id]);
        }

        // Add a brief sleep (e.g. 500ms) between emails to avoid hitting SMTP rate limits
        usleep(500000);
    }

} catch (Exception $e) {
    error_log("Queue processor encountered error: " . $e->getMessage());
}

// Release lock
flock($lock, LOCK_UN);
fclose($lock);
@unlink($lockFile);
?>
