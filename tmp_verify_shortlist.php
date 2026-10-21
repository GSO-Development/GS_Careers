<?php
$name = 'John Doe';
$jobTitle = 'Senior Software Engineer';
$companyName = 'George Steuart Consumer (Pvt) Ltd';
$jobRef = 'GS/2026/088';
$type = 'Online / Virtual';
$date = '2026-04-10';
$time = '10:30 AM';
$location = 'https://zoom.us/j/123456789';

$currentYear = date('Y');
$html = "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background-color: #f4f7f9; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e1e8ed; }
        .header { background-color: #1a1a2e; padding: 40px 20px; text-align: center; border-bottom: 5px solid #c8a951; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 2px; font-weight: 700; }
        .header p { color: #c8a951; margin: 8px 0 0; text-transform: uppercase; font-size: 13px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 40px 35px; }
        .greeting { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
        .highlight { color: #8b1a2b; font-weight: 700; }
        .details-heading { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 30px 0 15px 0; display: flex; align-items: center; }
        .info-box { background-color: #fdfaf3; border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px solid #f1e6c9; }
        .info-item { margin-bottom: 12px; display: flex; align-items: flex-start; }
        .info-item:last-child { margin-bottom: 0; }
        .info-label { font-weight: 700; color: #475569; width: 140px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { font-weight: 600; color: #1e293b; flex: 1; font-size: 15px; }
        .next-steps { margin-top: 30px; font-size: 15px; }
        .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #edf2f7; }
        .footer p { margin: 5px 0; }
        .automated { color: #94a3b8; font-style: italic; margin-top: 20px; font-size: 11px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>GEORGE STEUART</h1>
            <p>Established 1835</p>
        </div>
        <div class='content'>
            <div class='greeting'>Dear $name,</div>
            <p>Thank you for your interest in <strong>George Steuart Group</strong> and for applying for the position of <strong>$jobTitle</strong> (Ref: $jobRef).</p>
            <p>We are pleased to inform you that you have been <span class='highlight'>shortlisted</span> for the next stage of our recruitment process.</p>
            
            <div class='details-heading'>📌 Interview Details:</div>
            <div class='info-box'>
                <div class='info-item'>
                    <div class='info-label'>Position:</div>
                    <div class='info-value'>$jobTitle</div>
                </div>
                <div class='info-item'>
                    <div class='info-label'>Job Ref No:</div>
                    <div class='info-value'>$jobRef</div>
                </div>
                <div class='info-item'>
                    <div class='info-label'>Interview Type:</div>
                    <div class='info-value'>$type</div>
                </div>
                <div class='info-item'>
                    <div class='info-label'>Date:</div>
                    <div class='info-value'>$date</div>
                </div>
                <div class='info-item'>
                    <div class='info-label'>Time:</div>
                    <div class='info-value'>$time</div>
                </div>
                <div class='info-item'>
                    <div class='info-label'>Location / Link:</div>
                    <div class='info-value'>$location</div>
                </div>
            </div>

            <div class='next-steps'>
                <p>Please confirm your availability by replying to this email or contacting our Talent Acquisition team.</p>
                <p>We look forward to learning more about you and discussing how you can contribute to our team.</p>
            </div>

            <p>Warm regards,<br>
            <strong>Talent Acquisition Team</strong><br>
            George Steuart Group</p>
        </div>
        <div class='footer'>
            <p>&copy; $currentYear George Steuart Group. All Rights Reserved.</p>
            <p>No. 439, Galle Road, Colombo 03, Sri Lanka.</p>
            <div class='automated'>*This is an automated message. Please do not reply to this email.*</div>
        </div>
    </div>
</body>
</html>
";

file_put_contents('C:/xampp/htdocs/gs-Job/shortlist_preview.html', $html);
echo "Preview generated at C:/xampp/htdocs/gs-Job/shortlist_preview.html\n";
?>
