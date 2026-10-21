<?php
require_once 'c:/Users/nadumi/OneDrive - George Steuart Optimize Pvt Ltd/Documents/GS Careers CV/GS_Careers/backend/config.php';

$db = getDB();
$stmtSetting = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'min_medium_match_score'");
$minMedium = $stmtSetting ? (int)$stmtSetting->fetchColumn() : 50;

function parseNumericSalaryPHP($val)
{
    if (!$val) return null;
    $s = strtolower(trim((string)$val));
    if (!$s || $s === 'not mentioned' || $s === 'not specified' || $s === '0') return null;

    if (preg_match('/([\d,]+(?:\.\d+)?)\s*k?\s*[\-\–to]+\s*([\d,]+(?:\.\d+)?)\s*k?/i', $s, $m)) {
        $minV = (float)str_replace(',', '', $m[1]);
        $maxV = (float)str_replace(',', '', $m[2]);
        if (strpos($s, 'k') !== false && $minV < 1000) $minV *= 1000;
        if (strpos($s, 'k') !== false && $maxV < 1000) $maxV *= 1000;
        return ($minV + $maxV) / 2;
    }

    $clean = preg_replace('/[^0-9.]/', '', $s);
    if (!$clean) return null;
    $num = (float)$clean;
    if ($num <= 0) return null;
    if (strpos($s, 'k') !== false && $num < 1000) $num *= 1000;
    return $num;
}

function calculateSalaryMatchScorePHP($salaryExpectation, $minSalary, $maxSalary)
{
    $jobMin = (!empty($minSalary) && $minSalary > 0) ? (float)$minSalary : null;
    $jobMax = (!empty($maxSalary) && $maxSalary > 0) ? (float)$maxSalary : null;

    if (!$jobMin && !$jobMax) return 100;

    $candSal = parseNumericSalaryPHP($salaryExpectation);
    if ($candSal === null) return 80;

    if ($jobMin && $jobMax) {
        if ($candSal >= $jobMin && $candSal <= $jobMax) return 100;
        if ($candSal < $jobMin) return 100;
        $excess = ($candSal - $jobMax) / $jobMax;
        return max(10, round(100 - ($excess * 150)));
    } else if ($jobMax) {
        if ($candSal <= $jobMax) return 100;
        $excess = ($candSal - $jobMax) / $jobMax;
        return max(10, round(100 - ($excess * 150)));
    } else if ($jobMin) {
        if ($candSal >= $jobMin) return 100;
        return 100;
    }
    return 100;
}

function computeCandidateMatchScoreDirect($vacancy, $qualification, $overallExp, $relevantExp, $cvText, $tags, $skillsMetadata)
{
    if (!empty($vacancy['extracted_data']) && is_string($vacancy['extracted_data'])) {
        $parsedData = json_decode($vacancy['extracted_data'], true);
        if (isset($parsedData['ai_match_score']) && is_numeric($parsedData['ai_match_score'])) {
            return min(100, max(12, (int)$parsedData['ai_match_score']));
        }
    }
    if (!empty($skillsMetadata) && is_string($skillsMetadata)) {
        $parsedMeta = json_decode($skillsMetadata, true);
        if (isset($parsedMeta['ai_match_score']) && is_numeric($parsedMeta['ai_match_score'])) {
            return min(100, max(12, (int)$parsedMeta['ai_match_score']));
        }
    }

    $qualWeights = [
        'PhD' => 100, 'Masters Degree' => 90, 'Bachelors Degree' => 80,
        'Professional Certification' => 75, 'Diploma' => 65,
        'A/L' => 45, 'O/L' => 25
    ];

    $expWeights = [
        '10+ years' => 100, '8-10 years' => 85, '5-7 years' => 70,
        '3-4 years' => 55, '1-2 years' => 35, '0-1 years' => 15, '0 years' => 5
    ];

    $vacancyTitle = strtolower($vacancy['vacancy_title'] ?? ($vacancy['title'] ?? ''));
    $targetFullText = strtolower(($vacancy['vacancy_title'] ?? ($vacancy['title'] ?? '')) . ' ' . ($vacancy['requirements'] ?? ($vacancy['vacancy_requirements'] ?? '')) . ' ' . ($vacancy['description'] ?? ($vacancy['vacancy_description'] ?? '')) . ' ' . ($vacancy['required_skills'] ?? ($vacancy['vacancy_required_skills'] ?? '')));
    $candTextOnly = strtolower(($cvText ?? '') . ' ' . ($tags ?? '') . ' ' . ($skillsMetadata ?? ''));

    $domainKeywords = [
        'hr_admin' => ['hr', 'human resources', 'recruitment', 'talent acquisition', 'hiring', 'onboarding', 'training', 'learning and development', 'performance management', 'kpi', 'employee relations', 'attendance', 'payroll', 'hris', 'industrial relations', 'labour law', 'welfare'],
        'finance_accounting' => ['accountant', 'audit', 'auditor', 'tax', 'ledger', 'invoice', 'payroll', 'finance', 'reconciliation', 'budget', 'tally', 'quickbooks', 'casl', 'aat', 'cma', 'acca', 'cpa', 'financial reporting', 'ifrs'],
        'it_cybersecurity' => ['software', 'developer', 'react', 'javascript', 'node', 'php', 'mysql', 'python', 'java', 'aws', 'azure', 'devops', 'docker', 'cybersecurity', 'database', 'api', 'code', 'programming', 'fullstack', 'frontend', 'backend', 'qa', 'testing', 'tester'],
        'legal_compliance' => ['legal', 'lawyer', 'attorney', 'litigation', 'corporate law', 'contract', 'compliance', 'regulatory', 'company secretary'],
        'tea' => ['tea', 'tea taster', 'tea blending', 'tea processing', 'tea export', 'tea buyer', 'ctc', 'colombo tea auction'],
        'healthcare_pharma' => ['pharmaceutical', 'pharma', 'healthcare', 'medical', 'pharmacist', 'nmra', 'clinical', 'hospital'],
        'sales_marketing' => ['sales', 'marketing', 'branding', 'advertising', 'digital marketing', 'seo', 'sem', 'social media', 'leads', 'conversions']
    ];

    $jobDomain = '';
    if (strpos($vacancyTitle, 'hr') !== false || strpos($vacancyTitle, 'human resource') !== false || strpos($vacancyTitle, 'recruitment') !== false) {
        $jobDomain = 'hr_admin';
    } else if (strpos($vacancyTitle, 'finance') !== false || strpos($vacancyTitle, 'accountant') !== false || strpos($vacancyTitle, 'audit') !== false || strpos($vacancyTitle, 'tax') !== false) {
        $jobDomain = 'finance_accounting';
    } else if (strpos($vacancyTitle, 'software') !== false || strpos($vacancyTitle, 'developer') !== false || strpos($vacancyTitle, 'it ') !== false || strpos($vacancyTitle, 'cybersecurity') !== false || strpos($vacancyTitle, 'qa') !== false || strpos($vacancyTitle, 'testing') !== false || strpos($vacancyTitle, 'tester') !== false || strpos($vacancyTitle, 'engineer') !== false) {
        $jobDomain = 'it_cybersecurity';
    } else if (strpos($vacancyTitle, 'legal') !== false || strpos($vacancyTitle, 'lawyer') !== false || strpos($vacancyTitle, 'compliance') !== false) {
        $jobDomain = 'legal_compliance';
    } else if (strpos($vacancyTitle, 'tea') !== false) {
        $jobDomain = 'tea';
    } else if (strpos($vacancyTitle, 'pharma') !== false || strpos($vacancyTitle, 'medical') !== false) {
        $jobDomain = 'healthcare_pharma';
    } else if (strpos($vacancyTitle, 'sales') !== false || strpos($vacancyTitle, 'marketing') !== false) {
        $jobDomain = 'sales_marketing';
    }

    $skillsScore = 75;
    $reqSkills = array_filter(array_map('trim', explode(',', strtolower($vacancy['required_skills'] ?? ''))));
    if (strlen(trim($candTextOnly)) > 20 && !empty($reqSkills)) {
        $matchedCount = 0;
        foreach ($reqSkills as $rs) {
            if (!empty($rs) && strpos($candTextOnly, $rs) !== false) {
                $matchedCount++;
            }
        }
        $skillsScore = min(100, max(30, round(($matchedCount / count($reqSkills)) * 100)));
    }

    $appOverallWeight = $expWeights[$overallExp] ?? 20;
    $appRelevantWeight = $expWeights[$relevantExp] ?? 20;

    $minOverallWeight = isset($vacancy['min_experience']) && !empty($vacancy['min_experience']) ? ($expWeights[$vacancy['min_experience']] ?? 15) : 15;
    $minRelWeight = isset($vacancy['min_relevant_experience']) && !empty($vacancy['min_relevant_experience']) ? ($expWeights[$vacancy['min_relevant_experience']] ?? 15) : 15;

    $overallRatio = $minOverallWeight > 0 ? ($appOverallWeight / $minOverallWeight) : 1.0;
    $relRatio = $minRelWeight > 0 ? ($appRelevantWeight / $minRelWeight) : 1.0;
    
    // Prioritize Relevant Experience heavily (75% weight on Relevant Exp, 25% on Overall Exp)
    $combinedRatio = ($relRatio * 0.75) + ($overallRatio * 0.25);
    $expScore = min(100, round($combinedRatio * 100));

    if ($appRelevantWeight < $minRelWeight) {
        $expScore = round($expScore * 0.65); // 35% penalty if relevant experience falls below requirement
    }

    $appQualWeight = $qualWeights[$qualification] ?? null;
    if ($appQualWeight === null) {
        $qLower = strtolower($qualification ?? '');
        if (strpos($qLower, 'phd') !== false || strpos($qLower, 'doctorate') !== false) {
            $appQualWeight = 100;
        } else if (preg_match('/\b(master|msc|mba|m\.sc|m\.eng|mtech)\b/i', $qLower) && !preg_match('/\b(imaster|scrum\s*master|taskmaster|webmaster)\b/i', $qLower)) {
            $appQualWeight = 90;
        } else if (preg_match('/\b(bachelor|degree|bsc|b\.sc|bit|b\.i\.t|bict|b\.i\.c\.t|beng|b\.eng|btech|bba|bcom|hons)\b/i', $qLower)) {
            $appQualWeight = 80;
        } else if (strpos($qLower, 'diploma') !== false || strpos($qLower, 'hnd') !== false || strpos($qLower, 'nvq') !== false) {
            $appQualWeight = 65;
        } else if (strpos($qLower, 'professional') !== false || strpos($qLower, 'certification') !== false || strpos($qLower, 'ccna') !== false || strpos($qLower, 'cima') !== false || strpos($qLower, 'acca') !== false) {
            $appQualWeight = 75;
        } else if (strpos($qLower, 'a/l') !== false || strpos($qLower, 'advanced level') !== false) {
            $appQualWeight = 45;
        } else if (strpos($qLower, 'o/l') !== false || strpos($qLower, 'ordinary level') !== false) {
            $appQualWeight = 25;
        } else {
            $appQualWeight = 75;
        }
    }
    $requiredQualWeight = 80;
    if (strpos($targetFullText, 'phd') !== false) $requiredQualWeight = 100;
    else if (strpos($targetFullText, 'master') !== false || strpos($targetFullText, 'msc') !== false || strpos($targetFullText, 'mba') !== false) $requiredQualWeight = 90;
    else if (strpos($targetFullText, 'diploma') !== false) $requiredQualWeight = 65;
    else if (strpos($targetFullText, 'a/l') !== false) $requiredQualWeight = 45;

    $qualScore = min(100, ($appQualWeight / $requiredQualWeight) * 100);

    // Job Description & Text Match
    $jdStopwords = ['and', 'the', 'for', 'with', 'that', 'this', 'have', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take', 'person', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'candidate', 'should', 'must', 'required', 'ability', 'strong', 'knowledge', 'experience', 'minimum', 'years', 'degree', 'bachelor', 'master', 'qualification', 'skills', 'responsibilities', 'duties', 'manage', 'support', 'ensure', 'handling', 'working', 'able', 'proven', 'track', 'record', 'role', 'position', 'job'];

    $rawJdText = strtolower(($vacancy['vacancy_title'] ?? ($vacancy['title'] ?? '')) . ' ' . ($vacancy['requirements'] ?? ($vacancy['vacancy_requirements'] ?? '')) . ' ' . ($vacancy['description'] ?? ($vacancy['vacancy_description'] ?? '')) . ' ' . ($vacancy['required_skills'] ?? ($vacancy['vacancy_required_skills'] ?? '')));
    $cleanJdText = preg_replace('/[^a-z0-9+#.\s-]/', ' ', $rawJdText);
    $jdWords = array_filter(explode(' ', $cleanJdText), function($w) use ($jdStopwords) {
        return strlen($w) >= 3 && !in_array($w, $jdStopwords);
    });
    $uniqueJdKeywords = array_values(array_unique($jdWords));

    $jdDirectMatchScore = 75;
    if (strlen(trim($candTextOnly)) > 20 && !empty($uniqueJdKeywords)) {
        $matchedJdCount = 0;
        foreach ($uniqueJdKeywords as $kw) {
            if (strpos($candTextOnly, $kw) !== false) {
                $matchedJdCount++;
            }
        }
        $targetCount = max(5, min(20, round(count($uniqueJdKeywords) * 0.5)));
        $jdDirectMatchScore = min(100, round(($matchedJdCount / $targetCount) * 100));
    }

    $domainMatchScore = 50;
    if (strlen(trim($candTextOnly)) > 20) {
        if ($jobDomain && isset($domainKeywords[$jobDomain])) {
            $domKws = $domainKeywords[$jobDomain];
            $domMatches = 0;
            foreach ($domKws as $kw) {
                if (strpos($candTextOnly, $kw) !== false) {
                    $domMatches++;
                }
            }
            $domainMatchScore = min(100, round(($domMatches / min(6, count($domKws))) * 100));
        } else {
            $domainMatchScore = 50;
        }
    }

    $keywordScore = round(($jdDirectMatchScore * 0.60) + ($domainMatchScore * 0.40));

    $isJobMismatch = false;
    if (!empty($skillsMetadata) && (strpos($skillsMetadata, '"is_job_mismatch":true') !== false || strpos($skillsMetadata, 'mismatch_reason') !== false)) {
        $isJobMismatch = true;
    }

    $genericStopwords = ['executive', 'manager', 'coordinator', 'assistant', 'officer', 'bachelors', 'degree', 'diploma', 'operations', 'admin', 'clerk', 'management', 'communication', 'organization', 'interpersonal'];

    if (!$isJobMismatch && $jobDomain && isset($domainKeywords[$jobDomain]) && strlen(trim($candTextOnly)) > 30) {
        $domainCounts = [];
        foreach ($domainKeywords as $dKey => $dKws) {
            $cnt = 0;
            foreach ($dKws as $kw) {
                if (!in_array(strtolower($kw), $genericStopwords) && strpos($candTextOnly, $kw) !== false) {
                    $cnt++;
                }
            }
            $domainCounts[$dKey] = $cnt;
        }

        $maxCount = 0;
        $candidatePrimaryDomain = '';
        foreach ($domainCounts as $dKey => $cnt) {
            if ($cnt > $maxCount) {
                $maxCount = $cnt;
                $candidatePrimaryDomain = $dKey;
            }
        }

        $targetJobDomainMatches = $domainCounts[$jobDomain] ?? 0;

        if ($candidatePrimaryDomain && $candidatePrimaryDomain !== $jobDomain && $maxCount >= 2 && $maxCount > $targetJobDomainMatches) {
            $isJobMismatch = true;
        }
    }

    $salExp = $vacancy['salary_expectation'] ?? null;
    $jobMinSal = $vacancy['min_salary'] ?? null;
    $jobMaxSal = $vacancy['max_salary'] ?? null;
    $salaryScore = calculateSalaryMatchScorePHP($salExp, $jobMinSal, $jobMaxSal);

    if ($isJobMismatch) {
        $skillsScore *= 0.15;
        $keywordScore *= 0.10;
        $qualScore *= 0.40;
        $expScore *= 0.25;
    }

    $hasSalaryBudget = (!empty($jobMinSal) || !empty($jobMaxSal));
    if ($hasSalaryBudget) {
        $finalScore = ($skillsScore * 0.35) + ($expScore * 0.25) + ($qualScore * 0.15) + ($keywordScore * 0.15) + ($salaryScore * 0.10);
    } else {
        $finalScore = ($skillsScore * 0.40) + ($expScore * 0.25) + ($qualScore * 0.15) + ($keywordScore * 0.20);
    }
    return min(100, max(12, round($finalScore)));
}

require_once __DIR__ . '/libs/PdfExtractor.php';

$stmt = $db->query("SELECT a.id, a.first_name, a.last_name, a.qualification, a.overall_experience, a.relevant_experience, a.salary_expectation, a.cv_path, a.cv_text, a.tags, a.skills_metadata, a.is_manual_extracted, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.min_salary, v.max_salary, v.designation FROM applications a JOIN vacancies v ON a.vacancy_id = v.id");
$apps = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($apps as $app) {
    $cvTextToUse = $app['cv_text'];
    if (empty($cvTextToUse) && !empty($app['cv_path'])) {
        $fullPath = UPLOAD_DIR . $app['cv_path'];
        $extractedRaw = PdfExtractor::extractTextFromFile($fullPath);
        if ($extractedRaw) {
            $cvTextToUse = $extractedRaw;
        }
    }

    $score = computeCandidateMatchScoreDirect(
        $app,
        $app['qualification'],
        $app['overall_experience'],
        $app['relevant_experience'],
        $cvTextToUse,
        $app['tags'],
        $app['skills_metadata']
    );

    $isLowMatch = ($score < $minMedium);
    $isManualExtracted = (isset($app['is_manual_extracted']) && $app['is_manual_extracted'] == 1);

    if ($isManualExtracted) {
        $newStatus = 'extracted';
    } else if ($isLowMatch) {
        $newStatus = 'unextracted';
    } else {
        $newStatus = 'extracted';
    }
    
    echo "App ID: {$app['id']} ({$app['first_name']} {$app['last_name']}) - Job: {$app['vacancy_title']} -> Score: {$score}% -> Status: {$newStatus}\n";

    if ($newStatus === 'unextracted') {
        $upd = $db->prepare("UPDATE applications SET cv_text = NULL, extraction_status = 'unextracted', extracted_data = NULL, skills_metadata = NULL, tags = '' WHERE id = ?");
        $upd->execute([$app['id']]);
    } else {
        $upd = $db->prepare("UPDATE applications SET cv_text = ?, extraction_status = 'extracted' WHERE id = ?");
        $upd->execute([$cvTextToUse, $app['id']]);
    }
}
