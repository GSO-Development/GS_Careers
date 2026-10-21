<?php
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$nethminiText = <<<EOT
Nethmini Niresha Rajamanthri
0718787015/ 0782398873| nethminirajamanthri@gmail.com |
 Nethmini-Rajamanthri |  Nethmini-Niresha |
Kaduwela, Sri Lanka
OBJECTIVE
A dedicated and enthusiastic graduate with strong analytical and technical skills. Passionate about learning new
technologies and applying knowledge to solve real-world problems. I am a responsible team player with good
communication skills, seeking an opportunity to grow professionally while contributing effectively to a dynamic
organization.
EXPERIENCE
• Abans Group PLC December 2024 - August 2026
Junior Network Administrator Colombo 03, Sri Lanka
◦ Delivered enterprise IT deployment and Network support services across Abans Client sites, Including HNB Head
Office and The Ministry Of Education
CLIENT ASSIGNMENTS
HNB Head Office – IT Deployment Support May 2025 -July 2025
Client-site assignment through Abans Group PLC Colombo 10, Sri Lanka
◦ Installed operating systems and approved software across 500 desktop computers for the HNB Head Office
deployment.
◦ Installed and configured CrowdStrike Endpoint Security to support endpoint protection requirements.
◦ Configured required Control Panel settings, created administrator accounts, and verified each computer before
handover.
Ministry of Education – Network and Smart Classroom Support Jan 2025- June 2026
Client-site assignment through Abans Group PLC Pelawatta, Sri Lanka
◦ Provided on-site technical service for the deployment and operation of Huawei switches, access points,
SmartBoards, and video-conferencing equipment.
◦ Supported device integration, network monitoring, troubleshooting, and routine maintenance in line with
project IT standards.
◦ Used Huawei iMaster NCE Campus for performance monitoring and issue identification to support service
continuity.
EDUCATION
• Horizon Campus 2021-2025
BIT(Hons) in Networking and Mobile Computing Malabe, Sri Lanka
• Janadhipathi Balika Vidyalaya 2017-2019
Advanced Level Nawala, Sri Lanka
PROJECTS
• Bill Payment System] 2022
Tools: [Java Language, MySQ]
◦ Develop a reliable bill payment system using Java and MySQL that automates payment management, improves
accuracy, and ensures secure record handling.
• Remote Desktop Viewer Application 2023
Tools: [Java, Socket Programming]
◦ Develop a Remote Desktop Viewer application using Java and socket programming to secure real-time access,
monitoring, and control of remote systems.
• IoT Based Public Transport Solution with Digital Ticketing, Tracking and Real-Time Passenger Monitoring 2025
Tools: [Java, Python, Android Studio, IoT Devices(Raspberry Pi, Camera Modules etc.]
◦ Design an IoT-based public transport solution that enables digital ticketing, vehicle tracking, and real-time
passenger monitoring for improved efficiency, transparency, and user convenience.
SKILLS
• Networking: Networking Concepts, CISCO Configurations, Huawei Configurations
• Programming Languages: HTML, PHP, Java, C, Python
• Other Skills: Critical Thinking, Leadership, Collaboration, Time Management, Effective Communication
CERTIFICATIONS
• CCNA Certified December 2024
Cisco Networking Academy
• Introduction to Network March 2024
• Switching, Routing and Wireless Essentials May 2024
• Enterprise Networking, Security, and Automation June 2024
ADDITIONAL INFORMATION
Languages: Sinhala (Proficiency level), English(Proficiency level)
Interests: Reading, Networking, Sports, Gaming, Networking, Coding
REFERENCES
1. Mr.Buddhika Gihan Ekanayake
Solution Architect (Enterprise Solution)
Abans PLC
Email:buddhikag@abansgroup.com
Phone: 0718190318
2. Mr. Daminda Herath
Senior Lecturer
Horizon Campus
Email: damindaherath@horizoncampus.edu.lk
Phone: 0777296275
EOT;

$res = PdfExtractor::parseCvDataWithAI($nethminiText, 'Junior Network Administrator');

echo "=== FINAL EXTRACTED QUALIFICATIONS ===\n";
print_r($res['qualifications_found']);

echo "\n=== FINAL EXTRACTED CERTIFICATIONS ===\n";
print_r($res['certifications_found']);

echo "\n=== PRIMARY QUALIFICATION ===\n";
echo $res['qualification'] . "\n";
