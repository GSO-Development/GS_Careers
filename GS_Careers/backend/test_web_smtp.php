<?php
require_once 'config.php';

// Temporarily bypass admin role verification for this test
$to = 'georgesteuartit@gmail.com';
$toName = 'Manager';
$subject = 'Web SMTP Diagnostic';
$body = 'This is a test of SMTP from the Apache environment.';

$mail = new \PHPMailer\PHPMailer\PHPMailer(true);

try {
    $mail->SMTPDebug = 2; // Output debug info
    ob_start();

    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = SMTP_SECURE;
    $mail->Port       = SMTP_PORT;

    $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
    $mail->addAddress($to, $toName);
    $mail->addReplyTo(SMTP_REPLY_TO, 'Support');

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $body;

    $mail->send();
    $debug = ob_get_clean();
    echo "SUCCESS\n" . $debug;
} catch (\Exception $e) {
    $debug = ob_get_clean();
    echo "FAILURE: " . $e->getMessage() . "\n" . $debug;
}
