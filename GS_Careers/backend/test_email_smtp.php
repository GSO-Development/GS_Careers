<?php
// ============================================
// SMTP Connectivity Diagnostic Tool
// ============================================

require_once __DIR__ . '/config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

header('Content-Type: text/plain');
ob_implicit_flush(true);
while (ob_get_level() > 0) ob_end_flush();

echo "--- GEORGE STEUART SMTP DIAGNOSTIC ---\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n\n";

if (!EMAIL_ENABLED) {
    die("ERROR: EMAIL_ENABLED is set to FALSE in config.php. Please set it to TRUE to test.\n");
}

echo "Step 1: Checking Config Settings...\n";
echo "Host: " . SMTP_HOST . "\n";
echo "Port: " . SMTP_PORT . "\n";
echo "User: " . SMTP_USER . "\n";
echo "Secure: " . SMTP_SECURE . "\n\n";

echo "Step 2: Attempting SMTP Connection...\n";

$mail = new PHPMailer(true);

try {
    // Enable full debug output
    $mail->SMTPDebug = SMTP::DEBUG_SERVER;
    $mail->Debugoutput = function ($str, $level) {
        echo "DEBUG: $str\n";
    };

    $mail->isSMTP();
    $mail->Host = SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = SMTP_USER;
    $mail->Password = SMTP_PASS;
    $mail->SMTPSecure = (SMTP_SECURE === 'tls') ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = SMTP_PORT;
    $mail->Timeout = 15;
    $mail->SMTPKeepAlive = false;

    // SSL Bypass for local environments
    $mail->SMTPOptions = array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );

    $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
    $mail->addAddress(SMTP_USER, 'SMTP Test User');

    $mail->isHTML(true);
    $mail->Subject = 'George Steuart SMTP Diagnostic Test';
    $mail->Body = '<h1>SMTP Test Successful</h1><p>If you see this, your George Steuart portal email configuration is 100% correct!</p>';

    echo "\nStep 3: Sending Test Email...\n";
    $mail->send();
    echo "\nSUCCESS: Test email sent successfully to prathibhajay098@gmail.com!\n";
    echo "Check the inbox (and spam folder) to confirm.\n";

}
catch (Exception $e) {
    echo "\nFAILED: Email could not be sent.\n";
    echo "Mailer Error: {$mail->ErrorInfo}\n";
    echo "\nTROUBLESHOOTING TIPS:\n";
    echo "1. If using Gmail, make sure you have generated an 'App Password'.\n";
    echo "2. Check if Port 587 (TLS) or 465 (SSL) is allowed by your firewall.\n";
    echo "3. Verify your SMTP_USER matches your authenticated account.\n";
}
