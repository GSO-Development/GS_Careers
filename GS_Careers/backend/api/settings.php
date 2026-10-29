<?php
// ============================================
// Settings API (Super Admin Only)
// ============================================
require_once __DIR__ . '/../config.php';

// Authenticate admin, sub_admin, or super admin
$auth = verifyToken();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    getSettings();
} elseif ($method === 'POST') {
    if (isset($_GET['action']) && $_GET['action'] === 'test') {
        testSmtpConnection();
    } else {
        saveSettings();
    }
} else {
    jsonResponse(405, 'Method not allowed');
}

function getSettings()
{
    $db = getDB();
    $stmt = $db->prepare("SELECT setting_key, setting_value FROM settings");
    $stmt->execute();
    $results = $stmt->fetchAll();

    $settings = [];
    foreach ($results as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }

    // Default fallback values for Match Score Thresholds, Calculation Weights & Email Toggles
    $matchScoreDefaults = [
        'min_high_match_score' => '75',
        'min_medium_match_score' => '50',
        'enable_candidate_emails' => '1',
        'weight_skills' => '35',
        'weight_experience' => '30',
        'weight_qualification' => '20',
        'weight_jd_alignment' => '10',
        'weight_salary' => '5'
    ];

    foreach ($matchScoreDefaults as $key => $defaultVal) {
        if (!isset($settings[$key]) || $settings[$key] === '') {
            $settings[$key] = $defaultVal;
        }
    }

    // Default fallback values for PDPA settings
    $pdpaDefaults = [
        'pdpa_title' => 'Personal Data Protection Act (PDPA) Compliance',
        'pdpa_description' => 'In accordance with the Personal Data Protection Act (PDPA), we require your explicit consent to store, process, and retain your CV and personal information for future job openings.',
        'pdpa_purpose' => 'Your details will be accessed by our HR team to match you with suitable future career opportunities.',
        'pdpa_retention' => 'If consented, your data will be securely stored in our Talent Pool for a maximum duration of 1 year.',
        'pdpa_security' => 'All personal data is processed under strict confidentiality and industry-standard security measures.',
        'pdpa_rights' => 'You can withdraw your consent at any time by contacting our HR department.'
    ];

    foreach ($pdpaDefaults as $key => $defaultVal) {
        if (!isset($settings[$key]) || $settings[$key] === '') {
            $settings[$key] = $defaultVal;
        }
    }

    // Default fallback values for Email templates (Full HTML Structures)
    $emailDefaults = [
        'email_template_confirmation_subject' => 'Application Received - {job_title} | George Steuart Group',
        'email_template_confirmation_body' => '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Application Received - George Steuart Group</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, p, a, span { font-family: Arial, sans-serif !important; }
    </style>
    <![endif]-->
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }

        @media only screen and (max-width: 620px) {
            .mobile-wrapper { width: 100% !important; padding: 10px !important; }
            .mobile-card { width: 100% !important; border-radius: 12px !important; }
            .mobile-content { padding: 26px 20px !important; }
            .info-label-cell { width: 100% !important; display: block !important; padding-bottom: 2px !important; }
            .info-value-cell { width: 100% !important; display: block !important; padding-bottom: 12px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f1f5f9; table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 35px 12px;">
                <!--[if mso]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" role="presentation">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mobile-wrapper" style="max-width: 600px; margin: 0 auto;">
                    <tr>
                        <td>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mobile-card" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);">
                                <!-- Prestigious Brand Header -->
                                <tr>
                                    <td align="center" style="background-color: #0f172a; padding: 36px 24px 28px; border-bottom: 4px solid #c8a951;">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                                            <tr>
                                                <td align="center" style="font-family: \'Times New Roman\', Georgia, serif; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: 3.5px; text-transform: uppercase;">
                                                    GEORGE STEUART
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="padding-top: 6px;">
                                                    <span style="display: inline-block; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 10px; font-weight: 800; color: #c8a951; letter-spacing: 2px; text-transform: uppercase; background-color: rgba(200, 169, 81, 0.12); padding: 3px 12px; border-radius: 20px; border: 1px solid rgba(200, 169, 81, 0.35);">
                                                        ESTABLISHED 1835 &bull; SRI LANKA
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Status Notification Ribbon -->
                                <tr>
                                    <td style="background-color: #ecfdf5; border-bottom: 1px solid #d1fae5; padding: 11px 24px; text-align: center;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                            <tr>
                                                <td align="center" style="font-size: 12px; font-weight: 700; color: #065f46; letter-spacing: 0.5px; text-transform: uppercase;">
                                                    &#10003; Application Successfully Logged &bull; Ref: {ref_no}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Main Body Content -->
                                <tr>
                                    <td class="mobile-content" style="padding: 36px 36px 32px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.65;">
                                        
                                        <!-- Greeting -->
                                        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                                            Dear {name},
                                        </h2>

                                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.65;">
                                            Thank you for your interest in joining <strong style="color: #0f172a;">George Steuart Group</strong>. We have successfully received your application for the position of <strong style="color: #0f172a;">{job_title}</strong> and your profile is now under evaluation by our Talent Acquisition team.
                                        </p>

                                        <!-- Application Summary Card -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #c8a951; border-radius: 10px; margin-bottom: 28px; overflow: hidden;">
                                            <tr>
                                                <td style="background-color: #f1f5f9; padding: 10px 20px; border-bottom: 1px solid #e2e8f0;">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px;">
                                                                Application Summary
                                                            </td>
                                                            <td align="right" style="font-size: 11px; font-weight: 700; color: #059669;">
                                                                &#9679; Under Review
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 18px 20px;">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                                        <tr>
                                                            <td class="info-label-cell" width="34%" valign="top" style="padding: 7px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                                                                Position Applied
                                                            </td>
                                                            <td class="info-value-cell" width="66%" valign="top" style="padding: 7px 0; font-size: 14.5px; font-weight: 700; color: #0f172a;">
                                                                {job_title}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td class="info-label-cell" width="34%" valign="top" style="padding: 7px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                                                                Job Reference No
                                                            </td>
                                                            <td class="info-value-cell" width="66%" valign="top" style="padding: 7px 0; font-size: 13.5px; font-weight: 600; color: #0f172a;">
                                                                <span style="font-family: \'SFMono-Regular\', Consolas, Monaco, monospace; background-color: #ffffff; padding: 3px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700; color: #1e293b; display: inline-block;">
                                                                    {ref_no}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td class="info-label-cell" width="34%" valign="top" style="padding: 7px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                                                                Operating Entity
                                                            </td>
                                                            <td class="info-value-cell" width="66%" valign="top" style="padding: 7px 0; font-size: 14px; font-weight: 600; color: #334155;">
                                                                {company}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Sign-off -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
                                            <tr>
                                                <td>
                                                    <p style="margin: 0; font-size: 14px; color: #64748b;">
                                                        Warm regards,
                                                    </p>
                                                    <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">
                                                        Talent Acquisition &amp; People Operations
                                                    </p>
                                                    <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 600; color: #c8a951;">
                                                        George Steuart Group
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td align="center" style="background-color: #0f172a; padding: 28px 24px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                                        <span style="font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">GEORGE STEUART GROUP</span><br />
                                        <span style="font-size: 11px; color: #c8a951; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Sri Lanka\'s Oldest Mercantile Establishment &bull; Estd. 1835</span><br />
                                        <span style="display: inline-block; margin-top: 8px; color: #94a3b8; font-size: 11.5px;">No. 439, Galle Road, Colombo 03, Sri Lanka</span><br />
                                        <table border="0" cellpadding="0" cellspacing="0" width="80%" role="presentation" style="margin: 16px auto 14px;">
                                            <tr>
                                                <td style="border-top: 1px solid rgba(255, 255, 255, 0.12); height: 1px; line-height: 1px;">&nbsp;</td>
                                            </tr>
                                        </table>
                                        <span style="font-size: 10.5px; color: #64748b; display: inline-block;">
                                            &copy; {current_year} George Steuart &amp; Company Ltd. All Rights Reserved.<br />
                                            This is an automated recruitment communication. Please do not reply directly to this email.
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>
',

        'email_template_shortlist_subject' => 'Interview Invitation - {job_title} | George Steuart Group',
        'email_template_shortlist_body' => '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Interview Invitation</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f6f9; font-family: "Segoe UI", Arial, Helvetica, sans-serif; }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
        
        @media only screen and (max-width: 600px) {
            .mobile-wrapper { width: 100% !important; padding: 10px !important; }
            .mobile-content { padding: 25px 18px !important; }
            .btn-table { width: 100% !important; }
            .btn-td { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
            .btn-link { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
            .detail-label-td { display: block !important; width: 100% !important; padding-bottom: 2px !important; }
            .detail-value-td { display: block !important; width: 100% !important; padding-bottom: 12px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f4f6f9; table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 30px 10px;">
                <!--[if mso]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" role="presentation">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mobile-wrapper" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <tr>
                        <td align="center" style="background-color: #1a1a2e; padding: 32px 20px; border-bottom: 4px solid #c8a951;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">
                                        GEORGE STEUART
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 800; color: #c8a951; letter-spacing: 1.8px; text-transform: uppercase; padding-top: 4px;">
                                        ESTABLISHED 1835
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="mobile-content" style="padding: 36px 32px; font-family: \"Segoe UI\", Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #334155;">
                            <p style="margin: 0 0 18px 0; font-size: 20px; font-weight: bold; color: #0f172a;">
                                Dear {name},
                            </p>

                            <p style="margin: 0 0 24px 0;">
                                We are pleased to inform you that after reviewing your application for the position of <strong style="color: #0f172a;">{job_title}</strong> (Ref: {ref_no}), you have been <span style="background-color: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 13px; display: inline-block;">SHORTLISTED</span> for the next stage of our selection process.
                            </p>

                            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #fffaf0; border: 1px solid #fde68a; border-left: 4px solid #c8a951; border-radius: 8px; margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 22px 24px;">
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #1a1a2e; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 10px; border-bottom: 1px solid #fde68a; margin-bottom: 16px;">
                                            INTERVIEW DETAILS
                                        </div>

                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                            <tr>
                                                <td class="detail-label-td" width="110" valign="top" style="padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">TYPE</td>
                                                <td class="detail-value-td" valign="top" style="padding: 6px 0; font-family: \"Segoe UI\", Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">{interview_type}</td>
                                            </tr>
                                            <tr>
                                                <td class="detail-label-td" width="110" valign="top" style="padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">DATE</td>
                                                <td class="detail-value-td" valign="top" style="padding: 6px 0; font-family: \"Segoe UI\", Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">{interview_date}</td>
                                            </tr>
                                            <tr>
                                                <td class="detail-label-td" width="110" valign="top" style="padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">TIME</td>
                                                <td class="detail-value-td" valign="top" style="padding: 6px 0; font-family: \"Segoe UI\", Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">{interview_time}</td>
                                            </tr>
                                            <tr>
                                                <td class="detail-label-td" width="110" valign="top" style="padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">LOCATION</td>
                                                <td class="detail-value-td" valign="top" style="padding: 6px 0; font-family: \"Segoe UI\", Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">{interview_location}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 20px 0; font-weight: bold; color: #0f172a; text-align: center;">
                                Please confirm your availability for this schedule by clicking one of the buttons below:
                            </p>

                            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 24px 0;">
                                <tr>
                                    <td align="center">
                                        <!--[if mso]>
                                        <table align="center" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                        <tr>
                                        <td align="center" bgcolor="#10b981" style="border-radius:6px;">
                                            <a href="{confirm_url_yes}" target="_blank" style="padding: 14px 24px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; background-color: #10b981; border-radius: 6px;">Yes, I am available</a>
                                        </td>
                                        <td width="16">&nbsp;</td>
                                        <td align="center" bgcolor="#ef4444" style="border-radius:6px;">
                                            <a href="{confirm_url_no}" target="_blank" style="padding: 14px 24px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; background-color: #ef4444; border-radius: 6px;">No, I cannot attend</a>
                                        </td>
                                        </tr>
                                        </table>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" class="btn-table" style="margin: 0 auto;">
                                            <tr>
                                                <td align="center" bgcolor="#10b981" class="btn-td" style="border-radius: 6px; background-color: #10b981;">
                                                    <a href="{confirm_url_yes}" target="_blank" class="btn-link" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; padding: 14px 24px; border-radius: 6px; background-color: #10b981;">Yes, I am available</a>
                                                </td>
                                                <td width="16" style="width: 16px;">&nbsp;</td>
                                                <td align="center" bgcolor="#ef4444" class="btn-td" style="border-radius: 6px; background-color: #ef4444;">
                                                    <a href="{confirm_url_no}" target="_blank" class="btn-link" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; padding: 14px 24px; border-radius: 6px; background-color: #ef4444;">No, I cannot attend</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0 0 0;">
                                We look forward to discussing your potential contribution to George Steuart Group.
                            </p>

                            <p style="margin: 28px 0 0 0; line-height: 1.5;">
                                Best regards,<br />
                                <strong style="color: #0f172a;">Talent Acquisition Team</strong><br />
                                <span style="color: #64748b; font-size: 14px;">George Steuart Group</span>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="background-color: #f8fafc; padding: 24px 20px; border-top: 1px solid #e2e8f0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                            &#169; {current_year} George Steuart Group. All Rights Reserved.<br />
                            <span style="font-size: 11px; color: #cbd5e1; display: inline-block; margin-top: 6px;">This is an automated notification. Please do not reply directly to this message.</span>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>',

        'email_template_rejection_subject' => 'Application Status Update - {job_title} | George Steuart Group',
        'email_template_rejection_body' => '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #475569; margin: 0; padding: 0; background-color: #f8fafc; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background-color: #1a1a2e; padding: 40px 20px; text-align: center; border-bottom: 4px solid #ef4444; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
        .header p { color: #ef4444; margin: 5px 0 0; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; }
        .content { padding: 40px 35px; }
        .greeting { font-size: 20px; color: #1a1a2e; margin-bottom: 24px; font-weight: 700; }
        .info-bar { background-color: #f1f5f9; padding: 12px 20px; border-radius: 8px; font-size: 13px; color: #64748b; margin-bottom: 25px; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin-top: 10px !important; border-radius: 8px !important; }
            .content { padding: 25px 20px !important; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>GEORGE STEUART</h1>
                <p>ESTABLISHED 1835</p>
            </div>
            <div class="content">
                <div class="greeting">Dear {name},</div>
                <div class="info-bar">Position: {job_title} | Ref: {ref_no}</div>
                <p>Thank you for the time and effort you invested in applying for the position of <strong>{job_title}</strong> at <strong>{company}</strong>.</p>
                
                <p>After a thorough review of all applications, we regret to inform you that we will not be moving forward with your candidacy at this time. Our team received a significant number of competitive applications, making our selection process extremely competitive.</p>
                
                <p>We truly appreciate your interest in George Steuart Group and encourage you to apply for other positions that align with your expertise in the future.</p>
                
                <p style="margin-bottom: 0;">We wish you the very best in your professional endeavors.</p>
                
                <p style="margin-top: 30px;">Sincerely,<br>
                <strong style="color: #1a1a2e;">Talent Acquisition Team</strong><br>
                George Steuart Group</p>
            </div>
            <div class="footer">
                &copy; {current_year} George Steuart Group. All Rights Reserved.<br>
                No. 439, Galle Road, Colombo 03, Sri Lanka.<br>
            </div>
        </div>
    </div>
</body>
</html>',

        // Vacancy Requisition Workflow Templates
        'email_template_vacancy_pending_subject' => 'Action Required: Vacancy Requisition Pending Approval - {ref_no}',
        'email_template_vacancy_pending_body' => '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f0f4f8; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f0f4f8; padding-bottom: 40px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background-color: #1a1a2e; padding: 40px 20px; text-align: center; border-bottom: 5px solid #c8a951; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
        .header p { color: #c8a951; margin: 5px 0 0; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; }
        .content { padding: 40px 35px; }
        .greeting { font-size: 14px; color: #64748b; margin-bottom: 6px; }
        .status-pill { display: inline-block; background-color: #ffedd5; color: #c2410c; padding: 5px 14px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border: 1px solid #fed7aa; }
        .details-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0; }
        .details-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table td { padding: 8px 0; font-size: 14px; }
        .info-label { color: #64748b; font-weight: 700; width: 150px; }
        .info-value { color: #1e293b; font-weight: 600; }
        .note-box { background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 18px; margin-bottom: 28px; }
        .note-title { margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #c2410c; text-transform: uppercase; letter-spacing: 0.5px; }
        .note-desc { margin: 0; font-size: 13px; color: #475569; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
        .btn-link { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; color: #ffffff !important; background-color: #c8a951; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin-top: 10px !important; border-radius: 8px !important; }
            .content { padding: 25px 20px !important; }
            .info-table td { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 4px 0 !important; }
            .info-label { width: 100% !important; }
            .btn-link { display: block !important; width: auto !important; text-align: center !important; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>GEORGE STEUART</h1>
                <p>ESTABLISHED 1835</p>
            </div>
            <div class="content">
                <p class="greeting">Dear <strong>{reviewer_name}</strong>,</p>
                <div class="status-pill">Pending Your Approval</div>
                <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#1a0208;line-height:1.3;">Requisition Requires Your Review</h2>
                
                <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.6;">A new job vacancy requisition has been submitted and is awaiting your approval before it proceeds to publication.</p>
                
                <div class="details-box">
                    <div class="details-title">Requisition Details</div>
                    <table class="info-table">
                        <tr>
                            <td class="info-label">Position / Title</td>
                            <td class="info-value">{job_title}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Reference No.</td>
                            <td class="info-value" style="color:#C8A951; font-family:monospace;">{ref_no}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Company</td>
                            <td class="info-value">{company}</td>
                        </tr>
                    </table>
                </div>

                <div class="note-box">
                    <div class="note-title">⚠️ Action Required</div>
                    <p class="note-desc">Please review the details carefully and either approve to publish/forward it, or reject it with comments.</p>
                </div>

                <div style="text-align:center;margin-bottom:8px;">
                    <a href="{review_url}" class="btn-link">Review & Approve Requisition</a>
                </div>
            </div>
            <div class="footer">
                &copy; {current_year} George Steuart Group. All Rights Reserved.<br>
                <p style="font-size: 10px; margin-top: 10px;">This is an automated system notification. Please do not reply.</p>
            </div>
        </div>
    </div>
</body>
</html>',

        'email_template_vacancy_approved_subject' => 'Vacancy Approved & Published — {ref_no}',
        'email_template_vacancy_approved_body' => '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f0f4f8; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f0f4f8; padding-bottom: 40px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background-color: #1a1a2e; padding: 40px 20px; text-align: center; border-bottom: 5px solid #c8a951; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
        .header p { color: #c8a951; margin: 5px 0 0; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; }
        .content { padding: 40px 35px; }
        .greeting { font-size: 14px; color: #64748b; margin-bottom: 6px; }
        .status-pill { display: inline-block; background-color: #e2fbf0; color: #10b981; padding: 5px 14px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border: 1px solid #bbf7d0; }
        .details-box { background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #bbf7d0; }
        .details-title { font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table td { padding: 8px 0; font-size: 14px; }
        .info-label { color: #15803d; font-weight: 700; width: 150px; }
        .info-value { color: #166534; font-weight: 600; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
        .btn-link { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; color: #ffffff !important; background-color: #10b981; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin-top: 10px !important; border-radius: 8px !important; }
            .content { padding: 25px 20px !important; }
            .info-table td { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 4px 0 !important; }
            .info-label { width: 100% !important; }
            .btn-link { display: block !important; width: auto !important; text-align: center !important; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>GEORGE STEUART</h1>
                <p>ESTABLISHED 1835</p>
            </div>
            <div class="content">
                <p class="greeting">Dear <strong>{recipient_name}</strong>,</p>
                <div class="status-pill">Approved & Published</div>
                <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#166534;line-height:1.3;">🎉 Vacancy Approved & Published</h2>
                
                <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.6;">Great news! The job vacancy requisition has been approved and is now successfully published and live on the careers portal. Candidates can now view and apply for this position.</p>
                
                <div class="details-box">
                    <div class="details-title">Approved Requisition</div>
                    <table class="info-table">
                        <tr>
                            <td class="info-label">Position / Title</td>
                            <td class="info-value">{job_title}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Reference No.</td>
                            <td class="info-value" style="color:#16a34a; font-family:monospace;">{ref_no}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Company</td>
                            <td class="info-value">{company}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align:center;margin-bottom:8px;">
                    <a href="{review_url}" class="btn-link">View Vacancy in Portal</a>
                </div>
            </div>
            <div class="footer">
                &copy; {current_year} George Steuart Group. All Rights Reserved.<br>
                <p style="font-size: 10px; margin-top: 10px;">This is an automated system notification. Please do not reply.</p>
            </div>
        </div>
    </div>
</body>
</html>',

        'email_template_vacancy_rejected_subject' => 'Vacancy Returned for Revision - {ref_no}',
        'email_template_vacancy_rejected_body' => '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f0f4f8; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f0f4f8; padding-bottom: 40px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background-color: #1a1a2e; padding: 40px 20px; text-align: center; border-bottom: 5px solid #ef4444; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
        .header p { color: #ef4444; margin: 5px 0 0; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; }
        .content { padding: 40px 35px; }
        .greeting { font-size: 14px; color: #64748b; margin-bottom: 6px; }
        .status-pill { display: inline-block; background-color: #fff5f5; color: #c53030; padding: 5px 14px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border: 1px solid #feb2b2; }
        .feedback-box { background: linear-gradient(135deg, #fff5f5 0%, #fffbfb 100%); border: 1px solid #feb2b2; border-left: 4px solid #e53e3e; border-radius: 10px; padding: 20px; margin-bottom: 28px; }
        .feedback-title { margin: 0 0 8px; font-size: 11px; font-weight: 800; color: #c53030; text-transform: uppercase; letter-spacing: 0.8px; }
        .feedback-desc { margin: 0; font-size: 14px; color: #2d3748; font-weight: 600; line-height: 1.6; font-style: italic; }
        .details-box { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 28px; }
        .details-title { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 14px; }
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table td { padding: 8px 0; font-size: 14px; }
        .info-label { color: #64748b; font-weight: 700; width: 150px; }
        .info-value { color: #1e293b; font-weight: 600; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
        .btn-link { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; color: #ffffff !important; background-color: #e53e3e; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin-top: 10px !important; border-radius: 8px !important; }
            .content { padding: 25px 20px !important; }
            .info-table td { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 4px 0 !important; }
            .info-label { width: 100% !important; }
            .btn-link { display: block !important; width: auto !important; text-align: center !important; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>GEORGE STEUART</h1>
                <p>ESTABLISHED 1835</p>
            </div>
            <div class="content">
                <p class="greeting">Dear <strong>{recipient_name}</strong>,</p>
                <div class="status-pill">Revision Required</div>
                <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#e53e3e;line-height:1.3;">Vacancy Requisition Returned for Revision</h2>
                
                <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.6;">The vacancy requisition you submitted has been reviewed and has been returned with feedback for revision.</p>
                
                <div class="feedback-box">
                    <div class="feedback-title">Reviewer Feedback & Reason</div>
                    <p class="feedback-desc">&ldquo;{reason}&rdquo;</p>
                </div>

                <div class="details-box">
                    <div class="details-title">Requisition Details</div>
                    <table class="info-table">
                        <tr>
                            <td class="info-label">Position / Title</td>
                            <td class="info-value">{job_title}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Reference No.</td>
                            <td class="info-value" style="color:#b91c1c; font-family:monospace;">{ref_no}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Company</td>
                            <td class="info-value">{company}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align:center;margin-bottom:8px;">
                    <a href="{review_url}" class="btn-link">Edit & Resubmit Requisition</a>
                </div>
            </div>
            <div class="footer">
                &copy; {current_year} George Steuart Group. All Rights Reserved.<br>
                <p style="font-size: 10px; margin-top: 10px;">This is an automated system notification. Please do not reply.</p>
            </div>
        </div>
    </div>
</body>
</html>'
    ];

    foreach ($emailDefaults as $key => $defaultVal) {
        if (!isset($settings[$key]) || $settings[$key] === '' || (strpos($key, '_body') !== false && strpos($settings[$key], '<!DOCTYPE html>') === false)) {
            $settings[$key] = $defaultVal;
        }
    }

    // Add default fallback email from config constant
    $settings['default_email'] = defined('SMTP_USER') ? SMTP_USER : '';
    $settings['default_smtp_host'] = defined('SMTP_HOST') ? SMTP_HOST : '';
    $settings['default_smtp_port'] = defined('SMTP_PORT') ? SMTP_PORT : '';
    $settings['default_smtp_secure'] = defined('SMTP_SECURE') ? SMTP_SECURE : '';
    $settings['default_smtp_user'] = defined('SMTP_USER') ? SMTP_USER : '';
    $settings['default_smtp_from_name'] = defined('SMTP_FROM_NAME') ? SMTP_FROM_NAME : '';

    // Auto-sync fallback from .env if database is empty
    $envGeminiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : (getenv('GEMINI_API_KEY') ?: '');
    if (!empty($envGeminiKey) && empty($settings['gemini_api_key'])) {
        $settings['gemini_api_key'] = $envGeminiKey;
        $db = getDB();
        $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('gemini_api_key', ?) ON DUPLICATE KEY UPDATE setting_value = ?")->execute([$envGeminiKey, $envGeminiKey]);
    }

    // If Sub Admin, strip sensitive credentials (SMTP password & Gemini API keys)
    global $auth;
    if ($auth && ($auth['role'] === 'sub_admin1' || $auth['role'] === 'sub_admin2' || $auth['role'] === 'sub_admin')) {
        unset($settings['smtp_pass'], $settings['gemini_api_key'], $settings['gemini_api_key_backup']);
    }

    $settings['email_template_confirmation_body'] = removeConfirmationSelectionRoadmap($settings['email_template_confirmation_body']);

    jsonResponse(200, 'Settings retrieved', $settings);
}

function saveSettings()
{
    global $auth;
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        jsonResponse(400, 'Invalid settings data');
    }

    // Default Overall Calculation Formula weights can ONLY be edited by super_admin
    $formulaWeightKeys = [
        'weight_skills',
        'weight_experience',
        'weight_qualification',
        'weight_jd_alignment',
        'weight_salary'
    ];
    if (!$auth || $auth['role'] !== 'super_admin') {
        foreach ($formulaWeightKeys as $wKey) {
            unset($input[$wKey]);
        }
    }

    // Sub Admins are only allowed to modify Match Score algorithm thresholds
    if ($auth && ($auth['role'] === 'sub_admin1' || $auth['role'] === 'sub_admin2' || $auth['role'] === 'sub_admin')) {
        $allowedMatchScoreKeys = [
            'min_high_match_score',
            'min_medium_match_score'
        ];
        $input = array_intersect_key($input, array_flip($allowedMatchScoreKeys));
        if (empty($input)) {
            jsonResponse(400, 'No valid match score settings provided');
        }
    }

    $db = getDB();
    $db->beginTransaction();

    try {
        // Fetch current settings for diff comparison
        $stmtCurr = $db->query("SELECT setting_key, setting_value FROM settings");
        $currSettings = [];
        while ($r = $stmtCurr->fetch(PDO::FETCH_ASSOC)) {
            $currSettings[$r['setting_key']] = $r['setting_value'];
        }

        $changedWeights = [];
        $changedThresholds = [];
        $changedOther = [];

        foreach ($input as $key => $value) {
            $key = sanitize($key);
            $value = sanitize($value);

            // Skip updating sensitive keys if they are masked
            if ($key === 'smtp_pass' && $value === '********') {
                continue;
            }

            // Validate email format if key is system_email and not empty
            if ($key === 'system_email' && !empty($value)) {
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    jsonResponse(400, 'Invalid email address format');
                }
            }

            $oldVal = $currSettings[$key] ?? '';
            if ((string)$oldVal !== (string)$value) {
                if (strpos($key, 'weight_') === 0) {
                    $changedWeights[$key] = ['old' => $oldVal, 'new' => $value];
                } elseif (strpos($key, 'min_') === 0 && strpos($key, '_match_score') !== false) {
                    $changedThresholds[$key] = ['old' => $oldVal, 'new' => $value];
                } else {
                    $isSecret = in_array($key, ['smtp_pass', 'gemini_api_key', 'gemini_api_key_backup']);
                    $changedOther[$key] = [
                        'old' => $isSecret ? '********' : $oldVal,
                        'new' => $isSecret ? '********' : $value
                    ];
                }
            }

            // Insert or update setting
            $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
            $stmt->execute([$key, $value, $value]);

            // Auto-sync relevant configuration keys to backend/.env file
            if ($key === 'gemini_api_key' && !empty($value)) {
                updateEnvVariable('GEMINI_API_KEY', $value);
            } elseif ($key === 'ollama_server' && !empty($value)) {
                updateEnvVariable('OLLAMA_SERVER', $value);
            } elseif ($key === 'ollama_model' && !empty($value)) {
                updateEnvVariable('OLLAMA_MODEL', $value);
            }
        }

        $db->commit();

        // Audit Logging
        $adminId = $auth['admin_id'] ?? null;

        if (!empty($changedWeights)) {
            $oldVals = array_map(fn($item) => $item['old'], $changedWeights);
            $newVals = array_map(fn($item) => $item['new'], $changedWeights);
            $descList = [];
            foreach ($changedWeights as $wK => $wV) {
                $cleanK = ucwords(str_replace(['weight_', '_'], ['', ' '], $wK));
                $descList[] = "$cleanK ({$wV['old']}% → {$wV['new']}%)";
            }
            $desc = "Adjusted Candidate Score Calculation weights: " . implode(', ', $descList);
            logSystemAudit($adminId, 'settings', 'update_weights', 'setting', 'calculation_weights', 'Calculation Formula (5 Dimensions)', $desc, $oldVals, $newVals);
        }

        if (!empty($changedThresholds)) {
            $oldVals = array_map(fn($item) => $item['old'], $changedThresholds);
            $newVals = array_map(fn($item) => $item['new'], $changedThresholds);
            $descList = [];
            foreach ($changedThresholds as $tK => $tV) {
                $cleanK = ucwords(str_replace(['min_', '_match_score', '_'], ['', '', ' '], $tK));
                $descList[] = "$cleanK ({$tV['old']}% → {$tV['new']}%)";
            }
            $desc = "Updated Candidate Match Score Thresholds: " . implode(', ', $descList);
            logSystemAudit($adminId, 'settings', 'update_thresholds', 'setting', 'match_thresholds', 'Evaluation Benchmarks Cutoffs', $desc, $oldVals, $newVals);
        }

        if (!empty($changedOther)) {
            $keysUpdated = implode(', ', array_keys($changedOther));
            $desc = "Updated portal configuration settings: $keysUpdated";
            $oldVals = array_map(fn($item) => $item['old'], $changedOther);
            $newVals = array_map(fn($item) => $item['new'], $changedOther);
            logSystemAudit($adminId, 'settings', 'update_settings', 'setting', 'general_settings', 'Portal System Settings', $desc, $oldVals, $newVals);
        }

        jsonResponse(200, 'Settings saved successfully');
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(500, 'Failed to save settings: ' . $e->getMessage());
    }
}

function testSmtpConnection()
{
    global $auth;
    if (!$auth || ($auth['role'] !== 'super_admin' && $auth['role'] !== 'admin')) {
        jsonResponse(403, 'Permission denied');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        jsonResponse(400, 'Invalid settings data');
    }

    // Retrieve input values
    $smtp_host = sanitize($input['smtp_host'] ?? '');
    $smtp_port = isset($input['smtp_port']) ? (int)$input['smtp_port'] : 0;
    $smtp_secure = sanitize($input['smtp_secure'] ?? '');
    $smtp_user = sanitize($input['smtp_user'] ?? '');
    $smtp_pass = sanitize($input['smtp_pass'] ?? '');
    $smtp_from_name = sanitize($input['smtp_from_name'] ?? '');
    $system_email = sanitize($input['system_email'] ?? '');
    $test_recipient = sanitize($input['test_recipient'] ?? '');

    // Validation
    if (empty($system_email) || !filter_var($system_email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(400, 'Invalid sender email address');
    }
    if (empty($test_recipient) || !filter_var($test_recipient, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(400, 'Invalid test recipient email address');
    }

    // Fallbacks if empty
    if (empty($smtp_host)) $smtp_host = SMTP_HOST;
    if (empty($smtp_port)) $smtp_port = SMTP_PORT;
    if (empty($smtp_secure)) $smtp_secure = SMTP_SECURE;
    if (empty($smtp_user)) $smtp_user = SMTP_USER;
    if (empty($smtp_from_name)) $smtp_from_name = SMTP_FROM_NAME;
    
    // If password is '********', retrieve the saved password from database
    if ($smtp_pass === '********') {
        try {
            $db = getDB();
            $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'smtp_pass'");
            $stmt->execute();
            $saved_pass = $stmt->fetchColumn();
            $smtp_pass = !empty($saved_pass) ? $saved_pass : SMTP_PASS;
        } catch (\Exception $ex) {
            $smtp_pass = SMTP_PASS;
        }
    } else if (empty($smtp_pass)) {
        $smtp_pass = SMTP_PASS;
    }

    // Attempt PHPMailer connection
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    
    // Set up debug capture
    $debugLog = "";
    $mail->SMTPDebug = 2;
    $mail->Debugoutput = function ($str, $level) use (&$debugLog) {
        $debugLog .= $str . "\n";
    };

    try {
        $mail->isSMTP();
        $mail->Host       = $smtp_host;
        $mail->SMTPAuth   = true;
        $mail->Username   = $smtp_user;
        $mail->Password   = $smtp_pass;
        $mail->SMTPSecure = $smtp_secure;
        $mail->Port       = $smtp_port;
        $mail->Timeout    = 12;

        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );

        $mail->setFrom($system_email, $smtp_from_name);
        $mail->addAddress($test_recipient, 'Test Recipient');
        $mail->isHTML(true);
        $mail->Subject = 'George Steuart SMTP Portal Verification';
        $mail->Body    = '<h3>SMTP Setup Works Perfectly!</h3>'
                       . '<p>Your George Steuart careers portal settings have been successfully tested and verified.</p>'
                       . '<ul>'
                       . '<li><strong>Sender Email:</strong> ' . htmlspecialchars($system_email) . '</li>'
                       . '<li><strong>SMTP Host:</strong> ' . htmlspecialchars($smtp_host) . '</li>'
                       . '<li><strong>SMTP Port:</strong> ' . htmlspecialchars($smtp_port) . '</li>'
                       . '<li><strong>SMTP Username:</strong> ' . htmlspecialchars($smtp_user) . '</li>'
                       . '</ul>';

        $mail->send();
        jsonResponse(200, 'Test email sent successfully', [
            'debug' => $debugLog
        ]);
    } catch (\Exception $e) {
        jsonResponse(500, 'SMTP connection test failed: ' . $mail->ErrorInfo, [
            'debug' => $debugLog
        ]);
    }
}
?>
