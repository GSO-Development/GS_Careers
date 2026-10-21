<?php

class RefinedExtractor {

    public static function extractQualificationsFromCVText($cvText) {
        if (empty($cvText)) return [];

        $extracted = [];
        $lines = explode("\n", $cvText);

        $inQualSection = false;
        $qualSectionLines = [];

        foreach ($lines as $line) {
            $l = trim($line);
            if (empty($l)) continue;

            if (preg_match('/^(?:EDUCATIONAL|ACADEMIC|PROFESSIONAL)?\s*(?:QUALIFICATIONS|BACKGROUND|EDUCATION)$/i', $l)) {
                $inQualSection = true;
                continue;
            }

            if ($inQualSection && preg_match('/^(?:EXPERIENCE|WORK EXPERIENCE|TECHNICAL KNOWLEDGE|TECHNICAL SKILLS|SKILLS|CERTIFICATIONS|PROJECTS|CLIENT ASSIGNMENTS|KEY ACHIEVEMENTS|ADDITIONAL INFORMATION|PERSONAL DETAILS|LANGUAGES|REFERENCES|OBJECTIVE|SUMMARY|PROFILE)\b/i', $l)) {
                $inQualSection = false;
            }

            if ($inQualSection) {
                $qualSectionLines[] = $l;
            }
        }

        $qualPatterns = [
            '/\b(?:Bachelor[s]?|B\.?Sc\.?|B\.?A\.?|B\.?Com\.?|B\.?B\.?A\.?|B\.?I\.?T\.?|BIT(?:\(Hons\))?|B\.?Tech\.?|B\.?E\.?)(?:\s*\(Hons\))?(?:\s+of|\s+in)?\s+[A-Za-z0-9\s&().,\'-]{3,60}/i',
            '/\b(?:Master[s]?|M\.?Sc\.?|M\.?A\.?|M\.?B\.?A\.?|M\.?Com\.?|M\.?Tech\.?)(?:\s+of|\s+in)?\s+[A-Za-z0-9\s&().,\'-]{3,60}/i',
            '/\b(?:Diploma|Higher National Diploma|HND|Post\s*Graduate\s*Diploma|PG\s*Diploma|Advanced\s*Diploma|NVQ\s*Level\s*[456])(?:\s+in|\s+of)?\s+[A-Za-z0-9\s&().,\'-]{3,60}/i',
            '/\b(?:Doctorate|Ph\.?D\.?)(?:\s+in|\s+of)?\s+[A-Za-z0-9\s&().,\'-]{3,60}/i',
            '/\b(?:G\.?C\.?E\.?\s*)?(?:Advanced\s+Level|A\/L|Ordinary\s+Level|O\/L)\b/i',
            '/\b(?:CIMA|ACCA|AAT|CA\s+Sri\s+Lanka|ICASL|CMA\s+Sri\s+Lanka)(?:\s+(?:Passed\s+Finalist|Finalist|Member|Affiliate|Strategic\s+Level|Operational\s+Level|Executive\s+Level|Passed|Qualified))?/i',
        ];

        $targetLines = !empty($qualSectionLines) ? $qualSectionLines : $lines;

        $locationsRegex = '/\s*[-–|@,]\s*(?:Sri Lanka|Malabe|Nawala|Colombo|Kandy|Galle|Jaffna|Batticaloa|Negombo|Gampaha|Kurunegala|Dehiwala|Mount Lavinia|Moratuwa|UK|USA|\d{4}).*$/i';

        foreach ($targetLines as $l) {
            $lClean = preg_replace('/^[•\-\*\s◦]+/', '', $l);
            $lClean = preg_replace('/\s*(?:19|20)\d{2}\s*[-–\s]*(?:19|20)?\d{2}?.*$/i', '', $lClean);
            $lClean = preg_replace($locationsRegex, '', $lClean);
            $lClean = preg_replace('/\s+(?:Malabe|Nawala|Colombo|Kandy|Galle|Jaffna|Sri Lanka)\b.*$/i', '', $lClean);
            $lClean = trim($lClean, " ,.-|:");

            if (empty($lClean)) continue;

            foreach ($qualPatterns as $pattern) {
                if (preg_match($pattern, $lClean, $matches)) {
                    $matchStr = trim($matches[0]);
                    $matchStr = preg_replace($locationsRegex, '', $matchStr);
                    $matchStr = preg_replace('/\s+(?:Malabe|Nawala|Colombo|Kandy|Galle|Jaffna|Sri Lanka)\b.*$/i', '', $matchStr);
                    $matchStr = preg_replace('/\s*\(\d{4}(?:\s*-\s*\d{4}|\s*-\s*Present)?\).*$/i', '', $matchStr);
                    $matchStr = trim($matchStr, " ,.-|:");

                    $lw = strtolower($matchStr);
                    if ($lw === 'advanced level' || $lw === 'a/l') {
                        $matchStr = "G.C.E. Advanced Level";
                    } else if ($lw === 'ordinary level' || $lw === 'o/l') {
                        $matchStr = "G.C.E. Ordinary Level";
                    }

                    if (strlen($matchStr) >= 4 && !in_array($matchStr, $extracted)) {
                        $extracted[] = $matchStr;
                    }
                }
            }

            if ($inQualSection && strlen($lClean) >= 5) {
                if (preg_match('/\b(?:Degree|Diploma|Graduate|Bachelor|Master|HND|BSc|MSc|BA|BBA|BIT|BTech|Advanced Level|A\/L)\b/i', $lClean)) {
                    if (!preg_match('/^(?:Horizon Campus|University|College|School|Institute|Janadhipathi Balika Vidyalaya)\b/i', $lClean)) {
                        if (!in_array($lClean, $extracted)) {
                            $extracted[] = $lClean;
                        }
                    }
                }
            }
        }

        if (empty($extracted)) {
            foreach ($qualPatterns as $pattern) {
                if (preg_match_all($pattern, $cvText, $gm)) {
                    foreach ($gm[0] as $g) {
                        $gClean = trim(preg_replace('/\s+/', ' ', $g));
                        $gClean = preg_replace($locationsRegex, '', $gClean);
                        $gClean = preg_replace('/\s+(?:Malabe|Nawala|Colombo|Kandy|Galle|Jaffna|Sri Lanka)\b.*$/i', '', $gClean);
                        $gClean = trim($gClean, " ,.-|:");
                        if (strlen($gClean) >= 4 && !in_array($gClean, $extracted)) {
                            $extracted[] = $gClean;
                        }
                    }
                }
            }
        }

        return array_values(array_unique($extracted));
    }

    public static function extractCertificationsFromCVText($cvText) {
        if (empty($cvText)) return [];

        $certPatterns = [
            '/\b(?:CCNA(?:\s+Certified)?|CCNP|CCIE|Cisco Certified[A-Za-z0-9\s-]*)/i',
            '/\b(?:AWS|Amazon Web Services)\s+(?:Certified\s+)?[A-Za-z0-9\s-]{3,40}/i',
            '/\b(?:PMP|Project Management Professional)\b/i',
            '/\b(?:Certified Scrum Master|Scrum Master|CSM)\b/i',
            '/\b(?:Microsoft Certified|MCSE|MCSA|AZ-\d+|MS-\d+)[A-Za-z0-9\s-]{0,30}/i',
            '/\b(?:ITIL(?:\s+Foundation)?)\b/i',
            '/\b(?:Google Analytics Certified|Google Ads Certified)/i',
            '/\b(?:ISO \d+(?:\s*Lead Auditor)?|HACCP|GMP)/i',
            '/\b(?:Diploma|Certificate|Certification)\s+(?:in|of)\s+[A-Za-z0-9\s]{3,40}(?:Hacking|Security|Cyber|Testing|Design|Marketing|SEO|Python|Java|Web|Networking|Cloud)/i',
            '/\b(?:Ethical Hack(?:er|ing)|CEH|VAPT|CompTIA [A-Za-z+]+)/i',
            '/\b(?:Introduction to Network|Switching,\s*Routing\s*(?:and\s*Wireless\s*Essentials)?|Enterprise Networking,\s*Security,\s*and\s*Automation)\b/i'
        ];

        $found = [];

        $lines = explode("\n", $cvText);
        $inCertSection = false;

        foreach ($lines as $line) {
            $l = trim($line);
            if (empty($l)) continue;

            if (preg_match('/^(?:CERTIFICATIONS|CERTIFICATION|COURSES|TRAINING|PROFESSIONAL CERTIFICATIONS)(?:\s*[\&\+]\s*(?:TRAINING|CERTIFICATIONS|COURSES))?$/i', $l)) {
                $inCertSection = true;
                continue;
            }

            if ($inCertSection && preg_match('/^(?:ADDITIONAL INFORMATION|TECHNICAL KNOWLEDGE|TECHNICAL SKILLS|SKILLS|ACHIEVEMENTS|VOLUNTEER|EXPERIENCE|EDUCATION|WORK EXPERIENCE|REFERENCES|PROJECTS|INTERESTS|LANGUAGES|PERSONAL DETAILS)$/i', $l)) {
                $inCertSection = false;
            }

            if ($inCertSection) {
                $lClean = preg_replace('/^[•\-\*\s◦]+/', '', $l);
                $lClean = preg_replace('/\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}/i', '', $lClean);
                $lClean = preg_replace('/\s*(?:19|20)\d{2}/', '', $lClean);
                $lClean = trim($lClean, " ,.-|:");

                if (empty($lClean)) continue;

                if (preg_match('/^(?:Cisco Networking Academy|Coursera|Udemy|Simplilearn|LinkedIn Learning|Great Learning)\s*$/i', $lClean)) {
                    continue;
                }

                if (strlen($lClean) >= 4 && !self::isGarbledText($lClean)) {
                    if (!in_array($lClean, $found)) {
                        $found[] = $lClean;
                    }
                }
            }
        }

        foreach ($certPatterns as $pat) {
            if (preg_match_all($pat, $cvText, $cm)) {
                foreach ($cm[0] as $c) {
                    $cClean = trim(preg_replace('/\s+/', ' ', $c));
                    $cClean = preg_replace('/\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}/i', '', $cClean);
                    $cClean = preg_replace('/\s*(?:19|20)\d{2}/', '', $cClean);
                    $cClean = trim($cClean, " ,.-|:");
                    if (strlen($cClean) >= 3 && !in_array($cClean, $found)) {
                        $found[] = $cClean;
                    }
                }
            }
        }

        return array_values(array_unique($found));
    }

    public static function validateAndSanitizeExtractedData($json, $cvText) {
        if (!is_array($json)) $json = [];

        $parsedQuals = self::extractQualificationsFromCVText($cvText);
        $parsedCerts = self::extractCertificationsFromCVText($cvText);

        // Validate qualifications_found from AI against actual CV text
        if (!empty($json['qualifications_found']) && is_array($json['qualifications_found'])) {
            $validQuals = [];
            foreach ($json['qualifications_found'] as $q) {
                $qClean = trim($q);
                if (empty($qClean)) continue;

                // Strip common words
                $qLower = strtolower($qClean);
                if ($qLower === 'none' || $qLower === 'none identified' || $qLower === 'n/a') continue;

                // Check if the degree phrase or main degree code (BIT, BSc, MSc, MBA, HND, Advanced Level) exists in CV text
                $foundInCv = false;
                if (stripos($cvText, $qClean) !== false) {
                    $foundInCv = true;
                } else {
                    // Extract degree acronym / main degree term (e.g., BIT, BSc, MSc, MBA, HND, Diploma)
                    if (preg_match('/\b(BIT|BSc|B\.Sc|MSc|M\.Sc|BBA|MBA|HND|Diploma|Advanced Level|A\/L|CIMA|ACCA|AAT)\b/i', $qClean, $dm)) {
                        if (stripos($cvText, $dm[1]) !== false) {
                            $foundInCv = true;
                        }
                    }
                }

                if ($foundInCv) {
                    $validQuals[] = $qClean;
                }
            }
            $json['qualifications_found'] = array_values(array_unique($validQuals));
        }

        if (empty($json['qualifications_found'])) {
            $json['qualifications_found'] = $parsedQuals;
        }

        // Validate certifications_found from AI
        if (!empty($json['certifications_found']) && is_array($json['certifications_found'])) {
            $validCerts = [];
            foreach ($json['certifications_found'] as $c) {
                $cClean = trim($c);
                if (empty($cClean)) continue;

                $cLower = strtolower($cClean);
                if ($cLower === 'none' || $cLower === 'none identified' || $cLower === 'n/a') continue;

                $foundInCv = false;
                if (stripos($cvText, $cClean) !== false) {
                    $foundInCv = true;
                } else {
                    $cFirstWord = preg_split('/\s+/', strtolower($cClean))[0] ?? '';
                    if (strlen($cFirstWord) >= 4 && stripos($cvText, $cFirstWord) !== false) {
                        $foundInCv = true;
                    }
                }

                if ($foundInCv) {
                    $validCerts[] = $cClean;
                }
            }
            $json['certifications_found'] = array_values(array_unique($validCerts));
        }

        if (empty($json['certifications_found'])) {
            $json['certifications_found'] = $parsedCerts;
        }

        if (!empty($json['qualifications_found'])) {
            $json['qualification'] = $json['qualifications_found'][0];
        } else {
            $json['qualification'] = 'Bachelors Degree';
        }

        return $json;
    }

    private static function isGarbledText($text) {
        if (empty($text)) return false;
        if (preg_match('/^\(cid:\d+\)+$/i', trim($text))) return true;
        if (substr_count($text, "\x00") > 0) return true;
        return false;
    }
}

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

// Hallucinated response from AI
$bogusAiResponse = [
    'qualifications_found' => ['ma in English', 'Diploma in English', 'ma in Information', 'Diploma in Information'],
    'certifications_found' => ['None identified']
];

$sanitized = RefinedExtractor::validateAndSanitizeExtractedData($bogusAiResponse, $nethminiText);

echo "=== SANITIZED RESULTS (AFTER BOGUS AI HALLUCINATION INPUT) ===\n";
print_r($sanitized);
