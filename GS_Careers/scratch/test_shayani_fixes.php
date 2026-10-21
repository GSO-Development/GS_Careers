<?php

class RefinedExtractor2 {
    public static function extractQualificationsFromCVText($cvText) {
        if (empty($cvText)) return [];

        $extracted = [];

        // Pre-clean line breaks inside degree names like "B.Sc. (\n Hons)"
        $cleanText = preg_replace('/(B\.?Sc\.?|B\.?A\.?|B\.?I\.?T\.?|BIT|Diploma|B\.?B\.?A\.?)\s*\n\s*(\(?Hons\)?|in|of)/i', '$1 $2', $cvText);
        $cleanText = preg_replace('/(Computer Science|Software Engineering|Information Technology)\s*\n\s*(and|&)?\s*(Software Engineering|Computer Science|Information Technology)?/i', '$1 $2 $3', $cleanText);

        $lines = explode("\n", $cleanText);

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
            '/\b(?:Bachelor[s]?|B\.?Sc\.?|B\.?A\.?|B\.?Com\.?|B\.?B\.?A\.?|B\.?I\.?T\.?|BIT(?:\(Hons\))?|B\.?I\.?C\.?T\.?|B\.?Tech\.?|Bachelor\s+of\s+Engineering)(?:\s*\(Hons\))?(?:\s+of|\s+in)?\s+[A-Za-z0-9\s&().,\'-]{3,60}/i',
            '/\b(?:Master[s]?|M\.?Sc\.?|M\.?A\.?|M\.?B\.?A\.?|M\.?Com\.?|M\.?Tech\.?)(?:\s+of|\s+in)?\s+[A-Za-z0-9\s&().,\'-]{3,60}/i',
            '/\b(?:(?:N|n)?ational Diploma|Diploma|Higher National Diploma|HND|Post\s*Graduate\s*Diploma|PG\s*Diploma|Advanced\s*Diploma|NVQ\s*Level\s*[IV1-6]+)(?:\s+in|\s+of)?\s+[A-Za-z0-9\s&().,\[\]\'-]{3,60}/i',
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
        }

        if (empty($extracted)) {
            foreach ($qualPatterns as $pattern) {
                if (preg_match_all($pattern, $cleanText, $gm)) {
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
            '/\b(?:CCNA(?:\s+Certified)?|CCNP|CCIE|CCST|Cisco Certified[A-Za-z0-9\s-]*)/i',
            '/\b(?:AWS|Amazon Web Services)\s+(?:Certified\s+)?[A-Za-z0-9\s-]{3,40}/i',
            '/\b(?:PMP|Project Management Professional)\b/i',
            '/\b(?:Certified Scrum Master|Scrum Master|CSM)\b/i',
            '/\b(?:Microsoft Certified|MCSE|MCSA|AZ-\d+|MS-\d+)[A-Za-z0-9\s-]{0,30}/i',
            '/\b(?:ITIL(?:\s+Foundation)?)\b/i',
            '/\b(?:Google Analytics Certified|Google Ads Certified)/i',
            '/\b(?:ISO \d+(?:\s*Lead Auditor)?|HACCP|GMP)/i',
            '/\b(?:Diploma|Certificate|Certification|Certificate Course)\s+(?:in|of|for)?\s+[A-Za-z0-9\s]{3,40}(?:Hacking|Security|Cyber|Testing|Design|Marketing|SEO|Python|Java|Web|Networking|Cloud|Development)/i',
            '/\b(?:Ethical Hack(?:er|ing)|CEH|VAPT|CompTIA [A-Za-z+]+)/i',
            '/\b(?:Introduction to Network|Switching,\s*Routing\s*(?:and\s*Wireless\s*Essentials)?|Enterprise Networking,\s*Security,\s*and\s*Automation|JavaScript Essentials|Python Essentials|AI\/ML Engineer)\b/i'
        ];

        $found = [];

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
}

require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/libs/PdfExtractor.php';

$file = __DIR__ . '/../backend/uploads/cv/cv_85_1791458943_6ac77e7f6335b.pdf';
$text = PdfExtractor::extractTextFromFile($file);

echo "=== SHAYANI RE-TEST QUALIFICATIONS ===\n";
print_r(RefinedExtractor2::extractQualificationsFromCVText($text));

echo "\n=== SHAYANI RE-TEST CERTIFICATIONS ===\n";
print_r(RefinedExtractor2::extractCertificationsFromCVText($text));
