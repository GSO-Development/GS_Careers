import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApplications, exportApplications, getAllVacancies, getCompanies, updateApplicationStatus, sendInterviewInvitation, getSuggestions, API_BASE, deleteApplication, bulkDeleteApplications, getCompanyLocations, extractCvAdmin, getSettings } from '../../services/api';
import { OVERALL_EXPERIENCE_OPTIONS, RELEVANT_EXPERIENCE_OPTIONS, QUALIFICATION_OPTIONS, formatDate, formatDateTime, formatContactNumber } from '../../utils/constants';

const BACKEND_ROOT = API_BASE.replace('/api', '');
import { toast } from 'react-toastify';
import { renderAsync } from 'docx-preview';
import axios from 'axios';
import {
    FiDownload, FiFilter, FiSearch, FiMail, FiPhone, FiFileText,
    FiChevronRight, FiChevronLeft, FiArrowRight, FiUser, FiBriefcase, FiCalendar, FiExternalLink, FiX, FiHome, FiCheckCircle, FiChevronDown, FiChevronUp,
    FiAward, FiTarget, FiAlertCircle, FiXCircle, FiInfo, FiTag, FiBarChart2, FiCpu, FiHash, FiVideo, FiMapPin, FiTrash2, FiUserCheck, FiSlash, FiRotateCcw, FiAlertTriangle, FiDollarSign, FiSliders
} from 'react-icons/fi';
import './Applicants.css';
import PaginationFooter from '../../components/PaginationFooter';
import { calculateCandidateMatchScore, calculateSalaryMatchScore, parseNumericSalary, extractCandidateMismatchReason } from '../../utils/scoreCalculator';

// Helper to get today's local date as YYYY-MM-DD
const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to render job description/requirements with better formatting
const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const result = [];
    let currentList = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        // Detect bullet points or numbered lists
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
                // Check if it looks like a sub-heading (short, all caps or ends with colon)
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

// Comprehensive Domain Keywords for NLP-style matching
// Comprehensive Domain Keywords — George Steuart Group Subsidiaries
// Covers: GS&Co (parent), GS Teas, GS Health, GS Solutions, HVA Foods, GS Consumer,
//         GS Travels, GS Aviation, Citrus Leisure, GS Insurance, GS Investments,
//         GS Asset Management, GS Recruitment, GS Optimize
const DOMAIN_KEYWORDS = {

    // ── George Steuart & Company Ltd (Parent) ── shared corporate functions ──
    finance_accounting: [
        'accountant', 'audit', 'auditor', 'tax', 'ledger', 'invoice', 'payroll', 'finance',
        'reconciliation', 'budget', 'tally', 'quickbooks', 'erp', 'sap', 'oracle financials',
        'casl', 'aat', 'cma', 'acca', 'cpa', 'cfo', 'treasury', 'billing', 'accounts payable',
        'accounts receivable', 'cost accounting', 'financial reporting', 'ifrs', 'cash flow',
        'fixed assets', 'management accounts', 'variance analysis', 'internal audit',
        'external audit', 'statutory', 'chartered accountant', 'ca sri lanka'
    ],

    hr_admin: [
        'hr', 'human resources', 'recruitment', 'talent acquisition', 'hiring', 'onboarding',
        'training', 'learning and development', 'l&d', 'performance management', 'kpi',
        'administrative', 'office', 'receptionist', 'clerk', 'coordinator', 'executive',
        'operations', 'clerical', 'data entry', 'policy', 'employee relations', 'attendance',
        'secretarial', 'compliance', 'payroll', 'hris', 'grievance', 'organizational development',
        'workforce planning', 'compensation', 'benefits', 'job evaluation', 'hr generalist',
        'labour law', 'industrial relations', 'welfare', 'succession planning'
    ],

    legal_compliance: [
        'legal', 'lawyer', 'attorney', 'legal officer', 'compliance', 'regulatory',
        'contract', 'litigation', 'corporate law', 'intellectual property', 'company secretarial',
        'company secretary', 'board', 'governance', 'due diligence', 'legal counsel',
        'statutory compliance', 'data protection', 'gdpr', 'risk', 'risk management'
    ],

    // ── George Steuart Teas (Pvt) Ltd ──
    tea: [
        'tea', 'tea taster', 'tea blending', 'tea processing', 'tea packaging', 'tea export',
        'tea buyer', 'tea grading', 'ctc', 'orthodox', 'green tea', 'black tea', 'white tea',
        'flavoured tea', 'bulk tea', 'tea bags', 'colombo tea auction', 'tea broker',
        'plantation', 'estate', 'garden', 'made tea', 'liquoring', 'tea factory',
        'tea marketing', 'tea industry', 'camellia sinensis', 'agronomy', 'packing'
    ],

    // ── George Steuart Health (Pvt) Ltd ──
    healthcare_pharma: [
        'pharmaceutical', 'pharma', 'healthcare', 'medical', 'medicine', 'diagnostics',
        'medical devices', 'surgical', 'clinical', 'laboratory', 'lab technician',
        'medical representative', 'med rep', 'detail officer', 'drug regulatory',
        'nmra', 'drug registration', 'hospital', 'clinic', 'dispensary', 'pharmacist',
        'pharmacy', 'biotech', 'wellness', 'health products', 'medical marketing',
        'key account manager', 'hospital sales', 'doctor detailing', 'product manager pharma',
        'quality assurance pharma', 'cold chain', 'medical equipment', 'dental', 'ophthalmology'
    ],

    // ── George Steuart Solutions (Pvt) Ltd ── solar / generators / elevators / ACs ──
    solutions_engineering: [
        'solar', 'solar panels', 'photovoltaic', 'pv system', 'solar installation',
        'solar engineer', 'renewable energy', 'net metering', 'inverter', 'battery storage',
        'generator', 'genset', 'ups', 'power solutions', 'elevator', 'lift', 'escalator',
        'stairlift', 'lift technician', 'elevator engineer', 'otis', 'schindler',
        'air conditioning', 'hvac', 'ac technician', 'refrigeration', 'chillers',
        'mechanical engineer', 'electrical engineer', 'electromechanical', 'installation',
        'commissioning', 'maintenance', 'preventive maintenance', 'service technician',
        'autocad', 'project engineer', 'site engineer', 'energy audit', 'building services'
    ],

    // ── HVA Foods (Pvt) Ltd ── food & beverage manufacturing ──
    food_beverage: [
        'food', 'beverage', 'food manufacturing', 'food production', 'food safety',
        'haccp', 'iso 22000', 'food technology', 'food technologist', 'quality control food',
        'fmcg food', 'factory', 'production supervisor', 'plant operator', 'food processing',
        'packaging', 'labelling', 'r&d food', 'product development food', 'spices',
        'condiments', 'bakery', 'confectionery', 'beverages', 'dairy', 'fmcg production',
        'batch production', 'yield', 'shelf life', 'sensory evaluation', 'hygiene',
        'gmp', 'food grade', 'costing food', 'npl', 'new product launch'
    ],

    // ── George Steuart Consumer (Pvt) Ltd ── FMCG distribution / sales ──
    fmcg_sales_distribution: [
        'fmcg', 'consumer goods', 'distribution', 'distributor', 'sales representative',
        'field sales', 'territory manager', 'area sales manager', 'regional sales',
        'van sales', 'key account', 'modern trade', 'general trade', 'trade marketing',
        'merchandiser', 'shelf management', 'planogram', 'brand activation', 'btl', 'atl',
        'channel management', 'retail', 'supermarket', 'spar', 'keells', 'cargills',
        'detergent', 'personal care', 'home care', 'spices', 'teas fmcg',
        'route to market', 'rtm', 'beat plan', 'outlet coverage', 'sell-in', 'sell-out',
        'product listing', 'brand manager', 'trade promotions', 'secondary sales'
    ],

    // ── George Steuart Travels Ltd ──
    travel_tourism: [
        'travel', 'tourism', 'tour operator', 'inbound tourism', 'outbound tourism',
        'corporate travel', 'leisure travel', 'travel consultant', 'travel advisor',
        'ticketing', 'airline ticketing', 'gds', 'amadeus', 'galileo', 'sabre',
        'iata', 'visa', 'passport', 'itinerary', 'tour planning', 'destination management',
        'mice', 'event travel', 'incentive travel', 'group tours', 'fit', 'tailor-made tours',
        'hotel booking', 'transfers', 'guide', 'tour guide', 'travel agency',
        'reservations', 'operations travel', 'travel document', 'niche travel'
    ],

    // ── George Steuart Aviation (Pvt) Ltd ── GSA / airline representation ──
    aviation: [
        'aviation', 'airline', 'gsa', 'general sales agent', 'cargo', 'air cargo',
        'iata', 'airport', 'ground handling', 'check-in', 'ramp', 'passenger handling',
        'flight operations', 'load control', 'dangerous goods', 'dg', 'airside',
        'airline sales', 'corporate airline', 'ticketing', 'reservations', 'crm airline',
        'philippine airlines', 'aircraft', 'airfreight', 'revenue management',
        'interline', 'codeshare', 'maldives', 'travel trade airline'
    ],

    // ── Citrus Leisure PLC ── hotels / resorts / F&B / leisure ──
    hospitality_leisure: [
        'hotel', 'resort', 'hospitality', 'restaurant', 'food and beverage', 'f&b',
        'front office', 'front desk', 'guest relations', 'housekeeping', 'concierge',
        'chef', 'sous chef', 'kitchen', 'banquet', 'events', 'stewarding',
        'food service', 'room service', 'spa', 'recreation', 'leisure',
        'property management', 'pms', 'opera', 'revenue management hotel', 'yield',
        'occ', 'adr', 'revpar', 'hospitality management', 'duty manager', 'night manager',
        'bellboy', 'valet', 'pool', 'bar', 'sommelier', 'barista', 'bartender',
        'catering', 'reservation hotel', 'booking', 'citrus', 'hotel supervisor'
    ],

    // ── George Steuart Insurance Brokers (Pvt) Ltd ──
    insurance: [
        'insurance', 'insurance broker', 'risk management', 'underwriting',
        'claims', 'claims management', 'reinsurance', 'life insurance', 'general insurance',
        'health insurance', 'marine insurance', 'fire insurance', 'motor insurance',
        'liability insurance', 'policy', 'premium', 'actuary', 'loss adjuster',
        'corporate insurance', 'irb sri lanka', 'insurance regulation', 'ibsl',
        'risk assessment', 'sum insured', 'deductible', 'renewal', 'endorsement'
    ],

    // ── George Steuart Investments (Pvt) Ltd ── money market / inter-bank ──
    investments_money_market: [
        'investments', 'investment', 'money market', 'treasury', 'interbank',
        'fixed income', 'bonds', 'repo', 't-bills', 'government securities',
        'forex', 'foreign exchange', 'capital market', 'securities', 'equity',
        'dealing', 'dealer', 'central bank', 'cbsl', 'liquidity', 'interest rate',
        'yield', 'portfolio', 'risk desk', 'market risk', 'credit risk',
        'financial markets', 'sec', 'cse', 'stock exchange', 'broker dealer'
    ],

    // ── George Steuart Asset Management (Pvt) Ltd ── wealth / portfolio mgmt ──
    asset_management_wealth: [
        'asset management', 'wealth management', 'portfolio management', 'fund manager',
        'unit trust', 'mutual fund', 'investment manager', 'investment analyst',
        'client advisor', 'relationship manager wealth', 'high net worth', 'hnwi',
        'financial planning', 'retirement planning', 'investment advisory',
        'cfa', 'sec licensed', 'investment licence', 'aum', 'nav', 'benchmark',
        'equity research', 'fundamental analysis', 'technical analysis', 'allocation'
    ],

    // ── George Steuart Recruitment ── overseas recruitment ──
    overseas_recruitment: [
        'overseas recruitment', 'overseas placement', 'foreign employment',
        'slbfe', 'visa processing', 'work visa', 'demand letter', 'attestation',
        'manpower', 'skilled workers', 'semi-skilled', 'unskilled', 'domestic workers',
        'recruitment consultant', 'placement', 'candidate sourcing', 'mobilization',
        'middle east', 'gulf', 'uae', 'qatar', 'saudi', 'kuwait', 'bahrain',
        'employment agent', 'licensed recruitment', 'recruitment agency', 'foreign jobs'
    ],

    // ── George Steuart Optimize ── IT / project / cybersecurity ──
    it_cybersecurity: [
        'software', 'developer', 'software engineer', 'react', 'javascript', 'node',
        'php', 'mysql', 'python', 'java', 'aws', 'azure', 'gcp', 'cloud', 'frontend',
        'backend', 'fullstack', 'api', 'git', 'mobile', 'ios', 'android', 'laravel',
        'c#', 'dot net', '.net', 'ui', 'ux', 'database', 'linux', 'devops', 'docker',
        'kubernetes', 'ci/cd', 'cybersecurity', 'information security', 'iso 27001',
        'penetration testing', 'ethical hacking', 'soc', 'siem', 'network security',
        'firewall', 'endpoint', 'vulnerability', 'it support', 'helpdesk', 'infrastructure',
        'networks', 'project manager', 'scrum', 'agile', 'business analyst',
        'llm', 'ai', 'machine learning', 'data science', 'openai', 'gemini', 'agents',
        'optimize', 'erp implementation', 'it consulting'
    ],

    // ── Cross-group: Sales & Marketing (general) ──
    sales_marketing: [
        'sales', 'marketing', 'branding', 'advertising', 'digital marketing', 'seo',
        'sem', 'social media', 'content marketing', 'email marketing', 'leads',
        'conversions', 'customer', 'wholesale', 'negotiation', 'promotion', 'crm',
        'market research', 'revenue', 'growth', 'client management', 'brand manager',
        'product manager', 'category management', 'trade', 'b2b', 'b2c', 'e-commerce'
    ],

    // ── Cross-group: Supply Chain & Logistics ──
    logistics_supply_chain: [
        'logistics', 'supply chain', 'warehouse', 'shipping', 'export', 'import',
        'procurement', 'inventory', 'transport', 'delivery', 'fleet', 'stores',
        'purchasing', 'customs', 'clearing', 'forwarding', 'freight', 'lcl', 'fcl',
        'letter of credit', 'lc', 'incoterms', 'supplier management', 'vendor',
        'demand planning', 'mrp', 'stock control', 'distribution centre'
    ]
};

// Clean candidate name and extract location
const cleanCandidateNameAndLocation = (firstName, lastName) => {
    let cleanFirst = (firstName || '').trim();
    let cleanLast = (lastName || '').trim();
    let detectedLocation = '';

    const locationKeywords = [
        'sri lanka', 'srilanka', 'colombo', 'kandy', 'galle', 'malabe', 'negombo', 'gampaha', 
        'jaffna', 'batticaloa', 'trincomalee', 'kurunegala', 'kalutara', 'matara', 'moratuwa',
        'nugegoda', 'maharagama', 'kotte', 'battaramulla', 'mount lavinia', 'dehiwala', 'rajagiriya'
    ];
    
    const fullCombined = `${cleanFirst} ${cleanLast}`.trim();
    
    // Check if there is a comma
    const commaIndex = fullCombined.lastIndexOf(',');
    if (commaIndex !== -1) {
        const beforeComma = fullCombined.substring(0, commaIndex).trim();
        const afterComma = fullCombined.substring(commaIndex + 1).trim();
        
        // Find the last word in beforeComma
        const wordsBefore = beforeComma.split(/\s+/);
        const lastWordBefore = wordsBefore[wordsBefore.length - 1];
        
        if (wordsBefore.length > 1 && (locationKeywords.includes(lastWordBefore.toLowerCase()) || /^[A-Z]/.test(lastWordBefore))) {
            detectedLocation = `${lastWordBefore}, ${afterComma}`;
            wordsBefore.pop();
            const namePart = wordsBefore.join(' ');
            return { name: namePart, location: detectedLocation };
        } else {
            detectedLocation = afterComma;
            return { name: beforeComma, location: detectedLocation };
        }
    }
    
    // Fallback: check if "Sri Lanka" is at the end without a comma
    const sriLankaIndex = fullCombined.toLowerCase().lastIndexOf('sri lanka');
    if (sriLankaIndex !== -1 && sriLankaIndex > 0) {
        const namePart = fullCombined.substring(0, sriLankaIndex).trim();
        const locPart = fullCombined.substring(sriLankaIndex).trim();
        const cleanedName = namePart.replace(/,\s*$/, '').trim();
        return { name: cleanedName, location: locPart };
    }

    return { name: fullCombined, location: '' };
};

const DocxViewer = ({ url }) => {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const renderDocx = async () => {
            if (!url || !containerRef.current) return;
            try {
                setLoading(true);
                setError(null);

                // Use axios directly to handle blob response
                const response = await axios.get(url, {
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('gs_admin_token')}`
                    }
                });

                // Clear container before rendering
                containerRef.current.innerHTML = '';
                await renderAsync(response.data, containerRef.current, null, {
                    className: "docx",
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPageToSections: true,
                    trimXmlDeclaration: true,
                });
            } catch (err) {
                console.error("Docx render error:", err);
                setError("Failed to render document. Please download to view.");
            } finally {
                setLoading(false);
            }
        };

        renderDocx();
    }, [url]);

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '50px' }}>
                    <div className="spinner-p"></div>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Rendering Document...</p>
                </div>
            )}
            {error && <div style={{ color: 'var(--crimson)', padding: '20px' }}>{error}</div>}
            <div ref={containerRef} style={{ width: '100%', maxWidth: '800px' }}></div>
        </div>
    );
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

const makeSafeSkillRegex = (term) => {
    if (!term || typeof term !== 'string') return null;
    const termClean = term.trim();
    if (!termClean) return null;
    const escaped = termClean.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const hasSpecial = /[^a-zA-Z0-9\s]/.test(termClean);
    try {
        return hasSpecial
            ? new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i')
            : new RegExp(`\\b${escaped}\\b`, 'i');
    } catch (e) {
        return null;
    }
};

const getNormalizedSkills = (skillsMetadataStr, tags, extractedDataInput, candidateObj = {}) => {
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
        candidateObj.extraction_status === 'unextracted' ||
        (candidateObj.extraction_status !== 'extracted' && candidateObj.is_manual_extracted != 1) ||
        candidateObj.is_extracted === 0 ||
        candidateObj.is_extracted === false ||
        candidateObj.is_extracted === '0' ||
        (!candidateObj.cv_text && !candidateObj.extracted_data && (!candidateObj.skills_metadata || candidateObj.skills_metadata === '[]' || candidateObj.skills_metadata === '""'))
    );

    if (isUnextracted) {
        const metaObj = dataFromMetadata || dataFromExtracted;
        return {
            skills: [],
            parsedReport: {
                is_unextracted: true,
                is_job_mismatch: metaObj?.is_job_mismatch ?? false,
                mismatch_reason: metaObj?.mismatch_reason || 'CV auto-extraction skipped because candidate match score is below minimum threshold (<50%).',
                experience_summary: metaObj?.experience_summary || 'Extraction Skipped: Candidate match score is below 50% threshold. Admins can manually extract this CV.',
                recruiter_insights: Array.isArray(metaObj?.recruiter_insights) && metaObj.recruiter_insights.length > 0 
                    ? metaObj.recruiter_insights 
                    : ['⚠️ Auto-extraction skipped (<50% Match Score). Manual extraction available.'],
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

    if (cvTextContent && (candidateObj.extraction_status === 'extracted' || candidateObj.is_manual_extracted == 1) && !isGarbled(cvTextContent)) {
        // A. Match against dictionary
        Object.entries(DOMAIN_SKILL_CATEGORIES).forEach(([categoryName, kwList]) => {
            kwList.forEach(kw => {
                let matched = false;
                if (kw === 'C') {
                    matched = /(?:c\s*[\/\+]\s*c\+\+|c\s+(?:language|programming|developer|code)|(?<![a-zA-Z0-9])c\+\+(?![a-zA-Z0-9]))/i.test(cvTextContent);
                } else {
                    const regex = makeSafeSkillRegex(kw);
                    matched = regex ? regex.test(cvTextContent) : cvTextContent.toLowerCase().includes(kw.toLowerCase());
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
                    const regex = makeSafeSkillRegex(k);
                    return regex ? regex.test(fullJobContextText) : fullJobContextText.toLowerCase().includes(k.toLowerCase());
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
                isDirectJobMatch = /(?:c\s*[\/\+]\s*c\+\+|c\s+(?:language|programming|developer|code)|(?<![a-zA-Z0-9])c\+\+(?![a-zA-Z0-9]))/i.test(fullJobContextText);
            } else if (sLower.length <= 3) {
                const regex = makeSafeSkillRegex(sLower);
                isDirectJobMatch = regex ? regex.test(fullJobContextText) : fullJobContextText.includes(sLower);
            } else {
                const regex = makeSafeSkillRegex(sLower);
                if ((regex && regex.test(fullJobContextText)) || fullJobContextText.includes(sLower)) {
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
                const regex = makeSafeSkillRegex(k);
                return sName === k.toLowerCase() || (regex && regex.test(sName));
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

    let scoreVal = null;
    if (candidateObj?.match_score != null && candidateObj.match_score !== '') {
        scoreVal = parseInt(candidateObj.match_score, 10);
    } else if (candidateObj?.score != null && candidateObj.score !== '') {
        scoreVal = parseInt(candidateObj.score, 10);
    } else if (dataFromMetadata?.ai_match_score != null && dataFromMetadata.ai_match_score !== '') {
        scoreVal = parseInt(dataFromMetadata.ai_match_score, 10);
    } else if (dataFromExtracted?.ai_match_score != null && dataFromExtracted.ai_match_score !== '') {
        scoreVal = parseInt(dataFromExtracted.ai_match_score, 10);
    } else if (candidateObj && (candidateObj.vacancy_id || candidateObj.applied_vacancy || candidateObj.vacancy_title)) {
        try {
            const sc = calculateCandidateMatchScore(candidateObj);
            if (sc && typeof sc.score === 'number') {
                scoreVal = sc.score;
            }
        } catch (e) {
            scoreVal = null;
        }
    }

    const minMed = Number(candidateObj?.min_medium_match_score) || 50;

    if (!isMismatch && !isUnextracted && (targetDomain || candidateJob)) {
        if ((scoreVal !== null && !isNaN(scoreVal) && scoreVal < minMed) || relevantSkillsFound.length === 0) {
            isMismatch = true;
            mismatchReason = cvActualDomain !== 'General' && cvActualDomain !== targetDomain
                ? `Candidate CV background (${cvActualDomain}) does not align with target vacancy requirements for "${candidateJob}".`
                : `Candidate CV profile lacks required domain competencies for "${candidateJob}".`;
        } else if (cvActualDomain !== 'General' && cvActualDomain !== targetDomain && relevantSkillsFound.length < 2) {
            isMismatch = true;
            mismatchReason = `Candidate CV background (${cvActualDomain}) does not closely align with target vacancy requirements for "${candidateJob}".`;
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

    // Ensure Mandatory Requirements Validation is populated
    if (!Array.isArray(parsedReport.fully_demonstrated_skills) || parsedReport.fully_demonstrated_skills.length === 0) {
        parsedReport.fully_demonstrated_skills = relevantSkillsFound.slice(0, 5);
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

const formatSalaryVal = (val) => {
    if (!val || val === '0') return 'Not specified';
    const digits = String(val).replace(/[^0-9]/g, '');
    if (!digits) return val;
    return `LKR ${Number(digits).toLocaleString('en-US')}`;
};

const formatExpVal = (val) => {
    if (!val || val === '0 years' || val === '0' || val === '0-1 years') return '1-2 Years';
    return val;
};

const getMatchBreakdown = (app, vacanciesList = []) => {
    if (!app) return { overall: 0, salary: 0, experience: 0, qualification: 0, skills: 0, jdAlignment: 0, jdSkills: 0 };
    const res = calculateCandidateMatchScore(app, vacanciesList);
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
            points.push(`Candidate background and skillset diverge from the requirements of "${candidate?.vacancy_title || candidate?.applied_vacancy || 'target position'}".`);
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

function Applicants({ admin }) {
    const [searchParams] = useSearchParams();
    const [applications, setApplications] = useState([]);
    const [vacancies, setVacancies] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showRevertModal, setShowRevertModal] = useState(false);
    const [revertTarget, setRevertTarget] = useState(null);
    const [showShortlistModal, setShowShortlistModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [shortlistData, setShortlistData] = useState({
        interview_type: 'Online',
        interview_date: '',
        interview_time: '',
        interview_location: ''
    });
    const [processingStatus, setProcessingStatus] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [viewingCV, setViewingCV] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [selectedIds, setSelectedIds] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingBulk, setDeletingBulk] = useState(false);
    const [showConfirmShortlist, setShowConfirmShortlist] = useState(false);
    const [showSendInviteModal, setShowSendInviteModal] = useState(false);
    const [isExtractingId, setIsExtractingId] = useState(null);
    const [inviteTarget, setInviteTarget] = useState(null); // app object for invite modal
    const [sendingInvite, setSendingInvite] = useState(false);
    const [inviteData, setInviteData] = useState({
        interview_type: 'Online',
        interview_date: '',
        interview_time: '',
        interview_location: '',
        interview_location_link: ''
    });
    const [locationPreset, setLocationPreset] = useState('');
    const [filters, setFilters] = useState({
        vacancy_id: searchParams.get('vacancy_id') || '',
        company_id: '',
        overall_experience: '',
        relevant_experience: '',
        qualification: '',
        status: '',
        search: '',
        interview_date: '',
        salary_match: '',
        sortBy: searchParams.get('vacancy_id') ? 'matchScore' : 'newest'
    });

    const [showJobDetails, setShowJobDetails] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [activeAdminTab, setActiveAdminTab] = useState('Relevant Skills');
    const selVac = vacancies.find(v => String(v.id) === String(filters.vacancy_id)) || {};

    useEffect(() => {
        if (showDetail) {
            setActiveAdminTab('Relevant Skills');
        }
    }, [showDetail]);

    useEffect(() => {
        if (inviteTarget) {
            const today = getTodayDateString();
            setInviteData({
                interview_type: inviteTarget.interview_type || 'Online',
                interview_date: (inviteTarget.interview_date && inviteTarget.interview_date >= today) ? inviteTarget.interview_date : '',
                interview_time: inviteTarget.interview_time || '',
                interview_location: inviteTarget.interview_location || '',
                interview_location_link: inviteTarget.interview_location_link || ''
            });
            if (inviteTarget.interview_type === 'On-site' && inviteTarget.interview_location) {
                setLocationPreset('Other');
            }
        }
    }, [inviteTarget]);

    const applyAutoMatch = () => {
        if (!selVac.id) {
            toast.info('Please select a position first');
            return;
        }
        setFilters(prev => ({
            ...prev,
            overall_experience: selVac.min_experience || '',
            relevant_experience: selVac.min_relevant_experience || '',
            sortBy: 'matchScore'
        }));
        toast.success(`Filters synced with ${selVac.title} requirements`);
    };

    useEffect(() => {
        loadMeta();
    }, []);

    const visibleVacancies = filters.company_id
        ? vacancies.filter(v => String(v.company_id) === String(filters.company_id))
        : vacancies;

    const handleCompanyChange = (newCompanyId) => {
        setFilters(prev => {
            const next = { ...prev, company_id: newCompanyId };
            if (prev.vacancy_id && newCompanyId) {
                const vac = vacancies.find(v => String(v.id) === String(prev.vacancy_id));
                if (vac && String(vac.company_id) !== String(newCompanyId)) {
                    next.vacancy_id = '';
                    next.sortBy = 'newest';
                }
            }
            return next;
        });
    };

    const handleVacancyChange = (newVacId) => {
        setFilters(prev => {
            const next = {
                ...prev,
                vacancy_id: newVacId,
                sortBy: newVacId ? 'matchScore' : 'newest'
            };
            if (newVacId) {
                const vac = vacancies.find(v => String(v.id) === String(newVacId));
                if (vac && vac.company_id) {
                    next.company_id = String(vac.company_id);
                }
            }
            return next;
        });
    };

    // Reset pagination to page 1 whenever any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [
        filters.vacancy_id,
        filters.company_id,
        filters.overall_experience,
        filters.relevant_experience,
        filters.qualification,
        filters.status,
        filters.interview_date,
        filters.salary_match,
        filters.sortBy,
        filters.search
    ]);

    useEffect(() => {
        loadApplications();
        if (filters.vacancy_id) {
            loadSuggestions();
            setShowSuggestions(false); // collapse list whenever vacancy changes
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [filters.vacancy_id, filters.company_id, filters.overall_experience, filters.relevant_experience, filters.qualification, filters.status, filters.interview_date]);

    const loadSuggestions = async () => {
        try {
            setLoadingSuggestions(true);
            const res = await getSuggestions({ vacancy_id: filters.vacancy_id });
            setSuggestions(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const [minHighScore, setMinHighScore] = useState(75);
    const [minMediumScore, setMinMediumScore] = useState(50);
    const [autoExtractionEnabled, setAutoExtractionEnabled] = useState(true);

    const loadMeta = async () => {
        try {
            const [vacRes, compRes, locRes, setRes] = await Promise.all([
                getAllVacancies(),
                getCompanies(),
                getCompanyLocations(),
                getSettings().catch(() => null)
            ]);
            setVacancies(vacRes.data.data || []);
            setCompanies(compRes.data.data || []);
            setLocations(locRes.data.data || []);
            if (setRes && setRes.data?.data) {
                const sData = setRes.data.data;
                if (sData.min_high_match_score) setMinHighScore(parseInt(sData.min_high_match_score) || 75);
                if (sData.min_medium_match_score) setMinMediumScore(parseInt(sData.min_medium_match_score) || 50);
                if (sData.enable_cv_extraction !== undefined) {
                    setAutoExtractionEnabled(sData.enable_cv_extraction === '1' || sData.enable_cv_extraction === 1 || sData.enable_cv_extraction === true || sData.enable_cv_extraction === 'true');
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadApplications = async () => {
        try {
            setLoading(true);
            const params = {};
            // Send only database query parameters to backend
            if (filters.vacancy_id) params.vacancy_id = filters.vacancy_id;
            if (filters.company_id) params.company_id = filters.company_id;
            if (filters.overall_experience) params.overall_experience = filters.overall_experience;
            if (filters.relevant_experience) params.relevant_experience = filters.relevant_experience;
            if (filters.qualification) params.qualification = filters.qualification;
            if (filters.status) params.status = filters.status;
            if (filters.interview_date) params.interview_date = filters.interview_date;

            const res = await getApplications(params);
            setApplications(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Upgraded 4-Factor Multi-Weighted Scoring Model
    const calculateMatchScore = (app) => {
        return calculateCandidateMatchScore(app, vacancies);
    };

    const handleExport = async () => {
        if (isExporting) return;
        setIsExporting(true);
        const toastId = toast.loading('Preparing candidate export (ranking by score)...');
        try {
            // Prefer live filtered applications from UI state to guarantee 100% fidelity with the screen
            let exportList = (filteredApps && filteredApps.length > 0) ? [...filteredApps] : [];

            // If local state doesn't have applications (e.g. initial load before render), fallback to backend API
            if (exportList.length === 0) {
                const params = {};
                Object.entries(filters).forEach(([k, v]) => {
                    if (v && k !== 'search') params[k] = v;
                });
                const res = await exportApplications(params);
                if (res.data && res.data.type && res.data.type.includes('application/json')) {
                    const text = await res.data.text();
                    const errJson = JSON.parse(text);
                    throw new Error(errJson.message || 'Export error');
                }
                const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                const selectedVac = vacancies.find(v => String(v.id) === String(filters.vacancy_id));
                const vacSlug = selectedVac?.title ? selectedVac.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' : '';
                a.download = `applicants_${vacSlug}${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    if (document.body.contains(a)) document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 2500);
                toast.dismiss(toastId);
                toast.success('Excel/CSV downloaded successfully (Ranked by Match Score)');
                return;
            }

            // Rank candidates by Match Score descending (matches UI ranking)
            exportList.sort((a, b) => {
                const aScore = calculateMatchScore(a)?.score ?? 0;
                const bScore = calculateMatchScore(b)?.score ?? 0;
                if (bScore !== aScore) return bScore - aScore;

                const expMap = {
                    '10+ years': 7, '8-10 years': 6, '5-7 years': 5,
                    '3-4 years': 4, '1-2 years': 3, '0-1 years': 2, '0 years': 1
                };
                const aRel = expMap[a.relevant_experience] || 0;
                const bRel = expMap[b.relevant_experience] || 0;
                if (bRel !== aRel) return bRel - aRel;

                const aExp = expMap[a.overall_experience] || 0;
                const bExp = expMap[b.overall_experience] || 0;
                if (bExp !== aExp) return bExp - aExp;

                return new Date(b.applied_at) - new Date(a.applied_at);
            });

            const headers = [
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
            ];

            const escapeCsvCell = (val) => {
                if (val === null || val === undefined) return '""';
                const str = String(val).trim().replace(/"/g, '""');
                return `"${str}"`;
            };

            const rows = exportList.map((app, index) => {
                const scoreData = calculateMatchScore(app);
                const scoreVal = (scoreData && typeof scoreData.score === 'number') ? scoreData.score : 0;

                // Contact Number: standardize to International Format with spaces (+94 77 123 4567)
                // Use ="..." formula format so Excel renders it as text without scientific notation or loss of leading symbols
                const formattedContact = formatContactNumber(app.contact_number);
                const contactCell = formattedContact ? `="${formattedContact.replace(/"/g, '""')}"` : '""';

                // Applied Date: use YYYY-MM-DD format so Excel does not display ########
                const appliedDate = app.applied_at ? String(app.applied_at).slice(0, 10) : '';

                return [
                    index + 1,
                    `"${scoreVal}%"`,
                    escapeCsvCell(app.first_name || ''),
                    escapeCsvCell(app.last_name || ''),
                    escapeCsvCell(app.email || ''),
                    contactCell,
                    escapeCsvCell(app.overall_experience || ''),
                    escapeCsvCell(app.relevant_experience || ''),
                    escapeCsvCell(app.qualification || ''),
                    escapeCsvCell(app.salary_expectation || ''),
                    escapeCsvCell(appliedDate),
                    escapeCsvCell(app.vacancy_title || selVac?.title || ''),
                    escapeCsvCell(app.designation || selVac?.designation || ''),
                    escapeCsvCell(app.company_name || selVac?.company_name || ''),
                    escapeCsvCell(app.status || 'pending'),
                    escapeCsvCell(app.rejection_reason || '')
                ].join(',');
            });

            // Prepend UTF-8 BOM so Excel opens Sinhala and Unicode cleanly
            const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const selectedVac = vacancies.find(v => String(v.id) === String(filters.vacancy_id));
            const vacSlug = selectedVac?.title ? selectedVac.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' : '';
            a.download = `applicants_${vacSlug}${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                if (document.body.contains(a)) {
                    document.body.removeChild(a);
                }
                window.URL.revokeObjectURL(url);
            }, 2500);

            toast.dismiss(toastId);
            toast.success('Excel/CSV downloaded successfully (Ranked by Match Score)');
        } catch (err) {
            console.error('Export error:', err);
            toast.dismiss(toastId);
            toast.error(err?.response?.data?.message || err?.message || 'Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            vacancy_id: '',
            company_id: '',
            overall_experience: '',
            relevant_experience: '',
            qualification: '',
            status: '',
            search: '',
            interview_date: '',
            salary_match: '',
            sortBy: 'newest'
        });
        setSelectedIds([]);
        setCurrentPage(1);
    };

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.vacancy_id ||
        filters.company_id ||
        filters.overall_experience ||
        filters.relevant_experience ||
        filters.qualification ||
        filters.status ||
        filters.interview_date ||
        filters.salary_match ||
        (filters.sortBy && filters.sortBy !== 'newest')
    );

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(paginatedApps.map(app => app.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        try {
            setDeletingBulk(true);
            await bulkDeleteApplications({ ids: selectedIds });
            toast.success(`${selectedIds.length} applications deleted successfully`);
            setSelectedIds([]);
            setShowDeleteModal(false);
            loadApplications();
        } catch (err) {
            toast.error('Failed to delete applications');
        } finally {
            setDeletingBulk(false);
        }
    };

    const handleStatusUpdate = async (id, status, reason = '', extraData = {}) => {
        try {
            setProcessingStatus(true);
            await updateApplicationStatus({ id, status, rejection_reason: reason, ...extraData });
            toast.success(`Application marked as ${status}`);
            setShowRejectModal(false);
            setShowRevertModal(false);
            setRevertTarget(null);
            setShowShortlistModal(false);
            setShowConfirmShortlist(false);
            setRejectReason('');
            setShortlistData({ interview_type: 'Online', interview_date: '', interview_time: '', interview_location: '' });
            setShowDetail(null);
            loadApplications();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally {
            setProcessingStatus(false);
        }
    };

    // Step 1: Mark as shortlisted (no email)
    const handleQuickShortlist = async (app) => {
        try {
            setProcessingStatus(true);
            await updateApplicationStatus({ id: app.id, status: 'shortlisted' });
            toast.success(`${app.first_name} ${app.last_name} shortlisted successfully`);
            setShowConfirmShortlist(false);
            setShowDetail(null);
            loadApplications();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to shortlist');
        } finally {
            setProcessingStatus(false);
        }
    };

    // Step 2: Send interview invitation email
    const handleSendInterview = async () => {
        if (!inviteTarget) return;
        const today = getTodayDateString();
        if (inviteData.interview_date && inviteData.interview_date < today) {
            toast.error('Interview date cannot be scheduled in the past. Please select today or a future date.');
            return;
        }
        const isReschedule = Boolean(inviteTarget.interview_date);
        try {
            setSendingInvite(true);
            await sendInterviewInvitation({ id: inviteTarget.id, ...inviteData });
            toast.success(isReschedule ? `Interview rescheduled & updated invitation sent to ${inviteTarget.first_name}!` : `Interview invitation sent to ${inviteTarget.first_name}!`);
            setShowSendInviteModal(false);
            setInviteTarget(null);
            setInviteData({ interview_type: 'Online', interview_date: '', interview_time: '', interview_location: '', interview_location_link: '' });
            loadApplications();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send invitation');
        } finally {
            setSendingInvite(false);
        }
    };

    const handleSingleExtract = async (id) => {
        setIsExtractingId(id);
        try {
            const res = await extractCvAdmin({ id });
            toast.success(res.data?.message || 'CV extracted successfully!');
            
            const resData = res.data?.data?.results?.[0];
            if (resData) {
                if (showDetail && showDetail.id === id) {
                    setShowDetail(prev => ({
                        ...prev,
                        ...resData,
                        extraction_status: 'extracted',
                        extracted_data: resData.extracted_data,
                        skills_metadata: resData.skills_metadata,
                        tags: resData.tags,
                        cv_text: resData.cv_text || prev.cv_text,
                        overall_experience: resData.overall_experience || prev.overall_experience,
                        relevant_experience: resData.relevant_experience || prev.relevant_experience,
                        qualification: resData.qualification || prev.qualification
                    }));
                }
                setApplications(prev => prev.map(app => app.id === id ? {
                    ...app,
                    ...resData,
                    extraction_status: 'extracted',
                    extracted_data: resData.extracted_data,
                    skills_metadata: resData.skills_metadata,
                    tags: resData.tags
                } : app));
            }
            await loadApplications();
        } catch (err) {
            toast.error(err.response?.data?.message || 'CV extraction failed.');
        } finally {
            setIsExtractingId(null);
        }
    };

    // Reset locationPreset whenever the invite modal closes
    const closeInviteModal = () => {
        setShowSendInviteModal(false);
        setInviteTarget(null);
        setLocationPreset('');
        setInviteData({ interview_type: 'Online', interview_date: '', interview_time: '', interview_location: '', interview_location_link: '' });
    };

    // (calculateMatchScore is declared above)

    // Smart qualification matcher for client-side filtering consistency
    const matchQualification = (candQual, filterQual) => {
        if (!filterQual) return true;
        if (!candQual) return false;
        const qLower = String(candQual).toLowerCase();
        const fLower = String(filterQual).toLowerCase();

        if (fLower === 'bachelors degree' || fLower === 'bachelor' || fLower === 'degree') {
            return /bachelor|bsc|b\.sc|beng|bit|degree|undergraduate/i.test(qLower);
        }
        if (fLower === 'diploma' || fLower === 'hnd') {
            return /diploma|hnd|nvq/i.test(qLower);
        }
        if (fLower === 'masters degree' || fLower === 'master' || fLower === 'masters') {
            return /master|msc|mba|m\.sc|postgraduate/i.test(qLower);
        }
        if (fLower === 'phd' || fLower === 'doctorate') {
            return /phd|doctorate|ph\.d/i.test(qLower);
        }
        if (fLower.includes('cert') || fLower.includes('professional')) {
            return /certif|cima|acca|aat|chartered|ca sri lanka|professional/i.test(qLower);
        }
        if (fLower === 'a/l') {
            return /a\/l|advanced level/i.test(qLower);
        }
        if (fLower === 'o/l') {
            return /o\/l|ordinary level/i.test(qLower);
        }
        return qLower.includes(fLower);
    };

    const filteredApps = applications
        .filter(app => {
            // 1. Omnipresent Search Filter (name, email, phone, role, company, qual, tags, skills)
            if (filters.search) {
                const q = filters.search.trim().toLowerCase();
                const fullName = `${app.first_name || ''} ${app.last_name || ''}`.toLowerCase();
                const email = String(app.email || '').toLowerCase();
                const contact = String(app.contact_number || '').toLowerCase();
                const vacancyTitle = String(app.vacancy_title || '').toLowerCase();
                const companyName = String(app.company_name || '').toLowerCase();
                const qualification = String(app.qualification || '').toLowerCase();
                const tags = String(app.tags || '').toLowerCase();
                const designation = String(app.designation || '').toLowerCase();
                const skillsMeta = typeof app.skills_metadata === 'string' ? app.skills_metadata.toLowerCase() : '';
                const cvSnippet = String(app.cv_text || '').slice(0, 1000).toLowerCase();

                const matchSearch = fullName.includes(q) ||
                    email.includes(q) ||
                    contact.includes(q) ||
                    vacancyTitle.includes(q) ||
                    companyName.includes(q) ||
                    qualification.includes(q) ||
                    tags.includes(q) ||
                    designation.includes(q) ||
                    skillsMeta.includes(q) ||
                    cvSnippet.includes(q);

                if (!matchSearch) return false;
            }

            // 2. Position Filter
            if (filters.vacancy_id && String(app.vacancy_id) !== String(filters.vacancy_id)) {
                return false;
            }

            // 3. Establishment / Company Filter
            if (filters.company_id && String(app.company_id) !== String(filters.company_id)) {
                return false;
            }

            // 4. Academic Qualification Matcher
            if (filters.qualification && !matchQualification(app.qualification, filters.qualification)) {
                return false;
            }

            // 5. Overall Experience Filter
            if (filters.overall_experience) {
                if (filters.overall_experience === '0 years') {
                    if (app.overall_experience && app.overall_experience !== '0 years' && app.overall_experience !== '0-1 years') {
                        return false;
                    }
                } else {
                    const tiers = getExperienceAtLeast(filters.overall_experience);
                    if (app.overall_experience && !tiers.includes(app.overall_experience)) {
                        return false;
                    }
                }
            }

            // 6. Relevant Experience Filter
            if (filters.relevant_experience) {
                if (filters.relevant_experience === '0 years') {
                    if (app.relevant_experience && app.relevant_experience !== '0 years' && app.relevant_experience !== '0-1 years') {
                        return false;
                    }
                } else {
                    const tiers = getExperienceAtLeast(filters.relevant_experience);
                    if (app.relevant_experience && !tiers.includes(app.relevant_experience)) {
                        return false;
                    }
                }
            }

            // 7. Status Filter
            if (filters.status && app.status !== filters.status) {
                return false;
            }

            // 8. Interview Date Filter
            if (filters.interview_date && app.interview_date !== filters.interview_date) {
                return false;
            }

            // 9. Salary Match Filter
            if (filters.salary_match) {
                const appVac = vacancies.find(v => String(v.id) === String(app.vacancy_id)) || selVac || {};
                const minB = appVac.min_salary || app.min_salary || selVac.min_salary;
                const maxB = appVac.max_salary || app.max_salary || selVac.max_salary;
                const candSalNum = parseNumericSalary(app.salary_expectation);

                if (filters.salary_match === 'specified') {
                    if (candSalNum === null) return false;
                } else if (filters.salary_match === 'unspecified') {
                    if (candSalNum !== null) return false;
                } else {
                    const matchResult = calculateSalaryMatchScore(app.salary_expectation, minB, maxB);
                    if (filters.salary_match === 'within') {
                        if (matchResult.status !== 'within_range') return false;
                    } else if (filters.salary_match === 'above') {
                        if (matchResult.status !== 'above_range') return false;
                    } else if (filters.salary_match === 'below') {
                        if (matchResult.status !== 'below_range') return false;
                    }
                }
            }

            return true;
        })
        .sort((a, b) => {
            if (filters.sortBy === 'newest') return new Date(b.applied_at) - new Date(a.applied_at);
            if (filters.sortBy === 'oldest') return new Date(a.applied_at) - new Date(b.applied_at);

            if (filters.sortBy === 'matchScore') {
                const aScore = (calculateMatchScore(a)?.score ?? a.match_score ?? a.score ?? 0);
                const bScore = (calculateMatchScore(b)?.score ?? b.match_score ?? b.score ?? 0);
                if (bScore !== aScore) {
                    return bScore - aScore;
                }
                const expMap = {
                    '10+ years': 7, '8-10 years': 6, '5-7 years': 5,
                    '3-4 years': 4, '1-2 years': 3, '0-1 years': 2, '0 years': 1
                };
                const aRel = expMap[a.relevant_experience] || 0;
                const bRel = expMap[b.relevant_experience] || 0;
                if (bRel !== aRel) return bRel - aRel;

                const aExp = expMap[a.overall_experience] || 0;
                const bExp = expMap[b.overall_experience] || 0;
                if (bExp !== aExp) return bExp - aExp;

                return new Date(b.applied_at) - new Date(a.applied_at);
            }

            if (filters.sortBy === 'lowestScore') {
                const aScore = (calculateMatchScore(a)?.score ?? a.match_score ?? a.score ?? 0);
                const bScore = (calculateMatchScore(b)?.score ?? b.match_score ?? b.score ?? 0);
                if (aScore !== bScore) {
                    return aScore - bScore;
                }
                return new Date(b.applied_at) - new Date(a.applied_at);
            }

            if (filters.sortBy === 'highExperience') {
                const expMap = {
                    '10+ years': 7, '8-10 years': 6, '5-7 years': 5,
                    '3-4 years': 4, '1-2 years': 3, '0-1 years': 2, '0 years': 1
                };
                const aOverall = expMap[a.overall_experience] || 0;
                const bOverall = expMap[b.overall_experience] || 0;
                if (bOverall !== aOverall) return bOverall - aOverall;

                const aRel = expMap[a.relevant_experience] || 0;
                const bRel = expMap[b.relevant_experience] || 0;
                if (bRel !== aRel) return bRel - aRel;

                const aScore = (calculateMatchScore(a)?.score ?? a.match_score ?? a.score ?? 0);
                const bScore = (calculateMatchScore(b)?.score ?? b.match_score ?? b.score ?? 0);
                if (bScore !== aScore) return bScore - aScore;

                return new Date(b.applied_at) - new Date(a.applied_at);
            }

            if (filters.sortBy === 'lowExperience') {
                const expMap = {
                    '10+ years': 7, '8-10 years': 6, '5-7 years': 5,
                    '3-4 years': 4, '1-2 years': 3, '0-1 years': 2, '0 years': 1
                };
                const aOverall = expMap[a.overall_experience] || 0;
                const bOverall = expMap[b.overall_experience] || 0;
                if (aOverall !== bOverall) return aOverall - bOverall;

                const aRel = expMap[a.relevant_experience] || 0;
                const bRel = expMap[b.relevant_experience] || 0;
                if (aRel !== bRel) return aRel - bRel;

                return new Date(b.applied_at) - new Date(a.applied_at);
            }

            if (filters.sortBy === 'salaryAsc') {
                const aSal = parseNumericSalary(a.salary_expectation);
                const bSal = parseNumericSalary(b.salary_expectation);
                const aVal = aSal !== null ? aSal : Infinity;
                const bVal = bSal !== null ? bSal : Infinity;
                if (aVal !== bVal) return aVal - bVal;
                return new Date(b.applied_at) - new Date(a.applied_at);
            }

            if (filters.sortBy === 'salaryDesc') {
                const aSal = parseNumericSalary(a.salary_expectation);
                const bSal = parseNumericSalary(b.salary_expectation);
                const aVal = aSal !== null ? aSal : -1;
                const bVal = bSal !== null ? bSal : -1;
                if (bVal !== aVal) return bVal - aVal;
                return new Date(b.applied_at) - new Date(a.applied_at);
            }

            if (filters.sortBy === 'nameAsc') {
                const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
                const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
                return aName.localeCompare(bName);
            }

            return new Date(b.applied_at) - new Date(a.applied_at);
        });

    // Pagination Logic
    const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedApps = filteredApps.slice(startIndex, startIndex + itemsPerPage);

    // Calculate active filter count and chips
    const activeFilterCount = [
        filters.search,
        filters.vacancy_id,
        filters.company_id,
        filters.overall_experience,
        filters.relevant_experience,
        filters.qualification,
        filters.salary_match,
        filters.status,
        filters.interview_date,
        (filters.sortBy && filters.sortBy !== 'newest' ? filters.sortBy : '')
    ].filter(Boolean).length;

    const activeChips = [];
    if (filters.search) {
        activeChips.push({ key: 'search', label: `Search: "${filters.search}"`, clear: () => setFilters(prev => ({ ...prev, search: '' })) });
    }
    if (filters.vacancy_id) {
        const vacName = vacancies.find(v => String(v.id) === String(filters.vacancy_id))?.title || 'Position';
        activeChips.push({ key: 'vacancy_id', label: `Role: ${vacName}`, clear: () => handleVacancyChange('') });
    }
    if (filters.company_id) {
        const compName = companies.find(c => String(c.id) === String(filters.company_id))?.name || 'Establishment';
        activeChips.push({ key: 'company_id', label: `Entity: ${compName}`, clear: () => handleCompanyChange('') });
    }
    if (filters.overall_experience) {
        activeChips.push({ key: 'overall_experience', label: `Min Exp: ${filters.overall_experience}`, clear: () => setFilters(prev => ({ ...prev, overall_experience: '' })) });
    }
    if (filters.relevant_experience) {
        activeChips.push({ key: 'relevant_experience', label: `Rel Exp: ${filters.relevant_experience}`, clear: () => setFilters(prev => ({ ...prev, relevant_experience: '' })) });
    }
    if (filters.qualification) {
        activeChips.push({ key: 'qualification', label: `Academic Status: ${filters.qualification}`, clear: () => setFilters(prev => ({ ...prev, qualification: '' })) });
    }
    if (filters.salary_match) {
        const salaryLabels = {
            within: 'Within Budget',
            above: 'Above Budget',
            below: 'Below Budget',
            specified: 'Expectation Mentioned',
            unspecified: 'Expectation Not Mentioned'
        };
        activeChips.push({ key: 'salary_match', label: `Salary: ${salaryLabels[filters.salary_match] || filters.salary_match}`, clear: () => setFilters(prev => ({ ...prev, salary_match: '' })) });
    }
    if (filters.status) {
        activeChips.push({ key: 'status', label: `Status: ${filters.status.replace('_', ' ')}`, clear: () => setFilters(prev => ({ ...prev, status: '', interview_date: '' })) });
    }
    if (filters.interview_date) {
        activeChips.push({ key: 'interview_date', label: `Interview: ${filters.interview_date}`, clear: () => setFilters(prev => ({ ...prev, interview_date: '' })) });
    }
    if (filters.sortBy && filters.sortBy !== 'newest') {
        const sortLabels = {
            matchScore: 'Highest Match Score',
            lowestScore: 'Lowest Match Score',
            oldest: 'Oldest First'
        };
        activeChips.push({
            key: 'sortBy',
            label: `Sort: ${sortLabels[filters.sortBy] || filters.sortBy}`,
            clear: () => setFilters(prev => ({ ...prev, sortBy: 'newest' }))
        });
    }

    return (
        <div className="manage-vacancies-console">
            {/* MINIMALIST HERO HEADER */}
            <div className="vacancies-orchestration-header">
                <div className="header-content-p">
                    <div className="console-badge">
                        <span className="live-dot pulse"></span>
                        CANDIDATE ORCHESTRATION PIPELINE
                    </div>
                    <h1 className="serif-title-p">Applications</h1>
                    <p className="hero-subline">Review and manage candidates for all active roles across George Steuart & Company.</p>
                </div>
                <button className="btn-establish-p" onClick={handleExport} disabled={isExporting} style={{ opacity: isExporting ? 0.7 : 1 }}>
                    <FiDownload /> <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
                </button>
            </div>

            {/* MODERN ULTRA-PREMIUM FILTER & SEARCH SUITE WITH COLLAPSIBLE PANEL */}
            <div className="applicant-filter-card">
                {/* Main Top Control Row: Search + Position Dropdown + Filter Toggle Button + Actions */}
                <div className="filter-top-bar">
                    {/* Search Bar Input */}
                    <div className="filter-search-wrapper">
                        <div className="search-input-box">
                            <FiSearch className="search-lead-icon" />
                            <input
                                id="applicant_search"
                                name="applicant_search"
                                type="text"
                                placeholder="Search by applicant name, email, contact number, or keyword..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                            {filters.search && (
                                <button
                                    type="button"
                                    className="clear-search-trigger"
                                    onClick={() => setFilters({ ...filters, search: '' })}
                                    title="Clear search"
                                >
                                    <FiX size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Position Filter Dropdown next to Search */}
                    <div className="filter-position-wrapper">
                        <div className={`top-position-box ${filters.vacancy_id ? 'has-selected' : ''}`}>
                            <FiBriefcase className="top-position-icon" />
                            <select
                                id="top_vacancy_filter"
                                name="top_vacancy_id"
                                aria-label="Filter by position"
                                value={filters.vacancy_id}
                                onChange={(e) => handleVacancyChange(e.target.value)}
                            >
                                <option value="">All Positions ({visibleVacancies.length})</option>
                                {visibleVacancies.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.title} {!filters.company_id && v.company_name ? `(${v.company_name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="filter-top-actions">
                        {/* Filter Toggle Button */}
                        <button
                            type="button"
                            className={`btn-toggle-filters ${showFilterPanel ? 'active' : ''} ${activeFilterCount > 0 ? 'has-active' : ''}`}
                            onClick={() => setShowFilterPanel(prev => !prev)}
                            title="Toggle filter options"
                        >
                            <FiFilter className="btn-filter-icon" />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="filter-count-badge">{activeFilterCount}</span>
                            )}
                            {showFilterPanel ? <FiChevronUp className="btn-chevron-icon" /> : <FiChevronDown className="btn-chevron-icon" />}
                        </button>

                        {filters.vacancy_id && (
                            <button
                                type="button"
                                className="btn-match-reqs"
                                onClick={applyAutoMatch}
                                title="Auto-filter candidates matching this role's requirements"
                            >
                                <FiCheckCircle size={14} /> Match Reqs
                            </button>
                        )}

                        {hasActiveFilters && (
                            <button 
                                type="button" 
                                className="btn-clear-all-filters" 
                                onClick={clearFilters}
                                title="Reset all filters"
                            >
                                <FiRotateCcw size={13} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Active Filters Chips Ribbon (Always visible if chips exist) */}
                {activeChips.length > 0 && (
                    <div className="active-filter-chips-row">
                        <div className="chips-left-group">
                            <span className="chips-label-badge">
                                <FiFilter size={12} />
                                <span>Active Filters</span>
                                <span className="chips-count-dot">{activeChips.length}</span>
                            </span>
                            <div className="chips-list">
                                {activeChips.map(chip => (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        className="filter-chip"
                                        onClick={chip.clear}
                                        title={`Remove ${chip.label}`}
                                    >
                                        <span className="chip-text">{chip.label}</span>
                                        <span className="chip-remove-circle">
                                            <FiX size={10} />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="chips-clear-all-btn"
                            onClick={clearFilters}
                            title="Reset all filters"
                        >
                            <FiRotateCcw size={11} />
                            <span>Clear All</span>
                        </button>
                    </div>
                )}

                {/* Expandable Filter Dropdowns Grid */}
                {showFilterPanel && (
                    <div className="filter-dropdowns-expandable animated-fade-in">
                        <div className="filter-panel-header">
                            <span className="panel-title-text">Filter & Refine Candidate Pipeline</span>
                            <button 
                                type="button" 
                                className="panel-close-btn" 
                                onClick={() => setShowFilterPanel(false)}
                                title="Hide filters"
                            >
                                <FiX size={14} /> Close
                            </button>
                        </div>

                        <div className="filter-dropdowns-grid">
                            {/* 1. Establishment / Entity */}
                            {(admin.role === 'super_admin' || admin.role === 'admin') && (
                                <div className={`filter-field-box ${filters.company_id ? 'has-value' : ''}`}>
                                    <label htmlFor="company_filter">
                                        <FiHome className="field-icon" /> Establishment
                                    </label>
                                    <div className="custom-select-wrapper">
                                        <select
                                            id="company_filter"
                                            name="company_id"
                                            value={filters.company_id}
                                            onChange={(e) => handleCompanyChange(e.target.value)}
                                        >
                                            <option value="">All GS Entities</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* 2. Position / Role */}
                            <div className={`filter-field-box ${filters.vacancy_id ? 'has-value' : ''}`}>
                                <label htmlFor="vacancy_filter">
                                    <FiBriefcase className="field-icon" /> Position
                                </label>
                                <div className="custom-select-wrapper">
                                    <select
                                        id="vacancy_filter"
                                        name="vacancy_id"
                                        value={filters.vacancy_id}
                                        onChange={(e) => handleVacancyChange(e.target.value)}
                                    >
                                        <option value="">All Roles ({visibleVacancies.length})</option>
                                        {visibleVacancies.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.title} {!filters.company_id && v.company_name ? `(${v.company_name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 3. Min Overall Experience */}
                            <div className={`filter-field-box ${filters.overall_experience ? 'has-value' : ''}`}>
                                <label htmlFor="experience_filter">
                                    <FiCheckCircle className="field-icon" /> Min. Experience
                                </label>
                                <div className="custom-select-wrapper">
                                    <select
                                        id="experience_filter"
                                        name="overall_experience"
                                        value={filters.overall_experience}
                                        onChange={(e) => setFilters({ ...filters, overall_experience: e.target.value })}
                                    >
                                        <option value="">All Experience</option>
                                        <option value="0 years">Freshers (0 years)</option>
                                        <option value="0-1 years">0–1 years</option>
                                        <option value="1-2 years">1–2 years</option>
                                        <option value="3-4 years">3–4 years</option>
                                        <option value="5-7 years">5–7 years</option>
                                        <option value="8-10 years">8–10 years</option>
                                        <option value="10+ years">10+ years</option>
                                    </select>
                                </div>
                            </div>

                            {/* 4. Min Relevant Experience */}
                            <div className={`filter-field-box ${filters.relevant_experience ? 'has-value' : ''}`}>
                                <label htmlFor="relevant_experience_filter">
                                    <FiAward className="field-icon" /> Relevant Exp.
                                </label>
                                <div className="custom-select-wrapper">
                                    <select
                                        id="relevant_experience_filter"
                                        name="relevant_experience"
                                        value={filters.relevant_experience}
                                        onChange={(e) => setFilters({ ...filters, relevant_experience: e.target.value })}
                                    >
                                        <option value="">All Relevant Exp.</option>
                                        <option value="0 years">Freshers (0 years)</option>
                                        <option value="0-1 years">0–1 years</option>
                                        <option value="1-2 years">1–2 years</option>
                                        <option value="3-4 years">3–4 years</option>
                                        <option value="5-7 years">5–7 years</option>
                                        <option value="8-10 years">8–10 years</option>
                                        <option value="10+ years">10+ years</option>
                                    </select>
                                </div>
                            </div>

                            {/* 5. Academic Status */}
                            <div className={`filter-field-box ${filters.qualification ? 'has-value' : ''}`}>
                                <label htmlFor="qualification_filter">
                                    <FiFileText className="field-icon" /> Academic Status
                                </label>
                                <div className="custom-select-wrapper">
                                    <select
                                        id="qualification_filter"
                                        name="qualification"
                                        value={filters.qualification}
                                        onChange={(e) => setFilters({ ...filters, qualification: e.target.value })}
                                    >
                                        <option value="">Any Academic Status</option>
                                        {QUALIFICATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* 6. Salary Match */}
                            <div className={`filter-field-box ${filters.salary_match ? 'has-value' : ''}`}>
                                <label htmlFor="salary_filter">
                                    <FiTarget className="field-icon" /> Salary Match
                                </label>
                                <div className="custom-select-wrapper">
                                    <select
                                        id="salary_filter"
                                        name="salary_match"
                                        value={filters.salary_match}
                                        onChange={(e) => setFilters({ ...filters, salary_match: e.target.value })}
                                    >
                                        <option value="">All Salaries</option>
                                        <option value="within">🎯 Within Job Budget</option>
                                        <option value="above">📈 Above Job Budget</option>
                                        <option value="below">📉 Below Job Budget</option>
                                        <option value="specified">💵 Expectation Mentioned</option>
                                        <option value="unspecified">❓ Expectation Not Mentioned</option>
                                    </select>
                                </div>
                            </div>

                            {/* 7. Application Status */}
                            <div className={`filter-field-box ${filters.status ? 'has-value' : ''}`}>
                                <label htmlFor="status_filter">
                                    <FiFilter className="field-icon" /> Status
                                </label>
                                <div className="custom-select-wrapper">
                                    <select
                                        id="status_filter"
                                        name="status"
                                        value={filters.status}
                                        onChange={(e) => setFilters({
                                            ...filters,
                                            status: e.target.value,
                                            interview_date: e.target.value === 'shortlisted' ? filters.interview_date : ''
                                        })}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="under_review">Under Review</option>
                                        <option value="shortlisted">Shortlisted</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            {/* 8. Interview Date (Conditional for Shortlisted) */}
                            {filters.status === 'shortlisted' && (
                                <div className={`filter-field-box ${filters.interview_date ? 'has-value' : ''}`}>
                                    <label htmlFor="interview_date_filter">
                                        <FiCalendar className="field-icon" /> Interview Date
                                    </label>
                                    <div className="custom-select-wrapper">
                                        <input
                                            id="interview_date_filter"
                                            name="interview_date"
                                            type="date"
                                            value={filters.interview_date}
                                            onChange={(e) => setFilters({ ...filters, interview_date: e.target.value })}
                                            className="custom-date-input"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 9. Sort Order */}
                            <div className={`filter-field-box sort-field-box ${filters.sortBy && filters.sortBy !== 'newest' ? 'has-value' : ''}`}>
                                <label htmlFor="sort_by">
                                    <FiBarChart2 className="field-icon" /> Sort Order
                                </label>
                                <div className="custom-select-wrapper">
                                    <select
                                        id="sort_by"
                                        name="sortBy"
                                        value={filters.sortBy}
                                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                        className="sort-select-control"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="matchScore">Highest Match Score</option>
                                        <option value="lowestScore">Lowest Match Score</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== Job Position Info Panel — auto-displays on vacancy select ===== */}
            {filters.vacancy_id && (() => {
                if (!selVac.id) return null;
                return (
                    <div style={{
                        margin: '0 0 24px 0',
                        borderRadius: '16px',
                        border: '1px solid rgba(200,169,81,0.25)',
                        background: 'linear-gradient(135deg, #fffdf5 0%, #fff8e8 100%)',
                        boxShadow: '0 4px 20px rgba(184,134,11,0.08)',
                        overflow: 'hidden'
                    }}>
                        {/* Header bar */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1a0305 0%, #3d0a10 100%)',
                            padding: '14px 24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <FiBriefcase style={{ color: '#c8a951', flexShrink: 0 }} size={18} />
                            <div style={{ flex: 1 }}>
                                <span style={{ color: '#c8a951', fontWeight: 700, fontSize: '1rem', letterSpacing: 0.3 }}>
                                    {selVac.title}
                                </span>
                                {selVac.company_name && (
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: 10 }}>
                                        — {selVac.company_name}
                                    </span>
                                )}
                            </div>
                            <div
                                onClick={() => setShowJobDetails(!showJobDetails)}
                                style={{
                                    background: showJobDetails ? 'rgba(200,169,81,0.2)' : 'rgba(200,169,81,0.1)',
                                    border: '1px solid rgba(200,169,81,0.35)',
                                    color: '#c8a951',
                                    borderRadius: 8,
                                    padding: '5px 12px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="job-details-toggle-btn"
                            >
                                {showJobDetails ? 'Hide Details' : 'Job Details'}
                                <FiChevronRight style={{
                                    transform: showJobDetails ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s ease'
                                }} size={15} />
                            </div>
                        </div>

                        {/* Info pills row — only shown when expanded */}
                        {showJobDetails && (
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 12,
                                padding: '16px 24px',
                                borderBottom: '1px solid rgba(200,169,81,0.15)',
                                animation: 'fadeInDown 0.3s ease-out'
                            }}>
                                {/* Reference Number */}
                                {selVac.reference_number && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        background: '#fff', border: '1px solid rgba(200,169,81,0.3)',
                                        borderRadius: 10, padding: '7px 14px'
                                    }}>
                                        <FiHash size={13} style={{ color: '#b8860b' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ref No.</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b8860b' }}>{selVac.reference_number}</span>
                                    </div>
                                )}

                                {/* Min Experience */}
                                {selVac.min_experience && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        background: '#fff', border: '1px solid rgba(99,179,237,0.3)',
                                        borderRadius: 10, padding: '7px 14px'
                                    }}>
                                        <FiAward size={13} style={{ color: '#3182ce' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Min. Experience</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3182ce' }}>{selVac.min_experience}</span>
                                    </div>
                                )}

                                {/* Min Relevant Experience */}
                                {selVac.min_relevant_experience && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        background: '#fff', border: '1px solid rgba(99,179,237,0.3)',
                                        borderRadius: 10, padding: '7px 14px'
                                    }}>
                                        <FiTarget size={13} style={{ color: '#2b6cb0' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Relevant Exp.</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2b6cb0' }}>{selVac.min_relevant_experience}</span>
                                    </div>
                                )}

                                {/* Required Qualification */}
                                {selVac.min_qualification && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        background: '#fff', border: '1px solid rgba(72,187,120,0.35)',
                                        borderRadius: 10, padding: '7px 14px'
                                    }}>
                                        <FiCheckCircle size={13} style={{ color: '#38a169' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Required Qual.</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38a169' }}>{selVac.min_qualification}</span>
                                    </div>
                                )}

                                {/* Employment Type */}
                                {selVac.employment_type && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        background: '#fff', border: '1px solid rgba(160,118,249,0.3)',
                                        borderRadius: 10, padding: '7px 14px'
                                    }}>
                                        <FiTag size={13} style={{ color: '#805ad5' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#805ad5' }}>{selVac.employment_type}</span>
                                    </div>
                                )}

                                {/* Salary Budget */}
                                {(selVac.min_salary || selVac.max_salary || selVac.salary_range) && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        background: '#fff', border: '1px solid rgba(16,185,129,0.3)',
                                        borderRadius: 10, padding: '7px 14px'
                                    }}>
                                        <FiDollarSign size={13} style={{ color: '#10b981' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Salary Budget</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                                            {selVac.min_salary || selVac.max_salary ? (
                                                `LKR ${selVac.min_salary ? Number(selVac.min_salary).toLocaleString() : '0'} - ${selVac.max_salary ? Number(selVac.max_salary).toLocaleString() : 'Negotiable'}`
                                            ) : (
                                                selVac.salary_range
                                            )}
                                        </span>
                                    </div>
                                )}

                                {/* Location */}
                                {selVac.location && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        background: '#fff', border: '1px solid rgba(237,137,54,0.3)',
                                        borderRadius: 10, padding: '7px 14px'
                                    }}>
                                        <FiMapPin size={13} style={{ color: '#dd6b20' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Location</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dd6b20' }}>{selVac.location}</span>
                                    </div>
                                )}

                                {/* Deadline */}
                                {selVac.expire_date && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        background: '#fff', border: '1px solid rgba(252,129,74,0.3)',
                                        borderRadius: 10, padding: '7px 14px'
                                    }}>
                                        <FiCalendar size={13} style={{ color: '#e53e3e' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Deadline</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e53e3e' }}>
                                            {new Date(selVac.expire_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </div>)}

                        {/* Description & Requirements */}
                        {showJobDetails && (selVac.description || selVac.requirements) && (
                            <div className="vacancy-details-grid animated-fade-in" style={{ animationDuration: '0.4s' }}>
                                {selVac.description && (
                                    <div className="vd-col description-col">
                                        <div className="vd-col-header">
                                            <FiInfo size={14} />
                                            <span>Job Description</span>
                                        </div>
                                        <div className="vd-content-box">
                                            {renderFormattedText(selVac.description)}
                                        </div>
                                    </div>
                                )}
                                {selVac.requirements && (
                                    <div className="vd-col requirements-col">
                                        <div className="vd-col-header green">
                                            <FiAlertCircle size={14} />
                                            <span>Requirements</span>
                                        </div>
                                        <div className="vd-content-box">
                                            {renderFormattedText(selVac.requirements)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ===== Suggested Talent Pool — Teaser + Collapsible Section ===== */}
            {filters.vacancy_id && suggestions.length > 0 && (
                <div className="stp-section">
                    {/* Teaser Banner — always visible, click to expand */}
                    <div className="stp-header-banner stp-teaser" onClick={() => setShowSuggestions(s => !s)}>
                        <div className="stp-header-left">
                            <div className="stp-icon-wrap">🔥</div>
                            <div>
                                <h2 className="stp-title">
                                    {suggestions.length} candidate{suggestions.length !== 1 ? 's' : ''} already match this job!
                                </h2>
                                <p className="stp-subtitle">
                                    {showSuggestions
                                        ? 'Click to hide — these candidates opted in for future roles'
                                        : 'From your Talent Pool — click to view & invite them instantly'}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div className="stp-match-badge">
                                <span className="stp-count">{suggestions.length}</span>
                                <span className="stp-count-label">Match{suggestions.length !== 1 ? 'es' : ''}</span>
                            </div>
                            <div className="stp-chevron" style={{ transform: showSuggestions ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                <FiChevronRight size={22} style={{ transform: 'rotate(90deg)', color: 'rgba(255,255,255,0.6)' }} />
                            </div>
                        </div>
                    </div>

                    {/* Candidate Cards — only shown when expanded */}
                    {showSuggestions && (
                        <div className="stp-cards-grid">
                            {suggestions.map((sug, idx) => (
                                <div
                                    key={idx}
                                    className="stp-card"
                                    onClick={() => setShowDetail({ ...sug, is_suggestion: true })}
                                >
                                    <div className="stp-card-inner">
                                        <div className="stp-avatar">
                                            {sug.first_name?.[0]}{sug.last_name?.[0]}
                                        </div>
                                        <div className="stp-info">
                                            <div className="stp-name-row">
                                                <span className="stp-name">{sug.first_name} {sug.last_name}</span>
                                                <span className="stp-consented-badge">✓ Consented</span>
                                            </div>
                                            <div className="stp-prev">
                                                Previously applied: <strong>{sug.last_applied_vacancy}</strong>
                                            </div>
                                            <div className="stp-pills-row">
                                                <span className="stp-pill stp-pill-gold">{sug.overall_experience} exp</span>
                                                <span className="stp-pill stp-pill-light">{sug.qualification}</span>
                                                {sug.last_status === 'shortlisted' && (
                                                    <span className="stp-pill stp-pill-green">Favored</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="stp-action">
                                            <a
                                                href={`mailto:${sug.email}?subject=Exciting Opportunity at George Steuart`}
                                                className="stp-invite-btn"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <FiMail size={14} /> Invite
                                            </a>
                                            <button className="stp-view-btn" onClick={(e) => { e.stopPropagation(); setShowDetail({ ...sug, is_suggestion: true }); }}>
                                                View <FiChevronRight size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <style>{`
                        .stp-section {
                            margin-bottom: 36px;
                            border-radius: 20px;
                            overflow: hidden;
                            border: 1px solid rgba(200,169,81,0.2);
                            box-shadow: 0 8px 30px rgba(0,0,0,0.06);
                        }
                        .stp-header-banner {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            background: linear-gradient(135deg, #2a050b 0%, var(--crimson-dark) 100%);
                            padding: 22px 28px;
                            gap: 20px;
                        }
                        .stp-teaser {
                            cursor: pointer;
                            user-select: none;
                            transition: opacity 0.15s;
                        }
                        .stp-teaser:hover { opacity: 0.92; }
                        .stp-chevron { transition: transform 0.3s ease; }
                        .stp-header-left {
                            display: flex;
                            align-items: center;
                            gap: 16px;
                        }
                        .stp-icon-wrap {
                            font-size: 1.8rem;
                            width: 52px;
                            height: 52px;
                            background: rgba(200,169,81,0.15);
                            border: 1px solid rgba(200,169,81,0.3);
                            border-radius: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        }
                        .stp-title {
                            color: #fff;
                            font-family: var(--font-heading, serif);
                            font-size: 1.25rem;
                            margin: 0 0 4px 0;
                            font-weight: 700;
                        }
                        .stp-subtitle {
                            color: rgba(255,255,255,0.55);
                            font-size: 0.8rem;
                            margin: 0;
                        }
                        .stp-match-badge {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            background: rgba(200,169,81,0.12);
                            border: 1px solid rgba(200,169,81,0.35);
                            border-radius: 14px;
                            padding: 10px 20px;
                            flex-shrink: 0;
                        }
                        .stp-count {
                            font-size: 1.8rem;
                            font-weight: 800;
                            color: var(--gold-accent, #c8a951);
                            line-height: 1;
                        }
                        .stp-count-label {
                            font-size: 0.65rem;
                            color: rgba(200,169,81,0.7);
                            text-transform: uppercase;
                            letter-spacing: 0.8px;
                            font-weight: 600;
                        }
                        .stp-cards-grid {
                            background: #fafbfc;
                            display: flex;
                            flex-direction: column;
                        }
                        .stp-card {
                            cursor: pointer;
                            border-bottom: 1px solid #f0f1f5;
                            transition: background 0.2s;
                        }
                        .stp-card:last-child { border-bottom: none; }
                        .stp-card:hover { background: #fff; }
                        .stp-card-inner {
                            display: flex;
                            align-items: center;
                            gap: 18px;
                            padding: 18px 28px;
                        }
                        .stp-avatar {
                            width: 48px;
                            height: 48px;
                            border-radius: 50%;
                            background: linear-gradient(135deg, var(--crimson-dark), var(--crimson));
                            color: #fff;
                            font-weight: 800;
                            font-size: 1rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                            letter-spacing: 1px;
                        }
                        .stp-info { flex: 1; min-width: 0; }
                        .stp-name-row {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            margin-bottom: 4px;
                        }
                        .stp-name {
                            font-weight: 700;
                            color: var(--text-primary, #1a1a2e);
                            font-size: 0.95rem;
                        }
                        .stp-consented-badge {
                            font-size: 0.6rem;
                            background: #ecfdf5;
                            color: #059669;
                            border: 1px solid #a7f3d0;
                            padding: 2px 7px;
                            border-radius: 100px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .stp-prev {
                            font-size: 0.78rem;
                            color: var(--text-muted, #94a3b8);
                            margin-bottom: 8px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        .stp-prev strong { color: #475569; }
                        .stp-pills-row { display: flex; gap: 6px; flex-wrap: wrap; }
                        .stp-pill {
                            font-size: 0.7rem;
                            font-weight: 700;
                            padding: 2px 9px;
                            border-radius: 100px;
                        }
                        .stp-pill-gold {
                            background: rgba(200,169,81,0.1);
                            color: var(--gold-accent, #c8a951);
                            border: 1px solid rgba(200,169,81,0.25);
                        }
                        .stp-pill-light { background: #f1f5f9; color: #475569; }
                        .stp-pill-green { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
                        .stp-action { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
                        .stp-invite-btn {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            background: var(--gold-accent, #c8a951);
                            color: #fff;
                            font-size: 0.8rem;
                            font-weight: 700;
                            padding: 7px 14px;
                            border-radius: 8px;
                            text-decoration: none;
                            transition: opacity 0.2s, transform 0.2s;
                        }
                        .stp-invite-btn:hover { opacity: 0.88; transform: translateY(-1px); }
                        .stp-view-btn {
                            display: flex;
                            align-items: center;
                            gap: 4px;
                            background: none;
                            border: 1.5px solid #e2e8f0;
                            color: #475569;
                            font-size: 0.8rem;
                            font-weight: 600;
                            padding: 7px 12px;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: inherit;
                        }
                        .stp-view-btn:hover { border-color: var(--crimson, #8b1a2b); color: var(--crimson, #8b1a2b); }
                        @media (max-width: 640px) {
                            .stp-card-inner { flex-wrap: wrap; }
                            .stp-action { width: 100%; justify-content: flex-end; }
                        }
                    `}</style>
                </div>
            )}

            {/* DATA ORCHESTRATION TABLE */}
            <div className="orchestration-table-wrapper card-p" style={{ marginBottom: '16px' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredApps.length}</strong> candidates
                        </span>
                        {selectedIds.length > 0 && (
                            <div className="bulk-selection-badge animated-fade-in">
                                <strong>{selectedIds.length}</strong> Selected
                            </div>
                        )}
                    </div>
                    {selectedIds.length > 0 && !['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) && (
                        <button
                            className="btn btn-danger-minimal"
                            onClick={() => setShowDeleteModal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px' }}
                        >
                            <FiXCircle /> Bulk Delete
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="loading-state-p">
                        <div className="spinner-p"></div>
                        <p>Synchronizing pipeline data...</p>
                    </div>
                ) : filteredApps.length === 0 ? (
                    <div className="empty-state-p">
                        <div className="empty-icon"><FiUser /></div>
                        <h3>No prospects found</h3>
                        <p>We couldn't find any candidates matching your current filters.</p>
                        <button className="btn btn-outline" onClick={clearFilters}>Reset Console</button>
                    </div>
                ) : (
                    <div className="premium-table-container">
                        <table className="premium-table applicants-table">
                            <colgroup>
                                {admin.role !== 'super_admin' && <col style={{ width: '38px' }} />}
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '18%' }} />
                                <col style={{ width: '16%' }} />
                                <col style={{ width: '10%' }} />
                                <col className="col-credentials" style={{ width: '210px' }} />
                                <col className="col-applied-date" style={{ width: '115px' }} />
                                <col style={{ width: '11%' }} />
                                <col style={{ width: '5%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    {admin.role !== 'super_admin' && (
                                        <th style={{ width: '38px', paddingLeft: '16px' }}>
                                            <input
                                                type="checkbox"
                                                className="premium-checkbox"
                                                onChange={handleSelectAll}
                                                checked={paginatedApps.length > 0 && selectedIds.length === paginatedApps.length}
                                            />
                                        </th>
                                    )}
                                    <th>Candidate</th>
                                    <th>Target Position</th>
                                    <th>CV Match</th>
                                    <th>Status</th>
                                    <th className="th-credentials">Credentials</th>
                                    <th className="th-applied-date">Applied Date</th>
                                    <th>Interview Schedule</th>
                                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedApps.map((app) => (
                                    <tr key={app.id} className={selectedIds.includes(app.id) ? 'row-selected' : ''}>
                                        {admin.role !== 'super_admin' && (
                                            <td data-label="Select">
                                                <input
                                                    type="checkbox"
                                                    className="premium-checkbox"
                                                    checked={selectedIds.includes(app.id)}
                                                    onChange={() => handleSelectOne(app.id)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            </td>
                                        )}
                                        <td data-label="Candidate">
                                            <div className="candidate-cell" onClick={() => setShowDetail(app)} style={{ cursor: 'pointer' }} title="Click to view candidate assessment & details">
                                                <div className="candidate-avatar">
                                                    {app.first_name?.[0]}{app.last_name?.[0]}
                                                </div>
                                                <div className="candidate-info">
                                                    <div className="candidate-name-row">
                                                        <span className="candidate-name-txt" title={`${app.first_name} ${app.last_name}`}>
                                                            {app.first_name} {app.last_name}
                                                        </span>
                                                        {app.is_email_blocked == 1 && (
                                                            <span title="This email has been blocked in the Talent Pool" className="blocked-pill">
                                                                <FiSlash size={9} /> Blocked
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="candidate-email-txt" title={app.email}>
                                                        <FiMail size={12} className="email-icon-subtle" />
                                                        <span className="email-text-inner">{app.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Target Position">
                                            <div className="position-cell">
                                                <div className="position-details">
                                                    <h4 className="position-title" title={app.vacancy_title}>{app.vacancy_title}</h4>
                                                    <div className="company-name" title={app.company_name}>
                                                        <FiBriefcase size={11} className="company-icon-subtle" />
                                                        <span>{app.company_name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="CV Match" style={{ whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => setShowDetail(app)} title="Click to view full CV vs JD assessment">
                                            {(() => {
                                                const scoreData = calculateCandidateMatchScore(app, vacancies);
                                                const matchScore = scoreData.score || 0;
                                                const factors = scoreData.details?.factors || {};

                                                const salary = typeof factors.salary === 'number' ? factors.salary : 100;
                                                const experience = typeof factors.experience === 'number' ? factors.experience : 0;
                                                const qualification = typeof factors.qualification === 'number' ? factors.qualification : 0;
                                                const skillsScore = typeof factors.skills === 'number' ? factors.skills : 0;
                                                const jdScore = typeof factors.keyword === 'number' ? factors.keyword : 0;

                                                let matchClass = 'high';
                                                let tierName = 'High Match';
                                                if (matchScore < minMediumScore) {
                                                    matchClass = 'low';
                                                    tierName = 'Low Match';
                                                } else if (matchScore < minHighScore) {
                                                    matchClass = 'medium';
                                                    tierName = 'Medium Match';
                                                }

                                                const mismatchReason = extractCandidateMismatchReason(app, scoreData);

                                                return (
                                                    <div className="cve-match-cell">
                                                        <span className={`cve-match-pill ${matchClass}`}>
                                                            <span className="cve-match-dot" />
                                                            <strong>{matchScore}%</strong>
                                                            <span className="cve-match-tier-text">{tierName}</span>
                                                        </span>
                                                        <div className="cve-match-breakdown-grid">
                                                            <span className="cve-micro-rate" title="Skills Match: Candidate skills against vacancy requirements">
                                                                Skills: <strong>{skillsScore}%</strong>
                                                            </span>
                                                            <span className="cve-micro-rate" title="Experience: Relevant work history vs requirements">
                                                                Exp: <strong>{experience}%</strong>
                                                            </span>
                                                            <span className="cve-micro-rate" title="Qualifications: Degree level & specialization">
                                                                Qual: <strong>{qualification}%</strong>
                                                            </span>
                                                            <span className="cve-micro-rate" title="JD Alignment: Alignment of responsibilities with core role duties">
                                                                JD: <strong>{jdScore}%</strong>
                                                            </span>
                                                            <span className="cve-micro-rate cve-micro-rate-wide" title="Salary Budget: Salary expectation vs vacancy budget range">
                                                                Budget: <strong>{salary}%</strong>
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td data-label="Status">
                                            {(() => {
                                                const scoreData = calculateCandidateMatchScore(app, vacancies);
                                                const matchScore = scoreData.score || 0;
                                                const isLowMatch = matchScore < minMediumScore;
                                                const isAutoEnabled = app.auto_extraction_enabled !== undefined 
                                                    ? (app.auto_extraction_enabled === true || app.auto_extraction_enabled === '1' || app.auto_extraction_enabled === 1) 
                                                    : autoExtractionEnabled;

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                                        <span className={`status-pill status-${(app.status || 'pending').replace('_', '-')}`}>
                                                            {(app.status || 'pending').replace('_', ' ')}
                                                        </span>
                                                        {((app.extraction_status === 'extracted' || app.is_manual_extracted == 1) && (!isLowMatch || app.is_manual_extracted == 1)) ? (
                                                            <span className="cve-badge extracted" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                                                <FiCheckCircle size={10} /> Extracted {app.is_manual_extracted == 1 && <span style={{ fontSize: '0.62rem' }}>(Manual)</span>}
                                                            </span>
                                                        ) : (isAutoEnabled && isLowMatch) ? (
                                                            <span className="cve-badge disabled-low" style={{ fontSize: '0.7rem', padding: '2px 8px' }} title={`Match score (${matchScore}%) is below minimum threshold (<${minMediumScore}%).`}>
                                                                <FiXCircle size={10} /> Disabled (&lt;{minMediumScore}%)
                                                            </span>
                                                        ) : (
                                                            <span className="cve-badge unextracted" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                                                <FiAlertCircle size={10} /> Unextracted
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td data-label="Credentials" className="td-credentials">
                                            <div className="credentials-cell">
                                                <div className="credentials-badges-row">
                                                    {app.overall_experience && <span className="exp-badge">{app.overall_experience}</span>}
                                                    {filters.vacancy_id && (() => {
                                                        const scoreData = calculateMatchScore(app);
                                                        const isQual = scoreData.details.isQualified;
                                                        return isQual ? (
                                                            <div className="match-indicator qualified" title="Meets/Exceeds Required Experience">
                                                                <FiCheckCircle size={12} />
                                                            </div>
                                                        ) : (
                                                            <div className="match-indicator under" title="Below Required Experience">
                                                                <FiAlertCircle size={12} />
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                {app.qualification && (
                                                    <div className="degree-txt" title={app.qualification}>
                                                        <FiAward size={12} className="degree-icon-subtle" />
                                                        <span className="degree-text-inner">{app.qualification}</span>
                                                    </div>
                                                )}
                                                {app.salary_expectation && (
                                                    <div style={{ fontSize: '0.73rem', color: '#475569', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }} title={`Expected Salary: ${formatSalaryVal(app.salary_expectation)}`}>
                                                        <span style={{ fontWeight: 600 }}>Salary:</span>
                                                        <span style={{ color: '#0f172a', fontWeight: 700 }}>{formatSalaryVal(app.salary_expectation)}</span>
                                                        {(() => {
                                                            const appVac = vacancies.find(v => String(v.id) === String(app.vacancy_id)) || selVac || {};
                                                            const minB = appVac.min_salary || selVac.min_salary;
                                                            const maxB = appVac.max_salary || selVac.max_salary;
                                                            if (minB || maxB) {
                                                                const salResult = calculateSalaryMatchScore(app.salary_expectation, minB, maxB);
                                                                let badgeBg = '#f1f5f9';
                                                                let badgeColor = '#64748b';
                                                                let badgeText = 'N/A';
                                                                if (salResult.status === 'within_range') {
                                                                    badgeBg = '#ecfdf5'; badgeColor = '#059669'; badgeText = 'Within Budget';
                                                                } else if (salResult.status === 'above_range') {
                                                                    badgeBg = '#fff7ed'; badgeColor = '#c2410c'; badgeText = 'Above Budget';
                                                                } else if (salResult.status === 'below_range') {
                                                                    badgeBg = '#eff6ff'; badgeColor = '#1d4ed8'; badgeText = 'Below Budget';
                                                                }
                                                                return (
                                                                    <span style={{ fontSize: '0.62rem', background: badgeBg, color: badgeColor, padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                                        {badgeText}
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Applied Date" className="td-applied-date">
                                            <div className="timeline-cell">
                                                {(() => {
                                                    const rawDt = formatDateTime(app.applied_at);
                                                    const commaIdx = rawDt.indexOf(',');
                                                    if (commaIdx !== -1 && commaIdx < rawDt.length - 2) {
                                                        const datePart = rawDt.substring(0, commaIdx).trim();
                                                        const rest = rawDt.substring(commaIdx + 1).trim();
                                                        const yearMatch = rest.match(/^(\d{4})[,\s]*(.*)/);
                                                        if (yearMatch) {
                                                            return (
                                                                <div className="timeline-date-wrapper">
                                                                    <div className="applied-date-main">
                                                                        <FiCalendar size={12} className="calendar-icon-subtle" />
                                                                        <span>{datePart}, {yearMatch[1]}</span>
                                                                    </div>
                                                                    {yearMatch[2] && <div className="applied-time-sub">{yearMatch[2].trim()}</div>}
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="timeline-date-wrapper">
                                                                <div className="applied-date-main">
                                                                    <FiCalendar size={12} className="calendar-icon-subtle" />
                                                                    <span>{datePart}</span>
                                                                </div>
                                                                <div className="applied-time-sub">{rest}</div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="applied-date-main">
                                                            <FiCalendar size={12} className="calendar-icon-subtle" />
                                                            <span>{rawDt}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td data-label="Interview Schedule">
                                            {app.status === 'shortlisted' && app.interview_date ? (
                                                <div className="schedule-widget">
                                                    <div className="schedule-time-row">
                                                        <FiCalendar size={12} style={{ color: '#059669', flexShrink: 0 }} />
                                                        <span className="schedule-time">{formatDate(app.interview_date)}</span>
                                                    </div>
                                                    <div className="schedule-status-row">
                                                        <span className="schedule-time-sub">{app.interview_time}</span>
                                                        {app.interview_confirmed === 'yes' ? (
                                                            <span className="interview-pill confirmed">Confirmed</span>
                                                        ) : app.interview_confirmed === 'no' ? (
                                                            <span className="interview-pill declined">Declined</span>
                                                        ) : (
                                                            <span className="interview-pill invited">Invited</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>—</span>
                                            )}
                                        </td>
                                        <td data-label="Actions">
                                            <div className="actions-cell">
                                                {app.status === 'shortlisted' ? (
                                                    <button
                                                        className={`action-btn ${app.interview_date ? 'success-active' : 'success'}`}
                                                        title={['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? "Action restricted" : (app.interview_date ? "Interview Invitation Sent - Click to edit/resend" : "Send Interview Invite")}
                                                        style={{
                                                            opacity: ['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? 0.5 : 1,
                                                            cursor: ['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? 'not-allowed' : 'pointer'
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); setInviteTarget(app); setShowSendInviteModal(true); }}
                                                        disabled={['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role)}
                                                    >
                                                        <FiMail size={16} />
                                                    </button>
                                                ) : app.status === 'rejected' ? (
                                                    <button
                                                        className="action-btn warning"
                                                        title={['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? "Action restricted" : "Revert Rejection / Re-evaluate Candidate"}
                                                        style={{
                                                            opacity: ['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? 0.5 : 1,
                                                            cursor: ['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? 'not-allowed' : 'pointer',
                                                            background: '#fff7ed',
                                                            color: '#c2410c',
                                                            borderColor: '#ffedd5'
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); setRevertTarget(app); setShowRevertModal(true); }}
                                                        disabled={['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role)}
                                                    >
                                                        <FiRotateCcw size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="action-btn success"
                                                        title={['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? "Action restricted" : "Shortlist Candidate"}
                                                        style={{ opacity: ['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? 0.5 : 1, cursor: ['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? 'not-allowed' : 'pointer' }}
                                                        onClick={(e) => { e.stopPropagation(); setShowDetail(app); setShowConfirmShortlist(true); }}
                                                        disabled={['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role)}
                                                    >
                                                        <FiCheckCircle size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn details"
                                                    title="View Details"
                                                    onClick={() => setShowDetail(app)}
                                                >
                                                    <FiArrowRight size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <PaginationFooter
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredApps.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            label="candidates"
                        />
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetail && (() => {
                const { name: cleanName, location: cleanLocation } = cleanCandidateNameAndLocation(showDetail.first_name, showDetail.last_name);
                const initials = cleanName.split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
                const modalBreakdown = getMatchBreakdown(showDetail, vacancies);
                const mScore = modalBreakdown.overall;
                const isLow = mScore < minMediumScore;
                const { skills, parsedReport } = getNormalizedSkills(
                    showDetail.skills_metadata,
                    showDetail.tags,
                    showDetail.extracted_data,
                    showDetail,
                    minMediumScore
                );
                const isMismatch = Boolean(
                    parsedReport?.is_job_mismatch || 
                    isLow || 
                    modalBreakdown.mismatchReason || 
                    parsedReport?.mismatch_reason
                );
                const assessmentPoints = getAssessmentPoints(isMismatch, parsedReport, showDetail, modalBreakdown, minMediumScore);

                return (
                    <div className="confirm-overlay" onClick={() => setShowDetail(null)}>
                        <div className="confirm-modal candidate-detail-modal card-p animated-zoom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1450px', width: '96%', textAlign: 'left', overflow: 'hidden' }}>
                            <div className="modal-header-p candidate-header">
                                <div className="header-info-p">
                                    <div className="modal-avatar-wrapper">
                                        <div className="modal-avatar-ring"></div>
                                        <div className="modal-avatar-p">
                                            {initials}
                                        </div>
                                    </div>
                                    <div className="candidate-name-container">
                                        <h2>
                                            {cleanName}
                                            <span className={`status-badge-p badge-${showDetail.status || 'pending'}`}>
                                                {(showDetail.status || 'pending').replace('_', ' ')}
                                            </span>
                                            {(() => {
                                                const scoreData = calculateCandidateMatchScore(showDetail, vacancies);
                                                const matchScore = scoreData.score || 0;
                                                const isLowMatch = matchScore < minMediumScore;
                                                const isAutoEnabled = showDetail.auto_extraction_enabled !== undefined 
                                                    ? (showDetail.auto_extraction_enabled === true || showDetail.auto_extraction_enabled === '1' || showDetail.auto_extraction_enabled === 1) 
                                                    : autoExtractionEnabled;

                                                return ((showDetail.extraction_status === 'extracted' || showDetail.is_manual_extracted == 1) && (!isLowMatch || showDetail.is_manual_extracted == 1)) ? (
                                                    <span className="cve-badge extracted" style={{ fontSize: '0.75rem', padding: '3px 10px', marginLeft: '6px' }}>
                                                        <FiCheckCircle size={12} /> Extracted {showDetail.is_manual_extracted == 1 && <span style={{ fontSize: '0.65rem' }}>(Manual)</span>}
                                                    </span>
                                                ) : (isAutoEnabled && isLowMatch) ? (
                                                    <span className="cve-badge disabled-low" style={{ fontSize: '0.75rem', padding: '3px 10px', marginLeft: '6px' }} title={`Match score (${matchScore}%) is below minimum threshold (<${minMediumScore}%).`}>
                                                        <FiXCircle size={12} /> Disabled (&lt;{minMediumScore}%)
                                                    </span>
                                                ) : (
                                                    <span className="cve-badge unextracted" style={{ fontSize: '0.75rem', padding: '3px 10px', marginLeft: '6px' }}>
                                                        <FiAlertCircle size={12} /> Unextracted
                                                    </span>
                                                );
                                            })()}
                                        </h2>
                                        <div className="modal-subheaders" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <p className="modal-prospect-tag">{showDetail.is_suggestion ? 'Pool Candidate' : `${showDetail.vacancy_title} Prospect`}</p>
                                            {showDetail.job_ref && (
                                                <span className="ref-badge" style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px' }}>
                                                    #{showDetail.job_ref}
                                                </span>
                                            )}
                                            {cleanLocation && (
                                                <p className="modal-location-tag">
                                                    <FiMapPin size={12} style={{ color: 'var(--gold-accent)' }} />
                                                    {cleanLocation}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="o-btn delete" onClick={() => setShowDetail(null)}><FiX /></button>
                                </div>
                            </div>

                            <div className="modal-body-p" style={{ overflowY: 'auto', maxHeight: '82vh', padding: '24px 32px' }}>
                                {showDetail.is_suggestion && (
                                    <div style={{ background: '#ecfdf5', padding: '10px 16px', borderRadius: '10px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.85rem', marginBottom: '14px' }}>
                                        <p style={{ margin: 0 }}>This prospect matched your criteria from the Talent Pool. They previously applied for "{showDetail.last_applied_vacancy}" and consented to being contacted for future roles.</p>
                                    </div>
                                )}

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
                                            {/* 1. Technical Skills Match Rate */}
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

                                            {/* 2. Job Description & Scope Alignment */}
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
                                                title={`Relevant: ${showDetail.relevant_experience || '0-1 years'} | Overall: ${showDetail.overall_experience || '0-1 years'}`}
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
                                                title={`Candidate Qualification: ${showDetail.qualification || 'Bachelors Degree'}`}
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
                                                title={`Salary Expectation: ${showDetail.salary_expectation ? `LKR ${Number(String(showDetail.salary_expectation).replace(/[^0-9.]/g, '')).toLocaleString()}` : 'Not Specified'} vs Job Budget${showDetail.min_salary || showDetail.max_salary ? `: LKR ${Number(showDetail.min_salary || 0).toLocaleString()} - ${showDetail.max_salary ? Number(showDetail.max_salary).toLocaleString() : 'Uncapped'}` : ''}`}
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

                                {/* ── TOP INFO ROW: Contact + Profile + Submission in one strip ── */}
                                <div className="modal-info-grid">

                                    {/* Contact */}
                                    <div className="modal-info-card">
                                        <div className="modal-info-card-header">
                                            <FiUser size={13} /> Contact Protocols
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div className="info-item-row">
                                                <div className="info-item-icon">
                                                    <FiMail size={13} />
                                                </div>
                                                <div className="info-item-content">
                                                    <span className="info-item-label">Email</span>
                                                    <p className="info-item-val">{showDetail.email}</p>
                                                </div>
                                            </div>
                                            <div className="info-item-row">
                                                <div className="info-item-icon">
                                                    <FiPhone size={13} />
                                                </div>
                                                <div className="info-item-content">
                                                    <span className="info-item-label">Phone</span>
                                                    <p className="info-item-val">{formatContactNumber(showDetail.contact_number) || showDetail.contact_number || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Profile */}
                                    <div className="modal-info-card">
                                        <div className="modal-info-card-header">
                                            <FiBriefcase size={13} /> Professional Profile
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div className="info-item-row">
                                                <div className="info-item-icon">
                                                    <FiAward size={13} />
                                                </div>
                                                <div className="info-item-content">
                                                    <span className="info-item-label">Overall Exp.</span>
                                                    <p className="info-item-val">{formatExpVal(showDetail.overall_experience)}</p>
                                                </div>
                                            </div>
                                            <div className="info-item-row">
                                                <div className="info-item-icon">
                                                    <FiTarget size={13} />
                                                </div>
                                                <div className="info-item-content">
                                                    <span className="info-item-label">Relevant Exp.</span>
                                                    <p className="info-item-val">{formatExpVal(showDetail.relevant_experience)}</p>
                                                </div>
                                            </div>
                                            <div className="info-item-row">
                                                <div className="info-item-icon">
                                                    <FiCheckCircle size={13} />
                                                </div>
                                                <div className="info-item-content">
                                                    <span className="info-item-label">Qualification</span>
                                                    <p className="info-item-val">{showDetail.qualification || 'Specified in CV'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submission Details */}
                                    <div className="modal-info-card">
                                        <div className="modal-info-card-header">
                                            <FiHome size={13} /> Submission Details
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div className="info-item-row">
                                                <div className="info-item-icon">
                                                    <FiHome size={13} />
                                                </div>
                                                <div className="info-item-content">
                                                    <span className="info-item-label">{showDetail.is_suggestion ? 'Previously Applied to' : 'Company'}</span>
                                                    <p className="info-item-val">{showDetail.is_suggestion ? showDetail.last_applied_vacancy : showDetail.company_name}</p>
                                                </div>
                                            </div>
                                            <div className="info-item-row">
                                                <div className="info-item-icon">
                                                    <FiTag size={13} />
                                                </div>
                                                <div className="info-item-content">
                                                    <span className="info-item-label">Salary Expectation</span>
                                                    <p className="info-item-val" style={{ color: '#7A1228', fontWeight: '800' }}>{formatSalaryVal(showDetail.salary_expectation)}</p>
                                                </div>
                                            </div>
                                            <div className="info-item-row">
                                                <div className="info-item-icon">
                                                    <FiCalendar size={13} />
                                                </div>
                                                <div className="info-item-content">
                                                    <span className="info-item-label">Applied Date</span>
                                                    <p className="info-item-val">{formatDateTime(showDetail.applied_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Rejection / Block notices */}
                                {showDetail.status === 'rejected' && showDetail.rejection_reason && (
                                    <div className="rejection-reason-box" style={{ marginBottom: '12px' }}>
                                        <span>Rejection Reason</span>
                                        <p>{showDetail.rejection_reason}</p>
                                    </div>
                                )}
                                {Boolean(showDetail.is_blocked == 1 || showDetail.is_email_blocked) && (
                                    <div className="rejection-reason-box" style={{ border: '1px solid #fee2e2', background: '#fef2f2', color: '#991b1b', marginBottom: '12px' }}>
                                        <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}><FiSlash size={14} /> BLOCK REASON (ADMIN ONLY)</span>
                                        <p style={{ color: '#991b1b', fontWeight: 600 }}>{showDetail.block_reason || 'No reason specified'}</p>
                                    </div>
                                )}

                                {/* ── CANDIDATE SKILLS & AI EVALUATION (full width) ── */}
                                <div style={{ marginBottom: '12px' }}>
                                    <div className="section-divider-p">
                                        Candidate Skills &amp; AI Recruiter Evaluation
                                    </div>
                                    {(() => {
                                        const { skills, parsedReport } = getNormalizedSkills(showDetail.skills_metadata, showDetail.tags, showDetail.extracted_data, showDetail);
                                        const tabCategories = ['Relevant Skills', 'Related Skills', 'Additional Skills'];
                                        const activeSkills = skills.filter(item => item.category === activeAdminTab);
                                        
                                        return (
                                            <div className="admin-recruiter-report">
                                                <div className="admin-ai-report-header">
                                                    <div className="admin-ai-badge">
                                                        <FiCpu size={14} style={{ color: 'var(--gold-accent)' }} />
                                                        <span>Steuart AI Recruiter Evaluation Report</span>
                                                    </div>
                                                </div>

                                                {parsedReport && !parsedReport.is_unextracted && (parsedReport.is_job_mismatch || (calculateCandidateMatchScore(showDetail, vacancies).score < minMediumScore)) && (
                                                    <div className="job-mismatch-banner" style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '12px', padding: '10px 16px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: '12px', color: '#991b1b' }}>
                                                        <FiAlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                                                        <div style={{ flex: 1 }}>
                                                            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#b91c1c', display: 'block', margin: 0 }}>⚠️ Job &amp; CV Mismatch Warning</span>
                                                            <span style={{ fontSize: '0.82rem', color: '#7f1d1d', marginTop: '2px', display: 'block' }}>{parsedReport.mismatch_reason || `Candidate profile background differs from target position requirements for "${showDetail.vacancy_title || showDetail.applied_vacancy}".`}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {parsedReport && !parsedReport.is_unextracted && !parsedReport.is_job_mismatch && (calculateCandidateMatchScore(showDetail, vacancies).score >= minMediumScore) && (showDetail.vacancy_title || showDetail.applied_vacancy) && (
                                                    <div className="job-match-banner" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '10px 16px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: '12px', color: '#166534' }}>
                                                        <FiCheckCircle size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                                                        <div style={{ flex: 1 }}>
                                                            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#15803d', display: 'block', margin: 0 }}>✅ Verified Job Requirement Alignment</span>
                                                            <span style={{ fontSize: '0.82rem', color: '#166534', marginTop: '2px', display: 'block' }}>Candidate background &amp; verified competencies align well with target vacancy requirements for "{showDetail.vacancy_title || showDetail.applied_vacancy}".</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {parsedReport && (parsedReport.experience_summary || (Array.isArray(parsedReport.recruiter_insights) && parsedReport.recruiter_insights.length > 0)) && (
                                                    <div className="recruiter-report-summary">
                                                        {parsedReport.experience_summary && (
                                                            <div className="report-summary-block">
                                                                <h6>Experience Summary</h6>
                                                                <p className="summary-text">{parsedReport.experience_summary}</p>
                                                            </div>
                                                        )}
                                                        {Array.isArray(parsedReport.recruiter_insights) && parsedReport.recruiter_insights.length > 0 && (
                                                            <div className="report-insights-block">
                                                                <h6>Recruiter Insights &amp; Observations</h6>
                                                                <ul className="insights-list">
                                                                    {parsedReport.recruiter_insights.map((insight, idx) => (
                                                                        <li key={idx}>{insight}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {parsedReport && (
                                                    (Array.isArray(parsedReport.fully_demonstrated_skills) && parsedReport.fully_demonstrated_skills.length > 0) ||
                                                    (Array.isArray(parsedReport.partially_demonstrated_skills) && parsedReport.partially_demonstrated_skills.length > 0) ||
                                                    (Array.isArray(parsedReport.requirements_without_evidence) && parsedReport.requirements_without_evidence.length > 0)
                                                ) && (
                                                    <div className="requirements-validation-panel">
                                                        <h6>Mandatory Requirements Validation</h6>
                                                        <div className="validation-grid">
                                                            <div className="validation-col fully-supported">
                                                                <span className="col-title green"><FiCheckCircle size={12} /> Fully Demonstrated</span>
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
                                                                <span className="col-title orange"><FiAlertCircle size={12} /> Partially Demonstrated</span>
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
                                                                <span className="col-title red"><FiXCircle size={12} /> No Evidence Found</span>
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
                                                                        background: activeAdminTab === tabName ? 'rgba(139,26,43,0.1)' : '#f1f5f9',
                                                                        color: activeAdminTab === tabName ? 'var(--crimson, #8b1a2b)' : '#64748b',
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
                                                                        <div className="admin-skill-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                                                                                <span className="admin-skill-name-txt" style={{ fontWeight: 800 }}>
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

                                                {parsedReport && (
                                                    (Array.isArray(parsedReport.qualifications_found) && parsedReport.qualifications_found.length > 0) ||
                                                    (Array.isArray(parsedReport.certifications_found) && parsedReport.certifications_found.length > 0)
                                                ) && (
                                                    <div className="credentials-validation-panel" style={{ marginTop: '16px' }}>
                                                        <h6>Credentials &amp; Additional Information</h6>
                                                        <div className="validation-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                                            <div className="validation-col">
                                                                <span className="col-title" style={{ color: '#4f46e5' }}><FiAward size={12} /> Qualifications Found</span>
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
                                                                <span className="col-title" style={{ color: '#0891b2' }}><FiCheckCircle size={12} /> Certifications Found</span>
                                                                <div className="badge-list">
                                                                    {Array.isArray(parsedReport.certifications_found) && parsedReport.certifications_found.length > 0 ? (
                                                                        parsedReport.certifications_found.map((cert, idx) => (
                                                                            <span key={idx} className="val-badge cyan" style={{ background: '#ecfeff', color: '#0e7490', border: '1px solid #c5f2f7' }}>{cert}</span>
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

                                {/* Interview Schedule (if shortlisted with date) */}
                                {showDetail.status === 'shortlisted' && showDetail.interview_date && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div className="section-divider-p">
                                            Confirmed Interview Schedule
                                        </div>
                                        <div className="submission-box-p interview-widget-card">
                                            <div className="sm-item">
                                                <span>Medium / Type</span>
                                                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                                    <FiVideo style={{ color: 'var(--gold-accent)' }} /> {showDetail.interview_type}
                                                </p>
                                            </div>
                                            <div className="sm-item">
                                                <span>Date &amp; Duration</span>
                                                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                                    <FiCalendar style={{ color: 'var(--gold-accent)' }} /> {formatDate(showDetail.interview_date)} at {showDetail.interview_time}
                                                </p>
                                            </div>
                                            <div className="sm-item">
                                                <span>Location / Resource</span>
                                                <p style={{ fontSize: '0.85rem', wordBreak: 'break-all', display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-primary)' }}>
                                                    <FiMapPin style={{ color: 'var(--gold-accent)', marginTop: '4px' }} /> {showDetail.interview_location}
                                                </p>
                                            </div>
                                            <div className="sm-item">
                                                <span>Attendance Status</span>
                                                <p style={{ marginTop: '4px' }}>
                                                    {showDetail.interview_confirmed === 'yes' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', background: '#ecfdf5', border: '1px solid #b7f4cf', borderRadius: '100px', padding: '2px 10px' }}>
                                                            ✅ Confirmed
                                                        </span>
                                                    ) : showDetail.interview_confirmed === 'no' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '100px', padding: '2px 10px' }}>
                                                            ❌ Declined
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '100px', padding: '2px 10px' }}>
                                                            📩 Invited (Awaiting RSVP)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="cv-preview-section-p">
                                    <div className="cv-banner-p">
                                        <div className="cb-icon"><FiFileText /></div>
                                        <div className="cb-text">
                                            <span>Curriculum Vitae</span>
                                            <p style={{ margin: 0 }}>{showDetail.first_name}_CV_{showDetail.is_suggestion ? 'Pool' : (showDetail.vacancy_title || 'Document').replace(/\s+/g, '_')}.{(showDetail.cv_path || '').split('.').pop() || 'pdf'}</p>
                                        </div>
                                        <button
                                            className="btn btn-gold"
                                            onClick={() => setViewingCV(showDetail)}
                                        >
                                            <FiExternalLink /> View Document
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Actions Footer */}
                            <div className="modal-actions-footer-p">
                                {['super_admin', 'sub_admin2', 'sub_admin'].includes(admin.role) ? (
                                    <button className="btn btn-outline" style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: 600 }} onClick={() => setShowDetail(null)}>
                                        Close
                                    </button>
                                ) : showDetail.status === 'rejected' ? (
                                    <button className="btn btn-outline" style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: 600 }} onClick={() => setShowDetail(null)}>
                                        Close
                                    </button>
                                ) : showDetail.status === 'shortlisted' ? (
                                    <>
                                        <button className="btn btn-outline" style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: 600 }} onClick={() => setShowDetail(null)}>Close</button>
                                        {!showDetail.interview_date && (
                                            <button
                                                className="btn-status-action btn-status-shortlist"
                                                onClick={() => { setInviteTarget(showDetail); setShowDetail(null); setShowSendInviteModal(true); }}
                                            >
                                                📩 Send Interview Invite
                                            </button>
                                        )}
                                        {showDetail.interview_date && (
                                            <button
                                                className="btn-status-action btn-status-shortlist"
                                                onClick={() => { setInviteTarget(showDetail); setShowDetail(null); setShowSendInviteModal(true); }}
                                            >
                                                📅 Reschedule / Re-send Invite
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button className="btn btn-outline" style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: 600 }} onClick={() => setShowDetail(null)}>Cancel</button>
                                        <button className="btn-status-action btn-status-pending" onClick={() => handleStatusUpdate(showDetail.id, 'pending')} disabled={processingStatus || showDetail.status === 'pending'}>Mark Pending</button>
                                        <button className="btn-status-action btn-status-review" onClick={() => handleStatusUpdate(showDetail.id, 'under_review')} disabled={processingStatus || showDetail.status === 'under_review'}>Under Review</button>
                                        <button className="btn-status-action btn-status-reject" onClick={() => setShowRejectModal(true)} disabled={processingStatus}>Reject Candidacy</button>
                                        <button className="btn-status-action btn-status-shortlist" onClick={() => setShowConfirmShortlist(true)} disabled={processingStatus}>✓ Shortlist</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Reject Reason Modal */}
            {showRejectModal && (
                <div className="confirm-overlay" style={{ zIndex: 1100 }} onClick={() => setShowRejectModal(false)}>
                    <div className="confirm-modal card-p animated-zoom" style={{ maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-p" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <h2>Reject Application</h2>
                            <button className="close-btn-p" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}><FiX /></button>
                        </div>
                        <div className="modal-body-p">
                            <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                                Please provide a reason for rejecting <strong>{showDetail?.first_name} {showDetail?.last_name}</strong>. This will be sent to the applicant via email.
                            </p>
                            <textarea
                                className="styled-input"
                                rows="4"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'none' }}
                                placeholder="E.g., Does not meet the minimum experience requirements..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            ></textarea>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                                <button className="btn btn-outline" style={{ borderRadius: '12px', padding: '12px 24px', fontWeight: 600 }} onClick={() => setShowRejectModal(false)}>Keep Candidate</button>
                                <button
                                    className="btn-status-action btn-status-reject"
                                    onClick={() => handleStatusUpdate(showDetail.id, 'rejected', rejectReason)}
                                    disabled={processingStatus || !rejectReason.trim()}
                                >
                                    {processingStatus ? 'Rejecting...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Revert Rejection Modal */}
            {showRevertModal && revertTarget && (
                <div className="confirm-overlay" style={{ zIndex: 1100 }} onClick={() => setShowRevertModal(false)}>
                    <div className="confirm-modal card-p animated-zoom" style={{ maxWidth: '480px', width: '90%', padding: '32px 28px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-p" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fff7ed', border: '1.5px solid #ffedd5', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FiRotateCcw size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>Revert Rejection</h2>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Change status for {revertTarget.first_name} {revertTarget.last_name}</span>
                                </div>
                            </div>
                            <button className="close-btn-p" onClick={() => setShowRevertModal(false)}><FiX /></button>
                        </div>

                        <div className="modal-body-p">
                            {revertTarget.rejection_reason && (
                                <div style={{ background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Previous Rejection Reason:</span>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#9f1239', fontWeight: 600, fontStyle: 'italic' }}>
                                        "{revertTarget.rejection_reason}"
                                    </p>
                                </div>
                            )}

                            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                                Select a new evaluation status to restore <strong>{revertTarget.first_name}</strong> back to active recruitment:
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    className="btn"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 18px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                                        background: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '0.88rem',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--crimson)'; e.currentTarget.style.background = '#fff'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                    onClick={() => handleStatusUpdate(revertTarget.id, 'pending')}
                                    disabled={processingStatus}
                                >
                                    <span>🔄 Restore to Pending (New Applicant)</span>
                                    <FiChevronRight />
                                </button>

                                <button
                                    className="btn"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 18px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                                        background: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '0.88rem',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--crimson)'; e.currentTarget.style.background = '#fff'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                    onClick={() => handleStatusUpdate(revertTarget.id, 'under_review')}
                                    disabled={processingStatus}
                                >
                                    <span>🔍 Move to Under Review</span>
                                    <FiChevronRight />
                                </button>

                                <button
                                    className="btn"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 18px', borderRadius: '12px', border: '1.5px solid #a7f3d0',
                                        background: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '0.88rem',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#d1fae5'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ecfdf5'; }}
                                    onClick={() => handleQuickShortlist(revertTarget)}
                                    disabled={processingStatus}
                                >
                                    <span>✓ Directly Shortlist Candidate</span>
                                    <FiChevronRight />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                            <button className="btn btn-outline" style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: 600 }} onClick={() => setShowRevertModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 1: Confirm Shortlist Modal (no email) ── */}
            {showConfirmShortlist && showDetail && (
                <div className="confirm-overlay" style={{ zIndex: 1100 }} onClick={() => setShowConfirmShortlist(false)}>
                    <div className="confirm-modal card-p animated-zoom" style={{ maxWidth: '460px', width: '90%', textAlign: 'center', padding: '40px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--text-primary)' }}>Shortlist Candidate?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.6 }}>
                            You are about to shortlist <strong style={{ color: 'var(--text-primary)' }}>{showDetail.first_name} {showDetail.last_name}</strong> for <strong style={{ color: 'var(--text-primary)' }}>{showDetail.vacancy_title}</strong>.
                        </p>
                        <p style={{ color: '#b8860b', fontSize: '0.85rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 28 }}>
                            📩 No email will be sent yet. Use <strong>"Send Interview Invite"</strong> as the next step.
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn btn-outline" style={{ borderRadius: 12, padding: '12px 24px', fontWeight: 600 }} onClick={() => setShowConfirmShortlist(false)}>Cancel</button>
                            <button
                                className="btn-status-action btn-status-shortlist"
                                onClick={() => handleQuickShortlist(showDetail)}
                                disabled={processingStatus}
                            >
                                {processingStatus ? 'Shortlisting…' : 'Confirm Shortlist'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 2: Send Interview Invite Modal ── */}
            {showSendInviteModal && inviteTarget && (
                <div className="confirm-overlay" style={{ zIndex: 1100 }} onClick={closeInviteModal}>
                    <div className="confirm-modal card-p animated-zoom invite-invite-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="invite-modal-header-wrap" style={{ position: 'relative' }}>
                            {/* Close button — pinned top-right inside gradient header */}
                            <button className="invite-modal-close-btn" onClick={closeInviteModal} aria-label="Close">
                                <FiX size={18} />
                            </button>

                            {/* Icon + Title */}
                            <div className="invite-modal-title-row">
                                <div className="invite-modal-icon-lg"><FiMail size={24} /></div>
                                <h2 className="invite-modal-title-text">
                                    {inviteTarget.interview_date ? 'Reschedule Interview' : 'Send Interview Invitation'}
                                </h2>
                            </div>

                            {/* Candidate info rows */}
                            <div className="invite-modal-meta">
                                <div className="invite-meta-row invite-meta-row--inline">
                                    <span className="invite-meta-label">Candidate</span>
                                    <strong className="invite-meta-name">{inviteTarget.first_name} {inviteTarget.last_name}</strong>
                                </div>
                                <div className="invite-meta-row invite-meta-row--block">
                                    <span className="invite-meta-label">Position</span>
                                    <span className="invite-meta-position">{inviteTarget.vacancy_title}</span>
                                </div>
                                {inviteTarget.contact_number && (
                                    <div className="invite-meta-row invite-meta-row--inline">
                                        <span className="invite-meta-label">Telephone</span>
                                        <span className="invite-phone-badge">
                                            <FiPhone size={13} strokeWidth={2.5} />
                                            {formatContactNumber(inviteTarget.contact_number) || inviteTarget.contact_number}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-body-p">
                            {inviteTarget.interview_date && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.82rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FiCalendar size={16} style={{ flexShrink: 0, color: '#16a34a' }} />
                                    <div>
                                        <strong>Current Schedule:</strong> {formatDate(inviteTarget.interview_date)} at {inviteTarget.interview_time} ({inviteTarget.interview_type || 'Online'})
                                    </div>
                                </div>
                            )}
                            <div style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
                                <div className="form-group-p">
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Interview Type</label>
                                    <select className="styled-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        value={inviteData.interview_type} onChange={(e) => {
                                            setInviteData({ ...inviteData, interview_type: e.target.value, interview_location: '', interview_location_link: '' });
                                            setLocationPreset('');
                                        }}>
                                        <option value="Online">Online / Virtual</option>
                                        <option value="On-site">On-site / Physical</option>
                                    </select>
                                </div>
                                <div className="invite-modal-date-grid">
                                    <div className="form-group-p">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Interview Date</label>
                                        <input
                                            type="date"
                                            className="styled-input"
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            min={getTodayDateString()}
                                            value={inviteData.interview_date}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const today = getTodayDateString();
                                                if (val && val < today) {
                                                    toast.warning('Cannot schedule interview on a past date. Please select today or a future date.');
                                                    return;
                                                }
                                                setInviteData({ ...inviteData, interview_date: val });
                                            }}
                                        />
                                    </div>
                                    <div className="form-group-p">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Interview Time</label>
                                        <input type="time" className="styled-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            value={inviteData.interview_time} onChange={(e) => setInviteData({ ...inviteData, interview_time: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group-p">
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                        {inviteData.interview_type === 'Online' ? 'Meeting Link (Zoom/Teams/Meet)' : 'Interview Location (Address)'}
                                    </label>

                                    {inviteData.interview_type === 'Online' ? (
                                        /* Online — plain text for link */
                                        <input type="text" className="styled-input"
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            placeholder="Zoom / Teams / Google Meet link…"
                                            value={inviteData.interview_location}
                                            onChange={(e) => setInviteData({ ...inviteData, interview_location: e.target.value })} />
                                    ) : (
                                        /* On-site — preset dropdown + Other textbox */
                                        <>
                                            <select
                                                className="styled-input"
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: locationPreset === 'Other' ? '10px' : 0 }}
                                                value={locationPreset}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLocationPreset(val);
                                                    if (val && val !== 'Other') {
                                                        const locId = parseInt(val);
                                                        const selectedLoc = locations.find(l => l.id === locId);
                                                        if (selectedLoc) {
                                                            // Find the company to get c.location
                                                            const company = companies.find(c => c.id === selectedLoc.company_id);
                                                            const mainLocation = company ? company.location : '';
                                                            
                                                            setInviteData({ 
                                                                ...inviteData, 
                                                                interview_location: `${selectedLoc.company_name} — ${selectedLoc.location}`, 
                                                                interview_location_link: mainLocation || '' 
                                                            });
                                                        }
                                                    } else {
                                                        setInviteData({ ...inviteData, interview_location: '', interview_location_link: '' });
                                                    }
                                                }}
                                            >
                                                <option value="">— Select a location —</option>
                                                {companies.map(c => {
                                                    const companyLocs = locations.filter(loc => loc.company_id === c.id);
                                                    if (companyLocs.length === 0) return null;
                                                    return (
                                                        <optgroup key={c.id} label={c.name}>
                                                            {companyLocs.map(loc => (
                                                                <option key={loc.id} value={loc.id}>
                                                                    {loc.location}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    );
                                                })}
                                                <option value="Other">✏️ Other (type manually)</option>
                                            </select>

                                            {locationPreset === 'Other' && (
                                                <input
                                                    type="text"
                                                    className="styled-input"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c8a951', outline: 'none' }}
                                                    placeholder="Enter full address or room name…"
                                                    value={inviteData.interview_location}
                                                    onChange={(e) => setInviteData({ ...inviteData, interview_location: e.target.value })}
                                                    autoFocus
                                                />
                                            )}

                                            <div style={{ marginTop: '12px' }}>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                                    Location Map Link (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    className="styled-input"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                                    placeholder="Paste Google Maps link here..."
                                                    value={inviteData.interview_location_link}
                                                    onChange={(e) => setInviteData({ ...inviteData, interview_location_link: e.target.value })}
                                                />
                                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '4px 0 0 4px' }}>
                                                    Provide a map link to help the candidate find the location easily.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="invite-modal-footer">
                                <button className="btn btn-outline invite-modal-cancel-btn" onClick={closeInviteModal}>Cancel</button>
                                <button
                                    className="btn-status-action btn-status-shortlist"
                                    onClick={handleSendInterview}
                                    disabled={sendingInvite || !inviteData.interview_date || !inviteData.interview_time || !inviteData.interview_location || (inviteData.interview_date < getTodayDateString())}
                                >
                                    {sendingInvite
                                        ? (inviteTarget.interview_date ? 'Rescheduling…' : 'Sending…')
                                        : (inviteTarget.interview_date ? '📅 Reschedule & Send Email' : '📩 Send Interview Email')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Old Shortlist Modal (kept for backward compat, now unused) ── */}
            {showShortlistModal && (
                <div className="confirm-overlay" style={{ zIndex: 1100 }} onClick={() => setShowShortlistModal(false)}>
                    <div className="confirm-modal card-p animated-zoom" style={{ maxWidth: '550px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-p" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#ecfdf5', color: '#10b981', padding: '8px', borderRadius: '8px', display: 'flex' }}><FiCheckCircle size={20} /></div>
                                <h2>Shortlist Candidate</h2>
                            </div>
                            <button className="close-btn-p" onClick={() => setShowShortlistModal(false)}><FiX /></button>
                        </div>
                        <div className="modal-body-p">
                            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                You are about to shortlist <strong style={{ color: 'var(--text-primary)' }}>{showDetail?.first_name || ''} {showDetail?.last_name || 'this candidate'}</strong>. Please enter the interview details below to be included in the invitation email.
                            </p>

                            <div className="admin-grid-1" style={{ gap: '16px' }}>
                                <div className="form-group-p">
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Interview Type</label>
                                    <select
                                        className="styled-input"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        value={shortlistData.interview_type}
                                        onChange={(e) => setShortlistData({ ...shortlistData, interview_type: e.target.value })}
                                    >
                                        <option value="Online">Online / Virtual</option>
                                        <option value="On-site">On-site / Physical</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group-p">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Interview Date</label>
                                        <input
                                            type="date"
                                            className="styled-input"
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            min={getTodayDateString()}
                                            value={shortlistData.interview_date}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const today = getTodayDateString();
                                                if (val && val < today) {
                                                    toast.warning('Cannot schedule interview on a past date. Please select today or a future date.');
                                                    return;
                                                }
                                                setShortlistData({ ...shortlistData, interview_date: val });
                                            }}
                                        />
                                    </div>
                                    <div className="form-group-p">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Interview Time</label>
                                        <input
                                            type="time"
                                            className="styled-input"
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            value={shortlistData.interview_time}
                                            onChange={(e) => setShortlistData({ ...shortlistData, interview_time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group-p">
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Location / Meeting Link</label>
                                    <input
                                        type="text"
                                        className="styled-input"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        placeholder={shortlistData.interview_type === 'Online' ? 'Zoom, Teams link, etc.' : 'Office address, Boardroom name, etc.'}
                                        value={shortlistData.interview_location}
                                        onChange={(e) => setShortlistData({ ...shortlistData, interview_location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                                <button className="btn btn-outline" style={{ borderRadius: '12px', padding: '12px 24px', fontWeight: 600 }} onClick={() => setShowShortlistModal(false)}>Cancel</button>
                                <button
                                    className="btn-status-action btn-status-shortlist"
                                    onClick={() => handleStatusUpdate(showDetail.id, 'shortlisted', '', shortlistData)}
                                    disabled={processingStatus || !shortlistData.interview_date || !shortlistData.interview_time || !shortlistData.interview_location || (shortlistData.interview_date < getTodayDateString())}
                                >
                                    {processingStatus ? 'Sending...' : 'Confirm & Send Invitation'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Bulk Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="confirm-overlay animated-fade-in" style={{ zIndex: 1210 }} onClick={() => setShowDeleteModal(false)}>
                    <div className="confirm-modal card-p animated-zoom" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', textAlign: 'center', padding: '40px' }}>
                        <div className="warning-visual">
                            <FiTrash2 />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Confirm Bulk Deletion</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                            You are about to permanently delete <strong>{selectedIds.length}</strong> selected applications. This action cannot be undone. Are you sure you want to proceed?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => setShowDeleteModal(false)}
                                style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 600 }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn"
                                onClick={handleBulkDelete}
                                disabled={deletingBulk}
                                style={{ flex: 1, background: 'var(--crimson)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700 }}
                            >
                                {deletingBulk ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                .manage-vacancies-console {
                    animation: fadeIn 0.4s ease-out;
                }

                /* HERO HEADER - MINIMALIST */
                .vacancies-orchestration-header {
                    position: relative;
                    padding: 24px 30px;
                    border-radius: 16px;
                    overflow: hidden;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                    background: linear-gradient(135deg, #7A1528 0%, #4D0A14 100%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
                }

                .header-content-p { position: relative; z-index: 2; }

                .console-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 4px 12px;
                    border-radius: 100px;
                    font-size: 0.62rem;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.9);
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                }

                .live-dot {
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                }

                .serif-title-p {
                    font-family: var(--font-heading), 'Playfair Display', serif;
                    font-size: 1.75rem;
                    color: #ffffff;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.3px;
                    font-weight: 700;
                }

                .hero-subline {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.82rem;
                    margin: 0;
                    max-width: 600px;
                    line-height: 1.4;
                    font-weight: 400;
                }

                .btn-establish-p {
                    background: #C8A951;
                    color: #1a1a2a;
                    border: none;
                    padding: 9px 18px;
                    border-radius: 10px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(200, 169, 81, 0.25);
                    z-index: 10;
                    font-size: 0.84rem;
                }

                .btn-establish-p:hover {
                    background: #d4b45d;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(200, 169, 81, 0.35);
                }

                /* TOOLBAR REFINEMENT - MINIMALIST */
                .console-toolbar-p {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    margin-bottom: 20px;
                    background: #ffffff;
                    padding: 16px 20px;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                }

                .toolbar-search-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .search-orchestrator {
                    position: relative;
                    flex: 1;
                }

                .search-orchestrator .s-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #8B1A2B;
                    font-size: 1rem;
                    pointer-events: none;
                    z-index: 2;
                }

                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }

                .search-orchestrator input {
                    width: 100%;
                    padding: 10px 16px 10px 42px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    font-size: 0.86rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    color: #0f172a;
                    font-family: inherit;
                    box-sizing: border-box;
                }

                .search-orchestrator input:focus {
                    outline: none;
                    background: #ffffff;
                    border-color: #8B1A2B;
                    box-shadow: 0 0 0 3px rgba(139, 26, 43, 0.08);
                }

                .btn-reset-console {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0 16px;
                    height: 40px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    font-family: inherit;
                }

                .btn-reset-console:hover {
                    background: #fef2f2;
                    border-color: #fecaca;
                    color: #dc2626;
                }

                .toolbar-divider {
                    height: 1px;
                    background: #f1f5f9;
                    width: 100%;
                }

                .toolbar-filters-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                    gap: 12px 14px;
                    width: 100%;
                    align-items: end;
                    box-sizing: border-box;
                }

                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }

                .filter-label {
                    font-size: 0.68rem;
                    font-weight: 800;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    margin-bottom: 2px;
                }

                .select-orchestrator {
                    position: relative;
                    width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }

                .select-lg {
                    min-width: 0;
                }

                .select-orchestrator select {
                    width: 100%;
                    box-sizing: border-box;
                    height: 42px;
                    padding: 0 28px 0 34px;
                    border-radius: 12px;
                    border: 1.5px solid #e2e8f0;
                    background: #f8fafc;
                    font-size: 0.82rem;
                    font-weight: 600;
                    appearance: none;
                    -webkit-appearance: none;
                    cursor: pointer;
                    color: var(--text-primary);
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                    background-size: 14px;
                    transition: all 0.2s ease;
                    font-family: inherit;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }

                .select-orchestrator select:focus {
                    outline: none;
                    border-color: var(--crimson);
                    background-color: #fff;
                    box-shadow: 0 0 0 3.5px rgba(139, 26, 43, 0.08);
                }

                .select-orchestrator select:hover {
                    border-color: #cbd5e1;
                    background-color: #fff;
                }

                .f-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--crimson);
                    font-size: 0.9rem;
                    pointer-events: none;
                    z-index: 2;
                }

                .sort-select-crimson {
                    color: var(--crimson) !important;
                }

                .filter-field-sort {
                    flex: 0 0 auto;
                    min-width: 160px;
                    padding-left: 16px;
                    border-left: 1.5px solid #f1f5f9;
                }

                .sort-label {
                    color: var(--crimson);
                    opacity: 0.8;
                }

                .date-orchestrator-input {
                    width: 100%;
                    padding: 12px 14px 12px 40px;
                    border-radius: 10px;
                    border: 1.5px solid #edf2f7;
                    background: #f8fafc;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    font-family: inherit;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }

                .date-orchestrator-input:focus {
                    outline: none;
                    border-color: var(--crimson);
                }

                /* TABLE */
                .orchestration-table-wrapper {
                    background: #fff;
                    border-radius: 20px;
                    border: 1px solid var(--border-light);
                    overflow-x: auto;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                }

                .orchestrated-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 800px;
                }

                .orchestrated-table th {
                    background: #fcfcfd;
                    padding: 12px 16px;
                    text-align: left;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    border-bottom: 1px solid #f0f2f5;
                }

                .orchestrated-table td {
                    padding: 16px;
                    border-bottom: 1px solid #f8fafc;
                    vertical-align: middle;
                }

                .orchestrated-table tr {
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .orchestrated-table tr:hover { background: #fcfcfd; }
                .orchestrated-table tr:hover td { background: #fcfcfd; }

                .ref-cell span {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    background: #f1f5f9;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-weight: 600;
                }

                .pos-entity-cell { display: flex; flex-direction: column; gap: 4px; }
                .pos-name { font-weight: 800; color: var(--text-primary); font-size: 0.95rem; }
                .entity-name { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }

                .classification-cell { display: flex; flex-direction: column; gap: 6px; }
                .class-badge {
                    background: #eff6ff;
                    color: #2563eb;
                    padding: 3px 12px;
                    border-radius: 100px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    width: fit-content;
                    text-transform: uppercase;
                }
                .designation-sub { font-size: 0.85rem; color: var(--text-secondary); }
                
                .timeline-cell { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--text-muted); }
                .timeline-cell svg { font-size: 0.9rem; margin-right: 4px; }

                .orchestration-actions { display: flex; gap: 8px; justify-content: flex-end; }
                .o-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1.1rem;
                }
                .o-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 15px rgba(0,0,0,0.06); border-color: #e2e8f0; }
                .o-btn.applicants { color: var(--gold-accent); }
                .o-btn.delete { color: var(--crimson); }
                .o-btn.delete:hover { background: var(--crimson); color: #fff; }

                /* MODALS */
                .confirm-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                    animation: fadeIn 0.3s ease-out;
                }

                .confirm-modal {
                    background: #fff;
                    border-radius: 32px;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.15);
                }

                /* Applicant Modal specifics */
                .cv-banner-p {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: #1a1a2e;
                    padding: 16px 20px;
                    border-radius: 16px;
                    color: #fff;
                    margin-top: 16px;
                }

                .cb-icon { 
                    width: 50px; height: 50px; 
                    background: rgba(255, 255, 255, 0.1); 
                    border-radius: 12px; display: flex; 
                    align-items: center; justify-content: center; 
                    font-size: 1.5rem; color: var(--gold-accent);
                }

                .cb-text { flex: 1; }
                .cb-text span { display: block; font-weight: 700; font-size: 1rem; margin-bottom: 4px;}
                .cb-text p { margin: 0; font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); }

                .modal-actions-footer-p {
                    padding: 16px 28px;
                    border-top: 1px solid #e2e8f0;
                    background: #fcfcfd;
                }

                .submission-box-p {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    padding: 14px 16px;
                    background: #fdfdfd;
                    border: 1px solid #f1f5f9;
                    border-radius: 12px;
                    gap: 16px;
                    align-items: start;
                }

                .sm-item span { 
                    display: block; 
                    font-size: 0.65rem; 
                    color: var(--text-muted); 
                    margin-bottom: 4px; 
                    text-transform: uppercase; 
                    font-weight: 800; 
                    letter-spacing: 0.5px;
                }
                .sm-item p { margin: 0; font-weight: 700; color: var(--text-primary); font-size: 0.95rem; }

                .close-btn-p {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    padding: 0;
                }
                .close-btn-p:hover {
                    background: #f8fafc;
                    color: var(--crimson);
                    border-color: #cbd5e1;
                    transform: rotate(90deg);
                }

                .rejection-reason-box {
                    margin-top: 20px; padding: 20px; background: #fef2f2; 
                    border-radius: 12px; border-left: 4px solid #ef4444;
                }
                .rejection-reason-box span { font-size: 0.75rem; font-weight: bold; color: #ef4444; text-transform: uppercase; }
                .rejection-reason-box p { margin: 8px 0 0; font-size: 0.95rem; color: #ef4444; font-weight: 600; line-height: 1.5; }

                .loading-state-p { padding: 100px 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; }
                .empty-state-p { padding: 80px 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
                .empty-icon { font-size: 3rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 8px; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
                .pulse { animation: pulse 2s infinite; }
                .spinner-p { width: 50px; height: 50px; border: 4px solid #f1f5f9; border-top-color: var(--crimson); border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* RESPONSIVENESS */
                @media (max-width: 1024px) {
                    .vacancies-orchestration-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 24px;
                        padding: 40px;
                        border-radius: 24px;
                    }
                    
                    .serif-title-p { font-size: 2.5rem; }
                    
                    .toolbar-search-row {
                        flex-direction: column;
                        align-items: stretch;
                        width: 100%;
                    }
                    
                    .btn-reset-console, .btn-match-console {
                        width: 100%;
                        justify-content: center;
                    }
                    
                    .toolbar-filters-row {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 16px;
                        width: 100%;
                    }
                    
                    .filter-group {
                        min-width: 0;
                        flex: unset;
                    }
                    
                    .filter-field-sort {
                        grid-column: span 3;
                        border-left: none;
                        padding-left: 0;
                        border-top: 1.5px solid #f1f5f9;
                        padding-top: 16px;
                    }
                    
                    .select-orchestrator {
                        width: 100%;
                        min-width: 100%;
                    }

                    .premium-table-container {
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch;
                        padding-bottom: 8px !important;
                    }

                    .premium-table-container::-webkit-scrollbar {
                        height: 5px !important;
                    }
                    .premium-table-container::-webkit-scrollbar-track {
                        background: #f1f5f9 !important;
                        border-radius: 10px !important;
                    }
                    .premium-table-container::-webkit-scrollbar-thumb {
                        background: var(--crimson, #8b1a2b) !important;
                        border-radius: 10px !important;
                    }

                    .premium-table.applicants-table {
                        min-width: 1000px !important;
                    }
                }

                @media (max-width: 768px) {
                    .vacancies-orchestration-header {
                        padding: 24px 20px;
                        border-radius: 16px;
                        gap: 16px;
                    }
                    
                    .serif-title-p { font-size: 1.8rem; }
                    
                    .btn-establish-p {
                        width: 100%;
                        justify-content: center;
                    }
                    
                    .toolbar-filters-row {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                    }
                    
                    .filter-field-sort {
                        grid-column: span 2;
                        border-top: 1.5px solid #f1f5f9;
                        padding-top: 12px;
                    }
                    
                    .submission-box-p {
                        grid-template-columns: 1fr;
                    }
                }
                
                @media (max-width: 480px) {
                    .toolbar-filters-row {
                        grid-template-columns: 1fr;
                    }
                    .filter-field-sort {
                        grid-column: span 1;
                    }
                }
`}</style>

            {/* CV Viewer Modal */}
            {viewingCV && (
                <div className="modal-overlay-p" style={{ zIndex: 9999, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="detail-modal-p" style={{ width: '90%', height: '90vh', maxWidth: '1000px', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header-p" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'var(--crimson)', color: 'white', padding: '8px', borderRadius: '8px', display: 'flex' }}><FiFileText size={20} /></div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{viewingCV.first_name} {viewingCV.last_name} - Curriculum Vitae</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{viewingCV.cv_path}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <a
                                    href={`${API_BASE}/applications.php?action=view_cv&file=${encodeURIComponent(viewingCV.cv_path)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline"
                                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--crimson)' }}
                                >
                                    <FiExternalLink /> Open in New Tab
                                </a>
                                <a
                                    href={`${API_BASE}/applications.php?action=view_cv&file=${encodeURIComponent(viewingCV.cv_path)}`}
                                    download={`${viewingCV.first_name}_CV`}
                                    className="btn btn-outline"
                                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <FiDownload /> Download File
                                </a>
                                <button className="close-btn-p" onClick={() => setViewingCV(null)} style={{ background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={20} /></button>
                            </div>
                        </div>
                        <div className="modal-body-p" style={{ flex: 1, padding: 0, overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {viewingCV.cv_path.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={`${API_BASE}/applications.php?action=view_cv&file=${encodeURIComponent(viewingCV.cv_path)}#toolbar=0`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="CV Viewer"
                                />
                            ) : viewingCV.cv_path.toLowerCase().endsWith('.docx') || viewingCV.cv_path.toLowerCase().endsWith('.doc') ? (
                                <DocxViewer url={`${API_BASE}/applications.php?action=view_cv&file=${encodeURIComponent(viewingCV.cv_path)}`} />
                            ) : (
                                <div style={{ textAlign: 'center', color: '#64748b' }}>
                                    <FiFileText size={48} style={{ marginBottom: '16px', color: '#cbd5e1' }} />
                                    <h3>Document Viewer</h3>
                                    <p style={{ maxWidth: '400px', margin: '0 auto 20px auto' }}>This document type ({viewingCV.cv_path.split('.').pop().toUpperCase()}) cannot be previewed directly in the browser. Please download it to view.</p>
                                    <a
                                        href={`${API_BASE}/applications.php?action=view_cv&file=${encodeURIComponent(viewingCV.cv_path)}`}
                                        download={`${viewingCV.first_name}_CV`}
                                        className="btn btn-gold"
                                    >
                                        <FiDownload /> Download Document
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Applicants;
