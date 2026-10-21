import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    FiArrowLeft, FiMapPin, FiBriefcase, FiCalendar, FiUpload,
    FiCheck, FiMenu, FiX, FiUser, FiMail, FiPhone, FiBookOpen,
    FiClock, FiFileText, FiFacebook, FiLinkedin,
    FiGlobe, FiHash, FiChevronRight, FiAlertCircle, FiTag, FiZap, FiCheckCircle,
    FiChevronDown, FiChevronUp, FiEdit2
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getVacancy, applyForJob, aiParseCv, API_BASE, getPublicPdpa } from '../services/api';

const BACKEND_ROOT = API_BASE.replace('/api', '');

const OVERALL_EXPERIENCE_OPTIONS = [
    '0 years', '0-1 years', '1-2 years',
    '3-4 years', '5-7 years', '8-10 years', '10+ years'
];
const RELEVANT_EXPERIENCE_OPTIONS = OVERALL_EXPERIENCE_OPTIONS;
const QUALIFICATION_OPTIONS = ['O/L', 'A/L', 'Diploma', 'Bachelors Degree', 'Masters Degree', 'PhD', 'Professional Certification'];

// Helper to render job description/requirements with clean bullet lists and paragraphs
const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const result = [];
    let currentList = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const isBullet = /^[•\-\*\u2022\u25E6\u2023\u2219\u25CF\u00A0]/i.test(trimmed) || /^\d+[\.\)]\s*/.test(trimmed) || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•');

        if (isBullet) {
            let content = trimmed
                .replace(/^[\s•\-\*\u2022\u25E6\u2023\u2219\u25CF\u00A0\u200B]+/, '')
                .replace(/^\d+[\.\)]\s*/, '')
                .trim();
            while (/^[•\-\*\u2022\u25E6\u2023\u2219\u25CF\u00A0\u200B]/.test(content)) {
                content = content.replace(/^[•\-\*\u2022\u25E6\u2023\u2219\u25CF\u00A0\u200B]+\s*/, '').trim();
            }
            if (content) {
                currentList.push(<li key={`li-${index}`}>{content}</li>);
            }
        } else {
            if (currentList.length > 0) {
                result.push(<ul key={`ul-${index}`} className="formatted-list">{currentList}</ul>);
                currentList = [];
            }

            if (trimmed) {
                const isHeading = (trimmed.length < 40 && (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':')));
                result.push(
                    <p key={`p-${index}`} className={isHeading ? "formatted-heading" : "formatted-paragraph"}>
                        {trimmed}
                    </p>
                );
            } else {
                result.push(<div key={`br-${index}`} className="formatted-spacer" />);
            }
        }
    });

    if (currentList.length > 0) {
        result.push(<ul key="ul-final" className="formatted-list">{currentList}</ul>);
    }

    return result;
};

const isRobustMatch = (skill, requirement) => {
    if (!skill || !requirement) return false;
    const s = skill.toLowerCase().trim();
    const r = requirement.toLowerCase().trim();

    if (s === r) return true;

    // Boundary check for word matching (avoids false matches like "Java" matching "JavaScript")
    const escapedS = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexS = new RegExp(`\\b${escapedS}\\b`, 'i');
    if (regexS.test(r)) return true;

    const escapedR = r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexR = new RegExp(`\\b${escapedR}\\b`, 'i');
    if (regexR.test(s)) return true;

    // Synonym mapping
    const synonyms = [
        ["gcp", "google cloud", "google cloud platform"],
        ["aws", "amazon web services"],
        ["azure", "microsoft azure"],
        ["ci/cd", "cicd", "continuous integration", "continuous deployment"],
        ["js", "javascript"],
        ["ts", "typescript"],
        ["kubernetes", "k8s"]
    ];
    for (const group of synonyms) {
        const hasS = group.some(term => s.includes(term) || term.includes(s));
        if (hasS) {
            const matched = group.some(term => {
                const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regexTerm = new RegExp(`\\b${escapedTerm}\\b`, 'i');
                return regexTerm.test(r);
            });
            if (matched) return true;
        }
    }

    return false;
};

const checkSkillInCvText = (skillName, cvText) => {
    if (!skillName || !cvText) return false;
    const s = skillName.toLowerCase().trim();
    const cv = cvText.toLowerCase();

    if (!s) return false;

    // Synonym mapping to check if any synonyms match in the CV text
    const synonyms = [
        ["gcp", "google cloud", "google cloud platform"],
        ["aws", "amazon web services"],
        ["azure", "microsoft azure"],
        ["ci/cd", "cicd", "continuous integration", "continuous deployment"],
        ["js", "javascript"],
        ["ts", "typescript"],
        ["kubernetes", "k8s"],
        ["hris", "human resources information system", "hr software", "hr system"],
        ["payroll", "salary processing"],
        ["epf", "etf", "epf/etf"]
    ];

    // Find if the current skill is part of a synonym group
    const matchGroup = synonyms.find(group => group.some(term => s === term || term.includes(s) || s.includes(term)));
    const searchTerms = matchGroup ? matchGroup : [s];

    // 1. Direct search with word boundary (with synonyms)
    const isDirectMatch = searchTerms.some(term => {
        const hasSpecial = /[^a-zA-Z0-9\s]/.test(term);
        if (hasSpecial) {
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Custom boundary search: not preceded or followed by alphanumeric chars
            const regex = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');
            return regex.test(cv);
        } else {
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'i');
            return regex.test(cv);
        }
    });

    if (isDirectMatch) return true;

    // 2. Soft matching for multi-word skills (e.g. "HRIS Data Management" matches if "hris" is in CV)
    // Ignore common filler words to check if key phrases are found
    const fillerWords = ['and', 'the', 'for', 'with', 'job', 'vacancy', 'management', 'administration', 'skills', 'system', 'processing', 'claims', 'relations', 'development', 'operations', 'documentation', 'engagement'];
    const words = s.split(/[\s/\-_,]+/).filter(w => w.length > 2 && !fillerWords.includes(w));

    if (words.length > 0) {
        // If all significant words are found in the CV, we consider it a match
        return words.every(word => {
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'i');
            return regex.test(cv);
        });
    }

    return false;
};

const categorizeSkill = (skillName, rawCvText, requiredSkillsList, vacancy) => {
    // First, verify if the skill is actually in the CV
    const inCv = checkSkillInCvText(skillName, rawCvText);
    if (!inCv) return null; // Discard if not in CV!

    const s = skillName.toLowerCase().trim();

    // Check if in required skills list
    const isRequired = requiredSkillsList.some(rs => isRobustMatch(skillName, rs));

    const jdText = (
        (vacancy?.title || '') + ' ' +
        (vacancy?.description || '') + ' ' +
        (vacancy?.requirements || '') + ' ' +
        (vacancy?.required_skills || '')
    ).toLowerCase();

    // Check if the skill name is explicitly mentioned in the Job Description text
    const hasJdMention = jdText.includes(s) || checkSkillInCvText(skillName, jdText);

    if (isRequired || hasJdMention) {
        return 'Relevant Skills';
    }

    // Comprehensive Domain Keywords
    const DOMAIN_KEYWORDS = {
        accounting: ['accountant', 'audit', 'tax', 'ledger', 'invoice', 'payroll', 'finance', 'reconciliation', 'budget', 'tally', 'quickbooks', 'erp', 'casl', 'aat', 'cma', 'acca', 'cfo', 'treasury', 'billing'],
        it_software: ['software', 'developer', 'engineer', 'react', 'javascript', 'node', 'php', 'mysql', 'python', 'java', 'aws', 'cloud', 'frontend', 'backend', 'fullstack', 'api', 'git', 'mobile', 'ios', 'android', 'laravel', 'c#', 'dot net', 'ui', 'ux', 'database', 'linux', 'devops', 'cybersecurity', 'networks', 'it', 'docker', 'kubernetes', 'llm', 'llms', 'ai', 'openai', 'claude', 'gemini', 'agents', 'agent'],
        sales_marketing: ['sales', 'marketing', 'branding', 'advertising', 'digital marketing', 'seo', 'social media', 'leads', 'conversions', 'customer', 'retail', 'wholesale', 'negotiation', 'promotion', 'crm', 'market research', 'revenue', 'growth', 'client', 'representative', 'merchandiser', 'brand manager', 'distribution'],
        hr_admin: ['hr', 'human resources', 'recruitment', 'hiring', 'training', 'development', 'administrative', 'office', 'receptionist', 'clerk', 'ops', 'operations', 'clerical', 'data entry', 'policy', 'employee relations', 'attendance', 'secretarial', 'compliance'],
        engineering: ['mechanical', 'electrical', 'civil', 'production', 'quality', 'qa', 'qc', 'process', 'maintenance', 'structural', 'autocad', 'blueprints', 'manufacturing', 'technician', 'workshop', 'factory', 'project management'],
        healthcare: ['medical', 'pharma', 'healthcare', 'nurse', 'doctor', 'clinic', 'hospital', 'rehab', 'medicine', 'laboratory', 'pharmaceutical', 'biotech', 'clinical'],
        hospitality: ['travel', 'tourism', 'hotel', 'resort', 'front office', 'steward', 'chef', 'guest', 'reservation', 'ticketing', 'guides', 'airline'],
        logistics: ['logistics', 'supply chain', 'warehouse', 'shipping', 'export', 'import', 'procurement', 'inventory', 'transport', 'delivery', 'fleet', 'stores', 'purchasing']
    };

    // Find the domain of the current job post
    let jobDomain = '';
    let maxMatches = 0;
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        const matches = keywords.filter(k => jdText.includes(k)).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            jobDomain = domain;
        }
    }

    // Check if the skill matches the job's domain
    if (jobDomain && DOMAIN_KEYWORDS[jobDomain]) {
        const isRelated = DOMAIN_KEYWORDS[jobDomain].some(keyword => {
            const hasSpecial = /[^a-zA-Z0-9\s]/.test(keyword);
            if (hasSpecial) {
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');
                return regex.test(s);
            } else {
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escaped}\\b`, 'i');
                return regex.test(s) || s.includes(keyword);
            }
        });
        if (isRelated) {
            return 'Related Skills';
        }
    }

    return 'Additional Skills';
};

const normalizeSkills = (skills) => {
    if (!Array.isArray(skills)) return [];
    const seen = new Set();
    return skills
        .map(item => {
            if (!item || !item.skill) return null;
            const cleanSkill = item.skill.trim();
            if (!cleanSkill) return null;

            let cleanCategory = item.category;
            if (cleanCategory !== 'Relevant Skills' && cleanCategory !== 'Related Skills') {
                cleanCategory = 'Additional Skills';
            }

            return {
                ...item,
                skill: cleanSkill,
                category: cleanCategory,
                context: (item.context || item.usage_context || '').trim() || 'No usage context provided.'
            };
        })
        .filter(item => {
            if (!item) return false;
            const lowerSkill = item.skill.toLowerCase();
            if (seen.has(lowerSkill)) return false;
            seen.add(lowerSkill);
            return true;
        });
};

function ApplyPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vacancy, setVacancy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [showPdpaModal, setShowPdpaModal] = useState(false);
    const [pdpaConfig, setPdpaConfig] = useState({
        pdpa_title: 'Personal Data Protection Act (PDPA) Compliance',
        pdpa_description: 'In accordance with the Personal Data Protection Act (PDPA), we require your explicit consent to store, process, and retain your CV and personal information for future job openings.',
        pdpa_purpose: 'Your details will be accessed by our HR team to match you with suitable future career opportunities.',
        pdpa_retention: 'If consented, your data will be securely stored in our Talent Pool for a maximum duration of 1 year.',
        pdpa_security: 'All personal data is processed under strict confidentiality and industry-standard security measures.',
        pdpa_rights: 'You can withdraw your consent at any time by contacting our HR department.'
    });

    useEffect(() => {
        const fetchPdpa = async () => {
            try {
                const response = await getPublicPdpa();
                const pdpaData = response.data?.data || response.data;
                if (pdpaData) {
                    setPdpaConfig(pdpaData);
                }
            } catch (err) {
                console.error("Failed to fetch PDPA guidelines:", err);
            }
        };
        fetchPdpa();
    }, []);

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', contact_number: '',
        overall_experience: '', relevant_experience: '', qualification: '',
        salary_expectation: '', cv: null, future_consent: null
    });
    const [touched, setTouched] = useState({ email: false, contact_number: false });
    const [fieldErrors, setFieldErrors] = useState({ email: '', contact_number: '' });

    // Validation helpers for Email and Contact Number
    const validateEmail = (email) => {
        if (!email || !email.trim()) return "Email address is required.";
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) return "Please enter a valid email address (e.g. name@example.com).";
        return "";
    };

    const validateContactNumber = (phone) => {
        if (!phone || !phone.trim()) return "Contact number is required.";
        const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
        if (!/^\+?\d+$/.test(cleanPhone)) {
            return "Contact number can only contain digits, spaces, and optional +.";
        }
        if (cleanPhone.startsWith('+94') || cleanPhone.startsWith('94') || cleanPhone.startsWith('0')) {
            let digitsOnly = cleanPhone.startsWith('+94') ? cleanPhone.substring(3) : (cleanPhone.startsWith('94') ? cleanPhone.substring(2) : cleanPhone.substring(1));
            if (digitsOnly.length !== 9) {
                return "Sri Lankan contact number must have 9 digits (e.g. 077 123 4567 or +94 77 123 4567).";
            }
        } else {
            const digitsCount = cleanPhone.replace(/\+/g, '').length;
            if (digitsCount < 9 || digitsCount > 15) {
                return "Please enter a valid contact number (9 to 15 digits).";
            }
        }
        return "";
    };

    const [matchedSkills, setMatchedSkills] = useState([]); // skills auto-detected from CV
    const [userSkills, setUserSkills] = useState([]); // candidate general skills (editable/manual)
    const [skillsMetadata, setSkillsMetadata] = useState([]); // structured skills metadata with experience/context/category
    const [aiAnalysis, setAiAnalysis] = useState(null); // full recruiter analysis payload
    const [rawCvText, setRawCvText] = useState('');
    const [editingSkillName, setEditingSkillName] = useState(null);
    const [editingSkillValue, setEditingSkillValue] = useState('');
    const [newSkillName, setNewSkillName] = useState('');
    const [skillsPanelExpanded, setSkillsPanelExpanded] = useState(false);
    const [reviewSkillsExpanded, setReviewSkillsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('Relevant Skills');
    const [activeReviewTab, setActiveReviewTab] = useState('Relevant Skills');

    useEffect(() => {
        const fetchVacancy = async () => {
            try {
                const response = await getVacancy(id);
                const vacancyData = response.data?.data || response.data;
                if (vacancyData) { setVacancy(vacancyData); }
                else { toast.error('Vacancy not found.'); navigate('/vacancies'); }
            } catch { toast.error('Failed to load vacancy.'); navigate('/vacancies'); }
            finally { setLoading(false); }
        };
        fetchVacancy();
    }, [id, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (name === 'email' && touched.email) {
            setFieldErrors(prev => ({ ...prev, email: validateEmail(value) }));
        }
        if (name === 'contact_number' && touched.contact_number) {
            setFieldErrors(prev => ({ ...prev, contact_number: validateContactNumber(value) }));
        }
    };

    const requiredSkillsList = vacancy?.required_skills
        ? vacancy.required_skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const [parsing, setParsing] = useState(false);
    const [parsingProgress, setParsingProgress] = useState(0);
    const [isAiRefining, setIsAiRefining] = useState(false);
    const [aiVerified, setAiVerified] = useState(false);

    useEffect(() => {
        console.log("George Steuart AI PDFJS Integration Status:", !!window.pdfjsLib);
    }, []);

    const deSpaceSpacedOutText = (str) => {
        if (!str || typeof str !== 'string') return '';
        const trimmed = str.trim();
        const tokens = trimmed.split(/\s+/).filter(Boolean);
        if (tokens.length < 3) return trimmed;

        const singleLetterTokens = tokens.filter(t => t.length === 1 && /[a-zA-Z]/.test(t));
        if (singleLetterTokens.length / tokens.length < 0.6) {
            return trimmed;
        }

        // Insert word break where a lowercase letter is followed by an uppercase letter (e.g. 'a W')
        let s = trimmed.replace(/([a-z])\s+([A-Z])/g, '$1   $2');

        // Split on 2+ spaces as word boundaries
        if (/[ \t]{2,}/.test(s)) {
            const parts = s.split(/[ \t]{2,}/).map(p => p.replace(/\s+/g, '')).filter(Boolean);
            if (parts.length >= 1) {
                return parts.join(' ');
            }
        }

        // If purely 1-space separated throughout:
        let words = [];
        let currentWord = '';
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.length === 1 && /[a-zA-Z]/.test(t)) {
                if (currentWord.length > 0 && /[A-Z]/.test(t) && /[a-z]/.test(currentWord[currentWord.length - 1])) {
                    words.push(currentWord);
                    currentWord = t;
                } else {
                    currentWord += t;
                }
            } else {
                if (currentWord) {
                    words.push(currentWord);
                    currentWord = '';
                }
                words.push(t);
            }
        }
        if (currentWord) words.push(currentWord);
        return words.join(' ');
    };

    const extractTextFromPdf = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target.result);
                    const pdfjsLib = window.pdfjsLib;
                    if (!pdfjsLib) {
                        reject(new Error("PDFJS library not loaded yet. Please wait."));
                        return;
                    }
                    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    let fullText = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        let lastY = null;
                        let pageLines = [];
                        let currentLine = "";

                        for (const item of textContent.items) {
                            const y = item.transform ? item.transform[5] : null;
                            if (lastY !== null && y !== null && Math.abs(lastY - y) > 4) {
                                if (currentLine.trim()) pageLines.push(deSpaceSpacedOutText(currentLine.trim()));
                                currentLine = item.str;
                            } else {
                                currentLine += (currentLine ? " " : "") + item.str;
                            }
                            if (y !== null) lastY = y;
                            if (item.hasEOL) {
                                if (currentLine.trim()) pageLines.push(deSpaceSpacedOutText(currentLine.trim()));
                                currentLine = "";
                                lastY = null;
                            }
                        }
                        if (currentLine.trim()) pageLines.push(deSpaceSpacedOutText(currentLine.trim()));
                        fullText += pageLines.join("\n") + "\n";
                    }
                    resolve(fullText);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    };

    const extractPhoneNumberFromText = (text) => {
        if (!text) return '';

        // Flexible Sri Lankan phone regex matching (+94) 076-37 77 834, +94 77 123 4567, 077-1234567, 011-2089919
        const slRegex = /(?:\(?\+94\)?[\s\-\.]*\(?0?\)?)?[\s\-\.]*\(?0?(?:7[0-9]|11|[2-9][0-9])\)?(?:[\s\-\.]*\d){7,8}/g;

        // 1. Check for phone number in CONTACT section first
        const contactSectionMatch = text.match(/(?:^|\n)\s*(?:CONTACT|CONTACT\s+INFORMATION|CONTACT\s+DETAILS)\s*[:\-]?\s*\n?([\s\S]{1,400})/i);
        if (contactSectionMatch) {
            const contactSnippet = contactSectionMatch[1].split(/(?:^|\n)\s*(?:SKILLS|LANGUAGES|EDUCATION|EXPERIENCE|PROFILE|REFERENCE|REFEREES)\b/i)[0];
            const slInContact = contactSnippet.match(slRegex);
            if (slInContact && slInContact.length > 0) {
                for (const p of slInContact) {
                    const cleanDigits = p.replace(/\D/g, '').replace(/^940/, '94');
                    if (cleanDigits.length >= 9 && cleanDigits.length <= 12) {
                        return p.trim();
                    }
                }
            }
        }

        // 2. Exclude REFERENCES / REFEREES section so referee contacts are NEVER extracted as candidate phone
        const textWithoutRefs = text.split(/(?:^|\n)\s*(?:REFERENCES|REFERENCE|REFEREES)\b/i)[0] || text;
        const lines = textWithoutRefs.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const headerLines = lines.slice(0, 45).join('\n');

        // 3. High-priority: Candidate header Sri Lankan mobile/landline
        const slMatchesHeader = headerLines.match(slRegex);
        if (slMatchesHeader && slMatchesHeader.length > 0) {
            for (const m of slMatchesHeader) {
                const cleanDigits = m.replace(/\D/g, '').replace(/^940/, '94');
                if (cleanDigits.length >= 9 && cleanDigits.length <= 12) {
                    return m.trim();
                }
            }
        }

        // 4. Check for labeled phone number
        const labeled = textWithoutRefs.match(/(?:phone|tel|mobile|contact|cell)(?:\s*(?:no|number|#)?)?\s*[:\-]?\s*(\(?\+?[0-9]{1,4}\)?[\s\-\.]*\(?[0-9]{1,4}\)?[\s\-\.]*[0-9]{2,4}[\s\-\.]*[0-9]{3,4})/i);
        if (labeled) {
            const raw = labeled[1].trim();
            const digits = raw.replace(/\D/g, '').replace(/^940/, '94');
            if (digits.length >= 9 && digits.length <= 15 && !/(?:student|index|id|reg|cert)/i.test(labeled[0])) {
                return raw;
            }
        }

        // 5. Any Sri Lankan mobile/landline in non-reference text
        const slMatches = textWithoutRefs.match(slRegex);
        if (slMatches && slMatches.length > 0) {
            for (const m of slMatches) {
                const cleanDigits = m.replace(/\D/g, '').replace(/^940/, '94');
                if (cleanDigits.length >= 9 && cleanDigits.length <= 12) {
                    return m.trim();
                }
            }
        }

        // 6. International format (+...)
        const intlMatches = textWithoutRefs.match(/\+\d{1,4}[\s\-\.]*\(?\d{2,4}\)?[\s\-\.]*\d{3,4}[\s\-\.]*\d{3,4}/g);
        if (intlMatches && intlMatches.length > 0) {
            for (const m of intlMatches) {
                const digits = m.replace(/\D/g, '');
                if (digits.length >= 9 && digits.length <= 15) return m.trim();
            }
        }

        return '';
    };

    const deriveNameFromEmailAndFilename = (email, fileName) => {
        if (!email && !fileName) return { firstName: '', lastName: '' };

        const toTitleCase = (w) => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';

        const stopPrefixWords = new Set([
            'cv', 'resume', 'pdf', 'doc', 'docx', 'new', 'final', 'latest', 'updated', 'draft',
            'it', 'assistant', 'associate', 'developer', 'engineer', 'trainee', 'intern', 'manager', 'specialist'
        ]);

        let cleanFn = (fileName || '')
            .replace(/\.(?:pdf|docx?|txt)$/gi, '')
            .replace(/\.(?:pdf|docx?|txt)$/gi, '')
            .replace(/[_]/g, ' ')
            .replace(/[-]/g, ' ')
            .replace(/[0-9]/g, ' ')
            .trim();

        const fnParts = cleanFn.split(/\s+/).filter(Boolean);
        const validFnWords = [];
        for (const part of fnParts) {
            let p = part.toLowerCase();
            for (const stop of stopPrefixWords) {
                if (p.startsWith(stop) && p.length > stop.length) {
                    p = p.slice(stop.length);
                }
            }
            p = p.replace(/[^a-z]/g, '');
            if (p.length >= 3 && !stopPrefixWords.has(p)) {
                validFnWords.push(p);
            }
        }

        const emailRaw = (email || '').split('@')[0].toLowerCase();
        
        // Explicit email separators
        const emailParts = emailRaw.split(/[._\-]/).filter(p => {
            const c = p.replace(/[^a-z]/g, '');
            return c.length >= 2;
        });

        if (emailParts.length >= 2) {
            const f = emailParts[0].replace(/[^a-z]/g, '');
            const l = emailParts.slice(1).map(p => p.replace(/[^a-z]/g, '')).join(' ');
            if (f.length >= 2 && l.length >= 2) {
                return { firstName: toTitleCase(f), lastName: toTitleCase(l) };
            }
        }

        const emailAlpha = emailRaw.replace(/[^a-z]/g, '');

        // Match filename word with email prefix
        for (const fnW of validFnWords) {
            if (emailAlpha.startsWith(fnW) && emailAlpha.length > fnW.length + 2) {
                let remainder = emailAlpha.slice(fnW.length).replace(/[0-9x]+$/i, '');
                if (remainder.length >= 2) {
                    return { firstName: toTitleCase(fnW), lastName: toTitleCase(remainder) };
                }
            }
        }

        // Multiple valid words in filename
        if (validFnWords.length >= 2) {
            return { firstName: toTitleCase(validFnWords[0]), lastName: validFnWords.slice(1).map(toTitleCase).join(' ') };
        }

        // Common Sri Lankan & International name splitting in emailAlpha
        const commonNames = [
            'tharusha', 'dusantha', 'waruna', 'ravindu', 'keshan', 'nethmini', 'kasun', 'ashan', 'kavindi',
            'chamath', 'dinuka', 'sahan', 'isuru', 'chathura', 'lahiru', 'pramod', 'malith', 'sachin', 'nuwan',
            'supun', 'kamal', 'nimal', 'sunil', 'dilshan', 'yasiru', 'mihiranga', 'sampath', 'akalanka',
            'hasanga', 'wijesinghe', 'bandara', 'perera', 'silva', 'fernando', 'jayasinghe', 'wickramasinghe',
            'senanayake', 'herath', 'gunasekara', 'ratnayake', 'imesh', 'umesh', 'janith', 'nadun', 'nadumi',
            'shehan', 'praneeth', 'praveen', 'anuradha', 'dhanushka', 'chathuranga', 'tharindu', 'sandun'
        ];

        for (const cn of commonNames) {
            if (emailAlpha.startsWith(cn) && emailAlpha.length >= cn.length + 3) {
                let rem = emailAlpha.slice(cn.length).replace(/[0-9x]+$/i, '');
                if (rem.length >= 2) {
                    return { firstName: toTitleCase(cn), lastName: toTitleCase(rem) };
                }
            }
        }

        if (validFnWords.length === 1) {
            return { firstName: toTitleCase(validFnWords[0]), lastName: '' };
        }

        if (emailAlpha.length >= 3) {
            return { firstName: toTitleCase(emailAlpha), lastName: '' };
        }

        return { firstName: '', lastName: '' };
    };

    const fastExtractProfileFromText = (text, fileName = '') => {
        if (!text && !fileName) return {};

        // 1. Unwrap emails wrapped across lines (e.g. "warunaakalank0103@gmail.\ncom")
        const cleanText = (text || '')
            .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.)\s*\r?\n\s*([a-zA-Z]{2,6})\b/g, '$1$2')
            .replace(/([a-zA-Z0-9._%+-]+@)\s*\r?\n\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})\b/g, '$1$2');

        // 2. Extract Email (Prioritize candidate personal webmail or pre-referee email)
        const allEmails = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        let email = '';
        for (const em of allEmails) {
            const lowerEm = em.toLowerCase();
            if (lowerEm.includes('gmail') || lowerEm.includes('yahoo') || lowerEm.includes('outlook') || lowerEm.includes('hotmail') || lowerEm.includes('icloud')) {
                email = em;
                break;
            }
        }
        if (!email && allEmails.length > 0) email = allEmails[0];

        const contact_number = extractPhoneNumberFromText(cleanText);

        let first_name = '';
        let last_name = '';

        const stopWords = new Set([
            // Core CV Headings & Form Labels
            'software', 'developer', 'engineer', 'engineering', 'full-stack', 'fullstack', 'frontend', 'backend',
            'it', 'professional', 'page', 'summary', 'curriculum', 'curriculam', 'vitae', 'resume', 'cv',
            'profile', 'contact', 'contacts', 'email', 'tel', 'phone', 'telephone', 'mobile', 'address',
            'career', 'objective', 'education', 'skills', 'skill', 'experience', 'projects', 'project', 'work',
            'personal', 'details', 'information', 'bio', 'data', 'biodata', 'declaration', 'references', 'reference',
            'referees', 'referee', 'additional', 'qualifications', 'qualification', 'examination', 'school', 'attended',
            'academic', 'background', 'activities', 'activity', 'sports', 'competencies', 'birth', 'date', 'signature',
            'particulars', 'furnished', 'knowledge', 'hereby', 'declare', 'true', 'correct', 'best',
            'gender', 'civil', 'status', 'religion', 'nationality', 'district', 'male', 'female', 'single', 'married',
            'buddhist', 'christian', 'hindu', 'islam', 'sri', 'lankan', 'about', 'me',

            // Job Roles & Titles
            'manager', 'assistant', 'executive', 'officer', 'lead', 'leader', 'director', 'intern', 'trainee',
            'associate', 'admin', 'administrator', 'administration', 'accountant', 'finance', 'hr', 'sales',
            'business', 'development', 'designer', 'analyst', 'consultant', 'specialist', 'head', 'coordinator',
            'lecturer', 'professor', 'instructor', 'teacher', 'supervisor', 'senior', 'junior', 'fresher',
            'graduate', 'student', 'undergraduate', 'postgraduate',

            // IT & Technical Operations & Infrastructure (Prevents "Server Configuration", "Diagnosing System Issues")
            'server', 'servers', 'configuration', 'configure', 'configured', 'diagnosing', 'diagnosis', 'diagnostic',
            'system', 'systems', 'issues', 'issue', 'network', 'networking', 'networks', 'support', 'operations',
            'infrastructure', 'database', 'databases', 'hardware', 'cloud', 'architecture', 'architectures',
            'deployment', 'deploy', 'monitoring', 'security', 'troubleshooting', 'troubleshoot', 'maintenance',
            'maintain', 'installation', 'install', 'integration', 'integrate', 'analysis', 'testing', 'tester',
            'applications', 'application', 'storage', 'services', 'service', 'computing', 'orchestration',
            'optimization', 'optimize', 'migration', 'migrate', 'automation', 'automate', 'incident', 'handling',
            'backup', 'recovery', 'routing', 'switching', 'firewall', 'firewalls', 'protocol', 'protocols',
            'framework', 'tools', 'technologies', 'technical', 'exposure', 'languages', 'language',

            // Institutes & Corporate Suffixes
            'university', 'institute', 'faculty', 'department', 'campus', 'college', 'school', 'academy',
            'company', 'pvt', 'ltd', 'limited', 'inc', 'corp', 'authority', 'ministry', 'board', 'council',
            'centre', 'center', 'division', 'group', 'solutions', 'technologies', 'enterprises',

            // General Soft Skills & Resume Buzzwords
            'dynamic', 'seeking', 'role', 'enthusiastic', 'passionate', 'experienced', 'motivated', 'results',
            'driven', 'dedicated', 'hardworking', 'proven', 'track', 'record', 'looking', 'opportunity',
            'relations', 'teamwork', 'communication', 'thinking', 'solving', 'creativity', 'creative',
            'document', 'documentation', 'equipment', 'marine', 'environment', 'protection', 'national',
            'english', 'sinhala', 'tamil', 'fluent', 'intermediate', 'basic', 'native'
        ]);

        const toTitleCase = (w) => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';

        // Clean filename words for matching
        let cleanFn = (fileName || '')
            .replace(/\.(?:pdf|docx?|txt)$/gi, '')
            .replace(/\.(?:pdf|docx?|txt)$/gi, '')
            .replace(/[_]/g, ' ')
            .replace(/[-]/g, ' ')
            .replace(/\b(new|final|latest|updated|draft|pdf|doc|docx|cv|resume)\b/gi, '')
            .trim();
        const fnWords = cleanFn.split(/\s+/).filter(w => {
            const c = w.replace(/[^a-zA-Z]/g, '');
            return c.length >= 2 && !stopWords.has(c.toLowerCase());
        });

        if (cleanText) {
            const lines = cleanText.split(/\r?\n/).map(l => deSpaceSpacedOutText(l.trim())).filter(Boolean);

            // ── PRIORITY 1: Explicit labeled name field (e.g. "Name in full : Namadewa Vithanage Keshan Hasanga")
            for (const line of lines) {
                const m = line.match(/^(?:[•\-\*\s◦\.]*)?(?:name\s+in\s+full|full\s+name|name\s+with\s+initials|applicant(?:\'s)?\s+name|candidate\s+name|candidate)\s*[:\-]\s*([a-zA-Z\s\.\-]{3,60})$/i);
                if (m) {
                    const nameStr = m[1].trim()
                        .replace(/\b[A-Za-z]\b\.?/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();

                    const words = nameStr.split(/\s+/).filter(w => {
                        const c = w.replace(/[^a-zA-Z]/g, '');
                        return c.length >= 2 && !stopWords.has(c.toLowerCase());
                    });

                    if (words.length >= 2) {
                        if (fnWords.length >= 2) {
                            const fnLower = fnWords.map(w => w.toLowerCase());
                            const matchedFn = words.filter(w => fnLower.includes(w.toLowerCase()));
                            if (matchedFn.length >= 2) {
                                first_name = toTitleCase(matchedFn[0]);
                                last_name = matchedFn.slice(1).map(toTitleCase).join(' ');
                                break;
                            }
                        }
                        if (words.length >= 4) {
                            first_name = toTitleCase(words[words.length - 2]);
                            last_name = toTitleCase(words[words.length - 1]);
                        } else if (words.length === 3) {
                            first_name = toTitleCase(words[0]);
                            last_name = words.slice(1).map(toTitleCase).join(' ');
                        } else {
                            first_name = toTitleCase(words[0]);
                            last_name = toTitleCase(words[1]);
                        }
                        break;
                    }
                }
            }

            // ── PRIORITY 2: High-confidence verified line search across lines 0 to 50 (MUST have score >= 50!)
            if (!first_name) {
                const emailPrefix = (email || '').split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
                const lowerFn = cleanFn.toLowerCase();
                const candidates = [];

                for (let i = 0; i < Math.min(lines.length, 50); i++) {
                    const line = lines[i];
                    if (/[@0-9]/.test(line) || /https?:\/\//i.test(line)) continue;

                    let clean = line.replace(/^[•\-\*\s◦\.]+/g, '').trim();
                    clean = clean.split(/\s*[\u2013\u2014—–|:\/\n,]\s*|\s+-\s+/)[0].trim();
                    clean = clean.replace(/^(?:[A-Za-z]\.\s*)+/g, '').trim();

                    const rawWords = clean.split(/\s+/).filter(Boolean);
                    // Name MUST be between 2 and 4 words — NEVER single words!
                    if (rawWords.length < 2 || rawWords.length > 4) continue;
                    if (rawWords.some(w => stopWords.has(w.toLowerCase().replace(/[^a-z]/g, '')))) continue;
                    if (!rawWords.every(w => /^[a-zA-Z\s\.\-]{2,}$/.test(w))) continue;

                    let score = 10;
                    // Email prefix match gives massive boost
                    const matchedEmailWords = rawWords.filter(w => {
                        const cleanW = w.toLowerCase().replace(/[^a-z]/g, '');
                        return cleanW.length >= 3 && emailPrefix.includes(cleanW);
                    });
                    if (matchedEmailWords.length > 0) score += 100 * matchedEmailWords.length;

                    // Filename match gives high boost
                    const matchedFnWords = rawWords.filter(w => {
                        const cleanW = w.toLowerCase().replace(/[^a-z]/g, '');
                        return cleanW.length >= 3 && lowerFn.includes(cleanW);
                    });
                    if (matchedFnWords.length > 0) score += 80 * matchedFnWords.length;

                    // Adjacency to major headers
                    const prevLine = i > 0 ? lines[i - 1] : '';
                    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
                    if (/^(?:CURRICULUM|RESUME|CV|PROFILE|SUMMARY|WORK|EDUCATION|CONTACT|ABOUT)\b/i.test(prevLine) ||
                        /^(?:CURRICULUM|RESUME|CV|PROFILE|SUMMARY|WORK|EDUCATION|CONTACT|ABOUT)\b/i.test(nextLine)) {
                        score += 30;
                    }

                    if (clean === clean.toUpperCase()) score += 15;

                    // Only accept lines that have high identity confidence (score >= 50)
                    if (score >= 50) {
                        candidates.push({ name: clean, words: rawWords, score });
                    }
                }

                candidates.sort((a, b) => b.score - a.score);
                if (candidates.length > 0) {
                    first_name = toTitleCase(candidates[0].words[0]);
                    last_name = candidates[0].words.slice(1).map(toTitleCase).join(' ');
                }
            }

            // ── PRIORITY 3: Derive from email and filename (Guarantees candidates get real names when header is image/graphic/styled!)
            if (!first_name || !last_name) {
                const derived = deriveNameFromEmailAndFilename(email, fileName);
                if (derived.firstName && derived.lastName) {
                    first_name = derived.firstName;
                    last_name = derived.lastName;
                } else if (derived.firstName && !first_name) {
                    first_name = derived.firstName;
                    if (derived.lastName) last_name = derived.lastName;
                }
            }

            // ── PRIORITY 4: Bottom declaration/signature line (only for full CVs)
            if (!first_name && lines.length >= 15) {
                const lastLines = lines.slice(-8);
                for (const l of lastLines) {
                    if (/[@0-9]/.test(l) || /https?:\/\//i.test(l) || /^(?:date|place|signature|declared|address)\b/i.test(l.trim())) continue;
                    const clean = l.replace(/^[•\-\*\s◦\.]+/g, '').replace(/[\.…]+.*$/, '').replace(/[,]/g, ' ').trim();
                    const words = clean.split(/\s+/).filter(w => {
                        const c = w.replace(/[^a-zA-Z]/g, '');
                        return c.length >= 2 && !stopWords.has(c.toLowerCase());
                    });
                    if (words.length >= 2 && words.length <= 3) {
                        first_name = toTitleCase(words[0].replace(/[^a-zA-Z]/g, ''));
                        last_name = words.slice(1).map(w => toTitleCase(w.replace(/[^a-zA-Z]/g, ''))).join(' ');
                        break;
                    }
                }
            }

            // ── PRIORITY 5: Check for explicit LinkedIn profile name
            if (!first_name) {
                const linkedInMatch = cleanText.match(/linkedin\s*[—\-\|:]\s*([a-zA-Z\s]{3,40})/i);
                if (linkedInMatch) {
                    const lWords = linkedInMatch[1].trim().split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w.toLowerCase()));
                    if (lWords.length >= 2) {
                        first_name = toTitleCase(lWords[0]);
                        last_name = lWords.slice(1, 3).map(toTitleCase).join(' ');
                    }
                }
            }
        }

        // ── PRIORITY 6: Filename fallback
        if ((!first_name || !last_name) && fnWords.length >= 2) {
            first_name = toTitleCase(fnWords[0]);
            last_name = fnWords.slice(1).map(toTitleCase).join(' ');
        } else if (!first_name && fnWords.length === 1) {
            first_name = toTitleCase(fnWords[0]);
        }

        // ── PRIORITY 7: Email prefix fallback
        if ((!first_name || first_name.length <= 1) && email) {
            const emailPrefix = email.split('@')[0].replace(/[0-9_.-]/g, '');
            if (emailPrefix.length >= 4) {
                first_name = toTitleCase(emailPrefix);
            }
        }

        // ── QUALIFICATION EXTRACTION (Strict Academic Hierarchy)
        let qualification = '';
        if (text) {
            // CRITICAL: Exclude REFERENCES section first so referee degrees (e.g. Dr., PhD, Lecturer) are NEVER extracted!
            const textWithoutRefs = text.split(/(?:^|\n)\s*(?:REFERENCES|REFERENCE|REFEREES|REFEREE)\b/im)[0] || text;

            // 1. Locate the EDUCATION section specifically
            const eduSectionMatch = textWithoutRefs.split(/(?:^|\n)\s*(?:EDUCATION|EDUCATIONAL\s+QUALIFICATIONS|ACADEMIC\s+QUALIFICATIONS|ACADEMIC\s+BACKGROUND|EDUCATION\s*&\s*QUALIFICATIONS|HIGHER\s+EDUCATION|EDUCATION\s+AND\s+TRAINING)\s*(?:\n|$|:)/im);
            let eduText = '';
            if (eduSectionMatch.length > 1) {
                const afterEdu = eduSectionMatch[1];
                eduText = afterEdu.split(/(?:^|\n)\s*(?:WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EXPERIENCE|EMPLOYMENT|TECHNICAL\s+EXPOSURE|TECHNICAL\s+SKILLS|SKILLS|PROJECTS|RESEARCH|ACHIEVEMENTS|CERTIFICATIONS|CERTIFICATES|PERSONALITY|LANGUAGES|REFERENCES|DECLARATION)\b/im)[0];
            }

            const evalQual = (targetText) => {
                if (!targetText) return null;

                // Clean out non-academic "master" false-positives
                const cleanForMaster = targetText.replace(/\b(?:maze\s+master|scrum\s+master|task\s*master|webmaster|toastmaster|master\s+card|master\s+class|mastered)\b/gi, '');

                const isPhD = /\b(?:ph\.?d|doctorate|doctor\s+of\s+philosophy|d\.?phil)\s+(?:in|of|holder|degree|graduate)\b/i.test(targetText) ||
                              /\b(?:candidate|pursuing|reading\s+for|completed)\s+(?:ph\.?d|doctorate)\b/i.test(targetText);

                // Masters: MUST have academic context (degree, of, in, or specific acronyms like MSc, MBA, MEng, MPhil)
                const isMaster = (
                    /\bmasters?\s+(?:degree|of\s+[a-z]+|in\s+[a-z]+)/i.test(cleanForMaster) ||
                    /\b(?:m\.?sc|m\.?b\.?a|m\.?phil|m\.?tech|m\.?eng|m\.?com|ll\.?m|postgraduate\s+degree|postgraduate\s+diploma)\b/i.test(cleanForMaster) ||
                    /\bmaster(?:'s)?\s+degree\b/i.test(cleanForMaster)
                );

                // Bachelors: BSc, BEng, BTech, BBA, BCom, BIT, BICT, BA, BCA, LLB, Undergraduate degree
                const isBachelor = (
                    /\bbachelors?\s+(?:degree|of\s+[a-z]+|in\s+[a-z]+)/i.test(targetText) ||
                    /\b(?:b\.?sc|b\.?eng|beng|b\.?tech|btech|b\.?b\.?a|bba|b\.?com|bcom|b\.?i\.?t|bit|b\.?i\.?c\.?t|bict|b\.?a|b\.?c\.?a|bca|ll\.?b)\b(?:\s*\(hons\))?/i.test(targetText) ||
                    /\bundergraduate\s+degree\b/i.test(targetText) ||
                    /\b(?:bachelor|b\.?sc|b\.?eng|b\.?tech|b\.?a)\s*\(\s*hons\s*\)/i.test(targetText)
                );

                // Diploma: Higher National Diploma, HND, National Diploma, Diploma, NVQ Level 4/5/6
                const isDiploma = (
                    /\b(?:higher\s+national\s+diploma|hnd)\b/i.test(targetText) ||
                    /(?:national\s+diploma|diploma|nvq\s*level\s*[456]|advance(?:d)?\s+diploma|graduate\s+diploma)/i.test(targetText)
                );

                // Professional Certifications
                const isProfCert = /\b(?:cima|acca|aat|ca\s+sri\s+lanka|chartered\s+accountant|pmp|cisco\s+certified|ccna|ccnp|aws\s+certified)\b/i.test(targetText);

                // School Levels
                const isAL = /\b(?:g\.?c\.?e\.?\s*)?(?:advanced\s+level|advance\s+level|a\/l)\b/i.test(targetText);
                const isOL = /\b(?:g\.?c\.?e\.?\s*)?(?:ordinary\s+level|o\/l)\b/i.test(targetText);

                if (isPhD) return 'PhD';
                if (isMaster) return 'Masters Degree';
                if (isBachelor) return 'Bachelors Degree';
                if (isDiploma) return 'Diploma';
                if (isProfCert) return 'Professional Certification';
                if (isAL) return 'A/L';
                if (isOL) return 'O/L';

                return null;
            };

            // First check the isolated EDUCATION section
            if (eduText && eduText.trim().length >= 10) {
                const eduQual = evalQual(eduText);
                if (eduQual) qualification = eduQual;
            }

            // Fallback to checking full text (without references)
            if (!qualification) {
                qualification = evalQual(textWithoutRefs) || '';
            }
        }



        // ── EXPERIENCE CALCULATION
        const mapYearsToRange = (y) => {
            if (y >= 10) return '10+ years';
            if (y >= 8) return '8-10 years';
            if (y >= 5) return '5-7 years';
            if (y >= 3) return '3-4 years';
            if (y >= 1) return '1-2 years';
            if (y > 0) return '0-1 years';
            return '0 years';
        };

        let overall_experience = '1-2 years';
        let relevant_experience = '1-2 years';

        if (text) {
            const lower = text.toLowerCase();

            // 1. Check for explicit years of experience statement (bounded to 1-45 years)
            const explicitMatch = lower.match(/(?:over\s+|more\s+than\s+|having\s+)?\b([1-4]?\d)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:overall|relevant|working|work|professional|industry|practical|hands-on)?\s*experience/i);
            if (explicitMatch) {
                const numY = parseInt(explicitMatch[1], 10);
                if (numY >= 1 && numY <= 45) {
                    overall_experience = mapYearsToRange(numY);
                    relevant_experience = mapYearsToRange(Math.max(1, Math.round(numY * 0.8)));
                }
            } else {
                // 2. Scan work experience section for date ranges
                const expSectionMatch = text.split(/(?:^|\n)\s*(?:PROFESSIONAL\s+EXPERIENCE|WORK\s+EXPERIENCE|EMPLOYMENT\s+HISTORY|WORK\s+HISTORY|EXPERIENCE)\s*(?:\n|$|:)/im);
                const isFresher = lower.includes('fresher') || lower.includes('fresh graduate') || lower.includes('seeking my first');

                if (expSectionMatch.length > 1) {
                    const afterExp = expSectionMatch[1];
                    const expSection = afterExp.split(/(?:^|\n)\s*(?:EDUCATION|ACADEMIC|QUALIFICATIONS|SKILLS|REFERENCES|REFEREES|I\s+DO\s+HEREBY\s+DECLARE|DECLARATION)\b/im)[0];
                    const years = (expSection.match(/\b(20[012]\d|19[89]\d)\b/g) || []).map(Number);
                    
                    if (years.length >= 1) {
                        const currentYear = new Date().getFullYear();
                        const minYear = Math.min(...years);
                        const hasPresent = /(?:present|current|ongoing|since\s+[a-z]*\s*(?:20[012]\d)?|to\s+date)/i.test(expSection);
                        const maxYear = hasPresent ? currentYear : Math.max(...years);
                        const diff = Math.max(0, maxYear - minYear);
                        
                        if (diff >= 1) {
                            overall_experience = mapYearsToRange(diff);
                            relevant_experience = mapYearsToRange(Math.max(1, Math.round(diff * 0.75)));
                        } else {
                            overall_experience = '0-1 years';
                            relevant_experience = '0-1 years';
                        }
                    } else if (/(?:months?|trainee|intern)/i.test(expSection)) {
                        overall_experience = '0-1 years';
                        relevant_experience = '0-1 years';
                    }
                } else if (isFresher) {
                    overall_experience = '0 years';
                    relevant_experience = '0 years';
                }
            }
        }

        // ── SALARY EXPECTATION EXTRACTION
        let salary_expectation = '';
        if (text) {
            const salMatch = text.match(/(?:expected\s+(?:basic\s+)?salary|salary\s+expectation|expected\s+remuneration|expected\s+ctc|expected\s+salary)\s*[:\-]?\s*(?:lkr|rs\.?|inr|\$)?\s*([0-9]{2,3}(?:[,\s][0-9]{3})+|[0-9]{4,7})/i);
            if (salMatch) {
                const rawNum = parseInt(salMatch[1].replace(/[\s,]/g, ''), 10);
                if (rawNum >= 15000 && rawNum <= 10000000) {
                    salary_expectation = rawNum.toLocaleString('en-US');
                }
            }
        }

        return {
            first_name,
            last_name,
            email,
            contact_number,
            qualification,
            overall_experience,
            relevant_experience,
            salary_expectation
        };
    };

    const normalizeQualificationOption = (val) => {
        if (!val) return '';
        const s = val.toLowerCase().trim();
        if (s.includes('phd') || s.includes('doctorate') || s.includes('doctor of')) return 'PhD';
        if (s.includes('master') || s.includes('msc') || s.includes('mba') || s.includes('mphil') || s.includes('postgraduate')) return 'Masters Degree';
        if (s.includes('bachelor') || s.includes('bsc') || s.includes('beng') || s.includes('btech') || s.includes('bba') || s.includes('bcom') || s.includes('bit') || s.includes('bict') || s.includes('undergraduate') || s.includes('degree')) return 'Bachelors Degree';
        if (s.includes('diploma') || s.includes('hnd') || s.includes('nvq')) return 'Diploma';
        if (s.includes('cima') || s.includes('acca') || s.includes('aat') || s.includes('chartered') || s.includes('certification') || s.includes('certified') || s.includes('ccna') || s.includes('pmp')) return 'Professional Certification';
        if (s.includes('advanced level') || s.includes('a/l') || s.includes('advance level')) return 'A/L';
        if (s.includes('ordinary level') || s.includes('o/l')) return 'O/L';
        const match = QUALIFICATION_OPTIONS.find(q => q.toLowerCase() === s);
        return match || '';
    };

    const normalizeExperienceOption = (val) => {
        if (!val) return '';
        const s = val.toLowerCase().trim();
        const match = OVERALL_EXPERIENCE_OPTIONS.find(o => o.toLowerCase() === s);
        if (match) return match;
        if (s.includes('10+') || s.includes('over 10') || s.includes('more than 10')) return '10+ years';
        if (s.includes('8') || s.includes('9') || s.includes('10')) return '8-10 years';
        if (s.includes('5') || s.includes('6') || s.includes('7')) return '5-7 years';
        if (s.includes('3') || s.includes('4')) return '3-4 years';
        if (s.includes('1') || s.includes('2')) return '1-2 years';
        if (s.includes('0-1') || s.includes('months') || s.includes('intern') || s.includes('trainee')) return '0-1 years';
        if (s.includes('0') || s.includes('fresher') || s.includes('none')) return '0 years';
        return '';
    };

    const parseResumeWithAI = async (file) => {
        setIsAiRefining(true);
        setAiVerified(false);

        try {
            const text = await extractTextFromPdf(file);
            if (!text || text.trim().length === 0) {
                throw new Error("Unable to extract text content from PDF resume.");
            }
            setRawCvText(text);

            // 1. FAST INSTANT LOCAL EXTRACTION (<0.1s):
            // Populates First Name, Last Name, Email, Phone, Draft Qual/Exp IMMEDIATELY into the form inputs!
            // Candidate sees their details right away without ANY blocking screen!
            const extracted = fastExtractProfileFromText(text, file ? file.name : '');

            setForm(prev => ({
                ...prev,
                first_name: extracted.first_name || prev.first_name || '',
                last_name: extracted.last_name || prev.last_name || '',
                email: extracted.email || prev.email || '',
                contact_number: extracted.contact_number || prev.contact_number || '',
                qualification: '',
                overall_experience: '',
                relevant_experience: '',
                salary_expectation: extracted.salary_expectation || prev.salary_expectation || ''
            }));

            // Auto-detect mandatory skills for tags from CV text
            if (vacancy?.required_skills) {
                const reqSkills = vacancy.required_skills.split(',').map(s => s.trim()).filter(Boolean);
                const matched = reqSkills.filter(s => checkSkillInCvText(s, text));
                setMatchedSkills(matched);
                setUserSkills(matched);
            }

            // 2. Authoritative Gemini AI Extraction in the background (takes ~1-2s):
            // Refines and locks in Qualifications, Total Experience, Relevant Experience, and Verified Skills!
            try {
                const aiFormData = new FormData();
                aiFormData.append('cv_text', text);
                aiFormData.append('file_name', file ? file.name : '');
                aiFormData.append('vacancy_id', id);
                if (file) aiFormData.append('cv', file);

                const aiResponse = await aiParseCv(aiFormData);
                const aiData = aiResponse.data?.data || aiResponse.data;

                if (aiData) {
                    const normQual = normalizeQualificationOption(aiData.qualification) || normalizeQualificationOption(extracted.qualification);
                    const normOverallExp = normalizeExperienceOption(aiData.overall_experience) || normalizeExperienceOption(extracted.overall_experience);
                    const normRelExp = normalizeExperienceOption(aiData.relevant_experience) || normalizeExperienceOption(extracted.relevant_experience);

                    setForm(prev => ({
                        ...prev,
                        first_name: aiData.first_name || prev.first_name,
                        last_name: aiData.last_name || prev.last_name,
                        email: aiData.email || prev.email,
                        contact_number: aiData.contact_number || prev.contact_number,
                        qualification: normQual || prev.qualification,
                        overall_experience: normOverallExp || prev.overall_experience,
                        relevant_experience: normRelExp || prev.relevant_experience,
                        salary_expectation: (aiData.salary_expectation && aiData.salary_expectation !== 'Not specified')
                            ? aiData.salary_expectation
                            : prev.salary_expectation
                    }));

                    // Update skills from Gemini AI analysis
                    if (aiData.skills_analysis && Array.isArray(aiData.skills_analysis)) {
                        setSkillsMetadata(normalizeSkills(aiData.skills_analysis));
                        const relevantFromAi = aiData.skills_analysis
                            .filter(s => s.category === 'Relevant Skills' || s.verified)
                            .map(s => s.skill);
                        if (relevantFromAi.length > 0) {
                            setMatchedSkills(prev => Array.from(new Set([...prev, ...relevantFromAi])));
                            setUserSkills(prev => Array.from(new Set([...prev, ...relevantFromAi])));
                        }
                    }

                    if (aiData.ai_match_score) {
                        setAiAnalysis(aiData);
                    }
                    setAiVerified(true);
                }
            } catch (aiErr) {
                console.warn("Gemini AI refinement notice (used local fallback):", aiErr);
                setForm(prev => ({
                    ...prev,
                    qualification: prev.qualification || normalizeQualificationOption(extracted.qualification),
                    overall_experience: prev.overall_experience || normalizeExperienceOption(extracted.overall_experience),
                    relevant_experience: prev.relevant_experience || normalizeExperienceOption(extracted.relevant_experience)
                }));
            }

            toast.success("✨ Details pre-filled instantly! Verified with Steuart AI.", { autoClose: 3500 });
        } catch (err) {
            console.error("CV parsing error:", err);
            toast.info("CV uploaded! Please review and complete your details.");
        } finally {
            setIsAiRefining(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB).'); return; }

        setForm(prev => ({ ...prev, cv: file }));

        // Clear any previous AI parsing results when a new file is uploaded
        setAiAnalysis(null);
        setSkillsMetadata([]);
        setMatchedSkills([]);
        setUserSkills([]);
        setRawCvText('');
        setEditingSkillName(null);
        setEditingSkillValue('');
        setNewSkillName('');

        if (file.type === 'application/pdf') {
            await parseResumeWithAI(file);
        } else {
            toast.info('AI auto-fill is optimized for PDF resumes. Forms can still be filled manually.');
        }
    };

    const handleSaveSkill = (originalName, newName) => {
        const trimmed = newName.trim();
        if (!trimmed) {
            toast.error("Skill name cannot be empty");
            return;
        }
        const exists = skillsMetadata.some(item => item.skill.toLowerCase() === trimmed.toLowerCase() && item.skill.toLowerCase() !== originalName.toLowerCase());
        if (exists) {
            toast.error("This skill already exists");
            return;
        }

        const isMatched = checkSkillInCvText(trimmed, rawCvText);

        setSkillsMetadata(prev => prev.map(item => {
            if (item.skill.toLowerCase() === originalName.toLowerCase()) {
                return {
                    ...item,
                    skill: trimmed,
                    context: isMatched
                        ? (item.context.includes("Manually") || item.context === 'No usage context provided.' ? `Verified in CV.` : item.context)
                        : (item.context.includes("Manually") || item.context === 'No usage context provided.' ? `Not matched in CV.` : item.context),
                    is_mandatory: requiredSkillsList.some(rs => isRobustMatch(trimmed, rs)),
                    is_ai_extracted: isMatched
                };
            }
            return item;
        }));

        setUserSkills(prev => prev.map(s => s.toLowerCase() === originalName.toLowerCase() ? trimmed : s));

        const isMandatory = requiredSkillsList.some(rs => isRobustMatch(trimmed, rs));
        if (isMandatory) {
            setMatchedSkills(prev => {
                const clean = prev.filter(s => s.toLowerCase() !== originalName.toLowerCase());
                if (!clean.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
                    clean.push(trimmed);
                }
                return clean;
            });
        } else {
            setMatchedSkills(prev => prev.filter(s => s.toLowerCase() !== originalName.toLowerCase()));
        }

        setEditingSkillName(null);
        setEditingSkillValue('');
        toast.success(`Skill renamed to "${trimmed}"`);
    };

    const handleAddSkill = (e) => {
        if (e) e.preventDefault();
        const trimmed = newSkillName.trim();
        if (!trimmed) {
            toast.error("Skill name cannot be empty");
            return;
        }
        const exists = skillsMetadata.some(item => item.skill.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            toast.error("This skill already exists");
            return;
        }

        const isMandatory = requiredSkillsList.some(rs => isRobustMatch(trimmed, rs));
        const isMatched = checkSkillInCvText(trimmed, rawCvText);

        const newSkillObj = {
            skill: trimmed,
            experience: "1-2 Years",
            context: isMatched ? `Manually added: verified in CV.` : `Manually added: not found in CV.`,
            category: activeTab || 'Relevant Skills',
            evidence_source: isMatched ? 'Project' : 'Skills Section Only',
            evidence_strength: isMatched ? 'Moderate Evidence' : 'Mentioned Only',
            experience_level: 'Intermediate',
            is_mandatory: isMandatory,
            is_ai_extracted: isMatched
        };

        setSkillsMetadata(prev => [...prev, newSkillObj]);
        setUserSkills(prev => [...prev, trimmed]);
        if (isMandatory) {
            setMatchedSkills(prev => [...prev, trimmed]);
        }

        setNewSkillName('');
        toast.success(`Skill "${trimmed}" added!`);
    };

    const handleReview = (e) => {
        e.preventDefault();

        // Validate Email & Contact Number
        const emailErr = validateEmail(form.email);
        const phoneErr = validateContactNumber(form.contact_number);

        if (emailErr || phoneErr) {
            setTouched({ email: true, contact_number: true });
            setFieldErrors({ email: emailErr, contact_number: phoneErr });
            toast.error(emailErr || phoneErr);
            return;
        }

        if (!form.cv) { toast.error('Please upload your CV.'); return; }

        // Validate Salary Expectation (LKR)
        const salary = form.salary_expectation?.toString().trim();
        if (!salary) {
            toast.error('Salary Expectation (LKR) is required.');
            return;
        }

        // Clean formatting commas and check numeric validity
        const cleanSalary = salary.replace(/,/g, '');
        if (!/^\d+(\.\d+)?$/.test(cleanSalary) || parseFloat(cleanSalary) <= 0) {
            toast.error('Salary Expectation must be a valid positive numeric amount (digits only, e.g. 150000 or 150,000).');
            return;
        }

        if (!privacyAccepted) {
            toast.error('You must agree to the Privacy Policy to proceed.');
            return;
        }

        setShowPdpaModal(true);
    };

    const submitToBackend = async () => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                if (key === 'future_consent') formData.append(key, form[key] === true ? 'true' : 'false');
                else formData.append(key, form[key]);
            });
            formData.append('vacancy_id', id);
            formData.append('tags', userSkills.join(', '));

            let finalAnalysis = aiAnalysis;
            if (!finalAnalysis) {
                // Construct a fallback analysis object using the current skillsMetadata state
                finalAnalysis = {
                    skills_analysis: skillsMetadata
                        .filter(item => item.category === 'Relevant Skills' || item.category === 'Related Skills')
                        .map(item => ({
                            skill: item.skill,
                            category: item.category,
                            experience_level: 'Declared',
                            estimated_duration: item.experience || '1-2 Years',
                            evidence_strength: 'Mentioned Only',
                            evidence_source: 'Skills Section Only',
                            usage_context: item.context || 'Manually added by candidate',
                            verified: checkSkillInCvText(item.skill, rawCvText)
                        })),
                    fully_demonstrated_skills: skillsMetadata.filter(item => item.is_mandatory && checkSkillInCvText(item.skill, rawCvText)).map(item => item.skill),
                    partially_demonstrated_skills: [],
                    requirements_without_evidence: skillsMetadata.filter(item => item.is_mandatory && !checkSkillInCvText(item.skill, rawCvText)).map(item => item.skill),
                    additional_skills: skillsMetadata
                        .filter(item => item.category === 'Additional Skills')
                        .map(item => ({
                            skill: item.skill,
                            experience_level: item.experience_level || 'Basic',
                            estimated_duration: item.experience || '1-2 Years',
                            evidence_strength: item.evidence_strength || 'Mentioned Only',
                            evidence_source: item.evidence_source || 'Skills Section Only',
                            usage_context: item.context || 'Mentioned in CV.',
                            verified: checkSkillInCvText(item.skill, rawCvText)
                        })),
                    qualifications_found: [form.qualification].filter(Boolean),
                    certifications_found: [],
                    experience_summary: `Candidate has ${form.overall_experience} of total experience.`,
                    recruiter_insights: ["Candidate manually submitted profile information."]
                };
            } else {
                // Synchronize any manual edits/deletions back into it
                finalAnalysis.skills_analysis = skillsMetadata
                    .filter(item => item.category === 'Relevant Skills' || item.category === 'Related Skills')
                    .map(item => {
                        return {
                            skill: item.skill,
                            category: item.category,
                            experience_level: item.experience_level || 'Declared',
                            estimated_duration: item.experience || '1-2 Years',
                            evidence_strength: item.evidence_strength || 'Mentioned Only',
                            evidence_source: item.evidence_source || 'Skills Section Only',
                            usage_context: item.context || 'Manually added by candidate',
                            verified: checkSkillInCvText(item.skill, rawCvText)
                        };
                    });

                finalAnalysis.additional_skills = skillsMetadata
                    .filter(item => item.category === 'Additional Skills')
                    .map(item => {
                        return {
                            skill: item.skill,
                            experience_level: item.experience_level || 'Basic',
                            estimated_duration: item.experience || '1-2 Years',
                            evidence_strength: item.evidence_strength || 'Mentioned Only',
                            evidence_source: item.evidence_source || 'Skills Section Only',
                            usage_context: item.context || 'Mentioned in CV.',
                            verified: checkSkillInCvText(item.skill, rawCvText)
                        };
                    });

                finalAnalysis.fully_demonstrated_skills = skillsMetadata.filter(item => item.is_mandatory && checkSkillInCvText(item.skill, rawCvText)).map(item => item.skill);
                finalAnalysis.requirements_without_evidence = skillsMetadata.filter(item => item.is_mandatory && !checkSkillInCvText(item.skill, rawCvText)).map(item => item.skill);
            }
            formData.append('skills_metadata', JSON.stringify(finalAnalysis));
            formData.append('cv_text', rawCvText || '');
            formData.append('extracted_data', JSON.stringify({
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                contact_number: form.contact_number,
                qualification: form.qualification,
                overall_experience: form.overall_experience,
                relevant_experience: form.relevant_experience,
                salary_expectation: form.salary_expectation
            }));

            await applyForJob(formData);
            toast.success('Application submitted!');
            navigate('/success', { state: { vacancy } });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit.');
        } finally { setSubmitting(false); }
    };

    const formatDate = (d) => {
        if (!d) return 'N/A';
        const dt = new Date(d);
        return isNaN(dt) ? 'N/A' : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner"></div>
        </div>
    );

    return (
        <div className="apb-page">
            <style>{`
                .spinner-small {
                    width: 22px;
                    height: 22px;
                    border: 2px solid rgba(200, 169, 81, 0.15);
                    border-top-color: var(--gold-accent, #c8a951);
                    border-radius: 50%;
                    animation: spin-cv 0.8s linear infinite;
                }
                .spinner-large {
                    width: 56px;
                    height: 56px;
                    border: 4px solid rgba(139, 26, 43, 0.1);
                    border-top-color: var(--crimson, #8b1a2b);
                    border-right-color: var(--gold-accent, #c8a951);
                    border-radius: 50%;
                    animation: spin-cv 1s linear infinite;
                    margin: 0 auto 20px;
                }
                .parsing-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(255, 255, 255, 0.75);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    animation: fadeIn-cv 0.3s ease-out;
                }
                .parsing-popup {
                    background: #ffffff;
                    border-radius: 24px;
                    padding: 36px 30px;
                    width: 90%;
                    max-width: 460px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(139, 26, 43, 0.1);
                    border: 1px solid rgba(200, 169, 81, 0.2);
                    animation: scaleUp-cv 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes fadeIn-cv {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp-cv {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes spin-cv {
                    to { transform: rotate(360deg); }
                }
                .apb-form-parsing-active .apb-fieldset-label,
                .apb-form-parsing-active .apb-grid2,
                .apb-form-parsing-active .apb-consent,
                .apb-form-parsing-active .apb-talent-pool,
                .apb-form-parsing-active .apb-submit,
                .apb-form-parsing-active .apb-disclosure,
                .apb-form-parsing-active .apb-skill-match-panel,
                .apb-form-parsing-active .premium-skills-container {
                    display: none !important;
                }
                .skill-source-badge {
                    font-size: 0.65rem;
                    background: #f1f5f9;
                    color: #475569;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 700;
                    display: inline-block;
                }
                .skill-match-status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.68rem;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    line-height: 1;
                }
                .skill-match-status-badge.matched {
                     background-color: #e6fcf5;
                     color: #0ca678;
                     border: 1px solid #c3fae8;
                 }
                 .skill-match-status-badge.unrelated {
                     background-color: #f1f5f9;
                     color: #475569;
                     border: 1px solid #e2e8f0;
                 }
                 .skill-match-status-badge.unmatched {
                     background-color: #fff5f5;
                     color: #fa5252;
                     border: 1px solid #ffe3e3;
                 }
                .skill-edit-btn-trigger {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }
                .skill-edit-btn-trigger:hover {
                    color: var(--gold-accent, #c8a951);
                    background-color: #f1f5f9;
                }
                .skill-metadata-card {
                    position: relative;
                    transition: all 0.2s ease;
                }
                .skill-metadata-card.editing-card {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .add-skill-card {
                    border: 1px dashed #cbd5e1;
                    border-radius: 12px;
                    background-color: #f8fafc;
                    transition: all 0.2s ease;
                }
                .add-skill-card:hover {
                    border-color: var(--gold-accent, #c8a951);
                    background-color: #fff;
                }
                .btn-primary-small {
                    background-color: var(--crimson, #8b1a2b);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .btn-primary-small:hover {
                    background-color: #721422;
                }
                .btn-secondary-small {
                    background-color: #e2e8f0;
                    color: #475569;
                    border: none;
                    border-radius: 4px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .btn-secondary-small:hover {
                    background-color: #cbd5e1;
                }
                .apb-tooltip {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 1.2px solid currentColor;
                    font-size: 9px;
                    font-weight: 800;
                    cursor: help;
                    margin-left: 4px;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                    user-select: none;
                }
                .apb-tooltip:hover {
                    opacity: 1;
                }
                .apb-tooltip-text {
                    visibility: hidden;
                    width: 220px;
                    background-color: #1e293b;
                    color: #ffffff;
                    text-align: center;
                    border-radius: 8px;
                    padding: 8px 12px;
                    position: absolute;
                    z-index: 99999;
                    bottom: 135%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: opacity 0.2s, visibility 0.2s;
                    font-size: 11px;
                    font-weight: 500;
                    line-height: 1.4;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    pointer-events: none;
                    text-transform: none;
                    letter-spacing: normal;
                }
                .apb-tooltip-text::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: #1e293b transparent transparent transparent;
                }
                .apb-tooltip:hover .apb-tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }

                .pdpa-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    animation: pdpaFadeIn 0.3s ease-out;
                }

                .pdpa-modal-card {
                    background: #ffffff;
                    border-radius: 20px;
                    width: 90%;
                    max-width: 680px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(139, 26, 43, 0.25);
                    border: 1px solid rgba(200, 169, 81, 0.3);
                    animation: pdpaSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    overflow: hidden;
                }

                .pdpa-modal-header {
                    padding: 18px 24px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #fcfcfd;
                }

                .pdpa-modal-header h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: var(--crimson, #8b1a2b);
                    font-family: var(--font-body);
                }

                .pdpa-modal-close-btn {
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 6px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .pdpa-modal-close-btn:hover {
                    color: var(--crimson, #8b1a2b);
                    background: rgba(139, 26, 43, 0.05);
                }

                .pdpa-modal-body {
                    padding: 20px 24px;
                    overflow-y: auto;
                    flex: 1;
                    text-align: left;
                }

                .pdpa-info-section {
                    background: rgba(139, 26, 43, 0.015);
                    border-left: 4px solid var(--crimson, #8b1a2b);
                    padding: 14px 16px;
                    border-radius: 0 12px 12px 0;
                    margin-bottom: 18px;
                }

                .pdpa-info-section h4 {
                    margin: 0 0 6px 0;
                    font-size: 0.95rem;
                    font-weight: 800;
                    color: var(--crimson, #8b1a2b);
                }

                .pdpa-info-section p {
                    margin: 0 0 10px 0;
                    font-size: 0.85rem;
                    line-height: 1.45;
                    color: #475569;
                }

                .pdpa-bullets {
                    margin: 0;
                    padding-left: 20px;
                    font-size: 0.82rem;
                    color: #475569;
                    line-height: 1.5;
                }

                .pdpa-bullets li {
                    margin-bottom: 4px;
                }

                .pdpa-bullets li strong {
                    color: #1e293b;
                }

                .pdpa-consent-question {
                    margin-bottom: 14px;
                }

                .pdpa-consent-question strong {
                    font-size: 0.95rem;
                    color: #1e293b;
                    display: block;
                    margin-bottom: 2px;
                }

                .pdpa-consent-sub {
                    margin: 0;
                    font-size: 0.8rem;
                    color: #64748b;
                }

                .pdpa-checkbox-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 4px;
                }

                @media (max-width: 640px) {
                    .pdpa-checkbox-group {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                }

                .pdpa-checkbox-card {
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    gap: 14px;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    background: #ffffff;
                    user-select: none;
                    text-align: left;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
                }

                .pdpa-checkbox-card:hover {
                    border-color: var(--gold-accent, #c8a951);
                    background: rgba(200, 169, 81, 0.015);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }

                .pdpa-checkbox-card.selected {
                    border-color: var(--crimson, #8b1a2b);
                    background: rgba(139, 26, 43, 0.02);
                    box-shadow: 0 4px 12px rgba(139, 26, 43, 0.06);
                }

                .pdpa-checkbox-indicator {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    margin-top: 2px;
                    transition: all 0.2s;
                }

                .pdpa-checkbox-card.selected .pdpa-checkbox-indicator {
                    border-color: var(--crimson, #8b1a2b);
                }

                .pdpa-checkbox-checked {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: var(--crimson, #8b1a2b);
                    animation: pdpaScaleIn 0.15s ease-out;
                }

                .pdpa-checkbox-label {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .pdpa-checkbox-label strong {
                    font-size: 0.88rem;
                    color: #1e293b;
                    line-height: 1.3;
                }

                .pdpa-checkbox-card.selected .pdpa-checkbox-label strong {
                    color: var(--crimson, #8b1a2b);
                }

                .pdpa-checkbox-label span {
                    font-size: 0.78rem;
                    color: #64748b;
                    line-height: 1.4;
                }

                .pdpa-modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    background: #fcfcfd;
                }

                .pdpa-btn-cancel {
                    padding: 10px 20px;
                    border-radius: 10px;
                    background: #ffffff;
                    border: 1.5px solid #cbd5e1;
                    color: #475569;
                    font-weight: 700;
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .pdpa-btn-cancel:hover {
                    background: #f1f5f9;
                    border-color: #94a3b8;
                    color: #1e293b;
                }

                .pdpa-btn-proceed {
                    padding: 10px 24px;
                    border-radius: 10px;
                    background: var(--crimson, #8b1a2b);
                    border: none;
                    color: #ffffff;
                    font-weight: 700;
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    box-shadow: 0 4px 12px rgba(139, 26, 43, 0.15);
                }

                .pdpa-btn-proceed:hover:not(:disabled) {
                    background: #721422;
                    box-shadow: 0 6px 16px rgba(139, 26, 43, 0.25);
                }

                .pdpa-btn-proceed:disabled {
                    background: #e2e8f0;
                    color: #94a3b8;
                    cursor: not-allowed;
                    box-shadow: none;
                }

                @keyframes pdpaFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes pdpaSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes pdpaScaleIn {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
            `}</style>

            {/* ── Navbar ── */}
            <nav className="navbar">
                <Link to="/" className="navbar-brand">
                    <img src="/gs-logo.png" alt="George Steuart" className="navbar-logo" />
                    <div>
                        <div className="navbar-title">George Steuart</div>
                        <div className="navbar-subtitle">Careers</div>
                    </div>
                </Link>
                <div className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
                    <Link to="/" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                    <Link to="/vacancies" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>Vacancies</Link>
                    <Link 
                        to="/admin/login" 
                        className="navbar-link admin-icon-link" 
                        onClick={() => setMobileMenuOpen(false)}
                        title="Admin Portal"
                        aria-label="Admin Portal"
                    >
                        <FiUser size={19} />
                        <span className="admin-link-text">Admin Portal</span>
                    </Link>
                </div>
                <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(v => !v)}>
                    {mobileMenuOpen ? <FiX /> : <FiMenu />}
                </button>
            </nav>

            {/* ── HERO BANNER ── */}
            <div className="apb-banner">
                <div className="apb-banner-img">
                    <img src="/apply.png" alt="Apply" />
                </div>
                <div className="apb-banner-overlay" />
                <div className="apb-banner-content container">
                    <Link to="/vacancies" className="apb-back">
                        <FiArrowLeft /> Back to Vacancies
                    </Link>
                    <div className="apb-banner-company">
                        <div className="apb-banner-logo">
                            <img
                                src={vacancy?.company_logo
                                    ? `${BACKEND_ROOT}/uploads/logos/${vacancy.company_logo}`
                                    : '/gs-logo.png'}
                                alt={vacancy?.company_name || 'George Steuart'}
                                onError={(e) => e.target.src = '/gs-logo.png'}
                            />
                        </div>
                        <span>{vacancy?.company_name || 'George Steuart & Company'}</span>
                    </div>
                    <h1 className="apb-banner-title">{vacancy?.title || 'Open Position'}</h1>
                    <div className="apb-banner-tags">
                        {vacancy?.reference_number && <span className="apb-tag apb-tag-gold"><FiHash />{vacancy.reference_number}</span>}
                        {vacancy?.employment_type && <span className="apb-tag"><FiBriefcase />{vacancy.employment_type}</span>}
                        {vacancy?.location && <span className="apb-tag"><FiMapPin />{vacancy.location}</span>}
                        <span className="apb-tag apb-tag-deadline"><FiCalendar />Closes {formatDate(vacancy?.expire_date)}</span>
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <main className="apb-main">
                <div className="container apb-container">

                    {/* LEFT — Job details */}
                    <aside className="apb-sidebar">
                        <div className="apb-info-card">
                            <h3 className="apb-info-title">Position Details</h3>
                            {vacancy?.description && (
                                <div className="apb-info-block">
                                    <h4>About This Role</h4>
                                    {renderFormattedText(vacancy.description)}
                                </div>
                            )}
                            {vacancy?.requirements && (
                                <div className="apb-info-block">
                                    <h4>Requirements</h4>
                                    {renderFormattedText(vacancy.requirements)}
                                </div>
                            )}

                            {/* ── Mandatory Skills Panel ── */}
                            {vacancy?.required_skills && vacancy.required_skills.split(',').filter(s => s.trim()).length > 0 && (
                                <div className="apb-info-block apb-skills-block">
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FiTag size={13} style={{ color: 'var(--crimson, #8b1a2b)' }} />
                                        Mandatory Skills
                                    </h4>
                                    <div className="apb-skills-list">
                                        {vacancy.required_skills.split(',').filter(s => s.trim()).map((skill, idx) => (
                                            <span key={idx} className="apb-skill-badge">{skill.trim()}</span>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '10px', marginBottom: 0 }}>
                                        ✨ Upload your PDF CV — AI will auto-detect which skills you have.
                                    </p>
                                </div>
                            )}

                            <div className="apb-info-meta">
                                {vacancy?.location && <div className="apb-meta-row"><FiMapPin /><span>{vacancy.location}</span></div>}
                                {vacancy?.employment_type && <div className="apb-meta-row"><FiBriefcase /><span>{vacancy.employment_type}</span></div>}
                                <div className="apb-meta-row"><FiCalendar /><span>Closes {formatDate(vacancy?.expire_date)}</span></div>
                            </div>
                        </div>
                    </aside>

                    {/* RIGHT — Application form */}
                    <div className="apb-form-area">

                        {/* Step indicator */}
                        <div className="apb-steps">
                            <div className={`apb-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
                                <div className="apb-step-dot">{step > 1 ? <FiCheck /> : '1'}</div>
                                <span>Your Details</span>
                            </div>
                            <div className="apb-step-line" />
                            <div className={`apb-step ${step === 2 ? 'active' : ''}`}>
                                <div className="apb-step-dot">2</div>
                                <span>Review & Submit</span>
                            </div>
                        </div>

                        {/* ─── STEP 1 ─── */}
                        {step === 1 && (
                            <div className="apb-card">
                                <h2 className="apb-card-title">Your Application</h2>

                                <form onSubmit={handleReview}>

                                    {/* CV Upload at the TOP */}
                                    <div className="apb-fieldset-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                        <span>Quick Apply: Upload Your CV</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--gold-accent)', fontWeight: 'bold', background: 'rgba(200, 169, 81, 0.08)', padding: '3px 10px', borderRadius: '100px', border: '1px solid rgba(200,169,81,0.15)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                                            ✨ Steuart AI Auto-Fill Enabled
                                        </span>
                                    </div>
                                    <div className="apb-upload" style={{ position: 'relative', border: form.cv ? '2px solid #bbf7d0' : '2px dashed var(--border-light)', cursor: 'pointer', background: form.cv ? '#f8fafc' : 'transparent' }} onClick={() => document.getElementById('cv-file').click()}>
                                        <input id="cv-file" type="file" accept=".pdf"
                                            style={{ display: 'none' }} onChange={handleFileChange} />

                                        <div className={`apb-upload-icon ${form.cv ? 'has-file' : ''}`}>
                                            {form.cv ? <FiCheck size={22} /> : <FiUpload size={22} />}
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div className="apb-upload-text">
                                                {form.cv ? form.cv.name : 'Click here to upload your PDF CV'}
                                            </div>
                                            <div className="apb-upload-hint">{form.cv ? 'CV uploaded. Form pre-filled automatically! You can review or edit below.' : 'Upload a PDF resume to instantly pre-fill all form details in a single click!'}</div>
                                        </div>
                                    </div>

                                    {/* Personal Info */}
                                    <div className="apb-fieldset-label">Personal Information</div>
                                        <div className="apb-grid2">
                                            <div className="apb-field">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>First Name <span className="req">*</span></span>
                                                    {isAiRefining && !form.first_name && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--crimson, #8b1a2b)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '10px', height: '10px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                            Loading...
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="apb-iw" style={{ position: 'relative' }}>
                                                    <FiUser className="apb-ico" />
                                                    <input type="text" name="first_name" className="apb-input"
                                                        value={form.first_name} onChange={handleChange}
                                                        placeholder={isAiRefining && !form.first_name ? 'Detecting from CV...' : 'First name'} required />
                                                    {isAiRefining && !form.first_name && (
                                                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ width: '13px', height: '13px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="apb-field">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Last Name <span className="req">*</span></span>
                                                    {isAiRefining && !form.last_name && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--crimson, #8b1a2b)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '10px', height: '10px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                            Loading...
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="apb-iw" style={{ position: 'relative' }}>
                                                    <FiUser className="apb-ico" />
                                                    <input type="text" name="last_name" className="apb-input"
                                                        value={form.last_name} onChange={handleChange}
                                                        placeholder={isAiRefining && !form.last_name ? 'Detecting from CV...' : 'Last name'} required />
                                                    {isAiRefining && !form.last_name && (
                                                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ width: '13px', height: '13px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="apb-field">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Email <span className="req">*</span></span>
                                                    {isAiRefining && !form.email && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--crimson, #8b1a2b)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '10px', height: '10px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                            Loading...
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="apb-iw" style={{ position: 'relative' }}>
                                                    <FiMail className="apb-ico" style={fieldErrors.email ? { color: '#ef4444' } : {}} />
                                                    <input 
                                                        type="email" 
                                                        name="email" 
                                                        className="apb-input"
                                                        style={fieldErrors.email ? { borderColor: '#ef4444', backgroundColor: '#fff5f5' } : {}}
                                                        value={form.email} 
                                                        onChange={handleChange}
                                                        onBlur={() => {
                                                            setTouched(prev => ({ ...prev, email: true }));
                                                            setFieldErrors(prev => ({ ...prev, email: validateEmail(form.email) }));
                                                        }}
                                                        placeholder={isAiRefining && !form.email ? 'Detecting from CV...' : 'you@example.com'} 
                                                        required 
                                                    />
                                                    {isAiRefining && !form.email && (
                                                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ width: '13px', height: '13px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                        </div>
                                                    )}
                                                </div>
                                                {fieldErrors.email && (
                                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                        <FiAlertCircle size={13} /> {fieldErrors.email}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="apb-field">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Contact Number <span className="req">*</span></span>
                                                    {isAiRefining && !form.contact_number && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--crimson, #8b1a2b)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '10px', height: '10px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                            Loading...
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="apb-iw" style={{ position: 'relative' }}>
                                                    <FiPhone className="apb-ico" style={fieldErrors.contact_number ? { color: '#ef4444' } : {}} />
                                                    <input 
                                                        type="tel" 
                                                        name="contact_number" 
                                                        className="apb-input"
                                                        style={fieldErrors.contact_number ? { borderColor: '#ef4444', backgroundColor: '#fff5f5' } : {}}
                                                        value={form.contact_number} 
                                                        onChange={handleChange}
                                                        onBlur={() => {
                                                            setTouched(prev => ({ ...prev, contact_number: true }));
                                                            setFieldErrors(prev => ({ ...prev, contact_number: validateContactNumber(form.contact_number) }));
                                                        }}
                                                        placeholder={isAiRefining && !form.contact_number ? 'Detecting from CV...' : '+94 77 123 4567'} 
                                                        required 
                                                    />
                                                    {isAiRefining && !form.contact_number && (
                                                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ width: '13px', height: '13px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                        </div>
                                                    )}
                                                </div>
                                                {fieldErrors.contact_number && (
                                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                        <FiAlertCircle size={13} /> {fieldErrors.contact_number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Professional Profile */}
                                        <div className="apb-fieldset-label">Professional Profile</div>
                                        <div className="apb-grid2">
                                            <div className="apb-field">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Highest Qualification <span className="req">*</span></span>
                                                    {isAiRefining && !form.qualification && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--crimson, #8b1a2b)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '10px', height: '10px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                            Loading...
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="apb-iw" style={{ position: 'relative' }}>
                                                    <FiBookOpen className="apb-ico" />
                                                    <select name="qualification" className="apb-input apb-sel"
                                                        value={form.qualification} onChange={handleChange} required>
                                                        <option value="">{isAiRefining && !form.qualification ? 'Loading...' : 'Select'}</option>
                                                        {QUALIFICATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                    {isAiRefining && !form.qualification && (
                                                        <div style={{ position: 'absolute', right: '36px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ width: '13px', height: '13px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="apb-field">
                                                <label>Salary Expectation (LKR) <span className="req">*</span></label>
                                                <div className="apb-iw"><span className="apb-ico" style={{ fontSize: '0.75rem', fontWeight: 800, userSelect: 'none' }}>LKR</span>
                                                    <input
                                                        type="text"
                                                        name="salary_expectation"
                                                        className="apb-input"
                                                        value={form.salary_expectation}
                                                        onChange={handleChange}
                                                        placeholder="e.g. 150,000"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="apb-field">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Total Experience <span className="req">*</span></span>
                                                    {isAiRefining && !form.overall_experience && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--crimson, #8b1a2b)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '10px', height: '10px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                            Loading...
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="apb-iw" style={{ position: 'relative' }}>
                                                    <FiClock className="apb-ico" />
                                                    <select name="overall_experience" className="apb-input apb-sel"
                                                        value={form.overall_experience} onChange={handleChange} required>
                                                        <option value="">{isAiRefining && !form.overall_experience ? 'Loading...' : 'Select'}</option>
                                                        <option value="0 years">0 years (Fresher)</option>
                                                        <option value="0-1 years">0–1 years</option>
                                                        <option value="1-2 years">1–2 years</option>
                                                        <option value="3-4 years">3–4 years</option>
                                                        <option value="5-7 years">5–7 years</option>
                                                        <option value="8-10 years">8–10 years</option>
                                                        <option value="10+ years">10+ years</option>
                                                    </select>
                                                    {isAiRefining && !form.overall_experience && (
                                                        <div style={{ position: 'absolute', right: '36px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ width: '13px', height: '13px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="apb-field">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Relevant Experience <span className="req">*</span></span>
                                                    {isAiRefining && !form.relevant_experience && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--crimson, #8b1a2b)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '10px', height: '10px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                            Loading...
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="apb-iw" style={{ position: 'relative' }}>
                                                    <FiClock className="apb-ico" />
                                                    <select name="relevant_experience" className="apb-input apb-sel"
                                                        value={form.relevant_experience} onChange={handleChange} required>
                                                        <option value="">{isAiRefining && !form.relevant_experience ? 'Loading...' : 'Select'}</option>
                                                        <option value="0 years">0 years (Fresher)</option>
                                                        <option value="0-1 years">0–1 years</option>
                                                        <option value="1-2 years">1–2 years</option>
                                                        <option value="3-4 years">3–4 years</option>
                                                        <option value="5-7 years">5–7 years</option>
                                                        <option value="8-10 years">8–10 years</option>
                                                        <option value="10+ years">10+ years</option>
                                                    </select>
                                                    {isAiRefining && !form.relevant_experience && (
                                                        <div style={{ position: 'absolute', right: '36px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ width: '13px', height: '13px', border: '2px solid rgba(139,26,43,0.25)', borderTopColor: '#8b1a2b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* CV is now uploaded and parsed at the top */}

                                        {/* Privacy Consent */}
                                        <div className="apb-consent">
                                            <input
                                                type="checkbox"
                                                id="priv"
                                                checked={privacyAccepted}
                                                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                                required
                                            />
                                            <label htmlFor="priv">
                                                I agree my personal information may be processed for recruitment purposes per the <a href="#">Privacy Policy</a>.
                                            </label>
                                        </div>



                                        <button
                                            type="submit"
                                            className="apb-submit"
                                            disabled={!privacyAccepted}
                                            style={{
                                                opacity: !privacyAccepted ? 0.6 : 1,
                                                cursor: !privacyAccepted ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            Review Application <FiChevronRight />
                                        </button>
                                </form>
                            </div>
                        )}

                        {/* ─── STEP 2 — REVIEW ─── */}
                        {step === 2 && (
                            <div className="apb-card">
                                <h2 className="apb-card-title">Review Your Application</h2>

                                <div className="apb-review-block">
                                    <div className="apb-rev-section">Personal Information</div>
                                    <div className="apb-grid2">
                                        {[['First Name', form.first_name], ['Last Name', form.last_name],
                                        ['Email', form.email], ['Phone', form.contact_number]].map(([l, v]) => (
                                            <div key={l} className="apb-rv-item">
                                                <span className="apb-rv-lbl">{l}</span>
                                                <span className="apb-rv-val">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="apb-review-block">
                                    <div className="apb-rev-section">Professional Profile</div>
                                    <div className="apb-grid2">
                                        {[['Qualification', form.qualification],
                                        ['Salary', form.salary_expectation || '—'],
                                        ['Total Exp.', form.overall_experience],
                                        ['Relevant Exp.', form.relevant_experience]].map(([l, v]) => (
                                            <div key={l} className="apb-rv-item">
                                                <span className="apb-rv-lbl">{l}</span>
                                                <span className="apb-rv-val">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="apb-review-block">
                                    <div className="apb-rev-section">Documents & Preferences</div>
                                    <div className="apb-rv-doc"><FiFileText /><span>{form.cv?.name}</span></div>
                                    <div className="apb-rv-item" style={{ marginTop: 12 }}>
                                        <span className="apb-rv-lbl">Future Opportunities</span>
                                        <span className="apb-rv-val" style={{ color: form.future_consent ? 'var(--success)' : 'var(--text-muted)' }}>
                                            {form.future_consent ? 'Yes — keep my CV on file' : 'No — this role only'}
                                        </span>
                                    </div>
                                </div>

                                <div className="apb-disclosure" style={{ fontWeight: 700, color: '#b8860b', background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                                    <FiAlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: '#b8860b' }} />
                                    <strong>By submitting, you confirm all information is accurate and complete. </strong>
                                </div>

                                <div className="apb-review-actions">
                                    <button className="apb-edit-btn" onClick={() => setStep(1)} disabled={submitting}>
                                        <FiArrowLeft /> Edit
                                    </button>
                                    <button className="apb-submit apb-submit-final" onClick={submitToBackend} disabled={submitting}>
                                        {submitting ? 'Submitting…' : <><FiCheck /> Confirm & Submit</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="footer-premium">
                <div className="container">
                    <div className="footer-top-grid">
                        <div className="footer-col brand-col">
                            <img src="/gs-logo.png" alt="George Steuart" className="footer-logo-premium" />
                            <h3 className="footer-brand-name">George Steuart <br /><span>& Company Ltd</span></h3>
                            <p className="footer-about-text">Established in 1835, Sri Lanka's oldest mercantile firm.</p>
                            <div className="footer-socials">
                                <a href="https://www.facebook.com/GeorgeSteuarts" target="_blank" rel="noopener noreferrer" className="social-link"><FiFacebook /></a>
                                <a href="https://www.linkedin.com/company/george-steuart-&-company-limited" target="_blank" rel="noopener noreferrer" className="social-link"><FiLinkedin /></a>
                            </div>
                        </div>
                        <div className="footer-col links-col">
                            <h4 className="footer-col-title">Quick Links</h4>
                            <ul className="footer-links-list">
                                <li><Link to="/">Home</Link></li>
                                <li><Link to="/vacancies">All Vacancies</Link></li>
                            </ul>
                        </div>
                        <div className="footer-col contact-col">
                            <h4 className="footer-col-title">Get In Touch</h4>
                            <div className="footer-contact-info">
                                <p><FiMapPin className="c-icon" /> No. 439, Galle Road, Colombo 03.</p>
                                <p><FiGlobe className="c-icon" /> www.georgesteuart.lk</p>
                                <div className="contact-numbers">
                                    <p><span>T:</span> +94 117 792 400</p>
                                    <p><span>E:</span> info@georgesteuart.lk</p>
                                </div>
                            </div>
                        </div>
                        <div className="footer-bottom-bar">
                            <div className="copyright-area">© {new Date().getFullYear()} George Steuart & Company Ltd. All Rights Reserved.</div>
                        </div>
                    </div>
                </div>
            </footer>



            {/* ── PDPA Consent Modal ── */}
            {showPdpaModal && (
                <div className="pdpa-modal-overlay">
                    <div className="pdpa-modal-card">
                        <div className="pdpa-modal-header">
                            <h3>PDPA Consent & Guidelines</h3>
                            <button type="button" className="pdpa-modal-close-btn" onClick={() => setShowPdpaModal(false)}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="pdpa-modal-body">
                            <div className="pdpa-info-section">
                                <h4>{pdpaConfig.pdpa_title}</h4>
                                <p>
                                    {pdpaConfig.pdpa_description}
                                </p>
                                <ul className="pdpa-bullets">
                                    <li><strong>Purpose:</strong> {pdpaConfig.pdpa_purpose}</li>
                                    <li><strong>Retention:</strong> {pdpaConfig.pdpa_retention}</li>
                                    <li><strong>Security:</strong> {pdpaConfig.pdpa_security}</li>
                                    <li><strong>Your Rights:</strong> {pdpaConfig.pdpa_rights}</li>
                                </ul>
                            </div>

                            <div className="pdpa-consent-question">
                                <strong>Would you like George Steuart & Company to keep your CV for future opportunities? <span className="req">*</span></strong>
                                <p className="pdpa-consent-sub">Please select one option to proceed with your application.</p>
                            </div>

                            <div className="pdpa-checkbox-group">
                                <div
                                    className={`pdpa-checkbox-card ${form.future_consent === true ? 'selected' : ''}`}
                                    onClick={() => setForm({ ...form, future_consent: true })}
                                >
                                    <div className="pdpa-checkbox-indicator">
                                        {form.future_consent === true && <div className="pdpa-checkbox-checked"></div>}
                                    </div>
                                    <div className="pdpa-checkbox-label">
                                        <strong>Yes, keep my CV for future opportunities</strong>
                                        <span>Our HR team can contact you for relevant future roles. You won't need to reapply.</span>
                                    </div>
                                </div>

                                <div
                                    className={`pdpa-checkbox-card ${form.future_consent === false ? 'selected' : ''}`}
                                    onClick={() => setForm({ ...form, future_consent: false })}
                                >
                                    <div className="pdpa-checkbox-indicator">
                                        {form.future_consent === false && <div className="pdpa-checkbox-checked"></div>}
                                    </div>
                                    <div className="pdpa-checkbox-label">
                                        <strong>No, only process for this role</strong>
                                        <span>Your application will be considered for this position only. Your data will not be stored in the Talent Pool.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pdpa-modal-footer">
                            <button
                                type="button"
                                className="pdpa-btn-cancel"
                                onClick={() => setShowPdpaModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="pdpa-btn-proceed"
                                disabled={form.future_consent === null}
                                onClick={() => {
                                    setShowPdpaModal(false);
                                    setStep(2);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            >
                                Accept & Proceed <FiChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ApplyPage;
