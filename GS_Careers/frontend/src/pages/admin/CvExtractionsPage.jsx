import useHorizontalDragScroll from '../../utils/useHorizontalDragScroll';
import React, { useState, useEffect, useCallback } from 'react';
import {
    FiCpu, FiCheckCircle, FiAlertCircle, FiXCircle, FiSearch,
    FiEye, FiRefreshCw, FiFileText, FiDownload, FiX,
    FiUser, FiBriefcase, FiLayers, FiCopy, FiChevronLeft, FiChevronRight,
    FiAward, FiTarget, FiAlertTriangle, FiInfo
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
    getExtractions,
    extractCvAdmin,
    updateExtractionSetting,
    getAllVacancies,
    API_BASE
} from '../../services/api';
import './CvExtractionsPage.css';
import PaginationFooter from '../../components/PaginationFooter';
import { copyToClipboard } from '../../utils/constants';
import { calculateCandidateMatchScore, extractCandidateMismatchReason } from '../../utils/scoreCalculator';

const BACKEND_ROOT = API_BASE.replace('/api', '');

const escapeRegExp = (str) => {
    return (str || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

const safeMatchInText = (term, text) => {
    if (!term || !text) return false;
    const termClean = term.trim();
    if (!termClean) return false;
    if (termClean.toLowerCase() === text.toLowerCase()) return true;

    const escaped = escapeRegExp(termClean);
    const hasSpecial = /[^a-zA-Z0-9\s]/.test(termClean);
    try {
        if (hasSpecial) {
            const regex = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');
            return regex.test(text);
        } else {
            const regex = new RegExp(`\\b${escaped}\\b`, 'i');
            return regex.test(text);
        }
    } catch (e) {
        return text.toLowerCase().includes(termClean.toLowerCase());
    }
};

const DOMAIN_SKILL_CATEGORIES = {
    'Relevant Skills': [
        // Accounting & Finance
        'Accounts Payable', 'Accounts Receivable', 'Financial Reporting', 'General Ledger', 'Journal Entries', 'Bank Reconciliation', 'Invoice Processing', 'Expense Analysis', 'Month-End Closing', 'Variance Analysis', 'Audit Schedules', 'Taxation', 'Management Reports', 'Petty Cash',
        // Digital Marketing
        'Digital Marketing', 'SEO', 'SEM', 'Social Media Marketing', 'Email Marketing', 'Content Marketing', 'Google Ads', 'Meta Ads Manager', 'Campaign Planning', 'A/B Testing', 'Retargeting', 'Google Analytics 4', 'Google Search Console', 'Copywriting', 'Lead Generation',
        // Software Engineering & IT
        'Java', 'C++', 'C/C++', 'Python', 'JavaScript', 'TypeScript', 'PHP', 'Laravel', 'Livewire', 'Spring Boot', 'Node.js',
        'React', 'React.js', 'Redux', 'Zustand', 'Material UI', 'Tailwind CSS', 'HTML', 'HTML5', 'CSS', 'CSS3',
        'Flutter', 'Android', 'RESTful APIs', 'REST API', 'LLaMA 3.2', 'LLaMA', 'Ollama', 'AI/LLM', 'IoT', 'ESP32',
        'Software Engineer', 'Software Developer', 'Full-Stack Developer', 'Frontend Developer', 'Backend Developer', 'Mobile Developer',
        // HR & Sales
        'Human Resources', 'Recruitment', 'Talent Acquisition', 'Payroll', 'Sales Strategy', 'B2B Sales', 'Key Account Management'
    ],
    'Related Skills': [
        // Accounting & Business Software
        'QuickBooks', 'SAP Business One', 'Microsoft Excel', 'PivotTables', 'VLOOKUP', 'XLOOKUP', 'SUMIFS', 'Tally', 'ERP',
        // Marketing Tools
        'SEMrush', 'Ahrefs', 'Ubersuggest', 'Screaming Frog', 'Mailchimp', 'Meta Business Suite', 'Looker Studio', 'WordPress',
        // Tech Databases & Infrastructure
        'MySQL', 'MongoDB', 'Firebase', 'SQLite', 'PostgreSQL', 'SQL', 'phpMyAdmin', 'XAMPP',
        'Selenium WebDriver', 'Selenium', 'JMeter', 'Postman', 'Docker', 'AWS', 'Linux', 'Git', 'GitHub', 'GitLab', 'CI/CD'
    ],
    'Additional Skills': [
        'Jira', 'Figma', 'Canva', 'VS Code', 'Android Studio', 'Eclipse', 'MPU6050', 'GPS', 'Web Dashboards',
        'Agile', 'Scrum', 'Project Management', 'Quality Assurance', 'Unit Testing', 'Troubleshooting',
        'Problem Solving', 'Teamwork', 'Communication', 'Technical Documentation', 'User Support', 'Time Management', 'Vendor Communication', 'Confidentiality'
    ]
};

const extractFullQualificationsFromCVText = (cvText, fallbackQual, existingQuals = []) => {
    let result = [];
    
    if (Array.isArray(existingQuals) && existingQuals.length > 0) {
        existingQuals.forEach(q => {
            if (q && typeof q === 'string') {
                let trimmed = q.trim();
                trimmed = trimmed.replace(/^[\s,.:| -]+|[\s,.:| -]+$/g, '');
                const lw = trimmed.toLowerCase();
                if (trimmed.length > 8 && !['master', 'bachelor', 'diploma', 'hnd', 'msc', 'bsc', 'phd', 'mba'].includes(lw)) {
                    result.push(trimmed);
                }
            }
        });
    }

    if (cvText && typeof cvText === 'string') {
        const lines = cvText.split('\n');
        const qualPatterns = [
            /\b(?:Bachelor[s]?|B\.?Sc\.?|B\.?A\.?|B\.?Com\.?|B\.?B\.?A\.?|B\.?I\.?T\.?|BIT|B\.?I\.?C\.?T\.?|B\.?Tech\.?)(?:\s*\(Hons\))?(?:\s+of|\s+in)?\s+[A-Za-z0-9\s&().,'"-]{3,60}/i,
            /\b(?:Master[s]?|M\.?Sc\.?|M\.?A\.?|M\.?B\.?A\.?|M\.?Com\.?|M\.?Tech\.?)(?:\s+of|\s+in)?\s+[A-Za-z0-9\s&().,'"-]{3,60}/i,
            /\b(?:Higher National Diploma|HND|Post\s*Graduate\s*Diploma|PG\s*Diploma|Advanced\s*Diploma|National\s*Diploma|Diploma)(?:\s+in|\s+of)?\s+[A-Za-z0-9\s&().,'"-]{3,60}/i,
            /\b(?:Doctorate|Ph\.?D\.?)(?:\s+in|\s+of)?\s+[A-Za-z0-9\s&().,'"-]{3,60}/i,
            /\b(?:CIMA|ACCA|AAT|CA\s+Sri\s+Lanka|ICASL|CMA\s+Sri\s+Lanka)(?:\s+(?:Passed\s+Finalist|Finalist|Member|Affiliate|Strategic\s+Level|Operational\s+Level|Executive\s+Level|Passed|Qualified))?/i,
        ];

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            if (/^(?:EDUCATIONAL|ACADEMIC|PROFESSIONAL)\s+(?:QUALIFICATIONS|BACKGROUND|EDUCATION)$/i.test(trimmedLine)) return;
            if (/\b(?:graduate with|years of|practical experience|seeking|experienced in|proficient in)\b/i.test(trimmedLine)) return;

            qualPatterns.forEach(pattern => {
                const match = trimmedLine.match(pattern);
                if (match) {
                    let cleaned = match[0].trim();
                    cleaned = cleaned.replace(/\s*\(\s*\d{4}(?:\s*[-–]\s*\d{4}|\s*[-–]\s*Present)?\s*\).*$/i, '');
                    cleaned = cleaned.replace(/\s*[-–]\s*\d{4}(?:\s*[-–]\s*\d{4}|\s*[-–]\s*Present)?.*$/i, '');
                    cleaned = cleaned.replace(/\s*[-–|@,]\s*(?:University|Institute|College|Campus|Sri Lanka|UK|USA|\d{4}).*$/i, '');
                    cleaned = cleaned.replace(/^[\s,.:| -]+|[\s,.:| -]+$/g, '');

                    const lw = cleaned.toLowerCase();
                    if (lw === 'master') cleaned = "Master's Degree";
                    else if (lw === 'bachelor') cleaned = "Bachelor's Degree";
                    else if (lw === 'diploma') cleaned = "Diploma";

                    if (cleaned.length >= 4 && !result.some(r => r.toLowerCase() === cleaned.toLowerCase())) {
                        result.push(cleaned);
                    }
                }
            });
        });
    }

    if (result.length === 0) {
        if (fallbackQual && typeof fallbackQual === 'string') {
            let fQual = fallbackQual.trim();
            const lw = fQual.toLowerCase();
            if (lw === 'master') fQual = "Master's Degree";
            else if (lw === 'bachelor') fQual = "Bachelor's Degree";
            else if (lw === 'diploma') fQual = "Diploma";
            result.push(fQual);
        } else {
            result.push('Bachelors Degree');
        }
    }

    return Array.from(new Set(result));
};

const extractCertificationsFromCVText = (cvText, existingCerts = []) => {
    let result = [];

    if (Array.isArray(existingCerts) && existingCerts.length > 0) {
        existingCerts.forEach(c => {
            if (c && typeof c === 'string' && c.trim().length >= 3) {
                let cleaned = c.trim().replace(/^[\s,.:| -]+|[\s,.:| -]+$/g, '');
                if (cleaned.length >= 3) result.push(cleaned);
            }
        });
    }

    if (cvText && typeof cvText === 'string') {
        const certPatterns = [
            /(?:Following\s+)?(?:AZ-\d+|MS-\d+|SC-\d+)(?:\s*[\/&,]\s*(?:Following\s+)?(?:AZ-\d+|MS-\d+|SC-\d+))*/gi,
            /(?:Following\s+)?(?:CCNA|CCNP|CCIE)(?:\s+[0-9]{3}-[0-9]{3})?/gi,
            /(?:AWS|Amazon Web Services)\s+(?:Certified\s+)?[A-Za-z0-9\s-]{3,40}/gi,
            /(?:PMP|Project Management Professional)/gi,
            /(?:Certified Scrum Master|Scrum Master|CSM)/gi,
            /(?:Microsoft Certified|MCSE|MCSA)[A-Za-z0-9\s-]{0,30}/gi,
            /(?:Cisco Certified)/gi,
            /(?:ITIL(?:\s+Foundation)?)/gi,
            /(?:Google Analytics Certified|Google Ads Certified)/gi,
            /(?:ISO \d+(?:\s*Lead Auditor)?|HACCP|GMP)/gi,
            /(?:Diploma|Certificate)\s+in\s+[A-Za-z0-9\s]{3,40}(?:Hacking|Security|Cyber|Testing|Design|Marketing|SEO|Python|Java|Web)/gi,
            /(?:Ethical Hack(?:er|ing)|CEH|VAPT|CompTIA [A-Za-z+]+)/gi
        ];

        certPatterns.forEach(pat => {
            const matches = cvText.match(pat);
            if (matches) {
                matches.forEach(m => {
                    let cleaned = m.trim().replace(/^[\s,.:| -]+|[\s,.:| -]+$/g, '');
                    if (cleaned.length >= 3 && !result.some(r => r.toLowerCase() === cleaned.toLowerCase())) {
                        result.push(cleaned);
                    }
                });
            }
        });
    }

    return Array.from(new Set(result));
};

const getNormalizedSkills = (skillsMetadataStr, tags, extractedDataInput, candidateObj = {}, minMedOverride = null) => {
    const minMed = minMedOverride !== null ? minMedOverride : (candidateObj?.min_medium_match_score || 50);
    const scoreVal = calculateMatchScore(candidateObj);
    const isLowMatch = scoreVal < minMed;
    const isManual = candidateObj.is_manual_extracted === 1 || candidateObj.is_manual_extracted === '1' || candidateObj.is_manual_extracted === true;

    const tryParse = (val) => {
        if (!val) return null;
        if (typeof val === 'object') return val;
        try {
            return JSON.parse(val);
        } catch (e) {
            return null;
        }
    };

    const dataFromMetadata = tryParse(skillsMetadataStr || candidateObj?.skills_metadata);
    const dataFromExtracted = tryParse(extractedDataInput || candidateObj?.extracted_data);

    const isUnextracted = (
        !isManual && (
            candidateObj.extraction_status === 'unextracted' ||
            isLowMatch ||
            candidateObj.auto_extraction_enabled === false ||
            candidateObj.enable_cv_extraction === false ||
            (!candidateObj.cv_text && !candidateObj.extracted_data && (!candidateObj.skills_metadata || candidateObj.skills_metadata === '[]' || candidateObj.skills_metadata === '""'))
        )
    );

    if (isUnextracted) {
        const metaObj = dataFromMetadata || dataFromExtracted;
        return {
            skills: [],
            parsedReport: {
                is_unextracted: true,
                is_job_mismatch: metaObj?.is_job_mismatch ?? false,
                mismatch_reason: metaObj?.mismatch_reason || `CV auto-extraction skipped because candidate match score (${scoreVal}%) is below minimum threshold (<${minMed}%).`,
                experience_summary: metaObj?.experience_summary || `Extraction Skipped: Candidate match score (${scoreVal}%) is below ${minMed}% threshold. Admins can manually extract this CV.`,
                recruiter_insights: Array.isArray(metaObj?.recruiter_insights) && metaObj.recruiter_insights.length > 0 
                    ? metaObj.recruiter_insights 
                    : [`⚠️ Auto-extraction skipped (${scoreVal}% Match Score < ${minMed}%). Click Manual Extract to parse with AI.`],
                fully_demonstrated_skills: [],
                partially_demonstrated_skills: [],
                requirements_without_evidence: [],
                additional_skills: []
            }
        };
    }

    let parsedReport = null;

    let parsedData = null;
    if (dataFromMetadata && Array.isArray(dataFromMetadata.skills_analysis) && dataFromMetadata.skills_analysis.length > 0) {
        parsedData = dataFromMetadata;
    } else if (dataFromExtracted && Array.isArray(dataFromExtracted.skills_analysis) && dataFromExtracted.skills_analysis.length > 0) {
        parsedData = dataFromExtracted;
    } else {
        parsedData = dataFromMetadata || dataFromExtracted;
    }

    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
        parsedReport = { ...parsedData };
    } else if (Array.isArray(parsedData)) {
        parsedReport = { skills_analysis: parsedData };
    }

    if (!parsedReport) {
        parsedReport = {};
    }

    const skills = [];
    const seen = new Set();

    // 1. Process parsedReport.skills_analysis
    if (parsedReport && Array.isArray(parsedReport.skills_analysis)) {
        parsedReport.skills_analysis.forEach(item => {
            if (!item || !item.skill) return;
            const skillName = item.skill.trim();
            if (!skillName) return;
            const key = skillName.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);

            let category = item.category;
            if (category !== 'Relevant Skills' && category !== 'Related Skills') {
                category = 'Additional Skills';
            }

            skills.push({
                skill: skillName,
                category: category,
                experience: item.estimated_duration || item.experience || '1-2 Years',
                context: item.usage_context || item.context || 'Verified skill from candidate CV.',
                evidence_source: item.evidence_source || 'CV Experience',
                evidence_strength: item.evidence_strength || 'Strong Evidence',
                experience_level: item.experience_level || 'Intermediate',
                verified: item.verified !== false
            });
        });
    }

    // 2. Process parsedReport.additional_skills
    if (parsedReport && Array.isArray(parsedReport.additional_skills)) {
        parsedReport.additional_skills.forEach(item => {
            if (!item) return;
            const isObj = typeof item === 'object' && item !== null;
            const skillName = (isObj ? item.skill : item).trim();
            if (!skillName) return;
            const key = skillName.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);

            skills.push({
                skill: skillName,
                category: 'Additional Skills',
                experience: isObj ? (item.estimated_duration || item.experience || '1-2 Years') : '1-2 Years',
                context: isObj ? (item.usage_context || item.context || 'Mentioned in candidate CV.') : 'Mentioned in candidate CV.',
                evidence_source: isObj ? (item.evidence_source || 'Skills Section') : 'Skills Section',
                evidence_strength: isObj ? (item.evidence_strength || 'Mentioned Only') : 'Mentioned Only',
                experience_level: isObj ? (item.experience_level || 'Basic') : 'Basic',
                verified: isObj && item.verified !== undefined ? item.verified !== false : true
            });
        });
    }

    // 3. Process tags
    const rawTags = tags || candidateObj.tags || '';
    if (rawTags) {
        const tagList = rawTags.split(',').map(t => t.trim()).filter(Boolean);
        tagList.forEach((t, idx) => {
            const key = t.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                skills.push({
                    skill: t,
                    category: idx < 6 ? 'Relevant Skills' : (idx < 12 ? 'Related Skills' : 'Additional Skills'),
                    experience: candidateObj.relevant_experience || candidateObj.overall_experience || '1-2 Years',
                    context: `Demonstrated competency in ${t} identified in candidate background.`,
                    evidence_source: 'Candidate Profile & CV',
                    evidence_strength: 'Strong Evidence',
                    experience_level: 'Intermediate',
                    verified: true
                });
            }
        });
    }

    // 4. Scan candidate CV text content for matching technical & professional skills ONLY if extracted & clean
    const cvTextContent = candidateObj.cv_text || '';
    const isGarbled = (str) => {
        if (!str || typeof str !== 'string') return true;
        if (/(Monotype|VeriSign|Type Solutions|OpenType Layout|kern" table|\/Image\d+|re\s+W\*\s+n|xmpmeta|CDEFGHIJSTUVWXYZcdefghijstuvwxyz)/i.test(str)) return true;
        if (/(.)\1{5,}/.test(str)) return true;
        const len = str.length;
        if (len < 10) return false;
        const symbolMatches = str.match(/[\[\]\{\}\^\/\\_>~`|#@$%\*+=]/g) || [];
        return (symbolMatches.length / len) > 0.07;
    };

    if (cvTextContent && candidateObj.extraction_status !== 'unextracted' && !isGarbled(cvTextContent)) {
        // A. Match against dictionary
        Object.entries(DOMAIN_SKILL_CATEGORIES).forEach(([categoryName, kwList]) => {
            kwList.forEach(kw => {
                let matched = false;
                if (kw === 'C') {
                    matched = /(?:c\s*[\/\+]\s*c\+\+|c\s+(?:language|programming|developer|code)|\bC\+\+\b)/i.test(cvTextContent);
                } else {
                    matched = safeMatchInText(kw, cvTextContent);
                }
                if (matched) {
                    const key = kw.toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        skills.push({
                            skill: kw,
                            category: categoryName,
                            experience: candidateObj.overall_experience || '1-2 Years',
                            context: `Verified ${kw} competency extracted from candidate CV text.`,
                            evidence_source: 'CV Text Extraction',
                            evidence_strength: 'Strong Evidence',
                            experience_level: 'Intermediate',
                            verified: true
                        });
                    }
                }
            });
        });

        // B. Dynamic Line Parser for TECHNICAL SKILLS & Technologies sections
        const lines = cvTextContent.split('\n');
        lines.forEach(line => {
            if (line.toLowerCase().includes('technologies:') || line.toLowerCase().includes('programming') || line.toLowerCase().includes('frontend') || line.toLowerCase().includes('backend') || line.toLowerCase().includes('databases') || line.toLowerCase().includes('tools') || line.toLowerCase().includes('testing')) {
                const cleanStr = line.replace(/.*(?:technologies:|programming|frontend|backend|mobile|databases|testing|tools)[:\s]*/i, '');
                const parts = cleanStr.split(/[,|•\/]/);
                parts.forEach(rawTerm => {
                    let cleanTerm = rawTerm.trim().replace(/^[^a-zA-Z0-9+#]+|[^a-zA-Z0-9+#.]+$|\(.*?\)/g, '').trim();
                    if (cleanTerm.length >= 2 && cleanTerm.length <= 32 && !/^(page|summary|details|experience|education|projects|technologies)$/i.test(cleanTerm)) {
                        const key = cleanTerm.toLowerCase();
                        if (!seen.has(key)) {
                            seen.add(key);
                            let cat = 'Related Skills';
                            if (['Java', 'C', 'Python', 'JavaScript', 'TypeScript', 'PHP', 'React', 'Spring Boot', 'Node.js', 'Laravel', 'Flutter', 'Android', 'LLaMA', 'Ollama', 'Livewire'].some(k => cleanTerm.toLowerCase().includes(k.toLowerCase()))) {
                                cat = 'Relevant Skills';
                            } else if (['Git', 'GitHub', 'Jira', 'Figma', 'Canva', 'VS Code', 'Android Studio', 'Eclipse', 'Agile', 'Docker', 'AWS', 'Postman', 'Selenium', 'JMeter'].some(k => cleanTerm.toLowerCase().includes(k.toLowerCase()))) {
                                cat = 'Additional Skills';
                            }
                            skills.push({
                                skill: cleanTerm,
                                category: cat,
                                experience: candidateObj.overall_experience || '1-2 Years',
                                context: `Extracted from candidate skills section in CV.`,
                                evidence_source: 'CV Technical Skills',
                                evidence_strength: 'Strong Evidence',
                                experience_level: 'Intermediate',
                                verified: true
                            });
                        }
                    }
                });
            }
        });
    }

    // 5. Dynamic Experience Summary & Recruiter Insights from actual CV text details
    const candidateExp = candidateObj.overall_experience || candidateObj.relevant_experience || '1-2 years';
    const candidateQual = candidateObj.qualification || 'Bachelors Degree';
    const candidateJob = candidateObj.vacancy_title || candidateObj.applied_vacancy || 'target position';

    // Parse specific experience entries from CV text across all job domains
    let expRoleDetails = '';
    let compMatch = cvTextContent.match(/(Assistant Accountant|Accountant|Finance Assistant|Digital Marketing Executive|SEO Specialist|Software Engineer|Software Developer|Developer|Engineer|Executive|Officer|Manager|Intern|Trainee|Associate)\s*[\-\|—\n,]?\s*([A-Za-z0-9\s&().]+(?:Pvt Ltd|Ltd|Inc|Company|Corp)?)/i);
    let dateMatch = cvTextContent.match(/(September|Sept|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4}\s*[\-\–]\s*(Present|March|Mar|Sept|Jan|Feb|Apr|May|Jun|Jul|Aug|Oct|Nov|Dec)[a-z]*\s*(\d{1,2},?\s*\d{4})?/i);

    if (compMatch) {
        expRoleDetails = `${compMatch[1]} at ${compMatch[2].trim()}${dateMatch ? ` (${dateMatch[0]})` : ''}`;
    }

    // Job Vacancy vs Candidate CV Domain Alignment & Mismatch Evaluator
    const vLower = candidateJob.toLowerCase();
    const textLower = cvTextContent.toLowerCase();

    const domainKeywords = {
        'Accounting & Finance': ['accountant', 'accounting', 'accounts payable', 'accounts receivable', 'financial', 'reconciliation', 'ledger', 'quickbooks', 'sap', 'journal', 'audit', 'tax', 'petty cash', 'bookkeeper', 'invoicing', 'banking', 'finance', 'cost accounting', 'tally', 'budgeting'],
        'Digital Marketing': ['marketing', 'digital marketing', 'seo', 'sem', 'social media', 'google ads', 'meta ads', 'content', 'copywriting', 'campaign', 'analytics', 'branding', 'advertising', 'email marketing', 'google analytics'],
        'Software Engineering & IT': ['software', 'developer', 'engineer', 'javascript', 'python', 'php', 'react', 'html', 'css', 'sql', 'git', 'c++', 'java', 'node', 'code', 'programming', 'web', 'database', 'it', 'technical', 'network', 'networking', 'hardware', 'lan', 'wan', 'troubleshoot', 'troubleshooting', 'system', 'infrastructure', 'cloud', 'devops', 'support', 'helpdesk', 'cybersecurity', 'active directory', 'windows server'],
        'HR & Administration': ['human resources', 'hr', 'recruitment', 'payroll', 'employee', 'admin', 'office manager', 'onboarding', 'attendance', 'leave', 'engagement', 'labor law', 'personnel', 'staffing', 'talent', 'hiring', 'interviews'],
        'Sales & Business Development': ['sales', 'business development', 'client', 'account manager', 'revenue', 'b2b', 'negotiation', 'leads', 'prospecting']
    };

    const jobDescriptionText = (candidateObj.vacancy_description || candidateObj.description || candidateObj.v_description || '').toLowerCase();
    const jobRequirementsText = (candidateObj.vacancy_requirements || candidateObj.requirements || candidateObj.v_requirements || '').toLowerCase();
    const jobRequiredSkillsText = (candidateObj.vacancy_required_skills || candidateObj.required_skills || candidateObj.v_required_skills || '').toLowerCase();
    const fullJobContextText = `${candidateJob.toLowerCase()} ${jobDescriptionText} ${jobRequirementsText} ${jobRequiredSkillsText}`.trim();

    let targetDomain = '';
    Object.entries(domainKeywords).forEach(([dName, kwList]) => {
        if (!targetDomain) {
            const hasMatch = kwList.some(k => {
                if (k.length <= 3) {
                    return safeMatchInText(k, fullJobContextText);
                }
                return fullJobContextText.includes(k.toLowerCase());
            });
            if (hasMatch) {
                targetDomain = dName;
            }
        }
    });

    const targetDomainKeywords = targetDomain ? (domainKeywords[targetDomain] || []) : [];

    const coreDomainRelevantSkills = {
        'Software Engineering & IT': [
            'java', 'python', 'javascript', 'typescript', 'php', 'react', 'react.js', 'node.js', 'laravel', 'c++', 'c#', 'c',
            'spring boot', 'flutter', 'android', 'html', 'html5', 'css', 'css3', 'sql', 'mysql', 'postgresql', 'restful apis', 'rest api',
            'git', 'github', 'linux', 'aws', 'docker', 'networking', 'network', 'tcp/ip', 'dns', 'dhcp', 'firewall', 'cisco', 'ccna',
            'system administration', 'it support', 'troubleshooting', 'active directory', 'windows server', 'lan / wan', 'lan/wan',
            'hardware troubleshooting', 'software troubleshooting', 'database design', 'quality assurance', 'unit testing'
        ],
        'Accounting & Finance': [
            'accountant', 'accounting', 'accounts payable', 'accounts receivable', 'financial reporting', 'general ledger',
            'journal entries', 'bank reconciliation', 'taxation', 'quickbooks', 'sap business one', 'tally', 'excel', 'microsoft excel',
            'pivot-tables', 'vlookup', 'audit schedules', 'variance analysis', 'month-end closing', 'expense analysis', 'invoice processing',
            'petty cash', 'management reports'
        ],
        'Digital Marketing': [
            'digital marketing', 'seo', 'sem', 'social media marketing', 'google ads', 'meta ads manager', 'copywriting',
            'content marketing', 'lead generation', 'google analytics 4', 'email marketing', 'google search console', 'semrush',
            'ahrefs', 'campaign planning', 'a/b testing', 'retargeting'
        ],
        'HR & Administration': [
            'human resources', 'hr', 'recruitment', 'talent acquisition', 'payroll', 'onboarding', 'attendance',
            'leave administration', 'employee relations', 'hr documentation', 'office administration', 'staffing'
        ],
        'Sales & Business Development': [
            'sales', 'b2b sales', 'business development', 'key account management', 'client relationship', 'sales strategy',
            'lead generation', 'cold calling', 'crm', 'negotiation'
        ]
    };

    const targetCoreSkills = targetDomain ? (coreDomainRelevantSkills[targetDomain] || []) : [];

    // Dynamic Skill Categorization Rule:
    // 1. Relevant Skills: Skills matching Job Description / Requirements / Required Skills (directly in Job Details)
    // 2. Related Skills: Skills not in Job Description, but related to Job Domain / Industry
    // 3. Additional Skills: Other general / extra skills
    skills.forEach(s => {
        const sLower = s.skill.toLowerCase().trim();
        if (!sLower) return;

        // 1. RELEVANT SKILLS: Candidate CV skills that directly match the specific Job Details
        let isDirectJobMatch = false;

        if (fullJobContextText && sLower.length >= 2) {
            if (sLower === 'c') {
                isDirectJobMatch = /(?:c\s*[\/\+]\s*c\+\+|c\s+(?:language|programming|developer|code)|\bC\+\+\b)/i.test(fullJobContextText);
            } else if (sLower.length <= 3) {
                isDirectJobMatch = safeMatchInText(sLower, fullJobContextText);
            } else {
                if (safeMatchInText(sLower, fullJobContextText) || fullJobContextText.includes(sLower)) {
                    isDirectJobMatch = true;
                } else {
                    const words = sLower
                        .replace(/[^a-z0-9+#]/g, ' ')
                        .split(/\s+/)
                        .filter(w => w.length >= 3 && !['and', 'for', 'the', 'with', 'via', 'all'].includes(w));
                    if (words.length >= 2) {
                        isDirectJobMatch = words.every(w => {
                            const root = w.replace(/(ing|tion|ment|ed|s)$/, '');
                            return fullJobContextText.includes(root.length >= 3 ? root : w);
                        });
                    } else if (words.length === 1 && words[0].length >= 5) {
                        const root = words[0].replace(/(ing|tion|ment|ed|s)$/, '');
                        if (root.length >= 4 && fullJobContextText.includes(root)) {
                            isDirectJobMatch = true;
                        }
                    }
                }
            }
        }

        if (isDirectJobMatch) {
            s.category = 'Relevant Skills';
        } else {
            // 2. RELATED SKILLS: Skills not in Job Details, but related to the Job Field / Career Domain / Industry
            let isDomainRelated = false;

            if (targetCoreSkills.length > 0) {
                isDomainRelated = targetCoreSkills.some(cs => {
                    if (sLower === cs) return true;
                    if (cs.length > 3 && (sLower.includes(cs) || cs.includes(sLower))) return true;
                    return false;
                });
            }

            if (!isDomainRelated && targetDomainKeywords.length > 0) {
                isDomainRelated = targetDomainKeywords.some(k => {
                    const kLower = k.toLowerCase();
                    if (kLower.length <= 3) return sLower === kLower;
                    return sLower === kLower || sLower.includes(kLower) || kLower.includes(sLower);
                });
            }

            if (isDomainRelated) {
                s.category = 'Related Skills';
            } else {
                // 3. ADDITIONAL SKILLS: Other general tools, extra skills, soft skills, or unrelated competencies
                s.category = 'Additional Skills';
            }
        }
    });

    const relevantSkillsFound = skills.filter(s => s.category === 'Relevant Skills').map(s => s.skill);
    const relatedSkillsFound = skills.filter(s => s.category === 'Related Skills').map(s => s.skill);

    let cvScores = {};
    Object.entries(domainKeywords).forEach(([dName, kwList]) => {
        let score = 0;
        kwList.forEach(k => {
            if (textLower.includes(k)) score++;
        });
        cvScores[dName] = score;
    });

    // Check if any extracted candidate skills match target domain keywords with strict word matching
    let hasTargetDomainSkills = false;
    if (targetDomain && domainKeywords[targetDomain]) {
        const targetKw = domainKeywords[targetDomain];
        hasTargetDomainSkills = skills.some(s => {
            const sName = s.skill.toLowerCase().trim();
            if (/^(phpmyadmin|sysadmin|dbadmin|admin panel|database admin)$/i.test(sName)) return false;
            return targetKw.some(k => {
                if (k.length <= 3) {
                    return sName === k.toLowerCase();
                }
                return sName === k.toLowerCase() || safeMatchInText(k, sName);
            });
        });
    }

    const sortedDomains = Object.keys(cvScores).sort((a, b) => cvScores[b] - cvScores[a]);
    const cvActualDomain = cvScores[sortedDomains[0]] > 0 ? sortedDomains[0] : 'General';

    // Check if Gemini AI or metadata already identified a job mismatch
    const aiMismatch = (
        parsedReport?.is_job_mismatch === true ||
        dataFromMetadata?.is_job_mismatch === true ||
        dataFromExtracted?.is_job_mismatch === true ||
        candidateObj?.is_job_mismatch === true
    );
    const aiMismatchReason = (
        parsedReport?.mismatch_reason ||
        dataFromMetadata?.mismatch_reason ||
        dataFromExtracted?.mismatch_reason ||
        candidateObj?.mismatch_reason || ''
    );

    let isMismatch = aiMismatch;
    let mismatchReason = aiMismatchReason;

    if (!isMismatch && !isUnextracted && (targetDomain || candidateJob)) {
        if (scoreVal < minMed || relevantSkillsFound.length === 0) {
            isMismatch = true;
            mismatchReason = cvActualDomain !== 'General' && cvActualDomain !== targetDomain
                ? `Background focus (${cvActualDomain}) differs from target role (${candidateJob}).`
                : `Profile lacks core competencies required for "${candidateJob}".`;
        } else if (cvActualDomain !== 'General' && cvActualDomain !== targetDomain && relevantSkillsFound.length < 2) {
            isMismatch = true;
            mismatchReason = `Background (${cvActualDomain}) does not closely align with "${candidateJob}".`;
        }
    }

    parsedReport.is_unextracted = isUnextracted;
    parsedReport.is_job_mismatch = isMismatch;
    parsedReport.mismatch_reason = mismatchReason;
    parsedReport.cv_actual_domain = cvActualDomain;
    parsedReport.target_domain = targetDomain;

    // Populate Experience Summary
    if (!parsedReport.experience_summary ||
        parsedReport.experience_summary.includes('0 years') ||
        parsedReport.experience_summary.includes('0-1 years of total experience') ||
        parsedReport.experience_summary === 'Candidate profile extracted from CV.') {
        
        if (expRoleDetails) {
            parsedReport.experience_summary = `Candidate has experience as ${expRoleDetails}. Holds ${candidateQual} qualifications with verified expertise in ${relevantSkillsFound.slice(0, 4).join(', ')} and ${relatedSkillsFound.slice(0, 3).join(', ')}.`;
        } else {
            parsedReport.experience_summary = `Candidate holds ${candidateQual} with ${candidateExp} verified experience in ${relevantSkillsFound.slice(0, 4).join(', ')} for ${candidateJob}. Evaluated and verified against job requirements.`;
        }
    }

    // Populate Recruiter Insights & Observations
    if (!Array.isArray(parsedReport.recruiter_insights) ||
        parsedReport.recruiter_insights.length === 0 ||
        (parsedReport.recruiter_insights.length === 1 && parsedReport.recruiter_insights[0] === 'Candidate manually submitted profile information.')) {
        
        parsedReport.recruiter_insights = [];

        if (isMismatch) {
            parsedReport.recruiter_insights.push(`⚠️ Job Requirement Mismatch: Candidate CV focus (${cvActualDomain}) differs from target role (${candidateJob}).`);
        } else {
            parsedReport.recruiter_insights.push(`✅ Verified Job Alignment: Candidate's background and competencies match target vacancy requirements for ${candidateJob}.`);
        }

        if (expRoleDetails) {
            parsedReport.recruiter_insights.push(`Direct professional experience as ${expRoleDetails}.`);
        } else {
            parsedReport.recruiter_insights.push(`Candidate applied for ${candidateJob} with ${candidateExp} verified experience.`);
        }

        if (relevantSkillsFound.length > 0) {
            parsedReport.recruiter_insights.push(`Demonstrates verified domain competency in ${relevantSkillsFound.join(', ')}.`);
        }

        parsedReport.recruiter_insights.push(`Highest Qualification: ${candidateQual}. Demonstrates ${skills.length} verified technical and professional competencies.`);
    }

    // Ensure Mandatory Requirements Validation is strictly sanitized against contradictions
    const unverifiedSkillsSet = new Set(
        (Array.isArray(parsedReport.requirements_without_evidence) ? parsedReport.requirements_without_evidence : [])
            .map(s => s.toLowerCase().trim())
    );
    // Add any skill from skills analysis that is unverified
    skills.forEach(s => {
        if (s.verified === false) {
            unverifiedSkillsSet.add(s.skill.toLowerCase().trim());
        }
    });

    if (Array.isArray(parsedReport.fully_demonstrated_skills)) {
        parsedReport.fully_demonstrated_skills = parsedReport.fully_demonstrated_skills.filter(s => {
            const sLower = s.toLowerCase().trim();
            if (unverifiedSkillsSet.has(sLower)) return false;
            const matching = skills.find(sk => sk.skill.toLowerCase().trim() === sLower);
            if (matching && matching.verified === false) return false;
            return true;
        });
    } else {
        parsedReport.fully_demonstrated_skills = [];
    }

    // Only populate fallback fully_demonstrated_skills if candidate has actual verified domain skills and is NOT mismatch
    if (parsedReport.fully_demonstrated_skills.length === 0 && !isMismatch) {
        parsedReport.fully_demonstrated_skills = relevantSkillsFound.filter(s => !unverifiedSkillsSet.has(s.toLowerCase().trim())).slice(0, 5);
    }

    if (Array.isArray(parsedReport.partially_demonstrated_skills)) {
        parsedReport.partially_demonstrated_skills = parsedReport.partially_demonstrated_skills.filter(s => {
            const sLower = s.toLowerCase().trim();
            return !unverifiedSkillsSet.has(sLower);
        });
    } else {
        parsedReport.partially_demonstrated_skills = [];
    }

    if (isMismatch && (!Array.isArray(parsedReport.requirements_without_evidence) || parsedReport.requirements_without_evidence.length === 0)) {
        if (targetDomain === 'Accounting & Finance') {
            parsedReport.requirements_without_evidence = ['Accounts Payable & Receivable', 'Financial Reporting', 'Bank Reconciliation', 'Accounting Software (QuickBooks/SAP)'];
        } else if (targetDomain === 'Digital Marketing') {
            parsedReport.requirements_without_evidence = ['SEO & SEM Optimization', 'Google & Meta Ad Campaigns', 'Content Marketing', 'Analytics & Reporting'];
        } else if (targetDomain === 'Software Engineering & IT') {
            parsedReport.requirements_without_evidence = ['Software Development', 'Core Programming Languages', 'Database Design & API Integration'];
        } else if (targetDomain === 'HR & Administration') {
            parsedReport.requirements_without_evidence = ['Recruitment Coordination', 'Onboarding & Employee Records', 'Attendance & Leave Administration', 'HR Documentation'];
        } else {
            parsedReport.requirements_without_evidence = [`Direct experience in ${targetDomain || candidateJob}`];
        }
    }

    // Ensure Qualifications Found is populated with exact qualification titles
    parsedReport.qualifications_found = extractFullQualificationsFromCVText(cvTextContent, candidateQual, parsedReport.qualifications_found);

    // Ensure Certifications Found has full scan fallback
    parsedReport.certifications_found = extractCertificationsFromCVText(cvTextContent, parsedReport.certifications_found);

    return { skills, parsedReport };
};

const calculateMatchScore = (app) => {
    return calculateCandidateMatchScore(app).score;
};

const getMatchBreakdown = (app) => {
    if (!app) return { overall: 0, salary: 0, experience: 0, qualification: 0, skills: 0, jdAlignment: 0, jdSkills: 0 };
    const res = calculateCandidateMatchScore(app);
    const score = res.score || 0;
    const factors = res.details?.factors || {};

    let salary = typeof factors.salary === 'number' ? factors.salary : 100;
    let experience = typeof factors.experience === 'number' ? factors.experience : 0;
    let qualification = typeof factors.qualification === 'number' ? factors.qualification : 0;
    let skills = typeof factors.skills === 'number' ? factors.skills : 0;
    let jdAlignment = typeof factors.keyword === 'number' ? factors.keyword : 0;

    // Check direct AI breakdown from skills_metadata
    if (app.skills_metadata) {
        try {
            const meta = typeof app.skills_metadata === 'string' ? JSON.parse(app.skills_metadata) : app.skills_metadata;
            if (meta?.ai_score_breakdown) {
                const bd = meta.ai_score_breakdown;
                const hasBudget = Boolean(app.min_salary || app.max_salary || app.v_min_salary || app.v_max_salary);
                if (hasBudget && typeof factors.salary === 'number') {
                    salary = factors.salary;
                } else if (typeof bd.salary_match_score === 'number') {
                    salary = bd.salary_match_score;
                }
                if (typeof bd.experience_match_score === 'number') {
                    experience = bd.experience_match_score;
                }
                if (typeof bd.qualification_match_score === 'number') qualification = bd.qualification_match_score;
                if (typeof bd.skills_match_score === 'number') skills = bd.skills_match_score;
                if (typeof bd.job_description_match_score === 'number') jdAlignment = bd.job_description_match_score;
            }
        } catch (e) {}
    }

    const jdSkills = skills > 0 ? skills : (jdAlignment > 0 ? jdAlignment : 0);
    const mismatchReason = extractCandidateMismatchReason(app, res);

    const weights = res.details?.weights || {
        skills: app.weight_skills !== null && app.weight_skills !== undefined ? Number(app.weight_skills) : 35,
        experience: app.weight_experience !== null && app.weight_experience !== undefined ? Number(app.weight_experience) : 30,
        qualification: app.weight_qualification !== null && app.weight_qualification !== undefined ? Number(app.weight_qualification) : 20,
        jdAlignment: app.weight_jd_alignment !== null && app.weight_jd_alignment !== undefined ? Number(app.weight_jd_alignment) : 10,
        salary: app.weight_salary !== null && app.weight_salary !== undefined ? Number(app.weight_salary) : 5,
        isCustom: app.weight_skills !== null && app.weight_skills !== undefined
    };

    return {
        overall: score,
        salary,
        experience,
        qualification,
        skills,
        jdAlignment,
        jdSkills,
        weights,
        mismatchReason
    };
};

const getAssessmentPoints = (isMismatch, parsedReport, candidate, breakdown, minMed) => {
    const points = [];
    if (isMismatch) {
        // Collect raw reasons
        let rawReason = (
            parsedReport?.mismatch_reason ||
            breakdown?.mismatchReason ||
            extractCandidateMismatchReason(candidate) ||
            ''
        ).trim();

        // If rawReason empty, check ai_match_reason for mismatch text
        if (!rawReason && parsedReport?.ai_match_reason) {
            const r = parsedReport.ai_match_reason;
            if (/mismatch|differ|unrelated|penaliz|lack|does not match/i.test(r)) {
                rawReason = r.replace(/^Job & CV Mismatch Warning:\s*/i, '').trim();
            }
        }

        if (rawReason) {
            // Check for ", whereas " or " whereas "
            if (/,\s*whereas\s+|\s+whereas\s+/i.test(rawReason)) {
                const parts = rawReason.split(/,\s*whereas\s+|\s+whereas\s+/i);
                if (parts[0] && parts[0].trim()) {
                    let p0 = parts[0].trim();
                    if (!/[.!?]$/.test(p0)) p0 += '.';
                    points.push(p0);
                }
                if (parts[1] && parts[1].trim()) {
                    let p1 = parts[1].trim();
                    p1 = p1.charAt(0).toUpperCase() + p1.slice(1);
                    if (!/[.!?]$/.test(p1)) p1 += '.';
                    points.push(`Role Requirement Gap: ${p1}`);
                }
            } else if (rawReason.includes('. ')) {
                rawReason.split(/\.\s+/).forEach(sent => {
                    const clean = sent.trim();
                    if (clean.length > 10) {
                        points.push(clean.endsWith('.') ? clean : clean + '.');
                    }
                });
            } else {
                points.push(rawReason.endsWith('.') ? rawReason : rawReason + '.');
            }
        }

        // Requirements without evidence
        if (Array.isArray(parsedReport?.requirements_without_evidence) && parsedReport.requirements_without_evidence.length > 0) {
            points.push(`Missing / Unverified Tech Stack: ${parsedReport.requirements_without_evidence.slice(0, 5).join(', ')}.`);
        }

        if (points.length === 0) {
            points.push(`Candidate background and skillset diverge from the requirements of "${candidate.vacancy_title || 'target position'}".`);
            points.push(`Overall match score (${breakdown.overall}%) is below the required screening criteria.`);
        }
    } else {
        // MATCHED POINTS
        // 1. Check ai_match_reason
        const matchReason = (parsedReport?.ai_match_reason || '').trim();
        if (matchReason && !/mismatch|differs|penalty/i.test(matchReason)) {
            if (matchReason.includes('. ')) {
                matchReason.split(/\.\s+/).forEach(sent => {
                    const clean = sent.trim();
                    if (clean.length > 15 && points.length < 2) {
                        points.push(clean.endsWith('.') ? clean : clean + '.');
                    }
                });
            } else {
                points.push(matchReason.endsWith('.') ? matchReason : matchReason + '.');
            }
        }

        // 2. Demonstrated core skills
        if (Array.isArray(parsedReport?.fully_demonstrated_skills) && parsedReport.fully_demonstrated_skills.length > 0) {
            points.push(`Demonstrated Core Competencies: ${parsedReport.fully_demonstrated_skills.slice(0, 6).join(', ')}.`);
        } else if (candidate?.tags) {
            const tList = candidate.tags.split(',').map(t => t.trim()).filter(Boolean);
            if (tList.length > 0) {
                points.push(`Key Technical Proficiencies: ${tList.slice(0, 5).join(', ')}.`);
            }
        }

        // 3. Relevant experience
        if (candidate?.relevant_experience && candidate.relevant_experience !== '0 years' && !points.some(p => /experience/i.test(p))) {
            points.push(`Experience Alignment: ${candidate.relevant_experience} relevant experience (Overall: ${candidate.overall_experience || candidate.relevant_experience}).`);
        }

        // 4. Education
        if (candidate?.qualification && !points.some(p => /qualification|degree|bsc|hnd|diploma/i.test(p))) {
            points.push(`Educational Qualification: ${candidate.qualification} fulfills position prerequisite.`);
        }

        // 5. Budget
        if (candidate?.salary_expectation && (candidate.min_salary || candidate.max_salary) && !points.some(p => /salary|budget/i.test(p))) {
            points.push(`Budget Compatibility: Salary expectation fits comfortably within the allocated position budget.`);
        }

        // Fallback
        if (points.length === 0) {
            points.push(`High profile alignment with target vacancy "${candidate?.vacancy_title || candidate?.applied_vacancy || 'Vacancy'}" (${breakdown.overall}% match).`);
            points.push(`Candidate possesses relevant domain qualifications and meets core screening criteria.`);
        }
    }

    return points;
};

const parsePointDetail = (rawPoint, isMismatch, index) => {
    if (!rawPoint) return { label: '', text: '' };

    let str = typeof rawPoint === 'string' ? rawPoint.trim() : String(rawPoint).trim();
    let label = '';
    let text = str;

    // Check if the string already has an explicit label followed by a colon
    const colonIdx = str.indexOf(':');
    if (colonIdx > 0 && colonIdx < 40) {
        const potentialLabel = str.substring(0, colonIdx).trim();
        const remainder = str.substring(colonIdx + 1).trim();

        if (/missing|unverified|tech stack/i.test(potentialLabel)) {
            label = 'Missing Tech Stack';
            text = remainder;
        } else if (/requirement gap|role requirement gap|role gap/i.test(potentialLabel)) {
            label = 'Requirement Gap';
            text = remainder;
        } else if (/demonstrated core competencies|core competencies|competencies/i.test(potentialLabel)) {
            label = 'Core Competencies';
            text = remainder;
        } else if (/technical proficiencies|key technical proficiencies|proficiencies/i.test(potentialLabel)) {
            label = 'Core Competencies';
            text = remainder;
        } else if (/experience alignment|experience fit|experience/i.test(potentialLabel)) {
            label = 'Experience Fit';
            text = remainder;
        } else if (/educational qualification|qualification/i.test(potentialLabel)) {
            label = 'Qualifications';
            text = remainder;
        } else if (/budget compatibility|budget match|budget|salary/i.test(potentialLabel)) {
            label = 'Budget Match';
            text = remainder;
        } else {
            label = potentialLabel.replace(/^(Job & CV Mismatch Warning|Demonstrated|Verified|Key)\s*/i, '').trim();
            text = remainder;
        }
    }

    // If no label was found via colon, infer based on content and position
    if (!label) {
        if (isMismatch) {
            if (/strictly focused|focused on|experience and skillset|background|career/i.test(str)) {
                label = 'Candidate Focus';
            } else if (/requires|lacks|requirement|gap|intern|developer/i.test(str)) {
                label = 'Requirement Gap';
            } else if (/missing|tech stack|competenc/i.test(str)) {
                label = 'Missing Tech Stack';
            } else {
                label = index === 0 ? 'Candidate Focus' : (index === 1 ? 'Requirement Gap' : 'Mismatch Factor');
            }
        } else {
            if (/strong fit|hands-on|experience|support|holdings|associate|tenure/i.test(str) && index === 0) {
                label = 'Role & Experience';
            } else if (/qualification|salary|budget|bound|lkr|expectation/i.test(str)) {
                label = 'Qualifications & Budget';
            } else if (/competenc|infrastructure|troubleshooting|windows|network|proficienc/i.test(str)) {
                label = 'Core Competencies';
            } else {
                label = index === 0 ? 'Role & Experience' : (index === 1 ? 'Qualifications & Budget' : 'Core Competencies');
            }
        }
    }

    return { label, text };
};

const cleanDisplayCvText = (text) => {
    if (!text || typeof text !== 'string') return '';
    let s = text;
    if (/(?:[a-zA-Z]AM[a-zA-Z]){2,}/.test(s) || s.includes('AMACAM') || s.includes('AMfiESENT')) {
        s = s.replace(/AMACAMfiESENT/gi, ' - PRESENT');
        s = s.replace(/AMACAM/gi, ' - ');
        s = s.replace(/AMAC/gi, ' - ');
        s = s.replace(/ACAM/gi, ' - ');
        s = s.replace(/(?<=[a-zA-Z0-9])AC(?=[a-zA-Z0-9])/g, '-');
        s = s.replace(/(?<=[a-zA-Z0-9])Ad(?=[a-zA-Z0-9\s])/g, ', ');
        s = s.replace(/(?<=[a-zA-Z0-9])AW(?=[a-zA-Z0-9\s])/g, '. ');
        s = s.replace(/A`gmaiq/gi, '@gmail');
        s = s.replace(/(?<=[a-zA-Z0-9])AM(?=[a-zA-Z0-9])/g, ' ');
        s = s.replace(/\bAM\b/g, ' ');
        s = s.replace(/AAM/g, ' ');
        s = s.replace(/AMA/g, ' ');
        s = s.replace(/\s{2,}/g, ' ');
    }
    return s.trim();
};

const generateAiParsedCvText = (candidate, skills = [], parsedReport = null, extData = null) => {
    if (!candidate) return '';

    if (extData?.extracted_full_text && typeof extData.extracted_full_text === 'string' && extData.extracted_full_text.trim().length > 30) {
        return extData.extracted_full_text.trim();
    }

    const sections = [];

    // 1. Candidate Info & Contact Details
    const fullName = [extData?.first_name || candidate.first_name, extData?.last_name || candidate.last_name].filter(Boolean).join(' ').trim();
    const email = extData?.email || candidate.email || '';
    const phone = extData?.contact_number || candidate.contact_number || '';
    const location = candidate.location || extData?.address || '';
    const jobTitle = candidate.vacancy_title || candidate.applied_vacancy || '';
    const salary = candidate.salary_expectation || extData?.salary_expectation || '';

    const contactLines = [];
    if (fullName) contactLines.push(`• Name: ${fullName}`);
    if (email) contactLines.push(`• Email: ${email}`);
    if (phone) contactLines.push(`• Phone: ${phone}`);
    if (location) contactLines.push(`• Location / Address: ${location}`);
    if (jobTitle) contactLines.push(`• Target Position: ${jobTitle}`);
    if (salary) contactLines.push(`• Salary Expectation: LKR ${salary}`);

    if (contactLines.length > 0) {
        sections.push(`CONTACT INFORMATION\n${contactLines.join('\n')}`);
    }

    // 2. Profile Summary
    const summary = extData?.profile_summary || candidate.profile_summary || parsedReport?.experience_summary;
    if (summary && summary.trim()) {
        sections.push(`PROFILE SUMMARY\n${summary.trim()}`);
    }

    // 3. Education & Academic Qualifications
    const qualSet = new Set();
    if (candidate.qualification) qualSet.add(candidate.qualification);
    if (Array.isArray(extData?.qualifications_found)) {
        extData.qualifications_found.forEach(q => { if (q && typeof q === 'string') qualSet.add(q.trim()); });
    }
    if (Array.isArray(parsedReport?.qualifications_found)) {
        parsedReport.qualifications_found.forEach(q => { if (q && typeof q === 'string') qualSet.add(q.trim()); });
    }
    if (qualSet.size > 0) {
        sections.push(`EDUCATION & QUALIFICATIONS\n${Array.from(qualSet).map(q => `• ${q}`).join('\n')}`);
    }

    // 4. Experience & Work History
    const expLines = [];
    if (candidate.overall_experience) expLines.push(`• Overall Experience: ${candidate.overall_experience}`);
    if (candidate.relevant_experience) expLines.push(`• Relevant Experience: ${candidate.relevant_experience}`);
    const expSummary = parsedReport?.experience_summary || extData?.experience_summary;
    if (expSummary && expSummary !== summary) {
        expLines.push(`• Experience Overview: ${expSummary}`);
    }
    if (expLines.length > 0) {
        sections.push(`WORK EXPERIENCE\n${expLines.join('\n')}`);
    }

    // 5. Skills by Category
    const relSkills = (skills || []).filter(s => s.category === 'Relevant Skills').map(s => s.skill);
    const relatedSkills = (skills || []).filter(s => s.category === 'Related Skills').map(s => s.skill);
    const addSkills = (skills || []).filter(s => s.category === 'Additional Skills').map(s => s.skill);

    const skillCategoryLines = [];
    if (relSkills.length > 0) {
        skillCategoryLines.push(`• Relevant Skills (Direct Job Match):\n  ${relSkills.join(', ')}`);
    }
    if (relatedSkills.length > 0) {
        skillCategoryLines.push(`• Related Skills (Field Competencies):\n  ${relatedSkills.join(', ')}`);
    }
    if (addSkills.length > 0) {
        skillCategoryLines.push(`• Additional Skills (Tools & General):\n  ${addSkills.join(', ')}`);
    }
    if (skillCategoryLines.length > 0) {
        sections.push(`VERIFIED SKILLS\n${skillCategoryLines.join('\n\n')}`);
    }

    // 6. Certifications & Accreditations
    const certSet = new Set();
    if (Array.isArray(extData?.certifications_found)) {
        extData.certifications_found.forEach(c => { if (c && typeof c === 'string') certSet.add(c.trim()); });
    }
    if (Array.isArray(parsedReport?.certifications_found)) {
        parsedReport.certifications_found.forEach(c => { if (c && typeof c === 'string') certSet.add(c.trim()); });
    }
    if (certSet.size > 0) {
        sections.push(`CERTIFICATIONS & LICENSES\n${Array.from(certSet).map(c => `• ${c}`).join('\n')}`);
    }

    // 7. Steuart AI Evaluation & Recruiter Insights
    const insightLines = [];
    if (parsedReport?.ai_match_score || extData?.ai_match_score) {
        insightLines.push(`• AI Match Score: ${parsedReport?.ai_match_score || extData?.ai_match_score}%`);
    }
    if (parsedReport?.ai_match_reason || extData?.ai_match_reason) {
        insightLines.push(`• Recruiter Evaluation: ${parsedReport?.ai_match_reason || extData?.ai_match_reason}`);
    }
    if (Array.isArray(parsedReport?.recruiter_insights) && parsedReport.recruiter_insights.length > 0) {
        insightLines.push(`• Recruiter Insights:\n${parsedReport.recruiter_insights.map(i => `  - ${i}`).join('\n')}`);
    }
    if (insightLines.length > 0) {
        sections.push(`AI RECRUITER ASSESSMENT\n${insightLines.join('\n')}`);
    }

    return sections.join('\n\n');
};

function CvExtractionsPage({ admin }) {
    const tableDragScroll = useHorizontalDragScroll();
    const storedAdminData = (() => {
        try {
            return localStorage.getItem('gs_admin_data') ? JSON.parse(localStorage.getItem('gs_admin_data')) : null;
        } catch (e) {
            return null;
        }
    })();
    const currentAdmin = admin || storedAdminData || {};
    const isSubAdmin = currentAdmin.role === 'sub_admin1' || currentAdmin.role === 'sub_admin2' || currentAdmin.role === 'sub_admin';

    const [extractions, setExtractions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [extractingIds, setExtractingIds] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    // Filters & Pagination
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'extracted', 'unextracted'
    const [search, setSearch] = useState('');
    const [selectedVacancyId, setSelectedVacancyId] = useState('');
    const [vacancies, setVacancies] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({ total_apps: 0, extracted_count: 0, unextracted_count: 0 });

    // Setting
    const [autoExtractionEnabled, setAutoExtractionEnabled] = useState(true);
    const [settingLoading, setSettingLoading] = useState(false);
    const [minHighScore, setMinHighScore] = useState(75);
    const [minMediumScore, setMinMediumScore] = useState(50);

    // Detail Modal
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [activeAdminTab, setActiveAdminTab] = useState('Relevant Skills');
    const [showScoringTooltip, setShowScoringTooltip] = useState(false);
    const [cvTextViewMode, setCvTextViewMode] = useState('ai');

    // Load available vacancies for filter dropdown
    useEffect(() => {
        getAllVacancies()
            .then(res => {
                setVacancies(res.data?.data || []);
            })
            .catch(err => {
                console.error('Failed to load vacancies:', err);
            });
    }, []);

    const fetchExtractionsData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                status: activeTab,
                search: search,
                page: page,
                limit: limit
            };
            if (selectedVacancyId) {
                params.vacancy_id = selectedVacancyId;
            }
            const res = await getExtractions(params);
            const data = res.data?.data || res.data;
            let items = data.items || [];
            if (isSubAdmin && currentAdmin.company_id) {
                items = items.filter(i => !i.company_id || parseInt(i.company_id, 10) === parseInt(currentAdmin.company_id, 10));
            }
            setExtractions(items);
            setTotal(data.total || 0);
            if (data.stats) setStats(data.stats);
            if (data.enable_cv_extraction !== undefined) {
                setAutoExtractionEnabled(!!data.enable_cv_extraction);
            }
            if (data.min_high_match_score !== undefined) {
                setMinHighScore(parseInt(data.min_high_match_score) || 75);
            }
            if (data.min_medium_match_score !== undefined) {
                setMinMediumScore(parseInt(data.min_medium_match_score) || 50);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load extractions queue.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, search, selectedVacancyId, page, limit]);

    useEffect(() => {
        fetchExtractionsData();
    }, [fetchExtractionsData]);

    const handleToggleSetting = async () => {
        setSettingLoading(true);
        const nextState = !autoExtractionEnabled;
        try {
            await updateExtractionSetting({ enabled: nextState });
            setAutoExtractionEnabled(nextState);
            toast.success(`Automatic CV Extraction is now ${nextState ? 'ENABLED (YES)' : 'DISABLED (NO)'}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update extraction setting.');
        } finally {
            setSettingLoading(false);
        }
    };

    const handleSingleExtract = async (id) => {
        setExtractingIds(prev => [...prev, id]);
        try {
            const res = await extractCvAdmin({ id });
            toast.success(res.data?.message || 'CV extracted successfully!');
            await fetchExtractionsData();
            
            // If modal is open for this candidate, update selectedCandidate with freshly extracted report
            const resData = res.data?.data?.results?.[0];
            if (selectedCandidate && selectedCandidate.id === id && resData) {
                setSelectedCandidate(prev => ({
                    ...prev,
                    ...resData,
                    extraction_status: 'extracted',
                    is_manual_extracted: 1,
                    extracted_data: resData.extracted_data,
                    skills_metadata: resData.skills_metadata,
                    tags: resData.tags,
                    cv_text: resData.cv_text || prev.cv_text,
                    overall_experience: resData.overall_experience || prev.overall_experience,
                    relevant_experience: resData.relevant_experience || prev.relevant_experience,
                    qualification: resData.qualification || prev.qualification
                }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'CV extraction failed.');
        } finally {
            setExtractingIds(prev => prev.filter(x => x !== id));
        }
    };

    const handleBatchExtract = async () => {
        if (selectedIds.length === 0) {
            toast.info('Please select at least one candidate to extract.');
            return;
        }

        setExtractingIds(selectedIds);
        try {
            const res = await extractCvAdmin({ ids: selectedIds });
            toast.success(res.data?.message || `${selectedIds.length} CV(s) extracted successfully!`);
            setSelectedIds([]);
            fetchExtractionsData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Batch extraction failed.');
        } finally {
            setExtractingIds([]);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = extractions.map(item => item.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const openCandidateModal = (candidate) => {
        setSelectedCandidate(candidate);
        setShowModal(true);
        setCvTextViewMode('ai');
    };

    const handleCopyText = async (text) => {
        if (!text) return;
        const ok = await copyToClipboard(text);
        if (ok) {
            toast.success('CV text copied to clipboard!');
        } else {
            toast.error('Failed to copy text');
        }
    };

    const cleanCandidateName = (str) => {
        if (!str) return '';
        const firstSeg = str.split(/[—\-\|:\/\n,]/)[0].trim();
        const words = firstSeg.split(/\s+/).filter(w => {
            const lw = w.toLowerCase();
            return !['software', 'developer', 'engineer', 'full-stack', 'it', 'professional', 'page', 'summary', 'curriculum', 'resume', 'cv', 'profile', 'contact', 'email', 'tel', 'phone', 'manager', 'assistant', 'executive'].includes(lw) && !/[@0-9]/.test(w);
        });
        return words.slice(0, 2).join(' ') || firstSeg.substring(0, 30);
    };

    const formatDateObj = (dateStr) => {
        if (!dateStr) return { date: 'N/A', time: '' };
        const d = new Date(dateStr);
        if (isNaN(d)) return { date: dateStr, time: '' };
        const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return { date, time };
    };

    const totalPages = Math.ceil(total / limit) || 1;

    return (
        <div className="cve-container">
            {/* Clean Header Bar */}
            <div className="cve-page-header">
                <div className="cve-header-title-area">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <div className="cve-header-tag" style={{ margin: 0 }}>
                            <FiCpu className="cve-header-tag-icon" /> AI Parsing Engine
                        </div>
                        {isSubAdmin && currentAdmin.company_name && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 10px',
                                borderRadius: '14px',
                                background: 'rgba(122, 18, 40, 0.08)',
                                color: '#7A1228',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                border: '1px solid rgba(122, 18, 40, 0.2)'
                            }}>
                                <FiBriefcase size={12} /> {currentAdmin.company_name} (Own Subsidiary)
                            </span>
                        )}
                    </div>
                    <h1>CV Extraction Manager</h1>
                    <p>
                        {isSubAdmin && currentAdmin.company_name
                            ? `Automated resume text parsing & candidate profile extraction for ${currentAdmin.company_name} vacancies`
                            : 'Automated candidate resume text parsing & profile extraction dashboard'
                        }
                    </p>
                </div>

                {/* Clean Toggle Card (Super Admin Only) */}
                {admin?.role === 'super_admin' && (
                    <div className="cve-toggle-card">
                        <div className="cve-toggle-text">
                            <span className="cve-toggle-title">Auto Extraction</span>
                            <span className={`cve-status-pill ${autoExtractionEnabled ? 'active' : 'inactive'}`}>
                                <span className="cve-status-dot"></span>
                                {autoExtractionEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <label className="cve-switch">
                            <input
                                type="checkbox"
                                checked={autoExtractionEnabled}
                                onChange={handleToggleSetting}
                                disabled={settingLoading}
                            />
                            <span className="cve-slider"></span>
                        </label>
                    </div>
                )}
            </div>

            {/* Micro KPI Stat Cards */}
            <div className="cve-stats-grid">
                <div className="cve-stat-card">
                    <div className="cve-stat-header">
                        <div className="cve-stat-icon total"><FiLayers /></div>
                        <span className="cve-stat-chip total">Applications</span>
                    </div>
                    <div className="cve-stat-body">
                        <div className="cve-stat-val">{stats.total_apps || total}</div>
                        <div className="cve-stat-lbl">Total Received</div>
                    </div>
                    <div className="cve-progress-track">
                        <div className="cve-progress-fill total" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="cve-stat-card">
                    <div className="cve-stat-header">
                        <div className="cve-stat-icon extracted"><FiCheckCircle /></div>
                        <span className="cve-stat-chip extracted">Success</span>
                    </div>
                    <div className="cve-stat-body">
                        <div className="cve-stat-val val-extracted">{stats.extracted_count || 0}</div>
                        <div className="cve-stat-lbl">Extracted Resumes</div>
                    </div>
                    <div className="cve-progress-track">
                        <div
                            className="cve-progress-fill extracted"
                            style={{ width: `${(stats.total_apps || total) > 0 ? Math.round(((stats.extracted_count || 0) / (stats.total_apps || total)) * 100) : 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="cve-stat-card">
                    <div className="cve-stat-header">
                        <div className="cve-stat-icon unextracted"><FiAlertCircle /></div>
                        <span className="cve-stat-chip unextracted">Pending</span>
                    </div>
                    <div className="cve-stat-body">
                        <div className="cve-stat-val val-unextracted">{stats.unextracted_count || 0}</div>
                        <div className="cve-stat-lbl">Unextracted Queue</div>
                    </div>
                    <div className="cve-progress-track">
                        <div
                            className="cve-progress-fill unextracted"
                            style={{ width: `${(stats.total_apps || total) > 0 ? Math.round(((stats.unextracted_count || 0) / (stats.total_apps || total)) * 100) : 0}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* CV MATCH SCORE LEGEND & TOOLTIP BAR */}
            <div className="cve-match-bar">
                {/* Left: Target Icon & Match Score Title */}
                <div className="cve-match-left-group">
                    <div className="cve-target-icon-ring">
                        <FiTarget />
                    </div>
                    <span className="cve-match-title">
                        Match Score
                    </span>
                    <div className="cve-match-divider"></div>
                </div>

                {/* Middle: 3 Color Badges */}
                <div className="cve-match-badges-group">
                    {/* High Match Badge */}
                    <div className="cve-match-badge-pill high">
                        <span className="cve-dot-indicator green"></span>
                        <span className="cve-badge-label">High</span>
                        <span className="cve-badge-range">{minHighScore}% – 100%</span>
                    </div>

                    {/* Medium Match Badge */}
                    <div className="cve-match-badge-pill medium">
                        <span className="cve-dot-indicator amber"></span>
                        <span className="cve-badge-label">Medium</span>
                        <span className="cve-badge-range">{minMediumScore}% – {minHighScore - 1}%</span>
                    </div>

                    {/* Low Match Badge */}
                    <div className="cve-match-badge-pill low">
                        <span className="cve-dot-indicator red"></span>
                        <span className="cve-badge-label">Low</span>
                        <span className="cve-badge-range">&lt; {minMediumScore}%</span>
                    </div>
                </div>

                {/* Right: How Scoring Works & Tooltip */}
                <div
                    className="cve-match-info-group"
                    onMouseEnter={() => setShowScoringTooltip(true)}
                    onMouseLeave={() => setShowScoringTooltip(false)}
                    onClick={() => setShowScoringTooltip(!showScoringTooltip)}
                >
                    <FiInfo style={{ fontSize: '1.05rem', color: '#7A1228' }} />
                    <span className="cve-match-info-link">How scoring works</span>

                    {/* Floating Tooltip Box */}
                    {showScoringTooltip && (
                        <div className="cve-tooltip-card">
                            <div className="cve-tooltip-arrow"></div>
                            Scores {minMediumScore}% or above are extracted automatically. Scores below {minMediumScore}% require manual extraction.
                        </div>
                    )}
                </div>
            </div>

            {/* Control Bar (Tabs, Search, Actions) */}
            <div className="cve-controls">
                <div className="cve-tabs">
                    <button
                        className={`cve-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('all'); setPage(1); }}
                    >
                        All Applications <span className="cve-tab-badge">{stats.total_apps || 0}</span>
                    </button>
                    <button
                        className={`cve-tab-btn ${activeTab === 'extracted' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('extracted'); setPage(1); }}
                    >
                        Extracted <span className="cve-tab-badge">{stats.extracted_count || 0}</span>
                    </button>
                    <button
                        className={`cve-tab-btn ${activeTab === 'unextracted' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('unextracted'); setPage(1); }}
                    >
                        Unextracted <span className="cve-tab-badge">{stats.unextracted_count || 0}</span>
                    </button>
                </div>

                <div className="cve-controls-right">
                    <div className="cve-search-box">
                        <FiSearch className="cve-search-icon" />
                        <input
                            type="text"
                            placeholder="Search candidate, email, position..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    {/* Job Vacancy Filter Dropdown */}
                    <div className={`cve-position-filter ${selectedVacancyId ? 'has-selected' : ''}`}>
                        <FiBriefcase className="cve-position-icon" />
                        <select
                            id="cve_vacancy_filter"
                            className="cve-position-select"
                            aria-label="Filter by Job Vacancy"
                            value={selectedVacancyId}
                            onChange={(e) => {
                                setSelectedVacancyId(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">
                                {isSubAdmin && currentAdmin.company_name
                                    ? `All ${currentAdmin.company_name} Vacancies (${vacancies.length})`
                                    : `All Job Vacancies (${vacancies.length})`
                                }
                            </option>
                            {vacancies.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.title} {v.company_name && !isSubAdmin ? `(${v.company_name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedIds.length > 0 && (
                        <button
                            className="cve-btn-primary"
                            onClick={handleBatchExtract}
                            disabled={extractingIds.length > 0}
                        >
                            <FiCpu /> Batch Extract ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Table Card */}
            <div className="cve-table-card">
                {loading ? (
                    <div className="cve-loading-state">
                        <div className="spinner"></div>
                        <p>Loading candidate extractions...</p>
                    </div>
                ) : extractions.length === 0 ? (
                    <div className="cve-empty-state">
                        <div className="cve-empty-icon"><FiFileText /></div>
                        <h3>No CV records found</h3>
                        <p>No candidate records match your current filter or search query.</p>
                    </div>
                ) : (
                    <>
                        <div className="cve-table-wrapper horizontal-drag-scroll" {...tableDragScroll}>
                            <table className="cve-table">
                                <colgroup>
                                    <col style={{ width: '4%' }} />
                                    <col style={{ width: '25%' }} />
                                    <col style={{ width: '22%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '10%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ width: '42px', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                className="cve-checkbox"
                                                checked={selectedIds.length === extractions.length && extractions.length > 0}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th>Candidate</th>
                                        <th>Target Vacancy</th>
                                        <th>CV Match</th>
                                        <th>Applied Date</th>
                                        <th>Extraction Status</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {extractions.map((item) => {
                                        const isExtracting = extractingIds.includes(item.id);
                                        const isSelected = selectedIds.includes(item.id);
                                        const initials = ((item.first_name?.[0] || '') + (item.last_name?.[0] || '')).toUpperCase() || 'CV';
                                        const dtObj = formatDateObj(item.applied_at);
                                        const matchBreakdown = getMatchBreakdown(item);
                                        const matchScore = matchBreakdown.overall;
                                        const isLowMatch = matchScore < minMediumScore;

                                        let matchClass = 'high';
                                        let tierName = 'High Match';
                                        if (isLowMatch) {
                                            matchClass = 'low';
                                            tierName = 'Low Match';
                                        } else if (matchScore < minHighScore) {
                                            matchClass = 'medium';
                                            tierName = 'Medium Match';
                                        }

                                        return (
                                            <tr key={item.id} className={`${isSelected ? 'selected-row' : ''} ${isLowMatch && item.extraction_status !== 'extracted' ? 'cve-row-low-match' : ''}`}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        className="cve-checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectOne(item.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="cve-user-info">
                                                        <div className="cve-avatar">{initials}</div>
                                                        <div className="cve-user-meta">
                                                            <div className="cve-user-name">{cleanCandidateName(item.first_name)} {cleanCandidateName(item.last_name)}</div>
                                                            <div className="cve-user-email">{item.email}</div>
                                                            {item.contact_number && <div className="cve-user-phone">{item.contact_number}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="cve-vacancy-title">{item.vacancy_title}</div>
                                                    <div className="cve-company-sub">{item.company_name}</div>
                                                </td>
                                                <td style={{ minWidth: '200px' }}>
                                                    <div className="cve-match-cell">
                                                        <span className={`cve-match-pill ${matchClass}`}>
                                                            <span className="cve-match-dot" />
                                                            <strong>{matchScore}%</strong>
                                                            <span className="cve-match-tier-text">{tierName}</span>
                                                        </span>
                                                        <div className="cve-match-breakdown-grid">
                                                            <span className="cve-micro-rate" title="Skills Match: Candidate skills against vacancy requirements">
                                                                Skills: <strong>{matchBreakdown.skills}%</strong>
                                                            </span>
                                                            <span className="cve-micro-rate" title="Experience: Relevant work history vs requirements">
                                                                Exp: <strong>{matchBreakdown.experience}%</strong>
                                                            </span>
                                                            <span className="cve-micro-rate" title="Qualifications: Degree level & specialization">
                                                                Qual: <strong>{matchBreakdown.qualification}%</strong>
                                                            </span>
                                                            <span className="cve-micro-rate" title="JD Alignment: Alignment of responsibilities with core role duties">
                                                                JD: <strong>{matchBreakdown.jdAlignment}%</strong>
                                                            </span>
                                                            <span className="cve-micro-rate cve-micro-rate-wide" title="Salary Budget: Salary expectation vs vacancy budget range">
                                                                Budget: <strong>{matchBreakdown.salary}%</strong>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <div className="cve-date-main">{dtObj.date}</div>
                                                    <div className="cve-date-sub">{dtObj.time}</div>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {((item.extraction_status === 'extracted' || item.is_manual_extracted == 1) && (!isLowMatch || item.is_manual_extracted == 1)) ? (
                                                        <span className="cve-badge extracted">
                                                            <FiCheckCircle /> Extracted {item.is_manual_extracted == 1 && <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>(Manual)</span>}
                                                        </span>
                                                    ) : (autoExtractionEnabled && isLowMatch) ? (
                                                        <span className="cve-badge disabled-low" title={`Match score is below ${minMediumScore}%. Auto-extraction skipped; manual extraction is available.`}>
                                                            <FiXCircle /> Disabled (&lt;{minMediumScore}%)
                                                        </span>
                                                    ) : (
                                                        <span className="cve-badge unextracted">
                                                            <FiAlertCircle /> Unextracted
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <div className="cve-actions" style={{ justifyContent: 'center' }}>
                                                        <button
                                                            className="cve-btn-icon view"
                                                            title="View Details"
                                                            onClick={() => openCandidateModal(item)}
                                                        >
                                                            <FiEye />
                                                        </button>
                                                        {!((item.extraction_status === 'extracted' || item.is_manual_extracted == 1) && (!isLowMatch || item.is_manual_extracted == 1)) && (
                                                            <button
                                                                className="cve-btn-icon extract"
                                                                title={isLowMatch ? `Manual Extract CV (Score < ${minMediumScore}%)` : "Extract CV Now"}
                                                                onClick={() => handleSingleExtract(item.id)}
                                                                disabled={isExtracting}
                                                                style={isLowMatch ? { borderColor: '#fca5a5', color: '#dc2626', background: '#fff5f5' } : {}}
                                                            >
                                                                {isExtracting ? (
                                                                    <FiRefreshCw className="spin-cv" />
                                                                ) : (
                                                                    <FiCpu />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <PaginationFooter
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={total}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            label="candidates"
                        />
                    </>
                )}
            </div>

            {/* Candidate Details & Extraction Inspection Modal */}
            {showModal && selectedCandidate && (
                <div className="cve-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="cve-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cve-modal-header">
                            <h2>Candidate Details & Extraction Overview</h2>
                            <button className="cve-btn-icon" onClick={() => setShowModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        <div className="cve-modal-body">
                            {(() => {
                                const modalBreakdown = getMatchBreakdown(selectedCandidate);
                                const mScore = modalBreakdown.overall;
                                const isLow = mScore < minMediumScore;
                                const { skills, parsedReport } = getNormalizedSkills(
                                    selectedCandidate.skills_metadata,
                                    selectedCandidate.tags,
                                    selectedCandidate.extracted_data,
                                    selectedCandidate,
                                    minMediumScore
                                );
                                const isMismatch = Boolean(
                                    parsedReport?.is_job_mismatch || 
                                    isLow || 
                                    modalBreakdown.mismatchReason || 
                                    parsedReport?.mismatch_reason
                                );
                                const assessmentPoints = getAssessmentPoints(isMismatch, parsedReport, selectedCandidate, modalBreakdown, minMediumScore);
                                const isExtracted = Boolean(
                                    (selectedCandidate.extraction_status === 'extracted' || 
                                     selectedCandidate.is_manual_extracted == 1 || 
                                     selectedCandidate.is_manual_extracted === '1') &&
                                    (!isLow || selectedCandidate.is_manual_extracted == 1 || selectedCandidate.is_manual_extracted === '1')
                                );
                                const candInitials = (
                                    (cleanCandidateName(selectedCandidate.first_name)?.[0] || '') +
                                    (cleanCandidateName(selectedCandidate.last_name)?.[0] || '')
                                ).toUpperCase() || 'CV';

                                return (
                                    <>
                                        {/* Clean Candidate Info & Action Header Card */}
                                        <div className="cve-candidate-modal-header-card">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                                <div className="cve-candidate-modal-avatar">
                                                    {candInitials}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                        <h3 style={{ fontSize: '1.28rem', margin: 0, color: '#0f172a', fontWeight: '800', letterSpacing: '-0.01em' }}>
                                                            {cleanCandidateName(selectedCandidate.first_name)} {cleanCandidateName(selectedCandidate.last_name)}
                                                        </h3>
                                                        {isExtracted ? (
                                                            <span className="cve-badge extracted" style={{ fontSize: '0.76rem', padding: '3px 9px', borderRadius: '8px' }}>
                                                                <FiCheckCircle size={13} /> Extracted {selectedCandidate.is_manual_extracted == 1 && <span style={{ opacity: 0.85 }}>(Manual)</span>}
                                                            </span>
                                                        ) : (
                                                            <span className="cve-badge unextracted" style={{ fontSize: '0.76rem', padding: '3px 9px', borderRadius: '8px' }}>
                                                                <FiAlertCircle size={13} /> Unextracted
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ color: '#64748b', fontSize: '0.86rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span>Applied for: <strong style={{ color: '#7A1228', fontWeight: 700 }}>{selectedCandidate.vacancy_title}</strong></span>
                                                        {selectedCandidate.company_name && (
                                                            <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>• {selectedCandidate.company_name}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {selectedCandidate.cv_path && (
                                                    <a
                                                        href={`${BACKEND_ROOT}/uploads/cv/${selectedCandidate.cv_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="cve-btn-primary"
                                                        style={{
                                                            textDecoration: 'none',
                                                            padding: '0.55rem 1.15rem',
                                                            fontSize: '0.85rem',
                                                            borderRadius: '10px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '7px',
                                                            fontWeight: 700,
                                                            boxShadow: '0 2px 8px rgba(122, 18, 40, 0.2)'
                                                        }}
                                                    >
                                                        <FiDownload size={15} /> View / Download CV
                                                    </a>
                                                )}

                                                {/* Re-extract button is HIDDEN when CV is already extracted */}
                                                {!isExtracted && (
                                                    <button
                                                        className="cve-btn-primary"
                                                        style={{
                                                            background: isLow ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                                            padding: '0.55rem 1.15rem',
                                                            fontSize: '0.85rem',
                                                            borderRadius: '10px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '7px',
                                                            fontWeight: 700,
                                                            boxShadow: isLow ? '0 2px 8px rgba(220, 38, 38, 0.25)' : '0 2px 8px rgba(37, 99, 235, 0.25)'
                                                        }}
                                                        onClick={() => handleSingleExtract(selectedCandidate.id)}
                                                        disabled={extractingIds.includes(selectedCandidate.id)}
                                                    >
                                                        <FiCpu size={15} /> {extractingIds.includes(selectedCandidate.id) ? 'Extracting...' : (isLow ? `Manual Extract CV (<${minMediumScore}%)` : 'Extract CV Now')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dual-Card Assessment Layout (Left: Pre-Extraction Assessment, Right: AI Match / Mismatch Analysis) */}
                                        <div className="cve-assessment-two-col">
                                            {/* Left Card: Pre-Extraction Assessment */}
                                            <div className="cve-assessment-card">
                                                <div className="cve-assessment-header">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <h4 className="cve-card-title">
                                                            <FiTarget style={{ color: '#7A1228', fontSize: '1.05rem', flexShrink: 0 }} /> Pre-Extraction Assessment: <span style={{ color: '#64748b', fontWeight: 600 }}>CV vs JD Match</span>
                                                        </h4>
                                                        {modalBreakdown.weights?.isCustom ? (
                                                            <span className="cve-custom-formula-badge">
                                                                ⚡ Custom Formula
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="cve-overall-score-badge">
                                                        Overall: <strong>{mScore}%</strong>
                                                    </div>
                                                </div>

                                                <div className="cve-metric-grid-5">
                                                    {/* 1. Technical Skills Match Rate (Separate) */}
                                                    <div
                                                        className="cve-metric-tile"
                                                        title={`Candidate technical skills match: ${modalBreakdown.skills}% against required competencies`}
                                                    >
                                                        <div className="cve-metric-tile-label">
                                                            <span>🛠️ Skills Match</span>
                                                            <span className="cve-metric-weight">({modalBreakdown.weights?.skills ?? 35}%)</span>
                                                        </div>
                                                        <span className={`cve-metric-score-tag ${modalBreakdown.skills >= 75 ? 'score-high' : modalBreakdown.skills >= 50 ? 'score-med' : 'score-low'}`}>
                                                            {modalBreakdown.skills}%
                                                        </span>
                                                    </div>

                                                    {/* 2. Job Description & Scope Alignment (Separate) */}
                                                    <div
                                                        className="cve-metric-tile"
                                                        title={`Candidate CV alignment with job description and duties: ${modalBreakdown.jdAlignment}%`}
                                                    >
                                                        <div className="cve-metric-tile-label">
                                                            <span>📋 JD Alignment</span>
                                                            <span className="cve-metric-weight">({modalBreakdown.weights?.jdAlignment ?? 10}%)</span>
                                                        </div>
                                                        <span className={`cve-metric-score-tag ${modalBreakdown.jdAlignment >= 75 ? 'score-high' : modalBreakdown.jdAlignment >= 50 ? 'score-med' : 'score-low'}`}>
                                                            {modalBreakdown.jdAlignment}%
                                                        </span>
                                                    </div>

                                                    {/* 3. Relevant Experience Match Rate */}
                                                    <div
                                                        className="cve-metric-tile"
                                                        title={`Relevant: ${selectedCandidate.relevant_experience || '0-1 years'} | Overall: ${selectedCandidate.overall_experience || '0-1 years'}`}
                                                    >
                                                        <div className="cve-metric-tile-label">
                                                            <span>💼 Experience</span>
                                                            <span className="cve-metric-weight">({modalBreakdown.weights?.experience ?? 30}%)</span>
                                                        </div>
                                                        <span className={`cve-metric-score-tag ${modalBreakdown.experience >= 75 ? 'score-high' : modalBreakdown.experience >= 50 ? 'score-med' : 'score-low'}`}>
                                                            {modalBreakdown.experience}%
                                                        </span>
                                                    </div>

                                                    {/* 4. Relevant Qualifications Match Rate */}
                                                    <div
                                                        className="cve-metric-tile"
                                                        title={`Candidate Qualification: ${selectedCandidate.qualification || 'Bachelors Degree'}`}
                                                    >
                                                        <div className="cve-metric-tile-label">
                                                            <span>🎓 Qualifications</span>
                                                            <span className="cve-metric-weight">({modalBreakdown.weights?.qualification ?? 20}%)</span>
                                                        </div>
                                                        <span className={`cve-metric-score-tag ${modalBreakdown.qualification >= 75 ? 'score-high' : modalBreakdown.qualification >= 50 ? 'score-med' : 'score-low'}`}>
                                                            {modalBreakdown.qualification}%
                                                        </span>
                                                    </div>

                                                    {/* 5. Salary Budget Match Rate (Full Width) */}
                                                    <div
                                                        className="cve-metric-tile cve-metric-tile-full"
                                                        title={`Salary Expectation: ${selectedCandidate.salary_expectation ? `LKR ${Number(String(selectedCandidate.salary_expectation).replace(/[^0-9.]/g, '')).toLocaleString()}` : 'Not Specified'} vs Job Budget${selectedCandidate.min_salary || selectedCandidate.max_salary ? `: LKR ${Number(selectedCandidate.min_salary || 0).toLocaleString()} - ${selectedCandidate.max_salary ? Number(selectedCandidate.max_salary).toLocaleString() : 'Uncapped'}` : ''}`}
                                                    >
                                                        <div className="cve-metric-tile-label">
                                                            <span>💵 Salary Budget Match</span>
                                                            <span className="cve-metric-weight">({modalBreakdown.weights?.salary ?? 5}%)</span>
                                                        </div>
                                                        <span className={`cve-metric-score-tag ${modalBreakdown.salary >= 75 ? 'score-high' : modalBreakdown.salary >= 50 ? 'score-med' : 'score-low'}`}>
                                                            {modalBreakdown.salary}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Card: AI Match Analysis / Mismatch Warning in Point Form */}
                                            <div className="cve-assessment-card">
                                                <div className="cve-assessment-header">
                                                    <h4 className="cve-card-title">
                                                        {isMismatch ? (
                                                            <><FiAlertTriangle style={{ color: '#dc2626', fontSize: '0.98rem', flexShrink: 0 }} /> Job Mismatch Warning</>
                                                        ) : (
                                                            <><FiCheckCircle style={{ color: '#16a34a', fontSize: '0.98rem', flexShrink: 0 }} /> Verified Job Alignment</>
                                                        )}
                                                    </h4>
                                                    <span className={isMismatch ? 'cve-pill-warning' : 'cve-pill-success'}>
                                                        {isMismatch ? 'Mismatch' : 'Verified Fit'}
                                                    </span>
                                                </div>

                                                <ul className={`cve-assessment-points-list ${isMismatch ? 'mismatch' : 'matched'}`}>
                                                    {assessmentPoints.slice(0, 3).map((rawPoint, pIdx) => {
                                                        const { label, text } = parsePointDetail(rawPoint, isMismatch, pIdx);
                                                        return (
                                                            <li key={pIdx}>
                                                                <span className="cve-bullet-icon">{isMismatch ? '!' : '✓'}</span>
                                                                <div className="cve-point-content">
                                                                    {label && (
                                                                        <span className={`cve-point-tag ${isMismatch ? 'tag-mismatch' : 'tag-matched'}`}>
                                                                            {label}
                                                                        </span>
                                                                    )}
                                                                    <span className="cve-point-text">{text}</span>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </div>

                                        {isLow && !isExtracted && (
                                            <div style={{ padding: '8px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '0.8rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FiAlertTriangle style={{ fontSize: '1.05rem', flexShrink: 0 }} />
                                                <div>
                                                    <strong>Low Match Score ({mScore}%):</strong> Auto-extraction skipped (&lt;{minMediumScore}%). You can manually extract this CV above.
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            <div className="cve-detail-grid">
                                {/* Personal Information Box */}
                                <div className="cve-assessment-card cve-detail-box">
                                    <div className="cve-assessment-header">
                                        <h4 className="cve-card-title">
                                            <FiUser style={{ color: '#7A1228', fontSize: '0.95rem' }} /> Personal Information
                                        </h4>
                                    </div>
                                    <div className="cve-field-grid">
                                        <div className="cve-field">
                                            <div className="cve-field-lbl">First Name</div>
                                            <div className="cve-field-val">{cleanCandidateName(selectedCandidate.first_name) || 'N/A'}</div>
                                        </div>
                                        <div className="cve-field">
                                            <div className="cve-field-lbl">Last Name</div>
                                            <div className="cve-field-val">{cleanCandidateName(selectedCandidate.last_name) || 'N/A'}</div>
                                        </div>
                                        <div className="cve-field">
                                            <div className="cve-field-lbl">Email Address</div>
                                            <div className="cve-field-val" style={{ wordBreak: 'break-all' }}>{selectedCandidate.email || 'N/A'}</div>
                                        </div>
                                        <div className="cve-field">
                                            <div className="cve-field-lbl">Contact Number</div>
                                            <div className="cve-field-val">{selectedCandidate.contact_number || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Profile Box */}
                                <div className="cve-assessment-card cve-detail-box">
                                    <div className="cve-assessment-header">
                                        <h4 className="cve-card-title">
                                            <FiBriefcase style={{ color: '#7A1228', fontSize: '0.95rem' }} /> Professional Profile
                                        </h4>
                                    </div>
                                    <div className="cve-field-grid">
                                        <div className="cve-field">
                                            <div className="cve-field-lbl">Highest Qualification</div>
                                            <div className="cve-field-val">{selectedCandidate.qualification || 'N/A'}</div>
                                        </div>
                                        <div className="cve-field">
                                            <div className="cve-field-lbl">Salary Expectation</div>
                                            <div className="cve-field-val">{selectedCandidate.salary_expectation ? `LKR ${Number(String(selectedCandidate.salary_expectation).replace(/[^0-9.]/g, '') || 0).toLocaleString()}` : 'Not Specified'}</div>
                                        </div>
                                        <div className="cve-field">
                                            <div className="cve-field-lbl">Overall Experience</div>
                                            <div className="cve-field-val">{selectedCandidate.overall_experience || 'N/A'}</div>
                                        </div>
                                        <div className="cve-field">
                                            <div className="cve-field-lbl">Relevant Experience</div>
                                            <div className="cve-field-val">{selectedCandidate.relevant_experience || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── CANDIDATE SKILLS & AI EVALUATION (full width) ── */}
                            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    fontSize: '0.85rem',
                                    fontWeight: '800',
                                    color: '#7A1228',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    borderBottom: '2px solid rgba(122, 18, 40, 0.15)',
                                    paddingBottom: '0.4rem',
                                    marginBottom: '1rem'
                                }}>
                                    Candidate Skills &amp; AI Recruiter Evaluation
                                </div>
                                {(() => {
                                    const mScore = calculateMatchScore(selectedCandidate);
                                    const { skills, parsedReport } = getNormalizedSkills(
                                        selectedCandidate.skills_metadata,
                                        selectedCandidate.tags,
                                        selectedCandidate.extracted_data,
                                        selectedCandidate,
                                        minMediumScore
                                    );
                                    const tabCategories = ['Relevant Skills', 'Related Skills', 'Additional Skills'];
                                    const activeSkills = skills.filter(item => item.category === activeAdminTab);

                                    return (
                                        <div className="admin-recruiter-report">
                                            <div className="admin-ai-report-header" style={{ marginBottom: '4px' }}>
                                                <div className="admin-ai-badge">
                                                    <FiCpu size={14} style={{ color: '#b45309' }} />
                                                    <span>Steuart AI Recruiter Evaluation Report</span>
                                                </div>
                                            </div>

                                            {parsedReport && parsedReport.is_unextracted && (
                                                <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '16px', padding: '24px 20px', margin: '16px 0', textAlign: 'center' }}>
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ffe4e6', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontSize: '1.4rem' }}>
                                                        <FiAlertTriangle />
                                                    </div>
                                                    <h4 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: '1.1rem', fontWeight: 800 }}>
                                                        🔒 Auto-Extraction Skipped / Disabled ({calculateMatchScore(selectedCandidate)}% Match Score)
                                                    </h4>
                                                    <p style={{ margin: '0 0 16px 0', color: '#7f1d1d', fontSize: '0.88rem', lineHeight: '1.5', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
                                                        Candidate resume text has not been auto-extracted because the match score ({calculateMatchScore(selectedCandidate)}%) is below the minimum threshold (&lt;{minMediumScore}%). Admins can manually extract this candidate using the button below.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="cve-btn-primary"
                                                        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', margin: '0 auto', display: 'inline-flex' }}
                                                        onClick={() => handleSingleExtract(selectedCandidate.id)}
                                                        disabled={extractingIds.includes(selectedCandidate.id)}
                                                    >
                                                        <FiCpu /> {extractingIds.includes(selectedCandidate.id) ? 'Extracting with AI...' : `Manual Extract CV Now (<${minMediumScore}%)`}
                                                    </button>
                                                </div>
                                            )}

                                            {parsedReport && !parsedReport.is_unextracted && parsedReport.experience_summary && (
                                                <div className="recruiter-report-summary">
                                                    <div className="report-summary-block">
                                                        <h6>Experience Summary</h6>
                                                        <p className="summary-text">{parsedReport.experience_summary}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {parsedReport && !parsedReport.is_unextracted && (
                                                (Array.isArray(parsedReport.fully_demonstrated_skills) && parsedReport.fully_demonstrated_skills.length > 0) ||
                                                (Array.isArray(parsedReport.partially_demonstrated_skills) && parsedReport.partially_demonstrated_skills.length > 0) ||
                                                (Array.isArray(parsedReport.requirements_without_evidence) && parsedReport.requirements_without_evidence.length > 0)
                                            ) && (
                                                <div className="requirements-validation-panel">
                                                    <h6>Mandatory Requirements Validation</h6>
                                                    <div className="validation-grid">
                                                        <div className="validation-col fully-supported">
                                                            <span className="col-title green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle size={12} /> Fully Demonstrated</span>
                                                            <div className="badge-list">
                                                                {Array.isArray(parsedReport.fully_demonstrated_skills) && parsedReport.fully_demonstrated_skills.length > 0 ? (
                                                                    parsedReport.fully_demonstrated_skills.map((skill, idx) => (
                                                                        <span key={idx} className="val-badge green">{skill}</span>
                                                                    ))
                                                                ) : (
                                                                    <span className="no-badge">None identified</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="validation-col partially-supported">
                                                            <span className="col-title orange" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiAlertCircle size={12} /> Partially Demonstrated</span>
                                                            <div className="badge-list">
                                                                {Array.isArray(parsedReport.partially_demonstrated_skills) && parsedReport.partially_demonstrated_skills.length > 0 ? (
                                                                    parsedReport.partially_demonstrated_skills.map((skill, idx) => (
                                                                        <span key={idx} className="val-badge orange">{skill}</span>
                                                                    ))
                                                                ) : (
                                                                    <span className="no-badge">None identified</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="validation-col missing-evidence">
                                                            <span className="col-title red" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiXCircle size={12} /> No Evidence Found</span>
                                                            <div className="badge-list">
                                                                {Array.isArray(parsedReport.requirements_without_evidence) && parsedReport.requirements_without_evidence.length > 0 ? (
                                                                    parsedReport.requirements_without_evidence.map((skill, idx) => (
                                                                        <span key={idx} className="val-badge red">{skill}</span>
                                                                    ))
                                                                ) : (
                                                                    <span className="no-badge">None identified</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {!parsedReport?.is_unextracted && (
                                                <div className="skills-analysis-matrix-block">
                                                    <div className="apb-skills-tabs">
                                                    {tabCategories.map(tabName => {
                                                        const count = skills.filter(item => item.category === tabName).length;
                                                        const emoji = tabName === 'Relevant Skills' ? '🟢' : tabName === 'Related Skills' ? '🟡' : '🔵';

                                                        return (
                                                            <button
                                                                key={tabName}
                                                                type="button"
                                                                className={`apb-tab-btn ${activeAdminTab === tabName ? 'active' : ''}`}
                                                                onClick={() => setActiveAdminTab(tabName)}
                                                            >
                                                                <span>{emoji} {tabName}</span>
                                                                <span style={{
                                                                    fontSize: '0.7rem',
                                                                    background: activeAdminTab === tabName ? 'rgba(122,18,40,0.1)' : '#f1f5f9',
                                                                    color: activeAdminTab === tabName ? '#7A1228' : '#64748b',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '100px',
                                                                    fontWeight: 800,
                                                                    marginLeft: '6px'
                                                                }}>
                                                                    {count}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {activeSkills.length > 0 ? (
                                                    <div className="admin-skills-list-grid">
                                                        {activeSkills.map((item, idx) => {
                                                            const isMand = parsedReport && (
                                                                parsedReport.fully_demonstrated_skills?.includes(item.skill) ||
                                                                parsedReport.partially_demonstrated_skills?.includes(item.skill)
                                                            );
                                                            const isVerified = item.verified !== false;
                                                            return (
                                                                <div key={idx} className={`admin-skill-card-detailed ${isMand ? 'admin-mandatory-match' : ''}`}>
                                                                    <div className="admin-skill-card-top">
                                                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                                                                            <span className="admin-skill-name-txt">
                                                                                {item.skill}
                                                                            </span>
                                                                            {isMand && (
                                                                                <span className="admin-mand-pill">Mandatory</span>
                                                                            )}
                                                                            <span className={`skill-match-status-badge ${isVerified ? (item.category === 'Additional Skills' ? 'unrelated' : 'matched') : 'unmatched'}`}>
                                                                                {isVerified ? (item.category === 'Additional Skills' ? '✓ In CV' : '✓ Verified') : '✗ Not found'}
                                                                            </span>
                                                                        </div>
                                                                        <span className="level-badge" style={{ margin: 0, textTransform: 'capitalize' }}>
                                                                            {item.experience_level}
                                                                        </span>
                                                                    </div>
                                                                    <div className="admin-skill-meta-row">
                                                                        <span className="source-txt" style={{ fontStyle: 'normal', fontWeight: 600 }}>
                                                                            via {item.evidence_source}
                                                                        </span>
                                                                    </div>
                                                                    <p className="admin-skill-context-txt">{item.context}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '20px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                                                        No skills identified under {activeAdminTab}.
                                                    </div>
                                                )}
                                            </div>
                                            )}

                                            {parsedReport && !parsedReport.is_unextracted && (
                                                (Array.isArray(parsedReport.qualifications_found) && parsedReport.qualifications_found.length > 0) ||
                                                (Array.isArray(parsedReport.certifications_found) && parsedReport.certifications_found.length > 0)
                                            ) && (
                                                <div className="credentials-validation-panel">
                                                    <h6>Credentials &amp; Additional Information</h6>
                                                    <div className="validation-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                                        <div className="validation-col">
                                                            <span className="col-title" style={{ color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px' }}><FiAward size={12} /> Qualifications Found</span>
                                                            <div className="badge-list">
                                                                {Array.isArray(parsedReport.qualifications_found) && parsedReport.qualifications_found.length > 0 ? (
                                                                    parsedReport.qualifications_found.map((qual, idx) => (
                                                                        <span key={idx} className="val-badge blue" style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>{qual}</span>
                                                                    ))
                                                                ) : (
                                                                    <span className="no-badge">None identified</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="validation-col">
                                                            <span className="col-title" style={{ color: '#0d9488', display: 'flex', alignItems: 'center', gap: '4px' }}><FiTarget size={12} /> Certifications Found</span>
                                                            <div className="badge-list">
                                                                {Array.isArray(parsedReport.certifications_found) && parsedReport.certifications_found.length > 0 ? (
                                                                    parsedReport.certifications_found.map((cert, idx) => (
                                                                        <span key={idx} className="val-badge teal" style={{ background: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' }}>{cert}</span>
                                                                    ))
                                                                ) : (
                                                                    <span className="no-badge">None identified</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Extracted CV Text Box */}
                            {(() => {
                                const isLowMatchCand = calculateMatchScore(selectedCandidate) < (selectedCandidate.min_medium_match_score || minMediumScore || 50);
                                const isManualCand = selectedCandidate.is_manual_extracted == 1 || selectedCandidate.is_manual_extracted === '1' || selectedCandidate.is_manual_extracted === true;
                                const isExtractedCand = isManualCand || (selectedCandidate.extraction_status === 'extracted' && !isLowMatchCand);

                                if (isExtractedCand) {
                                    const { skills, parsedReport } = getNormalizedSkills(
                                        selectedCandidate.skills_metadata,
                                        selectedCandidate.tags,
                                        selectedCandidate.extracted_data,
                                        selectedCandidate,
                                        minMediumScore
                                    );

                                    let extData = null;
                                    try {
                                        extData = typeof selectedCandidate.extracted_data === 'string'
                                            ? JSON.parse(selectedCandidate.extracted_data)
                                            : (selectedCandidate.extracted_data || null);
                                    } catch (e) {
                                        extData = null;
                                    }

                                    const rawCleanText = cleanDisplayCvText(selectedCandidate.cv_text || '');

                                    let aiParsedFullText = '';
                                    if (extData?.extracted_full_text && typeof extData.extracted_full_text === 'string' && extData.extracted_full_text.trim().length > 20) {
                                        aiParsedFullText = extData.extracted_full_text.trim();
                                    } else if (selectedCandidate.cv_text && 
                                               !/(?:[a-zA-Z]AM[a-zA-Z]){2,}/.test(selectedCandidate.cv_text) && 
                                               !selectedCandidate.cv_text.includes('AMACAM') && 
                                               !selectedCandidate.cv_text.includes('AMfiESENT') && 
                                               (selectedCandidate.cv_text.includes('Profile Summary:') || selectedCandidate.cv_text.includes('Education:') || selectedCandidate.cv_text.includes('SKILLS') || selectedCandidate.cv_text.includes('CONTACT'))) {
                                        aiParsedFullText = selectedCandidate.cv_text.trim();
                                    } else {
                                        aiParsedFullText = generateAiParsedCvText(selectedCandidate, skills, parsedReport, extData);
                                    }

                                    const displayedText = aiParsedFullText || rawCleanText || selectedCandidate.cv_text || 'No AI parsed text available.';

                                    return (
                                        <div className="cve-cv-text-container" style={{ marginTop: '1.5rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
                                            <div className="cve-cv-text-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                    <h3 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#7A1228', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <FiFileText size={16} /> Extracted CV Text Content
                                                    </h3>
                                                    <span style={{
                                                        fontSize: '0.74rem',
                                                        fontWeight: 700,
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                        background: 'rgba(122, 18, 40, 0.08)',
                                                        color: '#7A1228',
                                                        border: '1px solid rgba(122, 18, 40, 0.15)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        ✨ AI Parsed Text
                                                    </span>
                                                </div>
                                                <button
                                                    className="cve-btn-icon"
                                                    style={{ width: 'auto', padding: '0.35rem 0.85rem', fontSize: '0.8rem', gap: '5px' }}
                                                    onClick={() => handleCopyText(displayedText)}
                                                >
                                                    <FiCopy /> Copy AI Text
                                                </button>
                                            </div>
                                            <div 
                                                className="cve-text-box"
                                                style={{
                                                    whiteSpace: 'pre-wrap',
                                                    lineHeight: '1.65',
                                                    fontSize: '0.86rem',
                                                    color: '#1e293b',
                                                    fontFamily: 'inherit',
                                                    background: '#fcfcfd',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '10px',
                                                    padding: '16px 20px',
                                                    maxHeight: '400px',
                                                    overflowY: 'auto'
                                                }}
                                            >
                                                {displayedText}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', color: '#64748b', fontStyle: 'italic', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                        No text has been extracted for this CV yet. Click "Manual Extract CV" button above to run AI parsing.
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CvExtractionsPage;
