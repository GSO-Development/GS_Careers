<?php
ob_start();
set_time_limit(180);
// ============================================
// Applications API
// ============================================
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../libs/PdfExtractor.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'apply':
        handleApply();
        break;
    case 'ai_parse_cv':
        handleAiParseCv();
        break;
    case 'list':
        listApplications();
        break;
    case 'export':
        exportApplications();
        break;
    case 'stats':
        getStats();
        break;
    case 'update_status':
        handleUpdateStatus();
        break;
    case 'send_interview':
        handleSendInterview();
        break;
    case 'get_suggestions':
        handleGetSuggestions();
        break;
    case 'get_candidate_count':
        handleGetCandidateCount();
        break;
    case 'get_matching_candidates':
        handleGetMatchingCandidates();
        break;
    case 'get_talent_pool':
        handleGetTalentPool();
        break;
    case 'update_candidate_tags':
        handleUpdateCandidateTags();
        break;
    case 'view_cv':
        handleViewCV();
        break;
    case 'delete':
        handleDeleteApplication();
        break;
    case 'bulk_delete':
        handleBulkDeleteApplications();
        break;
    case 'block_candidate':
        handleBlockCandidate();
        break;
    case 'unblock_candidate':
        handleUnblockCandidate();
        break;
    case 'confirm_interview':
        handleConfirmInterview();
        break;
    case 'list_extractions':
        handleListExtractions();
        break;
    case 'extract_cv':
        handleExtractCV();
        break;
    case 'get_extraction_setting':
        handleGetExtractionSetting();
        break;
    case 'update_extraction_setting':
        handleUpdateExtractionSetting();
        break;
    case 'cli':
    case 'test':
        break;
    default:
        jsonResponse(400, 'Invalid action');
}

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

    if ($jobMin && $jobMax && $jobMin > $jobMax) {
        $temp = $jobMin;
        $jobMin = $jobMax;
        $jobMax = $temp;
    }

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
        if ($candSal <= $jobMin * 1.25) return 100;
        if ($candSal < $jobMin) return 100;
        $excess = ($candSal - $jobMin) / $jobMin;
        return max(10, round(100 - ($excess * 120)));
    }
    return 100;
}

function calculateCandidateMatchScorePHP($parsedData, $vacancy, $candQual = '', $candOverallExp = '', $candRelExp = '', $salaryExpectation = null)
{
    if (!empty($parsedData['ai_score_breakdown']) && is_array($parsedData['ai_score_breakdown'])) {
        $bd = $parsedData['ai_score_breakdown'];
        $skillsFactor = (int)($bd['skills_match_score'] ?? 75);
        $expFactor = (int)($bd['experience_match_score'] ?? 75);
        $qualFactor = (int)($bd['qualification_match_score'] ?? 75);
        $jdFactor = (int)($bd['job_description_match_score'] ?? ($bd['jd_alignment_score'] ?? 75));
        $salaryFactor = (int)($bd['salary_match_score'] ?? 100);

        // Seniority & Relevance Reward (consistent across frontend and backend)
        if (empty($parsedData['is_job_mismatch'])) {
            $expWeights = [
                '10+ years' => 100, '8-10 years' => 85, '5-7 years' => 70,
                '3-4 years' => 55, '1-2 years' => 35, '0-1 years' => 15, '0 years' => 5
            ];
            $appExpWeight = $expWeights[$candRelExp ?? ''] ?? ($expWeights[$candOverallExp ?? ''] ?? 0);
            $minExpWeight = $expWeights[$vacancy['min_relevant_experience'] ?? ''] ?? ($expWeights[$vacancy['min_experience'] ?? ''] ?? 5);

            if ($appExpWeight > $minExpWeight) {
                if ($appExpWeight >= 70) {
                    $expFactor = max($expFactor, 100);
                } else if ($appExpWeight >= 55) {
                    $expFactor = max($expFactor, 95);
                }
            }

            $qualWeights = [
                'PhD' => 100, 'Masters Degree' => 90, 'Bachelors Degree' => 80,
                'Professional Certification' => 75, 'Diploma' => 65,
                'A/L' => 45, 'O/L' => 25
            ];
            $appQualWeight = $qualWeights[$candQual ?? ''] ?? 0;
            if ($appQualWeight === 0 && preg_match('/\b(bachelor|degree|bsc|beng|bba|bcom|bit|btech|honours)\b/i', (string)($candQual ?? ''))) {
                $appQualWeight = 80;
            }
            if ($appQualWeight >= 80) {
                $qualFactor = max($qualFactor, 100);
            }

            if ($appExpWeight >= 55) {
                $skillsFactor = max($skillsFactor, 95);
                $jdFactor = max($jdFactor, 90);
            }
        }

        $wSkills = !empty($vacancy['weight_skills']) ? (float)$vacancy['weight_skills'] / 100 : 0.35;
        $wExp = !empty($vacancy['weight_experience']) ? (float)$vacancy['weight_experience'] / 100 : 0.30;
        $wQual = !empty($vacancy['weight_qualification']) ? (float)$vacancy['weight_qualification'] / 100 : 0.20;
        $wJd = !empty($vacancy['weight_jd_alignment']) ? (float)$vacancy['weight_jd_alignment'] / 100 : 0.10;
        $wSal = !empty($vacancy['weight_salary']) ? (float)$vacancy['weight_salary'] / 100 : 0.05;

        return (int)round(($skillsFactor * $wSkills) + ($expFactor * $wExp) + ($qualFactor * $wQual) + ($jdFactor * $wJd) + ($salaryFactor * $wSal));
    }

    if (isset($parsedData['ai_match_score']) && is_numeric($parsedData['ai_match_score'])) {
        return (int)$parsedData['ai_match_score'];
    }

    return 75;
}

function computeCandidateMatchScore($vacancy, $qualification, $overallExp, $relevantExp, $cvText, $tags, $skillsMetadata, $salaryExpectation = null)
{
    if (!empty($vacancy['extracted_data']) && is_string($vacancy['extracted_data'])) {
        $parsedData = json_decode($vacancy['extracted_data'], true);
        if (isset($parsedData['ai_match_score']) && is_numeric($parsedData['ai_match_score'])) {
            if (empty($parsedData['is_job_mismatch'])) {
                return min(100, max(12, (int)$parsedData['ai_match_score']));
            } else {
                return min(22, max(12, (int)$parsedData['ai_match_score']));
            }
        }
    }
    if (!empty($skillsMetadata) && is_string($skillsMetadata)) {
        $parsedMeta = json_decode($skillsMetadata, true);
        if (isset($parsedMeta['ai_match_score']) && is_numeric($parsedMeta['ai_match_score'])) {
            if (empty($parsedMeta['is_job_mismatch'])) {
                return min(100, max(12, (int)$parsedMeta['ai_match_score']));
            } else {
                return min(22, max(12, (int)$parsedMeta['ai_match_score']));
            }
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
    $candTextOnly = strtolower(($cvText ?? '') . ' ' . ($tags ?? '') . ' ' . ($skillsMetadata ?? '') . ' ' . ($qualification ?? ''));

    // Core domain keyword definitions
    $domainKeywords = [
        'hr_admin' => ['hr', 'human resources', 'human resource', 'hrm', 'recruitment', 'talent acquisition', 'hiring', 'onboarding', 'training', 'learning and development', 'performance management', 'kpi', 'employee relations', 'attendance', 'payroll', 'hris', 'industrial relations', 'labour law', 'welfare', 'personnel', 'business management', 'business administration'],
        'finance_accounting' => ['accountant', 'accounting', 'audit', 'auditor', 'tax', 'ledger', 'invoice', 'payroll', 'finance', 'reconciliation', 'budget', 'tally', 'quickbooks', 'casl', 'aat', 'cma', 'acca', 'cpa', 'financial reporting', 'ifrs', 'banking'],
        'it_cybersecurity' => ['software', 'developer', 'react', 'javascript', 'node', 'php', 'mysql', 'python', 'java', 'aws', 'azure', 'devops', 'docker', 'cybersecurity', 'database', 'api', 'code', 'programming', 'fullstack', 'frontend', 'backend', 'qa', 'testing', 'tester', 'engineer', 'tech', 'computer science', 'information technology', 'bict', 'lan', 'wan', 'networking'],
        'legal_compliance' => ['legal', 'lawyer', 'attorney', 'litigation', 'corporate law', 'contract', 'compliance', 'regulatory', 'company secretary', 'law'],
        'tea' => ['tea', 'tea taster', 'tea blending', 'tea processing', 'tea export', 'tea buyer', 'ctc', 'colombo tea auction'],
        'healthcare_pharma' => ['pharmaceutical', 'pharma', 'healthcare', 'medical', 'pharmacist', 'nmra', 'clinical', 'hospital', 'nursing'],
        'sales_marketing' => ['sales', 'marketing', 'branding', 'advertising', 'digital marketing', 'seo', 'sem', 'social media', 'leads', 'conversions']
    ];

    // Detect job domain
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

    // 1. Skills match
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

    // 2. Exp match (Relevant Experience 75% weight)
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

    // 3. Qual match (Level match + Field/Subject match)
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

    $baseQualScore = min(100, ($appQualWeight / $requiredQualWeight) * 100);

    // Field/Subject Alignment Check against Job Domain
    $fieldMatchFactor = 1.0;
    if ($jobDomain && isset($domainKeywords[$jobDomain]) && strlen(trim($candTextOnly)) > 10) {
        $targetKws = $domainKeywords[$jobDomain];
        $matchedTargetKws = 0;
        foreach ($targetKws as $kw) {
            if (strpos($candTextOnly, $kw) !== false) {
                $matchedTargetKws++;
            }
        }

        $hasConflictingDomain = false;
        foreach ($domainKeywords as $dKey => $dKws) {
            if ($dKey === $jobDomain) continue;
            $cnt = 0;
            foreach ($dKws as $kw) {
                if (strpos($candTextOnly, $kw) !== false) {
                    $cnt++;
                }
            }
            if ($cnt >= 2 && $cnt > $matchedTargetKws) {
                $hasConflictingDomain = true;
                break;
            }
        }

        // Conflicting domain MUST be checked first: if candidate belongs to another domain (e.g. HR degree applying for IT role), heavily penalize qualification
        if ($hasConflictingDomain) {
            $fieldMatchFactor = 0.20; // 80% penalty if qualification domain conflicts with job domain
        } else if ($matchedTargetKws >= 3) {
            $fieldMatchFactor = 1.0;
        } else if ($matchedTargetKws >= 1) {
            $fieldMatchFactor = 0.60;
        } else {
            $fieldMatchFactor = 0.25;
        }
    }

    $qualScore = round($baseQualScore * $fieldMatchFactor);

    // 4. Keyword & Job Description Text Match
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

    // 5. Salary Match Calculation
    $salExp = $salaryExpectation ?? ($vacancy['salary_expectation'] ?? null);
    $jobMinSal = $vacancy['min_salary'] ?? null;
    $jobMaxSal = $vacancy['max_salary'] ?? null;
    $salaryScore = calculateSalaryMatchScorePHP($salExp, $jobMinSal, $jobMaxSal);

    // 6. Job & CV Mismatch Penalty
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

    if ($isJobMismatch) {
        $skillsScore *= 0.15;
        $keywordScore *= 0.10;
        $qualScore = min(20, round($qualScore * 0.20)); // Unrelated degree/qualification heavily penalized (capped at 20%)
        $expScore *= 0.25;
    }

    static $configuredWeights = null;
    if ($configuredWeights === null) {
        try {
            $db = getDB();
            $stmtW = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('weight_skills', 'weight_experience', 'weight_qualification', 'weight_jd_alignment', 'weight_salary')");
            $wRows = $stmtW ? $stmtW->fetchAll(PDO::FETCH_KEY_PAIR) : [];
            $configuredWeights = [
                'skills' => isset($wRows['weight_skills']) ? (float)$wRows['weight_skills'] : 35.0,
                'experience' => isset($wRows['weight_experience']) ? (float)$wRows['weight_experience'] : 30.0,
                'qualification' => isset($wRows['weight_qualification']) ? (float)$wRows['weight_qualification'] : 20.0,
                'jd' => isset($wRows['weight_jd_alignment']) ? (float)$wRows['weight_jd_alignment'] : 10.0,
                'salary' => isset($wRows['weight_salary']) ? (float)$wRows['weight_salary'] : 5.0
            ];
        } catch (\Exception $e) {
            $configuredWeights = ['skills' => 35.0, 'experience' => 30.0, 'qualification' => 20.0, 'jd' => 10.0, 'salary' => 5.0];
        }
    }

    $hasCustomVacancyWeights = is_array($vacancy) && (
        (isset($vacancy['weight_skills']) && $vacancy['weight_skills'] !== null && $vacancy['weight_skills'] !== '') ||
        (isset($vacancy['weight_experience']) && $vacancy['weight_experience'] !== null && $vacancy['weight_experience'] !== '') ||
        (isset($vacancy['weight_qualification']) && $vacancy['weight_qualification'] !== null && $vacancy['weight_qualification'] !== '') ||
        (isset($vacancy['weight_jd_alignment']) && $vacancy['weight_jd_alignment'] !== null && $vacancy['weight_jd_alignment'] !== '') ||
        (isset($vacancy['weight_salary']) && $vacancy['weight_salary'] !== null && $vacancy['weight_salary'] !== '')
    );

    if ($hasCustomVacancyWeights) {
        $wSkills = (isset($vacancy['weight_skills']) && $vacancy['weight_skills'] !== null && $vacancy['weight_skills'] !== '') ? (float)$vacancy['weight_skills'] : $configuredWeights['skills'];
        $wExp = (isset($vacancy['weight_experience']) && $vacancy['weight_experience'] !== null && $vacancy['weight_experience'] !== '') ? (float)$vacancy['weight_experience'] : $configuredWeights['experience'];
        $wQual = (isset($vacancy['weight_qualification']) && $vacancy['weight_qualification'] !== null && $vacancy['weight_qualification'] !== '') ? (float)$vacancy['weight_qualification'] : $configuredWeights['qualification'];
        $wJd = (isset($vacancy['weight_jd_alignment']) && $vacancy['weight_jd_alignment'] !== null && $vacancy['weight_jd_alignment'] !== '') ? (float)$vacancy['weight_jd_alignment'] : $configuredWeights['jd'];
        $wSal = (isset($vacancy['weight_salary']) && $vacancy['weight_salary'] !== null && $vacancy['weight_salary'] !== '') ? (float)$vacancy['weight_salary'] : $configuredWeights['salary'];
    } else {
        $wSkills = $configuredWeights['skills'];
        $wExp = $configuredWeights['experience'];
        $wQual = $configuredWeights['qualification'];
        $wJd = $configuredWeights['jd'];
        $wSal = $configuredWeights['salary'];
    }

    $hasSalaryBudget = (!empty($jobMinSal) || !empty($jobMaxSal));
    if ($hasSalaryBudget) {
        $finalScore = ($skillsScore * ($wSkills / 100)) +
            ($expScore * ($wExp / 100)) +
            ($qualScore * ($wQual / 100)) +
            ($keywordScore * ($wJd / 100)) +
            ($salaryScore * ($wSal / 100));
    } else {
        $nonSalTotal = max(1, $wSkills + $wExp + $wQual + $wJd);
        $finalScore = ($skillsScore * ($wSkills / $nonSalTotal)) +
            ($expScore * ($wExp / $nonSalTotal)) +
            ($qualScore * ($wQual / $nonSalTotal)) +
            ($keywordScore * ($wJd / $nonSalTotal));
    }
    if ($isJobMismatch) {
        return min(30, max(10, round($finalScore)));
    }
    return min(100, max(10, round($finalScore)));
}

function handleAiParseCv()
{
    require_once __DIR__ . '/../libs/PdfExtractor.php';

    $vacancyId = (int)($_POST['vacancy_id'] ?? ($_GET['vacancy_id'] ?? 0));
    $cvText = $_POST['cv_text'] ?? '';
    $fileName = $_POST['file_name'] ?? '';
    $tempPath = null;

    // If a CV file is uploaded in this request:
    if (isset($_FILES['cv']) && $_FILES['cv']['error'] === UPLOAD_ERR_OK) {
        $tempPath = $_FILES['cv']['tmp_name'];
        if (empty(trim($cvText))) {
            $extractedFromFile = PdfExtractor::extractTextFromFile($tempPath);
            if (!empty($extractedFromFile) && strlen(trim($extractedFromFile)) >= 20) {
                $cvText = $extractedFromFile;
            }
        }
    }

    if (empty(trim($cvText))) {
        jsonResponse(400, 'CV text or file is required for AI evaluation.');
    }

    $db = getDB();
    $vacancy = null;
    if ($vacancyId > 0) {
        $stmt = $db->prepare("SELECT v.*, c.name as company_name FROM vacancies v LEFT JOIN companies c ON v.company_id = c.id WHERE v.id = ?");
        $stmt->execute([$vacancyId]);
        $vacancy = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    $candData = [
        'salary_expectation' => $_POST['salary_expectation'] ?? null,
        'overall_experience' => $_POST['overall_experience'] ?? null,
        'relevant_experience' => $_POST['relevant_experience'] ?? null,
        'qualification' => $_POST['qualification'] ?? null,
        'file_name' => $fileName
    ];

    // Call AI model (with multi-provider fallback) to evaluate against the target job
    $parsedData = PdfExtractor::parseCvDataWithAI($cvText, $vacancy ?: 'Open Position', $candData, $tempPath);

    // Guarantee score and breakdown even if AI model failed
    if (!isset($parsedData['ai_match_score']) || !is_numeric($parsedData['ai_match_score'])) {
        $score = computeCandidateMatchScore(
            $vacancy ?: ['title' => 'Open Position'],
            $parsedData['qualification'] ?? 'Bachelors Degree',
            $parsedData['overall_experience'] ?? '1-2 years',
            $parsedData['relevant_experience'] ?? '1-2 years',
            $cvText,
            '',
            json_encode($parsedData['skills_analysis'] ?? []),
            $parsedData['salary_expectation'] ?? null
        );
        $parsedData['ai_match_score'] = $score;
        if (empty($parsedData['ai_score_breakdown'])) {
            $parsedData['ai_score_breakdown'] = [
                'skills_match_score' => $score,
                'experience_match_score' => $score,
                'qualification_match_score' => $score,
                'job_description_match_score' => $score,
                'salary_match_score' => 100
            ];
        }
    }

    // Ensure candidate contact number is strictly extracted from header, never from REFERENCES
    $headerPhone = PdfExtractor::extractPhoneFromCVText($cvText);
    if (!empty($headerPhone)) {
        if (empty($parsedData['contact_number'])) {
            $parsedData['contact_number'] = $headerPhone;
        } else {
            $refPos = stripos($cvText, 'REFERENCES');
            if ($refPos === false) $refPos = stripos($cvText, 'REFEREES');
            if ($refPos !== false) {
                $phonePos = strpos($cvText, $parsedData['contact_number']);
                if ($phonePos !== false && $phonePos > $refPos) {
                    $parsedData['contact_number'] = $headerPhone;
                }
            }
        }
    }

    jsonResponse(200, 'CV parsed and evaluated successfully by AI', $parsedData);
}

function handleApply()
{
    // Read form data (multipart/form-data for file upload)
    $firstName = sanitize($_POST['first_name'] ?? '');
    $lastName = sanitize($_POST['last_name'] ?? '');
    $email = sanitize($_POST['email'] ?? '');
    $contactNumber = sanitize($_POST['contact_number'] ?? '');
    $overallExp = $_POST['overall_experience'] ?? '';
    $relevantExp = $_POST['relevant_experience'] ?? '';
    $qualification = $_POST['qualification'] ?? '';
    $salaryExpectation = sanitize($_POST['salary_expectation'] ?? '');
    $vacancyId = (int) ($_POST['vacancy_id'] ?? 0);
    $futureConsent = isset($_POST['future_consent']) && ($_POST['future_consent'] === 'true' || $_POST['future_consent'] === '1') ? 1 : 0;
    $tags = sanitize($_POST['tags'] ?? '');
    $skillsMetadata = $_POST['skills_metadata'] ?? null;

    // Validate required fields
    if (
        empty($firstName) || empty($lastName) || empty($email) || empty($contactNumber) ||
        empty($overallExp) || empty($relevantExp) || empty($qualification) || $vacancyId <= 0
    ) {
        jsonResponse(400, 'All fields are required');
    }

    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(400, 'Invalid email address');
    }

    // Validate CV file
    if (!isset($_FILES['cv']) || $_FILES['cv']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(400, 'CV file is required');
    }

    $cv = $_FILES['cv'];
    $allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (!in_array($cv['type'], $allowedTypes)) {
        jsonResponse(400, 'Only PDF, DOC, and DOCX files are allowed');
    }

    if ($cv['size'] > MAX_CV_SIZE) {
        jsonResponse(400, 'CV file must be less than 5MB');
    }

    $db = getDB();

    // Check if vacancy exists and is active
    $stmt = $db->prepare("SELECT v.*, c.name as company_name FROM vacancies v JOIN companies c ON v.company_id = c.id WHERE v.id = ? AND v.is_active = 1 AND v.expire_date >= CURDATE()");
    $stmt->execute([$vacancyId]);
    $vacancy = $stmt->fetch();

    if (!$vacancy) {
        jsonResponse(404, 'Vacancy not found or has expired');
    }

    // Check duplicate email for same vacancy
    $stmt = $db->prepare("SELECT id FROM applications WHERE email = ? AND vacancy_id = ?");
    $stmt->execute([$email, $vacancyId]);
    if ($stmt->fetch()) {
        jsonResponse(409, 'You have already applied for this position with this email');
    }

    // Check duplicate contact number for same vacancy
    $stmt = $db->prepare("SELECT id FROM applications WHERE contact_number = ? AND vacancy_id = ?");
    $stmt->execute([$contactNumber, $vacancyId]);
    if ($stmt->fetch()) {
        jsonResponse(409, 'You have already applied for this position with this contact number');
    }

    // Save CV file
    $ext = pathinfo($cv['name'], PATHINFO_EXTENSION);
    $cvFileName = 'cv_' . $vacancyId . '_' . time() . '_' . uniqid() . '.' . $ext;
    $cvPath = UPLOAD_DIR . $cvFileName;

    if (!move_uploaded_file($cv['tmp_name'], $cvPath)) {
        jsonResponse(500, 'Failed to upload CV');
    }

    require_once __DIR__ . '/../libs/PdfExtractor.php';

    // 1. Extract raw CV text immediately from uploaded file
    $cvTextExt = PdfExtractor::extractTextFromFile($cvPath);
    if (!empty($cvTextExt) && strlen(trim($cvTextExt)) >= 30 && !PdfExtractor::isGarbledText($cvTextExt)) {
        $cvText = $cvTextExt;
    } else {
        $cvTextFromPost = $_POST['cv_text'] ?? null;
        if (!empty($cvTextFromPost) && strlen(trim($cvTextFromPost)) >= 30 && !PdfExtractor::isGarbledText($cvTextFromPost)) {
            $cvText = $cvTextFromPost;
        } else {
            $cvText = "CANDIDATE RESUME PROFILE\n"
                    . "Name: {$firstName} {$lastName}\n"
                    . "Email: {$email}\n"
                    . "Contact Number: {$contactNumber}\n"
                    . "Qualification: {$qualification}\n"
                    . "Overall Experience: {$overallExp}\n"
                    . "Relevant Experience: {$relevantExp}\n"
                    . "Target Vacancy: " . ($vacancy['title'] ?? 'Position') . "\n"
                    . "Salary Expectation: " . ($salaryExpectation ? "LKR {$salaryExpectation}" : 'Not specified');
        }
    }

    // 2. Check if email is already blocked
    $stmt = $db->prepare("SELECT is_blocked, block_reason FROM applications WHERE email = ? AND is_blocked = 1 LIMIT 1");
    $stmt->execute([$email]);
    $blockInfo = $stmt->fetch();
    $isBlocked = $blockInfo ? 1 : 0;
    $blockReason = $blockInfo ? $blockInfo['block_reason'] : null;

    // 3. Read AI Toggle & Low Threshold settings
    $stmtExtSetting = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'enable_cv_extraction'");
    $enableCvExt = $stmtExtSetting ? $stmtExtSetting->fetchColumn() : '1';
    $isToggleEnabled = ($enableCvExt === '1' || $enableCvExt === 'true' || $enableCvExt === true);

    $stmtMinMed = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'min_medium_match_score'");
    $minMedScore = $stmtMinMed ? (int)$stmtMinMed->fetchColumn() : 50;
    if ($minMedScore <= 0) $minMedScore = 50;

    $candData = [
        'salary_expectation' => $salaryExpectation,
        'overall_experience' => $overallExp,
        'relevant_experience' => $relevantExp,
        'qualification' => $qualification
    ];

    // 4. AI reads the CV and evaluates match score against Job Description (skills, experience, qualification, salary)
    $parsedData = PdfExtractor::parseCvDataWithAI($cvText, $vacancy, $candData, $cvPath);

    // Calculate authoritative final match score (with Seniority & Relevance Reward)
    $aiScore = calculateCandidateMatchScorePHP($parsedData, $vacancy, $qualification, $overallExp, $relevantExp, $salaryExpectation);
    if (!empty($parsedData) && is_array($parsedData)) {
        $parsedData['ai_match_score'] = $aiScore;
    }

    // 5. Evaluation Decision:
    // - If AI Score < Low Threshold ($minMedScore) -> UNEXTRACTED (even if Toggle is ON)
    // - If Toggle is OFF -> UNEXTRACTED
    // - If Toggle is ON AND AI Score >= Low Threshold -> AUTO EXTRACT!
    $isScoreGreaterOrEqualLow = ($aiScore >= $minMedScore);
    $shouldAutoExtract = $isToggleEnabled && $isScoreGreaterOrEqualLow;

    if ($shouldAutoExtract) {
        $extractionStatus = 'extracted';
        $extractedAt = date('Y-m-d H:i:s');
        $extractedData = json_encode($parsedData);

        // Update candidate qualification with the true qualification extracted from CV
        if (!empty($parsedData['qualifications_found'][0])) {
            $qualification = $parsedData['qualifications_found'][0];
        } else if (!empty($parsedData['qualification'])) {
            $qualification = $parsedData['qualification'];
        }

        // If AI returned clean full text transcription, use it as cvText
        if (!empty($parsedData['extracted_full_text']) && strlen(trim($parsedData['extracted_full_text'])) > 50) {
            $cvText = $parsedData['extracted_full_text'];
        }

        // Construct skills_metadata array from AI evaluation report
        $skillsMetadataArr = [
            'ai_match_score' => $aiScore,
            'ai_match_reason' => $parsedData['ai_match_reason'] ?? '',
            'is_job_mismatch' => $parsedData['is_job_mismatch'] ?? false,
            'mismatch_reason' => $parsedData['mismatch_reason'] ?? '',
            'ai_score_breakdown' => $parsedData['ai_score_breakdown'] ?? [],
            'skills_analysis' => $parsedData['skills_analysis'] ?? [],
            'fully_demonstrated_skills' => $parsedData['fully_demonstrated_skills'] ?? [],
            'partially_demonstrated_skills' => $parsedData['partially_demonstrated_skills'] ?? [],
            'requirements_without_evidence' => $parsedData['requirements_without_evidence'] ?? [],
            'additional_skills' => $parsedData['additional_skills'] ?? [],
            'qualifications_found' => $parsedData['qualifications_found'] ?? [],
            'certifications_found' => $parsedData['certifications_found'] ?? [],
            'experience_summary' => $parsedData['experience_summary'] ?? ($parsedData['profile_summary'] ?? 'Candidate profile evaluated from CV text.'),
            'recruiter_insights' => $parsedData['recruiter_insights'] ?? ['Candidate resume extracted and evaluated by Steuart AI Engine.']
        ];
        $skillsMetadata = json_encode($skillsMetadataArr);

        // Extract tags string from skills
        $allSkillsList = [];
        if (!empty($parsedData['skills_analysis']) && is_array($parsedData['skills_analysis'])) {
            foreach ($parsedData['skills_analysis'] as $sa) {
                if (!empty($sa['skill'])) $allSkillsList[] = $sa['skill'];
            }
        }
        if (!empty($allSkillsList)) {
            $tags = implode(', ', array_unique($allSkillsList));
        }
    } else {
        $extractionStatus = 'unextracted';
        $cvText = null;
        $extractedData = null;
        $extractedAt = null;
        $tags = '';
        // Retain the AI match score and reasoning in skills_metadata so Admin UI displays the exact AI score that fell below threshold
        $unextractedReason = !$isToggleEnabled
            ? "Auto-extraction is disabled in system settings."
            : "Candidate AI match score ({$aiScore}%) is below the minimum threshold ({$minMedScore}%).";

        $skillsMetadata = json_encode([
            'ai_match_score' => $aiScore,
            'ai_match_reason' => $parsedData['ai_match_reason'] ?? $unextractedReason,
            'unextracted_reason' => $unextractedReason,
            'is_unextracted' => true,
            'is_job_mismatch' => $parsedData['is_job_mismatch'] ?? false,
            'mismatch_reason' => $parsedData['mismatch_reason'] ?? '',
            'ai_score_breakdown' => $parsedData['ai_score_breakdown'] ?? []
        ]);
    }

    // Insert application with match_score saved directly to database
    $stmt = $db->prepare("INSERT INTO applications (vacancy_id, match_score, first_name, last_name, email, contact_number, overall_experience, relevant_experience, qualification, salary_expectation, cv_path, cv_text, extraction_status, is_manual_extracted, extracted_at, extracted_data, future_consent, is_blocked, block_reason, tags, skills_metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $vacancyId,
        $aiScore,
        $firstName,
        $lastName,
        $email,
        $contactNumber,
        $overallExp,
        $relevantExp,
        $qualification,
        $salaryExpectation,
        $cvFileName,
        $cvText,
        $extractionStatus,
        $extractedAt,
        $extractedData,
        $futureConsent,
        $isBlocked,
        $blockReason,
        $tags,
        $skillsMetadata
    ]);

    // Return response immediately to frontend so it can redirect
    jsonResponse(201, 'Application submitted successfully! A confirmation email is being sent.', null, true);

    // Continue sending email in background
    sendConfirmationEmail($email, $firstName, $vacancy['title'], $vacancy['company_name'], $vacancy['reference_number']);
    exit();
}

function sendConfirmationEmail($to, $name, $jobTitle, $companyName, $jobRef)
{
    if (!defined('EMAIL_ENABLED') || !EMAIL_ENABLED || !isCandidateEmailEnabled())
        return;

    $defaultSubject = "Application Received - {job_title} | George Steuart Group";
    $defaultBody = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <p>Thank you for your interest in joining George Steuart Group. We have successfully received your application for {job_title} ({ref_no}) and it is now being reviewed by our Talent Acquisition team.</p>
</body>
</html>';

    $subjectTemplate = getEmailTemplate('email_template_confirmation_subject', $defaultSubject);
    $bodyTemplate = getEmailTemplate('email_template_confirmation_body', $defaultBody);

    $vars = [
        'name' => $name,
        'job_title' => $jobTitle,
        'company' => $companyName,
        'ref_no' => $jobRef,
        'current_year' => date('Y')
    ];

    $subject = parseEmailTemplate($subjectTemplate, $vars);
    $body = parseEmailTemplate($bodyTemplate, $vars);

    queueEmail($to, $name, $subject, $body);
}

function sendShortlistEmail($applicationId, $to, $name, $jobTitle, $companyName, $jobRef, $type, $date, $time, $location, $locationLink = '')
{
    if (!defined('EMAIL_ENABLED') || !EMAIL_ENABLED || !isCandidateEmailEnabled())
        return;

    $defaultSubject = "Interview Invitation - {job_title} | George Steuart Group";
    $defaultBody = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f6f9; font-family: \'Segoe UI\', Arial, Helvetica, sans-serif; }
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
                        <td class="mobile-content" style="padding: 36px 32px; font-family: \'Segoe UI\', Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #334155;">
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
                                                <td class="detail-value-td" valign="top" style="padding: 6px 0; font-family: \'Segoe UI\', Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">{interview_type}</td>
                                            </tr>
                                            <tr>
                                                <td class="detail-label-td" width="110" valign="top" style="padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">DATE</td>
                                                <td class="detail-value-td" valign="top" style="padding: 6px 0; font-family: \'Segoe UI\', Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">{interview_date}</td>
                                            </tr>
                                            <tr>
                                                <td class="detail-label-td" width="110" valign="top" style="padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">TIME</td>
                                                <td class="detail-value-td" valign="top" style="padding: 6px 0; font-family: \'Segoe UI\', Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">{interview_time}</td>
                                            </tr>
                                            <tr>
                                                <td class="detail-label-td" width="110" valign="top" style="padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">LOCATION</td>
                                                <td class="detail-value-td" valign="top" style="padding: 6px 0; font-family: \'Segoe UI\', Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">{interview_location}</td>
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
</html>';

    $subjectTemplate = getEmailTemplate('email_template_shortlist_subject', $defaultSubject);
    $bodyTemplate = getEmailTemplate('email_template_shortlist_body', $defaultBody);

    $vars = [
        'name' => $name,
        'job_title' => $jobTitle,
        'company' => $companyName,
        'ref_no' => $jobRef,
        'interview_type' => $type,
        'interview_date' => $date,
        'interview_time' => $time,
        'interview_location' => $type === 'Online' ? 'Virtual / Online' : $location,
        'confirm_url_yes' => FRONTEND_URL . "/confirm-interview?id={$applicationId}&response=yes",
        'confirm_url_no' => FRONTEND_URL . "/confirm-interview?id={$applicationId}&response=no",
        'current_year' => date('Y')
    ];

    $subject = parseEmailTemplate($subjectTemplate, $vars);
    $body = parseEmailTemplate($bodyTemplate, $vars);

    queueEmail($to, $name, $subject, $body);
}

function sendInterviewConfirmationReceiptEmail($to, $name, $jobTitle, $companyName, $response, $jobRef)
{
    if (!defined('EMAIL_ENABLED') || !EMAIL_ENABLED || !isCandidateEmailEnabled())
        return;

    $responseStr = $response === 'yes' ? 'Yes, I am available' : 'No, I cannot attend';
    $subject = "Interview RSVP Confirmation: $jobTitle | George Steuart Group";
    $currentYear = date('Y');

    $body = "
    <!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Transitional//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'>
    <html xmlns='http://www.w3.org/1999/xhtml' xmlns:v='urn:schemas-microsoft-com:vml' xmlns:o='urn:schemas-microsoft-com:office:office'>
    <head>
        <meta http-equiv='Content-Type' content='text/html; charset=UTF-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <title>Interview RSVP Confirmation</title>
        <!--[if mso]>
        <noscript>
            <xml>
                <o:OfficeDocumentSettings>
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
        </noscript>
        <![endif]-->
        <style type='text/css'>
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f6f9; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; }
        </style>
    </head>
    <body style='margin: 0; padding: 0; background-color: #f4f6f9;'>
        <table border='0' cellpadding='0' cellspacing='0' width='100%' role='presentation' style='background-color: #f4f6f9; table-layout: fixed;'>
            <tr>
                <td align='center' style='padding: 30px 10px;'>
                    <!--[if mso]>
                    <table align='center' border='0' cellspacing='0' cellpadding='0' width='600' role='presentation'>
                    <tr>
                    <td align='center' valign='top' width='600'>
                    <![endif]-->
                    <table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.05);'>
                        <tr>
                            <td align='center' style='background-color: #1a1a2e; padding: 32px 20px; border-bottom: 4px solid #c8a951;'>
                                <table border='0' cellpadding='0' cellspacing='0' role='presentation'>
                                    <tr>
                                        <td align='center' style='font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;'>
                                            GEORGE STEUART
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align='center' style='font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 800; color: #c8a951; letter-spacing: 1.8px; text-transform: uppercase; padding-top: 4px;'>
                                            ESTABLISHED 1835
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style='padding: 36px 32px; font-family: \"Segoe UI\", Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #334155;'>
                                <p style='margin: 0 0 18px 0; font-size: 20px; font-weight: bold; color: #0f172a;'>Dear $name,</p>
                                
                                <p style='margin: 0 0 20px 0;'>
                                    <span style='background-color: " . ($response === 'yes' ? "#d1fae5" : "#fee2e2") . "; color: " . ($response === 'yes' ? "#065f46" : "#991b1b") . "; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block;'>RSVP RECORDED</span>
                                </p>
                                
                                <p style='margin: 0 0 20px 0;'>This email confirms that we have successfully received and registered your RSVP response for the scheduled interview.</p>
                                
                                <table border='0' cellpadding='0' cellspacing='0' width='100%' role='presentation' style='background-color: #fffaf0; border: 1px solid #fde68a; border-left: 4px solid #c8a951; border-radius: 8px; margin: 20px 0;'>
                                    <tr>
                                        <td style='padding: 20px;'>
                                            <table border='0' cellpadding='0' cellspacing='0' width='100%' role='presentation'>
                                                <tr>
                                                    <td width='130' valign='top' style='padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase;'>POSITION</td>
                                                    <td valign='top' style='padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;'>$jobTitle</td>
                                                </tr>
                                                <tr>
                                                    <td width='130' valign='top' style='padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase;'>REF NO</td>
                                                    <td valign='top' style='padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;'>$jobRef</td>
                                                </tr>
                                                <tr>
                                                    <td width='130' valign='top' style='padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #718096; text-transform: uppercase;'>YOUR RSVP</td>
                                                    <td valign='top' style='padding: 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; color: " . ($response === 'yes' ? "#10b981" : "#ef4444") . "; text-transform: uppercase;'>$responseStr</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <p style='margin: 20px 0 0 0;'>If you wish to reschedule or discuss alternative slots, please reply directly to your original interview invitation email or contact the recruitment team.</p>
                                
                                <p style='margin: 28px 0 0 0; line-height: 1.5;'>
                                    Best regards,<br />
                                    <strong style='color: #0f172a;'>Talent Acquisition Team</strong><br />
                                    <span style='color: #64748b; font-size: 14px;'>George Steuart Group</span>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align='center' style='background-color: #f8fafc; padding: 24px 20px; border-top: 1px solid #e2e8f0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.6;'>
                                &#169; $currentYear George Steuart Group. All Rights Reserved.<br />
                                <span style='font-size: 11px; color: #cbd5e1; display: inline-block; margin-top: 6px;'>No. 439, Galle Road, Colombo 03, Sri Lanka.</span>
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
    </html>";

    queueEmail($to, $name, $subject, $body);
}

function sendRejectionEmail($to, $name, $jobTitle, $companyName, $reason, $jobRef)
{
    if (!defined('EMAIL_ENABLED') || !EMAIL_ENABLED || !isCandidateEmailEnabled())
        return;

    $defaultSubject = "Application Status Update - {job_title} | George Steuart Group";
    $defaultBody = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <p>Dear {name},</p>
    <p>Thank you for your interest in George Steuart Group. We regret to inform you that we will not be moving forward with your application for the position of {job_title} ({ref_no}) at this time.</p>
    <p>We wish you all the best in your career.</p>
</body>
</html>';

    $subjectTemplate = getEmailTemplate('email_template_rejection_subject', $defaultSubject);
    $bodyTemplate = getEmailTemplate('email_template_rejection_body', $defaultBody);

    $vars = [
        'name' => $name,
        'job_title' => $jobTitle,
        'company' => $companyName,
        'ref_no' => $jobRef,
        'current_year' => date('Y')
    ];

    $subject = parseEmailTemplate($subjectTemplate, $vars);
    $body = parseEmailTemplate($bodyTemplate, $vars);

    queueEmail($to, $name, $subject, $body);
}


/**
 * Returns an ordered array of experience tiers.
 */
function getAllExperienceTiers()
{
    return [
        '0 years',
        '0-1 years',
        '1-2 years',
        '3-4 years',
        '5-7 years',
        '8-10 years',
        '10+ years',
    ];
}

/**
 * Returns all experience tiers >= the given level.
 * E.g. getExperienceAtLeast('3-4 years') => ['3-4 years','5-7 years','8-10 years','10+ years']
 */
function getExperienceAtLeast($level)
{
    $tiers = getAllExperienceTiers();
    $idx = array_search($level, $tiers);
    if ($idx === false)
        return $tiers; // if unknown, return all
    return array_slice($tiers, $idx);
}

function listApplications()
{
    $auth = verifyToken();
    $db = getDB();

    $vacancyId = $_GET['vacancy_id'] ?? '';
    $companyId = $_GET['company_id'] ?? '';
    $overallExp = $_GET['overall_experience'] ?? '';
    $relevantExp = $_GET['relevant_experience'] ?? '';
    $qualification = $_GET['qualification'] ?? '';
    $search = $_GET['search'] ?? '';
    $status = $_GET['status'] ?? '';

    $sql = "SELECT a.*, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.min_salary, v.max_salary, v.designation, v.reference_number as job_ref, c.name as company_name, v.company_id, a.future_consent,
            (SELECT COUNT(*) > 0 FROM applications a2 WHERE a2.email = a.email AND a2.is_blocked = 1 LIMIT 1) as is_email_blocked
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            JOIN companies c ON v.company_id = c.id
            WHERE 1=1";
    $params = [];

    // Company scoped admin restriction
    if ($auth['role'] !== 'super_admin' && $auth['role'] !== 'admin') {
        $sql .= " AND v.company_id = ?";
        $params[] = $auth['company_id'];
    }

    if (!empty($vacancyId)) {
        $sql .= " AND a.vacancy_id = ?";
        $params[] = $vacancyId;
    }

    if (!empty($companyId) && ($auth['role'] === 'super_admin' || $auth['role'] === 'admin')) {
        $sql .= " AND v.company_id = ?";
        $params[] = $companyId;
    }

    if (!empty($overallExp)) {
        // "At least" logic: show all tiers >= selected
        $overallTiers = getExperienceAtLeast($overallExp);
        $placeholders = implode(',', array_fill(0, count($overallTiers), '?'));
        $sql .= " AND a.overall_experience IN ($placeholders)";
        $params = array_merge($params, $overallTiers);
    }

    if (!empty($relevantExp)) {
        // "At least" logic: show all tiers >= selected
        $relTiers = getExperienceAtLeast($relevantExp);
        $placeholders = implode(',', array_fill(0, count($relTiers), '?'));
        $sql .= " AND a.relevant_experience IN ($placeholders)";
        $params = array_merge($params, $relTiers);
    }

    if (!empty($qualification)) {
        $sql .= " AND a.qualification = ?";
        $params[] = $qualification;
    }

    if (!empty($status)) {
        $sql .= " AND a.status = ?";
        $params[] = $status;
    }

    $interviewDate = sanitize($_GET['interview_date'] ?? '');
    if (!empty($interviewDate)) {
        $sql .= " AND a.interview_date = ?";
        $params[] = $interviewDate;
    }

    if (!empty($search)) {
        $sql .= " AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $sql .= " ORDER BY a.applied_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Read score settings and extraction toggle for synchronized presentation with CV Extractions
    $stmtScores = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('min_high_match_score', 'min_medium_match_score')");
    $scoreSettings = $stmtScores ? $stmtScores->fetchAll(PDO::FETCH_KEY_PAIR) : [];
    $minHigh = isset($scoreSettings['min_high_match_score']) ? (int)$scoreSettings['min_high_match_score'] : 75;
    $minMedium = isset($scoreSettings['min_medium_match_score']) ? (int)$scoreSettings['min_medium_match_score'] : 50;

    $stmtSetting = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'enable_cv_extraction'");
    $settingVal = $stmtSetting ? $stmtSetting->fetchColumn() : null;
    $enableSetting = ($settingVal === null || $settingVal === false || $settingVal === '1' || $settingVal === 'true' || $settingVal === true || $settingVal === 1);

    require_once __DIR__ . '/../libs/PdfExtractor.php';

    foreach ($applications as &$item) {
        $extractedDataArr = !empty($item['extracted_data']) ? (is_array($item['extracted_data']) ? $item['extracted_data'] : json_decode($item['extracted_data'], true)) : null;
        if (!empty($extractedDataArr['extracted_full_text'])) {
            $cvTextToUse = $extractedDataArr['extracted_full_text'];
        } else {
            $cvTextToUse = $item['cv_text'];
            if ((empty($cvTextToUse) || PdfExtractor::isGarbledText($cvTextToUse)) && !empty($item['cv_path'])) {
                $fullPath = UPLOAD_DIR . $item['cv_path'];
                if (file_exists($fullPath)) {
                    $extractedRaw = PdfExtractor::extractTextFromFile($fullPath);
                    if ($extractedRaw && !PdfExtractor::isGarbledText($extractedRaw)) {
                        $cvTextToUse = $extractedRaw;
                    } else {
                        $cvTextToUse = "Candidate resume text extracted from document.";
                    }
                }
            } else if (!empty($cvTextToUse)) {
                $cvTextToUse = PdfExtractor::cleanExtractedCvText($cvTextToUse);
                if (empty($cvTextToUse) || PdfExtractor::isGarbledText($cvTextToUse)) {
                    $cvTextToUse = "Candidate resume text extracted from document.";
                }
            }
        }
        $item['cv_text'] = $cvTextToUse;

        $meta = !empty($item['skills_metadata']) ? (is_array($item['skills_metadata']) ? $item['skills_metadata'] : json_decode($item['skills_metadata'], true)) : null;
        if (!empty($meta) && isset($meta['ai_match_score']) && is_numeric($meta['ai_match_score'])) {
            $effectiveScore = (int)$meta['ai_match_score'];
        } else {
            $effectiveScore = computeCandidateMatchScore(
                $item,
                $item['qualification'],
                $item['overall_experience'],
                $item['relevant_experience'],
                $cvTextToUse,
                $item['tags'],
                $item['skills_metadata'],
                $item['salary_expectation']
            );
        }
        $item['match_score'] = $effectiveScore;
        $item['score'] = $effectiveScore;

        $isManual = (isset($item['is_manual_extracted']) && ($item['is_manual_extracted'] == 1 || $item['is_manual_extracted'] === '1'));
        $isLowMatch = ($effectiveScore < $minMedium);

        if ($isManual) {
            $effectiveStatus = 'extracted';
        } else if (!$enableSetting || $isLowMatch) {
            $effectiveStatus = 'unextracted';
        } else {
            $effectiveStatus = 'extracted';
        }

        $item['extraction_status'] = $effectiveStatus;
        $item['auto_extraction_enabled'] = $enableSetting;
        $item['min_medium_match_score'] = $minMedium;
        $item['min_high_match_score'] = $minHigh;
    }
    unset($item);

    jsonResponse(200, 'Applications retrieved', $applications);
}

function handleUpdateStatus()
{
    $auth = verifyToken();
    if (in_array($auth['role'], ['super_admin', 'sub_admin2', 'sub_admin'])) {
        jsonResponse(403, 'Your role does not have permission to modify application status');
    }
    $db = getDB();

    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = (int) ($data['id'] ?? 0);
    $newStatus = sanitize($data['status'] ?? '');
    $rejectionReason = sanitize($data['rejection_reason'] ?? '');

    if ($applicationId <= 0 || !in_array($newStatus, ['pending', 'under_review', 'shortlisted', 'rejected'])) {
        jsonResponse(400, 'Invalid request data');
    }

    if ($newStatus === 'rejected' && empty($rejectionReason)) {
        jsonResponse(400, 'Rejection reason is required');
    }

    // Check permissions map correctly
    $stmt = $db->prepare("SELECT a.*, v.title as vacancy_title, v.reference_number as job_ref, c.name as company_name, v.company_id
                          FROM applications a 
                          JOIN vacancies v ON a.vacancy_id = v.id 
                          JOIN companies c ON v.company_id = c.id
                          WHERE a.id = ?");
    $stmt->execute([$applicationId]);
    $application = $stmt->fetch();

    if (!$application) {
        jsonResponse(404, 'Application not found');
    }

    if ($auth['role'] !== 'admin' && $application['company_id'] != $auth['company_id']) {
        jsonResponse(403, 'Unauthorized access to this application');
    }

    $currentStatus = $application['status'];
    if ($currentStatus === $newStatus && $newStatus !== 'rejected') {
        jsonResponse(400, 'Application is already marked as ' . $newStatus);
    }

    $reasonToSave = ($newStatus === 'rejected') ? $rejectionReason : null;

    if ($newStatus === 'shortlisted') {
        // Step 1: Only update status — NO interview details, NO email; clear rejection_reason if previously rejected
        $stmt = $db->prepare("UPDATE applications SET status = 'shortlisted', rejection_reason = NULL WHERE id = ?");
        $success = $stmt->execute([$applicationId]);
    } else {
        $stmt = $db->prepare("UPDATE applications SET status = ?, rejection_reason = ? WHERE id = ?");
        $success = $stmt->execute([$newStatus, $reasonToSave, $applicationId]);
    }

    if (!$success) {
        jsonResponse(500, 'Failed to update status');
    }

    // Audit logging the candidate status change
    $candidateName = $application['first_name'] . ' ' . $application['last_name'];
    $auditAction = 'candidate_' . $newStatus;
    $auditReason = "Candidate: " . $candidateName;
    if ($newStatus === 'rejected') {
        $auditReason .= " | Rejection Reason: " . $rejectionReason;
    }
    logVacancyAction($application['vacancy_id'], $auth['admin_id'], $auditAction, $currentStatus, $newStatus, $auditReason);

    // Return response immediately
    jsonResponse(200, 'Application status updated successfully', null, true);

    // Only send rejection email here; interview email is sent via send_interview action
    if ($newStatus === 'rejected') {
        sendRejectionEmail($application['email'], $application['first_name'], $application['vacancy_title'], $application['company_name'], $reasonToSave, $application['job_ref']);
    }
    exit();
}

/**
 * Step 2: Save interview details and send interview invitation email.
 * Works on already-shortlisted candidates. Can be called multiple times (re-send).
 */
function handleSendInterview()
{
    $auth = verifyToken();
    if (in_array($auth['role'], ['super_admin', 'sub_admin2', 'sub_admin'])) {
        jsonResponse(403, 'Your role does not have permission to schedule interviews');
    }
    $db = getDB();

    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = (int) ($data['id'] ?? 0);

    if ($applicationId <= 0) {
        jsonResponse(400, 'Invalid application ID');
    }

    $interviewType = sanitize($data['interview_type'] ?? 'Online');
    $interviewDate = sanitize($data['interview_date'] ?? '');
    $interviewTime = sanitize($data['interview_time'] ?? '');
    $interviewLocation = sanitize($data['interview_location'] ?? '');
    $interviewLocationLink = sanitize($data['interview_location_link'] ?? '');

    if (empty($interviewDate) || empty($interviewTime) || empty($interviewLocation)) {
        jsonResponse(400, 'Interview date, time, and location are required');
    }

    $today = date('Y-m-d');
    if ($interviewDate < $today) {
        jsonResponse(400, 'Interview date cannot be scheduled in the past. Please select today or a future date.');
    }

    // Fetch application
    $stmt = $db->prepare("SELECT a.*, v.title as vacancy_title, v.reference_number as job_ref, c.name as company_name, v.company_id
                          FROM applications a
                          JOIN vacancies v ON a.vacancy_id = v.id
                          JOIN companies c ON v.company_id = c.id
                          WHERE a.id = ?");
    $stmt->execute([$applicationId]);
    $application = $stmt->fetch();

    if (!$application) {
        jsonResponse(404, 'Application not found');
    }

    if ($auth['role'] !== 'admin' && $application['company_id'] != $auth['company_id']) {
        jsonResponse(403, 'Unauthorized');
    }

    if ($application['status'] !== 'shortlisted') {
        jsonResponse(400, 'Candidate must be shortlisted before sending an interview invitation');
    }

    // Save interview details
    $stmt = $db->prepare("UPDATE applications SET interview_type = ?, interview_date = ?, interview_time = ?, interview_location = ?, interview_location_link = ? WHERE id = ?");
    $stmt->execute([$interviewType, $interviewDate, $interviewTime, $interviewLocation, $interviewLocationLink, $applicationId]);

    // Audit logging the scheduled interview
    $candidateName = $application['first_name'] . ' ' . $application['last_name'];
    $auditReason = "Candidate: " . $candidateName . " | Date: " . $interviewDate . " @ " . $interviewTime . " | Type: " . $interviewType . " | Location: " . $interviewLocation;
    logVacancyAction($application['vacancy_id'], $auth['admin_id'], 'interview_scheduled', $application['status'], $application['status'], $auditReason);

    // Return immediately, then send email
    jsonResponse(200, 'Interview invitation sent successfully', null, true);

    sendShortlistEmail(
        $applicationId,
        $application['email'],
        $application['first_name'],
        $application['vacancy_title'],
        $application['company_name'],
        $application['job_ref'],
        $interviewType,
        $interviewDate,
        $interviewTime,
        $interviewLocation,
        $interviewLocationLink
    );
    exit();
}

function handleConfirmInterview()
{
    $db = getDB();
    $id = (int)($_GET['id'] ?? 0);
    $response = sanitize($_GET['response'] ?? '');

    if ($id <= 0 || !in_array($response, ['yes', 'no'])) {
        jsonResponse(400, 'Invalid confirmation parameters');
    }

    $stmt = $db->prepare("
        SELECT a.first_name, a.last_name, a.email, a.status, a.vacancy_id, 
               v.title as vacancy_title, v.reference_number as job_ref, c.name as company_name 
        FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        LEFT JOIN companies c ON v.company_id = c.id
        WHERE a.id = ?
    ");
    $stmt->execute([$id]);
    $app = $stmt->fetch();

    if (!$app) {
        jsonResponse(404, 'Application not found');
    }

    if ($app['status'] !== 'shortlisted') {
        jsonResponse(400, 'Application is not in shortlisted state');
    }

    $stmt = $db->prepare("UPDATE applications SET interview_confirmed = ? WHERE id = ?");
    $stmt->execute([$response, $id]);

    // Audit logging candidate interview confirmation response
    $candidateName = $app['first_name'] . ' ' . $app['last_name'];
    $auditAction = 'interview_confirmed_' . $response;
    $auditReason = "Candidate: " . $candidateName . " responded: " . strtoupper($response);
    logVacancyAction($app['vacancy_id'], null, $auditAction, $app['status'], $app['status'], $auditReason);

    // Send confirmation receipt email to the candidate
    sendInterviewConfirmationReceiptEmail(
        $app['email'],
        $candidateName,
        $app['vacancy_title'],
        $app['company_name'],
        $response,
        $app['job_ref']
    );

    jsonResponse(200, 'Interview confirmation updated successfully');
}

function exportApplications()
{
    $auth = verifyToken();
    $db = getDB();

    $vacancyId = $_GET['vacancy_id'] ?? '';
    $companyId = $_GET['company_id'] ?? '';
    $overallExp = $_GET['overall_experience'] ?? '';
    $relevantExp = $_GET['relevant_experience'] ?? '';
    $qualification = $_GET['qualification'] ?? '';
    $status = $_GET['status'] ?? '';

    $sql = "SELECT a.*, 
            v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements,
            v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience,
            v.min_salary, v.max_salary, v.reference_number as job_ref, v.designation, c.name as company_name,
            v.weight_skills, v.weight_experience, v.weight_qualification, v.weight_jd_alignment, v.weight_salary
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            JOIN companies c ON v.company_id = c.id
            WHERE 1=1";
    $params = [];

    if ($auth['role'] !== 'super_admin' && $auth['role'] !== 'admin') {
        $sql .= " AND v.company_id = ?";
        $params[] = $auth['company_id'];
    }

    if (!empty($vacancyId)) {
        $sql .= " AND a.vacancy_id = ?";
        $params[] = $vacancyId;
    }

    if (!empty($companyId) && ($auth['role'] === 'super_admin' || $auth['role'] === 'admin')) {
        $sql .= " AND v.company_id = ?";
        $params[] = $companyId;
    }

    if (!empty($overallExp)) {
        $overallTiers = getExperienceAtLeast($overallExp);
        $placeholders = implode(',', array_fill(0, count($overallTiers), '?'));
        $sql .= " AND a.overall_experience IN ($placeholders)";
        $params = array_merge($params, $overallTiers);
    }

    if (!empty($relevantExp)) {
        $relTiers = getExperienceAtLeast($relevantExp);
        $placeholders = implode(',', array_fill(0, count($relTiers), '?'));
        $sql .= " AND a.relevant_experience IN ($placeholders)";
        $params = array_merge($params, $relTiers);
    }

    if (!empty($qualification)) {
        $sql .= " AND a.qualification = ?";
        $params[] = $qualification;
    }

    if (!empty($status)) {
        $sql .= " AND a.status = ?";
        $params[] = $status;
    }

    $sql .= " ORDER BY a.applied_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Compute dynamic Match Score (%) for each candidate
    foreach ($applications as &$item) {
        $meta = !empty($item['skills_metadata']) ? (is_array($item['skills_metadata']) ? $item['skills_metadata'] : json_decode($item['skills_metadata'], true)) : null;
        $effectiveScore = null;

        if (!empty($meta) && isset($meta['ai_score_breakdown']) && is_array($meta['ai_score_breakdown'])) {
            $bd = $meta['ai_score_breakdown'];
            $skillsFactor = (int)($bd['skills_match_score'] ?? 75);
            $expFactor = (int)($bd['experience_match_score'] ?? 75);
            $qualFactor = (int)($bd['qualification_match_score'] ?? 75);
            $jdFactor = (int)($bd['job_description_match_score'] ?? ($bd['jd_alignment_score'] ?? 75));
            $salaryFactor = (int)($bd['salary_match_score'] ?? 100);

            // Seniority & Relevance Reward (consistent with frontend scoreCalculator.js)
            if (empty($meta['is_job_mismatch'])) {
                $expWeights = [
                    '10+ years' => 100, '8-10 years' => 85, '5-7 years' => 70,
                    '3-4 years' => 55, '1-2 years' => 35, '0-1 years' => 15, '0 years' => 5
                ];
                $appExpWeight = $expWeights[$item['relevant_experience'] ?? ''] ?? ($expWeights[$item['overall_experience'] ?? ''] ?? 0);
                $minExpWeight = $expWeights[$item['min_relevant_experience'] ?? ''] ?? ($expWeights[$item['min_experience'] ?? ''] ?? 5);

                if ($appExpWeight > $minExpWeight) {
                    if ($appExpWeight >= 70) {
                        $expFactor = max($expFactor, 100);
                    } else if ($appExpWeight >= 55) {
                        $expFactor = max($expFactor, 95);
                    }
                }

                $qualWeights = [
                    'PhD' => 100, 'Masters Degree' => 90, 'Bachelors Degree' => 80,
                    'Professional Certification' => 75, 'Diploma' => 65,
                    'A/L' => 45, 'O/L' => 25
                ];
                $candQual = $item['qualification'] ?? '';
                $appQualWeight = $qualWeights[$candQual] ?? 0;
                if ($appQualWeight === 0 && preg_match('/\b(bachelor|degree|bsc|beng|bba|bcom|bit|btech|honours)\b/i', $candQual)) {
                    $appQualWeight = 80;
                }
                if ($appQualWeight >= 80) {
                    $qualFactor = max($qualFactor, 100);
                }

                if ($appExpWeight >= 55) {
                    $skillsFactor = max($skillsFactor, 95);
                    $jdFactor = max($jdFactor, 90);
                }
            }

            $wSkills = !empty($item['weight_skills']) ? (float)$item['weight_skills'] / 100 : 0.35;
            $wExp = !empty($item['weight_experience']) ? (float)$item['weight_experience'] / 100 : 0.30;
            $wQual = !empty($item['weight_qualification']) ? (float)$item['weight_qualification'] / 100 : 0.20;
            $wJd = !empty($item['weight_jd_alignment']) ? (float)$item['weight_jd_alignment'] / 100 : 0.10;
            $wSal = !empty($item['weight_salary']) ? (float)$item['weight_salary'] / 100 : 0.05;

            $effectiveScore = (int)round(($skillsFactor * $wSkills) + ($expFactor * $wExp) + ($qualFactor * $wQual) + ($jdFactor * $wJd) + ($salaryFactor * $wSal));
        } elseif (!empty($meta) && isset($meta['ai_match_score']) && is_numeric($meta['ai_match_score'])) {
            $effectiveScore = (int)$meta['ai_match_score'];
        } else {
            $cvTextToUse = $item['cv_text'] ?? '';
            $effectiveScore = computeCandidateMatchScore(
                $item,
                $item['qualification'] ?? '',
                $item['overall_experience'] ?? '',
                $item['relevant_experience'] ?? '',
                $cvTextToUse,
                $item['tags'] ?? '',
                $item['skills_metadata'] ?? '',
                $item['salary_expectation'] ?? null
            );
        }
        $item['match_score'] = $effectiveScore;
    }
    unset($item);

    // Sort by Match Score descending (highest score first); if tied, newest applied first
    usort($applications, function ($a, $b) {
        if ($b['match_score'] !== $a['match_score']) {
            return $b['match_score'] <=> $a['match_score'];
        }
        return strcmp($b['applied_at'], $a['applied_at']);
    });

    // Clean any prior output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }

    // Generate CSV (lightweight, no library needed)
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="applicants_' . date('Y-m-d_H-i-s') . '.csv"');
    header('Access-Control-Expose-Headers: Content-Disposition');

    // Remove JSON content type
    header_remove('Content-Type');
    header('Content-Type: text/csv; charset=UTF-8');

    $output = fopen('php://output', 'w');

    // BOM for Excel UTF-8
    fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

    // Header row with Rank & Match Score %
    fputcsv($output, [
        'Rank',
        'Match Score (%)',
        'First Name',
        'Last Name',
        'Email',
        'Contact Number',
        'Overall Experience',
        'Relevant Experience',
        'Qualification',
        'Salary Expectation',
        'Applied Date',
        'Vacancy',
        'Designation',
        'Company',
        'Status',
        'Rejection Reason'
    ]);

    $rank = 1;
    foreach ($applications as $app) {
        $contact = trim((string)($app['contact_number'] ?? ''));
        // Excel formula format ="..." prevents numbers like +94 718... from turning into scientific notation (7.18E+08)
        $formattedContact = !empty($contact) ? '="' . str_replace('"', '""', $contact) . '"' : '';
        // Date format YYYY-MM-DD prevents Excel cells from rendering ########
        $appliedDate = !empty($app['applied_at']) ? substr($app['applied_at'], 0, 10) : '';

        fputcsv($output, [
            $rank++,
            $app['match_score'] . '%',
            $app['first_name'],
            $app['last_name'],
            $app['email'],
            $formattedContact,
            $app['overall_experience'],
            $app['relevant_experience'],
            $app['qualification'],
            $app['salary_expectation'],
            $appliedDate,
            $app['vacancy_title'],
            $app['designation'],
            $app['company_name'],
            $app['status'] ?? 'pending',
            $app['rejection_reason'] ?? ''
        ]);
    }

    fclose($output);
    exit();
}

function getStats()
{
    $auth = verifyToken();
    $db = getDB();

    $interval = "INTERVAL 1 YEAR";

    if ($auth['role'] === 'super_admin' || $auth['role'] === 'admin') {
        $totalVacancies = $db->query("SELECT COUNT(*) FROM vacancies")->fetchColumn();
        $activeVacancies = $db->query("SELECT COUNT(*) FROM vacancies WHERE is_active = 1 AND expire_date >= CURDATE()")->fetchColumn();
        $totalApplications = $db->query("SELECT COUNT(*) FROM applications")->fetchColumn();
        $totalCompanies = $db->query("SELECT COUNT(*) FROM companies")->fetchColumn();

        // Talent Pool: Unique emails with future_consent = 1 within 1 year
        $talentPoolCount = $db->query("SELECT COUNT(DISTINCT email) FROM applications WHERE future_consent = 1 AND applied_at >= DATE_SUB(NOW(), $interval)")->fetchColumn();

        // Total Matches: Candidates in pool matching ANY active vacancy designation
        $totalMatches = $db->query("SELECT COUNT(DISTINCT a.email) 
                                   FROM applications a 
                                   JOIN vacancies v_pool ON a.vacancy_id = v_pool.id
                                   WHERE a.future_consent = 1 
                                     AND a.applied_at >= DATE_SUB(NOW(), $interval)
                                     AND v_pool.designation IN (SELECT designation FROM vacancies WHERE is_active = 1 AND expire_date >= CURDATE())")->fetchColumn();
    } else {
        $cid = $auth['company_id'];
        $stmt = $db->prepare("SELECT COUNT(*) FROM vacancies WHERE company_id = ?");
        $stmt->execute([$cid]);
        $totalVacancies = $stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM vacancies WHERE company_id = ? AND is_active = 1 AND expire_date >= CURDATE()");
        $stmt->execute([$cid]);
        $activeVacancies = $stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE v.company_id = ?");
        $stmt->execute([$cid]);
        $totalApplications = $stmt->fetchColumn();

        $totalCompanies = 1;

        // Talent Pool for specific company
        $stmt = $db->prepare("SELECT COUNT(DISTINCT a.email) FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.future_consent = 1 AND v.company_id = ? AND a.applied_at >= DATE_SUB(NOW(), $interval)");
        $stmt->execute([$cid]);
        $talentPoolCount = $stmt->fetchColumn();

        // Total Matches for company active vacancies
        $stmt = $db->prepare("SELECT COUNT(DISTINCT a.email) 
                             FROM applications a 
                             JOIN vacancies v_pool ON a.vacancy_id = v_pool.id
                             WHERE a.future_consent = 1 
                               AND v_pool.company_id = ?
                               AND a.applied_at >= DATE_SUB(NOW(), $interval)
                               AND v_pool.designation IN (SELECT designation FROM vacancies WHERE company_id = ? AND is_active = 1 AND expire_date >= CURDATE())");
        $stmt->execute([$cid, $cid]);
        $totalMatches = $stmt->fetchColumn();
    }

    // Recent Applications Feature for Dashboard
    $recentApps = [];
    if ($auth['role'] === 'super_admin' || $auth['role'] === 'admin') {
        $recentApps = $db->query("SELECT a.first_name, a.last_name, a.applied_at, v.title as vacancy_title 
                                 FROM applications a 
                                 JOIN vacancies v ON a.vacancy_id = v.id 
                                 ORDER BY a.applied_at DESC LIMIT 5")->fetchAll();
    } else {
        $stmt = $db->prepare("SELECT a.first_name, a.last_name, a.applied_at, v.title as vacancy_title 
                             FROM applications a 
                             JOIN vacancies v ON a.vacancy_id = v.id 
                             WHERE v.company_id = ? 
                             ORDER BY a.applied_at DESC LIMIT 5");
        $stmt->execute([$cid]);
        $recentApps = $stmt->fetchAll();
    }

    // Upcoming Interviews
    $upcomingInterviews = [];
    $today = date('Y-m-d');

    if ($auth['role'] === 'super_admin' || $auth['role'] === 'admin') {
        $upcomingInterviews = $db->query("SELECT a.id, a.first_name, a.last_name, a.interview_date, a.interview_time, a.interview_type, v.title as vacancy_title 
                                 FROM applications a 
                                 JOIN vacancies v ON a.vacancy_id = v.id 
                                 WHERE a.status = 'shortlisted' AND a.interview_date >= '$today'
                                 ORDER BY a.interview_date ASC, a.interview_time ASC 
                                 LIMIT 5")->fetchAll();
    } else {
        $stmt = $db->prepare("SELECT a.id, a.first_name, a.last_name, a.interview_date, a.interview_time, a.interview_type, v.title as vacancy_title 
                             FROM applications a 
                             JOIN vacancies v ON a.vacancy_id = v.id 
                             WHERE v.company_id = ? AND a.status = 'shortlisted' AND a.interview_date >= ?
                             ORDER BY a.interview_date ASC, a.interview_time ASC 
                             LIMIT 5");
        $stmt->execute([$cid, $today]);
        $upcomingInterviews = $stmt->fetchAll();
    }

    jsonResponse(200, 'Stats retrieved', [
        'total_vacancies' => (int) $totalVacancies,
        'active_vacancies' => (int) $activeVacancies,
        'total_applications' => (int) $totalApplications,
        'total_companies' => (int) $totalCompanies,
        'talent_pool_count' => (int) $talentPoolCount,
        'total_matches' => (int) $totalMatches,
        'recent_applications' => $recentApps,
        'upcoming_interviews' => $upcomingInterviews
    ]);
}

function handleGetSuggestions()
{
    $auth = verifyToken();
    $db = getDB();
    $vacancyId = (int) ($_GET['vacancy_id'] ?? 0);

    if ($vacancyId <= 0) {
        jsonResponse(400, 'Vacancy ID is required');
    }

    // Get current vacancy details
    $stmt = $db->prepare("SELECT title, designation, company_id FROM vacancies WHERE id = ?");
    $stmt->execute([$vacancyId]);
    $vacancy = $stmt->fetch();

    if (!$vacancy) {
        jsonResponse(404, 'Vacancy not found');
    }

    // Prepare title keywords for flexible matching (split by space and remove small/common words)
    $titleKeywords = array_filter(explode(' ', strtolower($vacancy['title'])), function ($word) {
        return strlen($word) > 2 && !in_array($word, ['and', 'the', 'for', 'with', 'job', 'vacancy']);
    });

    $titleMatchSql = "";
    if (!empty($titleKeywords)) {
        $titleConditions = [];
        foreach ($titleKeywords as $keyword) {
            $titleConditions[] = "v.title LIKE ?";
        }
        $titleMatchSql = " OR (" . implode(" AND ", $titleConditions) . ")";
    }

    // Find candidates who:
    // 1. Have future_consent = 1
    // 2. Match by designation OR by important title keywords
    // 3. Have NOT already applied for THIS vacancy
    $sql = "SELECT DISTINCT a.email, a.first_name, a.last_name, a.contact_number, 
                            a.overall_experience, a.relevant_experience, a.qualification, 
                            a.salary_expectation, a.cv_path, v.title as last_applied_vacancy,
                            v.reference_number as job_ref,
                            c.name as last_applied_company,
                            (SELECT status FROM applications WHERE email = a.email ORDER BY applied_at DESC LIMIT 1) as last_status
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            JOIN companies c ON v.company_id = c.id
            WHERE a.future_consent = 1
              AND a.is_blocked = 0
              AND a.applied_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
              AND a.email NOT IN (SELECT email FROM applications WHERE vacancy_id = ?)
              AND a.email NOT IN (SELECT DISTINCT email FROM applications WHERE is_blocked = 1)
              AND (v.designation = ? $titleMatchSql)";

    $params = [$vacancyId, $vacancy['designation']];
    if (!empty($titleKeywords)) {
        foreach ($titleKeywords as $keyword) {
            $params[] = "%$keyword%";
        }
    }

    // Restriction for company scoped admin
    if ($auth['role'] !== 'super_admin') {
        $sql .= " AND v.company_id = ?";
        $params[] = $auth['company_id'];
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $suggestions = $stmt->fetchAll();

    jsonResponse(200, 'Suggested candidates retrieved', $suggestions);
}

function handleGetCandidateCount()
{
    $auth = verifyToken();
    $db = getDB();

    $designation = sanitize($_GET['designation'] ?? '');
    $title = sanitize($_GET['title'] ?? '');
    $companyId = (int) ($_GET['company_id'] ?? 0);

    if (empty($designation) && empty($title) && $companyId <= 0) {
        jsonResponse(200, 'Empty criteria', ['count' => 0]);
    }

    $sql = "SELECT COUNT(DISTINCT a.email) 
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            WHERE a.future_consent = 1
              AND a.applied_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";

    $params = [];
    $conditions = [];

    if (!empty($designation)) {
        $conditions[] = "v.designation = ?";
        $params[] = $designation;
    }

    if (!empty($title)) {
        // Simple title keyword matching
        $titleKeywords = array_filter(explode(' ', strtolower($title)), function ($word) {
            return strlen($word) > 2 && !in_array($word, ['and', 'the', 'for', 'with', 'job', 'vacancy']);
        });

        if (!empty($titleKeywords)) {
            $tParts = [];
            foreach ($titleKeywords as $kw) {
                $tParts[] = "v.title LIKE ?";
                $params[] = "%$kw%";
            }
            $conditions[] = "(" . implode(" AND ", $tParts) . ")";
        }
    }

    if (!empty($conditions)) {
        $sql .= " AND (" . implode(" OR ", $conditions) . ")";
    } elseif ($companyId > 0 && $auth['role'] === 'super_admin') {
        $sql .= " AND v.company_id = ?";
        $params[] = $companyId;
    }

    // Restriction for company scoped admin
    if ($auth['role'] !== 'super_admin') {
        $sql .= " AND v.company_id = ?";
        $params[] = $auth['company_id'];
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $count = $stmt->fetchColumn();

    jsonResponse(200, 'Candidate count retrieved', ['count' => (int) $count]);
}

function handleGetMatchingCandidates()
{
    $auth = verifyToken();
    $db = getDB();

    $designation = sanitize($_GET['designation'] ?? '');
    $title = sanitize($_GET['title'] ?? '');
    $companyId = (int) ($_GET['company_id'] ?? 0);

    if (empty($designation) && empty($title) && $companyId <= 0) {
        jsonResponse(200, 'Empty criteria', []);
    }

    $sql = "SELECT DISTINCT a.email, a.first_name, a.last_name, a.contact_number, 
                            a.overall_experience, a.relevant_experience, a.qualification, 
                            a.cv_path, v.title as last_applied_vacancy,
                            c.name as last_applied_company
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            JOIN companies c ON v.company_id = c.id
            WHERE a.future_consent = 1
              AND a.applied_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";

    $params = [];
    $conditions = [];

    if (!empty($designation)) {
        $conditions[] = "v.designation = ?";
        $params[] = $designation;
    }

    if (!empty($title)) {
        $titleKeywords = array_filter(explode(' ', strtolower($title)), function ($word) {
            return strlen($word) > 2 && !in_array($word, ['and', 'the', 'for', 'with', 'job', 'vacancy']);
        });

        if (!empty($titleKeywords)) {
            $tParts = [];
            foreach ($titleKeywords as $kw) {
                $tParts[] = "v.title LIKE ?";
                $params[] = "%$kw%";
            }
            $conditions[] = "(" . implode(" AND ", $tParts) . ")";
        }
    }

    if (!empty($conditions)) {
        $sql .= " AND (" . implode(" OR ", $conditions) . ")";
    } elseif ($companyId > 0 && $auth['role'] === 'super_admin') {
        $sql .= " AND v.company_id = ?";
        $params[] = $companyId;
    }

    // Restriction for company scoped admin
    if ($auth['role'] !== 'super_admin') {
        $sql .= " AND v.company_id = ?";
        $params[] = $auth['company_id'];
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $candidates = $stmt->fetchAll();

    jsonResponse(200, 'Matching candidates retrieved', $candidates);
}

function handleGetTalentPool()
{
    $auth = verifyToken();
    $db = getDB();

    $search = sanitize($_GET['search'] ?? '');
    $companyId = (int) ($_GET['company_id'] ?? 0);

    $showBlocked = sanitize($_GET['show_blocked'] ?? '');

    $sql = "SELECT a.id, a.email, a.first_name, a.last_name, a.contact_number, 
                            a.overall_experience, a.relevant_experience, a.qualification, 
                            a.cv_path, a.applied_at, a.status as last_status, a.tags,
                            a.is_blocked, a.block_reason,
                            v.title as last_applied_vacancy,
                            c.name as last_applied_company
            FROM applications a
            JOIN (
                SELECT email, MAX(applied_at) as max_date
                FROM applications
                WHERE future_consent = 1
                GROUP BY email
            ) latest ON a.email = latest.email AND a.applied_at = latest.max_date
            JOIN vacancies v ON a.vacancy_id = v.id
            JOIN companies c ON v.company_id = c.id
            WHERE a.future_consent = 1
              AND a.applied_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
    
    // Base SQL for counting before filtering by is_blocked
    $countSql = "SELECT SUM(CASE WHEN a.is_blocked = 0 THEN 1 ELSE 0 END) as active_count,
                        SUM(CASE WHEN a.is_blocked = 1 THEN 1 ELSE 0 END) as blocked_count
                 FROM applications a
                 JOIN (
                     SELECT email, MAX(applied_at) as max_date
                     FROM applications
                     WHERE future_consent = 1
                     GROUP BY email
                 ) latest ON a.email = latest.email AND a.applied_at = latest.max_date
                 JOIN vacancies v ON a.vacancy_id = v.id
                 WHERE a.future_consent = 1
                   AND a.applied_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
    
    $countParams = [];
    if ($companyId > 0 && ($auth['role'] === 'super_admin' || $auth['role'] === 'admin')) {
        $countSql .= " AND v.company_id = ?";
        $countParams[] = $companyId;
    }
    
    if ($auth['role'] !== 'super_admin' && $auth['role'] !== 'admin') {
        $countSql .= " AND v.company_id = ?";
        $countParams[] = $auth['company_id'];
    }
    
    $stmt = $db->prepare($countSql);
    $stmt->execute($countParams);
    $counts = $stmt->fetch();
    $activeCount = (int)($counts['active_count'] ?? 0);
    $blockedCount = (int)($counts['blocked_count'] ?? 0);

    if ($showBlocked === '1') {
        $sql .= " AND a.is_blocked = 1";
    } else {
        $sql .= " AND a.is_blocked = 0";
    }

    $params = [];

    if (!empty($search)) {
        $sql .= " AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ? OR v.designation LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    if ($companyId > 0 && ($auth['role'] === 'super_admin' || $auth['role'] === 'admin')) {
        $sql .= " AND v.company_id = ?";
        $params[] = $companyId;
    }

    $overallExperience = sanitize($_GET['overall_experience'] ?? '');
    if (!empty($overallExperience)) {
        $expTiers = getExperienceAtLeast($overallExperience);
        $placeholders = implode(',', array_fill(0, count($expTiers), '?'));
        $sql .= " AND a.overall_experience IN ($placeholders)";
        $params = array_merge($params, $expTiers);
    }

    $qualification = sanitize($_GET['qualification'] ?? '');
    if (!empty($qualification)) {
        $sql .= " AND a.qualification = ?";
        $params[] = $qualification;
    }

    $tagFilter = sanitize($_GET['tag'] ?? '');
    if (!empty($tagFilter)) {
        $sql .= " AND a.tags LIKE ?";
        $params[] = "%$tagFilter%";
    }

    $statusFilter = sanitize($_GET['status'] ?? '');
    if (!empty($statusFilter)) {
        $sql .= " AND a.status = ?";
        $params[] = $statusFilter;
    }

    // Restriction for company scoped admin
    if ($auth['role'] !== 'super_admin' && $auth['role'] !== 'admin') {
        $sql .= " AND v.company_id = ?";
        $params[] = $auth['company_id'];
    }

    $sql .= " ORDER BY a.applied_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $candidates = $stmt->fetchAll();

    jsonResponse(200, 'Talent pool retrieved', [
        'candidates' => $candidates,
        'active_count' => $activeCount,
        'blocked_count' => $blockedCount
    ]);
}

function handleBlockCandidate()
{
    $auth = verifyToken();
    if (in_array($auth['role'], ['super_admin', 'sub_admin2', 'sub_admin'])) {
        jsonResponse(403, 'Your role does not have permission to block candidates');
    }
    $db = getDB();

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        // Fallback to POST
        $data = $_POST;
    }

    $email = sanitize($data['email'] ?? '');
    $blockReason = sanitize($data['block_reason'] ?? '');

    if ($auth['role'] !== 'admin') {
        // Must have at least one application in their company with this email
        $stmt = $db->prepare("SELECT a.id FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.email = ? AND v.company_id = ?");
        $stmt->execute([$email, $auth['company_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(403, 'Unauthorized to block candidate not associated with your company');
        }
    }

    // Block ALL applications from this email
    $stmt = $db->prepare("UPDATE applications SET is_blocked = 1, block_reason = ? WHERE email = ?");
    $stmt->execute([$blockReason, $email]);

    $affected = $stmt->rowCount();
    jsonResponse(200, "Candidate blocked successfully ($affected records updated)");
}

function handleUnblockCandidate()
{
    $auth = verifyToken();
    if (in_array($auth['role'], ['super_admin', 'sub_admin2', 'sub_admin'])) {
        jsonResponse(403, 'Your role does not have permission to unblock candidates');
    }
    $db = getDB();

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        $data = $_POST;
    }

    $email = sanitize($data['email'] ?? '');

    if (empty($email)) {
        jsonResponse(400, 'Email is required');
    }

    if ($auth['role'] !== 'admin') {
        // Must have at least one application in their company with this email
        $stmt = $db->prepare("SELECT a.id FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.email = ? AND v.company_id = ?");
        $stmt->execute([$email, $auth['company_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(403, 'Unauthorized to unblock candidate not associated with your company');
        }
    }

    $stmt = $db->prepare("UPDATE applications SET is_blocked = 0, block_reason = NULL WHERE email = ?");
    $stmt->execute([$email]);

    jsonResponse(200, 'Candidate unblocked successfully');
}

function handleUpdateCandidateTags()
{
    $auth = verifyToken();
    if (in_array($auth['role'], ['super_admin', 'sub_admin2', 'sub_admin'])) {
        jsonResponse(403, 'Your role does not have permission to update candidate tags');
    }
    $db = getDB();

    $id = (int) ($_POST['id'] ?? 0);
    $tags = sanitize($_POST['tags'] ?? '');

    if ($id <= 0) {
        jsonResponse(400, 'Invalid application ID');
    }

    if ($auth['role'] !== 'admin') {
        $stmt = $db->prepare("SELECT v.company_id FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.id = ?");
        $stmt->execute([$id]);
        $app = $stmt->fetch();
        if (!$app || $app['company_id'] != $auth['company_id']) {
            jsonResponse(403, 'Unauthorized access to this application');
        }
    }

    $sql = "UPDATE applications SET tags = ? WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute([$tags, $id]);

    jsonResponse(200, 'Tags updated successfully');
}

function handleViewCV()
{
    // Suppress errors during streaming to avoid corrupting the file output
    ini_set('display_errors', 0);

    // Completely clear and stop all output buffering
    while (ob_get_level()) {
        ob_end_clean();
    }

    $file = $_GET['file'] ?? '';
    if (empty($file)) {
        header('Content-Type: application/json');
        echo json_encode(['message' => 'No file parameter provided']);
        exit;
    }

    // Security: basename ensures no directory traversal
    $file = basename($file);

    // Try possible relative paths and external fallback to be safe
    $possiblePaths = [
        __DIR__ . '/../uploads/cv/' . $file,
        dirname(__DIR__) . '/uploads/cv/' . $file,
        'C:/Users/nadumi/OneDrive - George Steuart Optimize Pvt Ltd/Documents/GS Careers CV/GS_Careers/backend/uploads/cv/' . $file
    ];

    $filePath = null;
    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            $filePath = $path;
            break;
        }
    }

    if (!$filePath) {
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode(['message' => 'Document not found on server']);
        exit;
    }

    // Modern browser headers for PDF/Doc streaming
    header('Access-Control-Allow-Origin: *');
    header('Content-Description: File Transfer');

    $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimeTypes = [
        'pdf' => 'application/pdf',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg'
    ];

    $mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';

    header("Content-Type: " . $mimeType);
    header("Content-Disposition: inline; filename=\"" . $file . "\"");
    header("Content-Length: " . filesize($filePath));
    header("Content-Transfer-Encoding: binary");
    header("Cache-Control: public, max-age=3600");
    header("Pragma: public");

    // Clear buffer one last time before streaming
    if (ob_get_length())
        ob_clean();
    flush();

    readfile($filePath);
    exit;
}

function handleDeleteApplication()
{
    $auth = verifyToken();
    if (in_array($auth['role'], ['super_admin', 'sub_admin2', 'sub_admin'])) {
        jsonResponse(403, 'Your role does not have permission to delete applications');
    }
    $db = getDB();

    $id = (int) ($_POST['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(400, 'Invalid application ID');
    }

    if ($auth['role'] !== 'admin') {
        $stmt = $db->prepare("SELECT v.company_id FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.id = ?");
        $stmt->execute([$id]);
        $app = $stmt->fetch();
        if (!$app || $app['company_id'] != $auth['company_id']) {
            jsonResponse(403, 'Unauthorized access to this application');
        }
    }

    // Optional: Delete CV file if needed, but keeping it for now for record safety.
    $sql = "DELETE FROM applications WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute([$id]);

    jsonResponse(200, 'Application deleted successfully');
}

function handleBulkDeleteApplications()
{
    $auth = verifyToken();
    if (in_array($auth['role'], ['super_admin', 'sub_admin2', 'sub_admin'])) {
        jsonResponse(403, 'Your role does not have permission to delete applications');
    }
    $db = getDB();

    $ids = $_POST['ids'] ?? [];
    if (!is_array($ids) || empty($ids)) {
        jsonResponse(400, 'Invalid or empty IDs');
    }

    if ($auth['role'] !== 'admin') {
        // check each ID to see if it belongs to their company
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare("SELECT COUNT(*) FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.id IN ($placeholders) AND v.company_id = ?");
        $params = array_merge($ids, [$auth['company_id']]);
        $stmt->execute($params);
        $count = $stmt->fetchColumn();
        if ((int)$count !== count($ids)) {
            jsonResponse(403, 'Unauthorized access to one or more applications');
        }
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $sql = "DELETE FROM applications WHERE id IN ($placeholders)";
    $stmt = $db->prepare($sql);
    $stmt->execute($ids);

    jsonResponse(200, count($ids) . ' applications deleted successfully');
}

function handleListExtractions()
{
    $auth = verifyToken();
    $db = getDB();

    $status = $_GET['status'] ?? 'all'; // all, extracted, unextracted
    $search = trim($_GET['search'] ?? '');
    $vacancyId = (int)($_GET['vacancy_id'] ?? 0);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $where = ["1=1"];
    $params = [];

    if ($auth['role'] !== 'super_admin' && $auth['role'] !== 'admin') {
        $where[] = "v.company_id = ?";
        $params[] = (int)($auth['company_id'] ?? 0);
    }

    if ($vacancyId > 0) {
        $where[] = "a.vacancy_id = ?";
        $params[] = $vacancyId;
    }

    if (!empty($search)) {
        $where[] = "(a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ? OR a.contact_number LIKE ? OR v.title LIKE ?)";
        $s = "%$search%";
        $params = array_merge($params, [$s, $s, $s, $s, $s]);
    }

    $whereStr = implode(' AND ', $where);

    // Get all candidate records for current company/search
    $sql = "SELECT a.id, a.vacancy_id, v.company_id, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.min_salary, v.max_salary, v.designation, c.name as company_name,
                   v.weight_skills, v.weight_experience, v.weight_qualification, v.weight_jd_alignment, v.weight_salary,
                   a.first_name, a.last_name, a.email, a.contact_number,
                   a.overall_experience, a.relevant_experience, a.qualification, a.salary_expectation,
                   a.cv_path, a.cv_text, a.extraction_status, a.is_manual_extracted, a.extracted_at, a.extracted_data,
                   a.applied_at, a.status as application_status, a.skills_metadata, a.tags
            FROM applications a
            JOIN vacancies v ON a.vacancy_id = v.id
            LEFT JOIN companies c ON v.company_id = c.id
            WHERE $whereStr
            ORDER BY a.id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $allCandidateItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmtScores = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('min_high_match_score', 'min_medium_match_score')");
    $scoreSettings = $stmtScores ? $stmtScores->fetchAll(PDO::FETCH_KEY_PAIR) : [];
    $minHigh = isset($scoreSettings['min_high_match_score']) ? (int)$scoreSettings['min_high_match_score'] : 75;
    $minMedium = isset($scoreSettings['min_medium_match_score']) ? (int)$scoreSettings['min_medium_match_score'] : 50;

    $stmtSetting = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'enable_cv_extraction'");
    $settingVal = $stmtSetting ? $stmtSetting->fetchColumn() : null;
    $enableSetting = ($settingVal === null || $settingVal === false || $settingVal === '1' || $settingVal === 'true' || $settingVal === true || $settingVal === 1);

    $processedItems = [];
    $extractedCount = 0;
    $unextractedCount = 0;

    foreach ($allCandidateItems as $item) {
        $extractedDataArr = !empty($item['extracted_data']) ? (is_array($item['extracted_data']) ? $item['extracted_data'] : json_decode($item['extracted_data'], true)) : null;
        if (!empty($extractedDataArr['extracted_full_text'])) {
            $cvTextToUse = $extractedDataArr['extracted_full_text'];
        } else {
            $cvTextToUse = $item['cv_text'];
            if ((empty($cvTextToUse) || PdfExtractor::isGarbledText($cvTextToUse)) && !empty($item['cv_path'])) {
                $fullPath = UPLOAD_DIR . $item['cv_path'];
                if (file_exists($fullPath)) {
                    $extractedRaw = PdfExtractor::extractTextFromFile($fullPath);
                    if ($extractedRaw && !PdfExtractor::isGarbledText($extractedRaw)) {
                        $cvTextToUse = $extractedRaw;
                    } else {
                        $cvTextToUse = "Candidate resume text extracted from document.";
                    }
                }
            } else if (!empty($cvTextToUse)) {
                $cvTextToUse = PdfExtractor::cleanExtractedCvText($cvTextToUse);
                if (empty($cvTextToUse) || PdfExtractor::isGarbledText($cvTextToUse)) {
                    $cvTextToUse = "Candidate resume text extracted from document.";
                }
            }
        }
        $item['cv_text'] = $cvTextToUse;

        $calculatedScore = computeCandidateMatchScore(
            $item,
            $item['qualification'],
            $item['overall_experience'],
            $item['relevant_experience'],
            $cvTextToUse,
            $item['tags'],
            $item['skills_metadata'],
            $item['salary_expectation']
        );
        $meta = !empty($item['skills_metadata']) ? (is_array($item['skills_metadata']) ? $item['skills_metadata'] : json_decode($item['skills_metadata'], true)) : null;
        if (!empty($meta) && isset($meta['ai_match_score']) && is_numeric($meta['ai_match_score'])) {
            $effectiveScore = (int)$meta['ai_match_score'];
        } else {
            $effectiveScore = computeCandidateMatchScore(
                $item,
                $item['qualification'],
                $item['overall_experience'],
                $item['relevant_experience'],
                $cvTextToUse,
                $item['tags'],
                $item['skills_metadata'],
                $item['salary_expectation']
            );
        }
        $item['match_score'] = $effectiveScore;
        $item['score'] = $effectiveScore;

        $isManual = (isset($item['is_manual_extracted']) && ($item['is_manual_extracted'] == 1 || $item['is_manual_extracted'] === '1'));
        $isLowMatch = ($effectiveScore < $minMedium);

        if ($isManual) {
            $effectiveStatus = 'extracted';
        } else if (!$enableSetting || $isLowMatch) {
            $effectiveStatus = 'unextracted';
        } else {
            $effectiveStatus = 'extracted';
        }

        // If candidate score >= 50% & toggle enabled, but DB record has not generated extraction metadata yet:
        if ($effectiveStatus === 'extracted' && (empty($item['extracted_data']) || $item['extraction_status'] !== 'extracted')) {
            if (!empty($item['cv_path'])) {
                $cvFilePath = UPLOAD_DIR . $item['cv_path'];
                if (file_exists($cvFilePath)) {
                    $extractedCvText = PdfExtractor::extractTextFromFile($cvFilePath) ?: "CV text content extracted.";
                    $parsedData = PdfExtractor::parseCvDataWithAI($extractedCvText, $item, $item, $cvFilePath);
                    $jsonExtractedData = json_encode($parsedData);

                    $skillsMetadataArr = [
                        'ai_match_score' => $parsedData['ai_match_score'] ?? $calculatedScore,
                        'ai_match_reason' => $parsedData['ai_match_reason'] ?? '',
                        'is_job_mismatch' => $parsedData['is_job_mismatch'] ?? false,
                        'mismatch_reason' => $parsedData['mismatch_reason'] ?? '',
                        'ai_score_breakdown' => $parsedData['ai_score_breakdown'] ?? [],
                        'skills_analysis' => $parsedData['skills_analysis'] ?? [],
                        'fully_demonstrated_skills' => $parsedData['fully_demonstrated_skills'] ?? [],
                        'partially_demonstrated_skills' => $parsedData['partially_demonstrated_skills'] ?? [],
                        'requirements_without_evidence' => $parsedData['requirements_without_evidence'] ?? [],
                        'additional_skills' => $parsedData['additional_skills'] ?? [],
                        'qualifications_found' => $parsedData['qualifications_found'] ?? [],
                        'certifications_found' => $parsedData['certifications_found'] ?? [],
                        'experience_summary' => $parsedData['experience_summary'] ?? ($parsedData['profile_summary'] ?? 'Candidate profile evaluated from CV text.'),
                        'recruiter_insights' => $parsedData['recruiter_insights'] ?? ['Candidate resume extracted and evaluated by Steuart AI Engine.']
                    ];
                    $jsonSkillsMetadata = json_encode($skillsMetadataArr);

                    $allSkillsList = [];
                    if (!empty($parsedData['skills_analysis']) && is_array($parsedData['skills_analysis'])) {
                        foreach ($parsedData['skills_analysis'] as $sa) {
                            if (!empty($sa['skill'])) $allSkillsList[] = $sa['skill'];
                        }
                    }
                    $tagsStr = implode(', ', array_unique($allSkillsList));

                    $cvTextToSave = !empty($parsedData['extracted_full_text']) ? $parsedData['extracted_full_text'] : $extractedCvText;
                    $upd = $db->prepare("UPDATE applications SET cv_text = ?, extraction_status = 'extracted', extracted_at = NOW(), extracted_data = ?, skills_metadata = ?, tags = CASE WHEN ? != '' THEN ? ELSE tags END WHERE id = ?");
                    $upd->execute([$cvTextToSave, $jsonExtractedData, $jsonSkillsMetadata, $tagsStr, $tagsStr, $item['id']]);

                    $item['cv_text'] = $cvTextToSave;
                    $item['extracted_data'] = json_decode($jsonExtractedData, true);
                    $item['skills_metadata'] = $jsonSkillsMetadata;
                    $item['tags'] = $tagsStr ?: $item['tags'];
                }
            }
        }

        $item['extraction_status'] = $effectiveStatus;

        if ($effectiveStatus === 'unextracted' && !$isManual) {
            $item['cv_text'] = null;
            $item['extracted_data'] = null;
            // Retain $item['skills_metadata'] so that Gemini AI match score, breakdown, and mismatch reasons are accessible to frontend
            $item['tags'] = '';
        }

        if ($effectiveStatus === 'extracted') {
            $extractedCount++;
        } else {
            $unextractedCount++;
        }

        $processedItems[] = $item;
    }

    // Filter by tab status
    $filtered = [];
    if ($status === 'extracted') {
        $filtered = array_values(array_filter($processedItems, fn($i) => $i['extraction_status'] === 'extracted'));
    } elseif ($status === 'unextracted') {
        $filtered = array_values(array_filter($processedItems, fn($i) => $i['extraction_status'] === 'unextracted'));
    } else {
        $filtered = $processedItems;
    }

    $total = count($filtered);
    $pagedItems = array_slice($filtered, $offset, $limit);

    $stats = [
        'total_apps' => count($processedItems),
        'extracted_count' => $extractedCount,
        'unextracted_count' => $unextractedCount
    ];

    jsonResponse(200, 'Success', [
        'items' => $pagedItems,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'stats' => $stats,
        'enable_cv_extraction' => $enableSetting,
        'min_high_match_score' => $minHigh,
        'min_medium_match_score' => $minMedium
    ]);
}

function handleExtractCV()
{
    $auth = verifyToken();
    require_once __DIR__ . '/../libs/PdfExtractor.php';

    $db = getDB();
    $input = json_decode(file_get_contents('php://input'), true);

    $ids = [];
    if (isset($input['id'])) {
        $ids[] = (int)$input['id'];
    } elseif (isset($input['ids']) && is_array($input['ids'])) {
        $ids = array_map('intval', $input['ids']);
    }

    if (empty($ids)) {
        jsonResponse(400, 'Application ID or list of IDs is required');
    }

    $extractedCount = 0;
    $results = [];

    foreach ($ids as $id) {
        if ($id <= 0) continue;

        $stmt = $db->prepare("SELECT a.*, v.*, v.title as vacancy_title, v.description as vacancy_description, v.requirements as vacancy_requirements, v.required_skills as vacancy_required_skills, v.min_experience, v.min_relevant_experience, v.min_salary, v.max_salary, v.designation FROM applications a JOIN vacancies v ON a.vacancy_id = v.id WHERE a.id = ?");
        $stmt->execute([$id]);
        $app = $stmt->fetch();
        if (!$app) continue;

        if ($auth['role'] !== 'super_admin' && $auth['role'] !== 'admin') {
            if ((int)$app['company_id'] !== (int)($auth['company_id'] ?? 0)) {
                continue;
            }
        }

        $cvFilePath = (!empty($app['cv_path']) && file_exists(UPLOAD_DIR . $app['cv_path'])) ? (UPLOAD_DIR . $app['cv_path']) : null;
        $cvText = $cvFilePath ? PdfExtractor::extractTextFromFile($cvFilePath) : '';
        if (!$cvText || strlen(trim($cvText)) < 30 || PdfExtractor::isGarbledText($cvText)) {
            $cvText = "CANDIDATE RESUME PROFILE\n"
                    . "Name: " . trim(($app['first_name'] ?? '') . " " . ($app['last_name'] ?? '')) . "\n"
                    . "Email: " . ($app['email'] ?? '') . "\n"
                    . "Contact Number: " . ($app['contact_number'] ?? '') . "\n"
                    . "Qualification: " . ($app['qualification'] ?? '') . "\n"
                    . "Overall Experience: " . ($app['overall_experience'] ?? '') . "\n"
                    . "Relevant Experience: " . ($app['relevant_experience'] ?? '') . "\n"
                    . "Target Vacancy: " . ($app['vacancy_title'] ?? ($app['title'] ?? 'Position')) . "\n"
                    . "Salary Expectation: " . (!empty($app['salary_expectation']) ? "LKR {$app['salary_expectation']}" : 'Not specified');
        }

        $vacancyData = [
            'id' => $app['vacancy_id'],
            'title' => $app['vacancy_title'] ?: ($app['title'] ?? 'Open Position'),
            'vacancy_title' => $app['vacancy_title'] ?: ($app['title'] ?? 'Open Position'),
            'designation' => $app['designation'] ?? '',
            'min_experience' => $app['min_experience'] ?? '0 years',
            'min_relevant_experience' => $app['min_relevant_experience'] ?? '0 years',
            'min_salary' => $app['min_salary'] ?? '',
            'max_salary' => $app['max_salary'] ?? '',
            'required_skills' => $app['vacancy_required_skills'] ?: ($app['required_skills'] ?? ''),
            'description' => $app['vacancy_description'] ?: ($app['description'] ?? ''),
            'requirements' => $app['vacancy_requirements'] ?: ($app['requirements'] ?? ''),
            'weight_skills' => $app['weight_skills'] ?? null,
            'weight_experience' => $app['weight_experience'] ?? null,
            'weight_qualification' => $app['weight_qualification'] ?? null,
            'weight_jd_alignment' => $app['weight_jd_alignment'] ?? null,
            'weight_salary' => $app['weight_salary'] ?? null
        ];

        $candData = [
            'salary_expectation' => $app['salary_expectation'] ?? '',
            'overall_experience' => $app['overall_experience'] ?? '',
            'relevant_experience' => $app['relevant_experience'] ?? '',
            'qualification' => $app['qualification'] ?? ''
        ];

        // Trigger Google Gemini AI model to evaluate candidate against target vacancy
        $parsedData = PdfExtractor::parseCvDataWithAI($cvText, $vacancyData, $candData, $cvFilePath);
        $jsonExtractedData = json_encode($parsedData);

        // Derive authoritative AI Match Score and breakdown (with Seniority & Relevance Reward)
        $aiScore = calculateCandidateMatchScorePHP(
            $parsedData,
            $vacancyData,
            !empty($parsedData['qualifications_found'][0]) ? $parsedData['qualifications_found'][0] : ($parsedData['qualification'] ?? $app['qualification']),
            $parsedData['overall_experience'] ?? $app['overall_experience'],
            $parsedData['relevant_experience'] ?? $app['relevant_experience'],
            $app['salary_expectation']
        );
        $parsedData['ai_match_score'] = $aiScore;
        $jsonExtractedData = json_encode($parsedData);

        // Construct skills_metadata array from Gemini AI evaluation report
        $skillsMetadataArr = [
            'ai_match_score' => $aiScore,
            'ai_match_reason' => $parsedData['ai_match_reason'] ?? '',
            'is_unextracted' => false,
            'is_job_mismatch' => $parsedData['is_job_mismatch'] ?? false,
            'mismatch_reason' => $parsedData['mismatch_reason'] ?? '',
            'ai_score_breakdown' => $parsedData['ai_score_breakdown'] ?? [],
            'skills_analysis' => $parsedData['skills_analysis'] ?? [],
            'fully_demonstrated_skills' => $parsedData['fully_demonstrated_skills'] ?? [],
            'partially_demonstrated_skills' => $parsedData['partially_demonstrated_skills'] ?? [],
            'requirements_without_evidence' => $parsedData['requirements_without_evidence'] ?? [],
            'additional_skills' => $parsedData['additional_skills'] ?? [],
            'qualifications_found' => $parsedData['qualifications_found'] ?? [],
            'certifications_found' => $parsedData['certifications_found'] ?? [],
            'experience_summary' => $parsedData['experience_summary'] ?? ($parsedData['profile_summary'] ?? 'Candidate profile evaluated from CV text.'),
            'recruiter_insights' => $parsedData['recruiter_insights'] ?? ['Candidate resume extracted and evaluated by Steuart AI Engine.']
        ];
        $jsonSkillsMetadata = json_encode($skillsMetadataArr);

        // Extract tags string from skills
        $allSkillsList = [];
        if (!empty($parsedData['skills_analysis']) && is_array($parsedData['skills_analysis'])) {
            foreach ($parsedData['skills_analysis'] as $sa) {
                if (!empty($sa['skill'])) $allSkillsList[] = $sa['skill'];
            }
        }
        $tagsStr = implode(', ', array_unique($allSkillsList));

        // Update application with sanitized names, metadata, and profile info
        $firstNameExt = PdfExtractor::cleanNamePart($parsedData['first_name'] ?? '');
        $lastNameExt = PdfExtractor::cleanNamePart($parsedData['last_name'] ?? '');
        $phoneExt = $parsedData['contact_number'] ?? '';
        $qualExt = !empty($parsedData['qualifications_found'][0]) ? $parsedData['qualifications_found'][0] : ($parsedData['qualification'] ?? '');
        $overallExpExt = $parsedData['overall_experience'] ?? '';
        $relevantExpExt = $parsedData['relevant_experience'] ?? '';

        $updateStmt = $db->prepare("UPDATE applications SET 
            match_score = ?,
            cv_text = ?, 
            extraction_status = 'extracted', 
            is_manual_extracted = 1,
            extracted_at = NOW(), 
            extracted_data = ?,
            skills_metadata = ?,
            tags = CASE WHEN ? != '' THEN ? ELSE tags END,
            first_name = CASE WHEN (first_name IS NULL OR first_name = '') AND ? != '' THEN ? ELSE first_name END,
            last_name = CASE WHEN (last_name IS NULL OR last_name = '') AND ? != '' THEN ? ELSE last_name END,
            contact_number = CASE WHEN (contact_number IS NULL OR contact_number = '') AND ? != '' THEN ? ELSE contact_number END,
            qualification = CASE WHEN ? != '' THEN ? ELSE qualification END,
            overall_experience = CASE WHEN ? != '' THEN ? ELSE overall_experience END,
            relevant_experience = CASE WHEN ? != '' THEN ? ELSE relevant_experience END
            WHERE id = ?");

        $fullParsedText = !empty($parsedData['extracted_full_text']) ? $parsedData['extracted_full_text'] : $cvText;
        $updateStmt->execute([
            $aiScore,
            $fullParsedText,
            $jsonExtractedData,
            $jsonSkillsMetadata,
            $tagsStr, $tagsStr,
            $firstNameExt, $firstNameExt,
            $lastNameExt, $lastNameExt,
            $phoneExt, $phoneExt,
            $qualExt, $qualExt,
            $overallExpExt, $overallExpExt,
            $relevantExpExt, $relevantExpExt,
            $id
        ]);

        $fetchStmt = $db->prepare("SELECT a.*, v.title as vacancy_title, c.name as company_name FROM applications a LEFT JOIN vacancies v ON a.vacancy_id = v.id LEFT JOIN companies c ON v.company_id = c.id WHERE a.id = ?");
        $fetchStmt->execute([$id]);
        $updatedApp = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        $extractedCount++;
        $results[] = array_merge($updatedApp ?: [], [
            'id' => $id,
            'status' => 'extracted',
            'extraction_status' => 'extracted',
            'is_manual_extracted' => 1,
            'extracted_data' => $parsedData,
            'skills_metadata' => $jsonSkillsMetadata,
            'tags' => $tagsStr,
            'cv_text' => $fullParsedText,
            'match_score' => $aiScore,
            'score' => $aiScore
        ]);
    }

    jsonResponse(200, "$extractedCount CV(s) extracted successfully", [
        'count' => $extractedCount,
        'results' => $results
    ]);
}

function handleGetExtractionSetting()
{
    $auth = verifyToken();
    $db = getDB();
    $stmt = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'enable_cv_extraction'");
    $val = $stmt ? $stmt->fetchColumn() : null;
    $enabled = ($val === null || $val === false || $val === '1' || $val === 'true' || $val === true || $val === 1);
    jsonResponse(200, 'Success', ['enable_cv_extraction' => $enabled]);
}

function handleUpdateExtractionSetting()
{
    $auth = requireSuperAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $enabled = isset($input['enabled']) && ($input['enabled'] === true || $input['enabled'] === 1 || $input['enabled'] === '1' || $input['enabled'] === 'true') ? '1' : '0';

    $db = getDB();
    $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('enable_cv_extraction', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
    $stmt->execute([$enabled, $enabled]);

    jsonResponse(200, 'Extraction setting updated successfully', ['enable_cv_extraction' => ($enabled === '1')]);
}
