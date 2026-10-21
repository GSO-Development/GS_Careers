import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
    FiSettings, FiMail, FiCheck, FiActivity, FiServer, 
    FiLock, FiUser, FiEye, FiEyeOff, FiPlay, FiInfo, 
    FiCheckCircle, FiXCircle, FiAlertTriangle, FiChevronDown, FiChevronUp,
    FiEdit, FiX, FiFileText, FiCpu, FiTarget, FiRefreshCw, FiShield,
    FiSliders, FiZap, FiLayers, FiCopy, FiToggleLeft, FiToggleRight, FiClock
} from 'react-icons/fi';
import { getSettings, saveSettings, testSmtpSettings, checkGeminiQuota } from '../../services/api';

const DIMENSION_CONFIG = [
    {
        id: 'skills',
        key: 'weight_skills',
        title: 'Skills Match',
        shortTag: 'Mandatory & optional skills',
        icon: '🎯',
        whatItChecks: "Compares candidate's extracted technical, functional, and specialized skills against mandatory and optional skills listed in the job vacancy.",
        keyPoints: [
            'Automatically detects skill synonyms and aliases (e.g., React.js = React, PostgreSQL = Postgres, Node = NodeJS).',
            'Mandatory skills hold significantly higher score weight than preferred or optional qualifications.',
            'Evaluates domain match and tool proficiency directly from CV work history.'
        ]
    },
    {
        id: 'experience',
        key: 'weight_experience',
        title: 'Work Experience',
        shortTag: 'Work tenure & role seniority',
        icon: '💼',
        whatItChecks: "Evaluates total career duration, relevant industry experience, and job title progression against the role's seniority requirements.",
        keyPoints: [
            'Career progression and domain-specific tenure are weighted against vacancy seniority.',
            'Entry-level applicants with prior internships or relevant projects receive top ranking (never penalized).',
            'Consistency and continuous career growth in matching roles contribute positively.'
        ]
    },
    {
        id: 'qualification',
        key: 'weight_qualification',
        title: 'Qualification',
        shortTag: 'Academic & certified credentials',
        icon: '🎓',
        whatItChecks: 'Validates accredited academic degrees (BSc, MSc, PhD), accredited diplomas, and recognized professional qualifications.',
        keyPoints: [
            'Detects global & national certifications (CIMA, ACCA, BIT, CIM, PMP, AWS, CIPM, etc.).',
            'Degree disciplines directly matching vacancy requirements provide maximum qualification merit.',
            'Validates verified educational institutions and recognized professional bodies.'
        ]
    },
    {
        id: 'jd_alignment',
        key: 'weight_jd_alignment',
        title: 'JD Alignment',
        shortTag: 'Project work & duties relevance',
        icon: '📄',
        whatItChecks: "Evaluates contextual alignment between candidate's demonstrated project work, daily responsibilities, and vacancy duties.",
        keyPoints: [
            'Ensures candidate has hands-on practical experience executing the core tasks of the role.',
            'Uses semantic AI analysis to match real-world project achievements with job descriptions.',
            'Verifies practical deliverables and responsibilities rather than simple keyword matches.'
        ]
    },
    {
        id: 'salary',
        key: 'weight_salary',
        title: 'Salary Budget',
        shortTag: 'Expected vs vacancy budget',
        icon: '💵',
        whatItChecks: "Compares candidate's expected salary against the approved vacancy budget range for the position.",
        keyPoints: [
            'Candidates within or below budget receive top marks; scaled fairly if slightly above.',
            'If no salary budget is configured for a position, this weight is auto-redistributed across skills and experience.',
            'Prevents unnecessary candidate disqualification while optimizing hiring cost.'
        ]
    }
];

function SettingsPage({ admin }) {
    const [activeTab, setActiveTab] = useState('score');
    const [activeEmailSubTab, setActiveEmailSubTab] = useState('candidate');
    const [settings, setSettings] = useState({
        system_email: '',
        smtp_host: '',
        smtp_port: '',
        smtp_secure: 'tls',
        smtp_user: '',
        smtp_pass: '',
        smtp_from_name: '',
        enable_candidate_emails: '1',
        
        // Match Score Thresholds
        min_high_match_score: '75',
        min_medium_match_score: '50',
        
        // PDPA Settings
        pdpa_title: '',
        pdpa_description: '',
        pdpa_purpose: '',
        pdpa_retention: '',
        pdpa_security: '',
        pdpa_rights: '',
        
        // Email Template Settings
        email_template_confirmation_subject: '',
        email_template_confirmation_body: '',
        email_template_shortlist_subject: '',
        email_template_shortlist_body: '',
        email_template_rejection_subject: '',
        email_template_rejection_body: '',
        
        // Vacancy Requisition Workflow Templates
        email_template_vacancy_pending_subject: '',
        email_template_vacancy_pending_body: '',
        email_template_vacancy_approved_subject: '',
        email_template_vacancy_approved_body: '',
        email_template_vacancy_rejected_subject: '',
        email_template_vacancy_rejected_body: '',
        
        // AI Settings
        ai_provider: 'ollama',
        gemini_api_key: '',
        gemini_api_key_backup: '',
        gemini_model: 'gemini-2.5-flash',
        ollama_server: 'http://172.16.7.21:11434',
        ollama_model: 'qwen2.5:3b',
        
        // Candidate Score Calculation Weights (%)
        weight_skills: 35,
        weight_experience: 30,
        weight_qualification: 20,
        weight_jd_alignment: 10,
        weight_salary: 5,
        
        // Defaults
        default_email: '',
        default_smtp_host: '',
        default_smtp_port: '',
        default_smtp_secure: '',
        default_smtp_user: '',
        default_smtp_from_name: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showBackupPassword, setShowBackupPassword] = useState(false);
    const [backupQuotaData, setBackupQuotaData] = useState(null);
    const [testRecipient, setTestRecipient] = useState('');
    const [testResult, setTestResult] = useState(null); // { success: boolean, message: string, debug: string }
    const [showDebug, setShowDebug] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [backupSettings, setBackupSettings] = useState(null);
    const [selectedDimensionModal, setSelectedDimensionModal] = useState(null);

    // Close modal on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedDimensionModal(null);
        };
        if (selectedDimensionModal) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDimensionModal]);

    // Role detection (Super Admin gets full access to all 5 tabs including AI & Email Templates)
    const storedAdminData = (() => {
        try {
            return localStorage.getItem('gs_admin_data') ? JSON.parse(localStorage.getItem('gs_admin_data')) : null;
        } catch (e) {
            return null;
        }
    })();
    const currentRole = admin?.role || storedAdminData?.role || '';
    const isSuperAdmin = currentRole === 'super_admin';
    const isSubAdmin = currentRole === 'sub_admin1' || currentRole === 'sub_admin2' || currentRole === 'sub_admin';

    // Gemini Quota Monitor State
    const [quotaData, setQuotaData] = useState(null);
    const [checkingQuota, setCheckingQuota] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (isSubAdmin) {
            setActiveTab('score');
        } else if (!isSuperAdmin && (activeTab === 'email' || activeTab === 'ai')) {
            setActiveTab('score');
        }
    }, [isSuperAdmin, isSubAdmin, activeTab]);

    useEffect(() => {
        if (isSuperAdmin && activeTab === 'ai' && !quotaData) {
            handleCheckQuota();
        }
    }, [activeTab, isSuperAdmin]);

    const handleCheckQuota = async () => {
        setCheckingQuota(true);
        try {
            const res = await checkGeminiQuota({ apiKey: settings.gemini_api_key });
            if (res.data?.data) {
                setQuotaData(res.data.data);
                if (res.data.data.status === 'healthy') {
                    toast.success('🟢 Primary Gemini API Key is active & healthy!');
                } else if (res.data.data.is_exhausted) {
                    toast.error(`🔴 Primary Key: ${res.data.data.message}`);
                } else {
                    toast.warning(`⚠️ Primary Key: ${res.data.data.message}`);
                }
            }

            if (settings.gemini_api_key_backup) {
                try {
                    const resB = await checkGeminiQuota({ apiKey: settings.gemini_api_key_backup });
                    if (resB.data?.data) {
                        setBackupQuotaData(resB.data.data);
                    }
                } catch (bErr) {
                    console.error('Backup quota check error:', bErr);
                }
            }
        } catch (err) {
            console.error('Failed to check Gemini quota:', err);
            toast.error('Failed to verify Gemini API Key status');
        } finally {
            setCheckingQuota(false);
        }
    };

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await getSettings();
            const data = res.data.data || {};
            const loaded = {
                system_email: data.system_email || '',
                smtp_host: data.smtp_host || '',
                smtp_port: data.smtp_port || '',
                smtp_secure: data.smtp_secure || 'tls',
                smtp_user: data.smtp_user || '',
                smtp_pass: data.smtp_pass || '',
                smtp_from_name: data.smtp_from_name || '',
                enable_candidate_emails: data.enable_candidate_emails !== undefined ? data.enable_candidate_emails : '1',
                
                min_high_match_score: data.min_high_match_score || '75',
                min_medium_match_score: data.min_medium_match_score || '50',
                
                pdpa_title: data.pdpa_title || '',
                pdpa_description: data.pdpa_description || '',
                pdpa_purpose: data.pdpa_purpose || '',
                pdpa_retention: data.pdpa_retention || '',
                pdpa_security: data.pdpa_security || '',
                pdpa_rights: data.pdpa_rights || '',
                
                email_template_confirmation_subject: data.email_template_confirmation_subject || '',
                email_template_confirmation_body: data.email_template_confirmation_body || '',
                email_template_shortlist_subject: data.email_template_shortlist_subject || '',
                email_template_shortlist_body: data.email_template_shortlist_body || '',
                email_template_rejection_subject: data.email_template_rejection_subject || '',
                email_template_rejection_body: data.email_template_rejection_body || '',
                
                email_template_vacancy_pending_subject: data.email_template_vacancy_pending_subject || '',
                email_template_vacancy_pending_body: data.email_template_vacancy_pending_body || '',
                email_template_vacancy_approved_subject: data.email_template_vacancy_approved_subject || '',
                email_template_vacancy_approved_body: data.email_template_vacancy_approved_body || '',
                email_template_vacancy_rejected_subject: data.email_template_vacancy_rejected_subject || '',
                email_template_vacancy_rejected_body: data.email_template_vacancy_rejected_body || '',
                
                ai_provider: data.ai_provider || 'ollama',
                gemini_api_key: data.gemini_api_key || '',
                gemini_api_key_backup: data.gemini_api_key_backup || '',
                gemini_model: data.gemini_model || 'gemini-2.5-flash',
                ollama_server: data.ollama_server || 'http://172.16.7.21:11434',
                ollama_model: data.ollama_model || 'qwen2.5:3b',
                
                weight_skills: data.weight_skills !== undefined ? parseInt(data.weight_skills, 10) : 35,
                weight_experience: data.weight_experience !== undefined ? parseInt(data.weight_experience, 10) : 30,
                weight_qualification: data.weight_qualification !== undefined ? parseInt(data.weight_qualification, 10) : 20,
                weight_jd_alignment: data.weight_jd_alignment !== undefined ? parseInt(data.weight_jd_alignment, 10) : 10,
                weight_salary: data.weight_salary !== undefined ? parseInt(data.weight_salary, 10) : 5,
                
                default_email: data.default_email || '',
                default_smtp_host: data.default_smtp_host || '',
                default_smtp_port: data.default_smtp_port || '',
                default_smtp_secure: data.default_smtp_secure || '',
                default_smtp_user: data.default_smtp_user || '',
                default_smtp_from_name: data.default_smtp_from_name || ''
            };
            setSettings(loaded);
            setBackupSettings(loaded);

            if (admin?.email) {
                setTestRecipient(admin.email);
            } else if (data.system_email) {
                setTestRecipient(data.system_email);
            } else {
                setTestRecipient(data.default_email || '');
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
            toast.error(err.response?.data?.message || 'Failed to load system settings');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAiSwitch = async (provider) => {
        if (settings.ai_provider === provider) return;
        try {
            await saveSettings({
                ...settings,
                ai_provider: provider
            });
            
            setSettings(prev => ({
                ...prev,
                ai_provider: provider
            }));
            
            toast.success(`🚀 System AI engine switched to ${provider === 'gemini' ? 'Google Gemini (Cloud)' : 'Local Ollama (Offline)'}!`);
        } catch (err) {
            console.error('Failed to switch AI provider:', err);
            toast.error('Failed to update AI engine selection');
        }
    };

    const handleStartEdit = () => {
        setBackupSettings({ ...settings });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (backupSettings) {
            setSettings({ ...backupSettings });
        }
        setIsEditing(false);
    };

    const handleChange = (e) => {
        setSettings({
            ...settings,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isSubAdmin) {
            if (!settings.system_email) {
                toast.warning('Sender Email Address is required');
                setActiveTab('mail');
                return;
            }
            if (!settings.pdpa_title || !settings.pdpa_description || !settings.pdpa_purpose || !settings.pdpa_retention || !settings.pdpa_security || !settings.pdpa_rights) {
                toast.warning('All PDPA Consent fields are required');
                setActiveTab('pdpa');
                return;
            }
        }

        if (isSuperAdmin) {
            const totalWeights = (parseInt(settings.weight_skills, 10) || 0) +
                                 (parseInt(settings.weight_experience, 10) || 0) +
                                 (parseInt(settings.weight_qualification, 10) || 0) +
                                 (parseInt(settings.weight_jd_alignment, 10) || 0) +
                                 (parseInt(settings.weight_salary, 10) || 0);
            if (totalWeights !== 100) {
                toast.warning(`Total Candidate Score Calculation Weights must equal exactly 100% (currently ${totalWeights}%). Please adjust your weights.`);
                setActiveTab('score');
                return;
            }
        }
        
        setSaving(true);
        try {
            const formulaWeights = isSuperAdmin ? {
                weight_skills: settings.weight_skills,
                weight_experience: settings.weight_experience,
                weight_qualification: settings.weight_qualification,
                weight_jd_alignment: settings.weight_jd_alignment,
                weight_salary: settings.weight_salary
            } : {};

            const payload = isSubAdmin ? {
                min_high_match_score: settings.min_high_match_score,
                min_medium_match_score: settings.min_medium_match_score,
                ...formulaWeights
            } : {
                system_email: settings.system_email,
                smtp_host: settings.smtp_host,
                smtp_port: settings.smtp_port,
                smtp_secure: settings.smtp_secure,
                smtp_user: settings.smtp_user,
                smtp_pass: settings.smtp_pass,
                smtp_from_name: settings.smtp_from_name,
                enable_candidate_emails: settings.enable_candidate_emails,
                min_high_match_score: settings.min_high_match_score,
                min_medium_match_score: settings.min_medium_match_score,
                ...formulaWeights,
                pdpa_title: settings.pdpa_title,
                pdpa_description: settings.pdpa_description,
                pdpa_purpose: settings.pdpa_purpose,
                pdpa_retention: settings.pdpa_retention,
                pdpa_security: settings.pdpa_security,
                pdpa_rights: settings.pdpa_rights,
                email_template_confirmation_subject: settings.email_template_confirmation_subject,
                email_template_confirmation_body: settings.email_template_confirmation_body,
                email_template_shortlist_subject: settings.email_template_shortlist_subject,
                email_template_shortlist_body: settings.email_template_shortlist_body,
                email_template_rejection_subject: settings.email_template_rejection_subject,
                email_template_rejection_body: settings.email_template_rejection_body,
                email_template_vacancy_pending_subject: settings.email_template_vacancy_pending_subject,
                email_template_vacancy_pending_body: settings.email_template_vacancy_pending_body,
                email_template_vacancy_approved_subject: settings.email_template_vacancy_approved_subject,
                email_template_vacancy_approved_body: settings.email_template_vacancy_approved_body,
                email_template_vacancy_rejected_subject: settings.email_template_vacancy_rejected_subject,
                email_template_vacancy_rejected_body: settings.email_template_vacancy_rejected_body,
                ai_provider: settings.ai_provider,
                gemini_api_key: settings.gemini_api_key,
                gemini_api_key_backup: settings.gemini_api_key_backup,
                gemini_model: settings.gemini_model,
                ollama_server: settings.ollama_server,
                ollama_model: settings.ollama_model
            };

            await saveSettings(payload);
            toast.success(isSubAdmin ? 'Candidate match score settings updated successfully' : 'System configurations updated successfully');
            setIsEditing(false);
            loadSettings();
        } catch (err) {
            console.error('Failed to save settings:', err);
            toast.error(err.response?.data?.message || 'Failed to save system settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestSmtp = async () => {
        if (!testRecipient) {
            toast.warning('Please enter a recipient email address to send the test message to.');
            return;
        }

        setTesting(true);
        setTestResult(null);
        setShowDebug(false);

        try {
            const res = await testSmtpSettings({
                system_email: settings.system_email || settings.default_email,
                smtp_host: settings.smtp_host || settings.default_smtp_host,
                smtp_port: settings.smtp_port || settings.default_smtp_port,
                smtp_secure: settings.smtp_secure || settings.default_smtp_secure,
                smtp_user: settings.smtp_user || settings.default_smtp_user,
                smtp_pass: settings.smtp_pass,
                smtp_from_name: settings.smtp_from_name || settings.default_smtp_from_name,
                test_recipient: testRecipient
            });
            setTestResult({
                success: true,
                message: res.data.message || 'SMTP Connection successful! Test email delivered.',
                debug: res.data.data?.debug || 'No log details available.'
            });
            toast.success('SMTP Verification Email Sent Successfully!');
        } catch (err) {
            console.error('SMTP test connection failed:', err);
            setTestResult({
                success: false,
                message: err.response?.data?.message || 'SMTP test connection failed.',
                debug: err.response?.data?.data?.debug || err.message || 'No log details available.'
            });
            toast.error('SMTP Connection Test Failed');
        } finally {
            setTesting(false);
        }
    };

    const insertTag = (fieldName, tag) => {
        setSettings(prev => ({
            ...prev,
            [fieldName]: (prev[fieldName] || '') + ` ${tag} `
        }));
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="spinner-p" style={{ width: '32px', height: '32px', borderWidth: '3px', borderTopColor: '#7A1228' }}></div>
                <p style={{ marginTop: '14px', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Loading configurations...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 8px 60px 8px', animation: 'fadeIn 0.25s ease-out' }}>
            
            {/* 1. EXECUTIVE HERO HEADER CARD BANNER */}
            <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                borderTop: '4px solid #7A1228',
                boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(122, 18, 40, 0.03)',
                padding: '24px 28px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background Decorative Ambient Glow */}
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    width: '180px',
                    height: '180px',
                    background: 'radial-gradient(circle, rgba(122, 18, 40, 0.06) 0%, rgba(255, 255, 255, 0) 70%)',
                    pointerEvents: 'none'
                }} />

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px'
                }}>
                    {/* Left Side: Icon + Titles */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '1 1 450px' }}>
                        {/* Glowing Brand Icon Badge */}
                        <div style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #7A1228 0%, #5c0b1e 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'center',
                            fontSize: '1.45rem',
                            boxShadow: '0 8px 20px rgba(122, 18, 40, 0.28)',
                            flexShrink: 0
                        }}>
                            <FiSliders />
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={{
                                    background: 'rgba(122, 18, 40, 0.08)',
                                    color: '#7A1228',
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                                    {isSubAdmin ? 'MATCH SCORE CRITERIA • CANDIDATE EVALUATION' : 'SYSTEM CONFIGURATIONS • V2.4'}
                                </span>
                            </div>

                            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 4px 0', letterSpacing: '-0.025em' }}>
                                {isSubAdmin ? 'Candidate Match Score Settings' : 'Portal Settings & Preferences'}
                            </h1>
                            
                            {!isSubAdmin && (
                                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, lineHeight: '1.45' }}>
                                    Manage candidate match thresholds, SMTP mail servers, notification templates, and AI resume parsing engines.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        {!isEditing ? (
                            <button
                                type="button"
                                onClick={handleStartEdit}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '11px 24px',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.88rem',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #7A1228 0%, #5c0b1e 100%)',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 4px 16px rgba(122, 18, 40, 0.28)',
                                    letterSpacing: '0.01em'
                                }}
                            >
                                <FiEdit style={{ fontSize: '0.95rem' }} /> Edit Settings
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    style={{
                                        padding: '11px 20px',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        fontSize: '0.88rem',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#475569',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '11px 26px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        fontSize: '0.88rem',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #7A1228 0%, #5c0b1e 100%)',
                                        color: '#ffffff',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 16px rgba(122, 18, 40, 0.28)'
                                    }}
                                >
                                    <FiCheck /> {saving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. FLOATING SEGMENTED CONTROL TABS (Super Admin & GS Admin Only) */}
            {!isSubAdmin && (
                <div style={{
                    background: '#f1f5f9',
                    padding: '4px',
                    borderRadius: '14px',
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '28px',
                    overflowX: 'auto',
                    border: '1px solid #e2e8f0'
                }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('score')}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '10px',
                            fontWeight: activeTab === 'score' ? 700 : 600,
                            fontSize: '0.86rem',
                            border: 'none',
                            background: activeTab === 'score' ? '#ffffff' : 'transparent',
                            color: activeTab === 'score' ? '#7A1228' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap',
                            boxShadow: activeTab === 'score' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                        }}
                    >
                        <FiTarget style={{ fontSize: '1rem', color: activeTab === 'score' ? '#7A1228' : '#94a3b8' }} />
                        Match Score
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('mail')}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '10px',
                            fontWeight: activeTab === 'mail' ? 700 : 600,
                            fontSize: '0.86rem',
                            border: 'none',
                            background: activeTab === 'mail' ? '#ffffff' : 'transparent',
                            color: activeTab === 'mail' ? '#7A1228' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap',
                            boxShadow: activeTab === 'mail' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                        }}
                    >
                        <FiMail style={{ fontSize: '1rem', color: activeTab === 'mail' ? '#7A1228' : '#94a3b8' }} />
                        Mail &amp; SMTP
                    </button>
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('email')}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '10px',
                                fontWeight: activeTab === 'email' ? 700 : 600,
                                fontSize: '0.86rem',
                                border: 'none',
                                background: activeTab === 'email' ? '#ffffff' : 'transparent',
                                color: activeTab === 'email' ? '#7A1228' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap',
                                boxShadow: activeTab === 'email' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                            }}
                        >
                            <FiFileText style={{ fontSize: '1rem', color: activeTab === 'email' ? '#7A1228' : '#94a3b8' }} />
                            Email Templates
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setActiveTab('pdpa')}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '10px',
                            fontWeight: activeTab === 'pdpa' ? 700 : 600,
                            fontSize: '0.86rem',
                            border: 'none',
                            background: activeTab === 'pdpa' ? '#ffffff' : 'transparent',
                            color: activeTab === 'pdpa' ? '#7A1228' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap',
                            boxShadow: activeTab === 'pdpa' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                        }}
                    >
                        <FiShield style={{ fontSize: '1rem', color: activeTab === 'pdpa' ? '#7A1228' : '#94a3b8' }} />
                        PDPA Consent
                    </button>
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('ai')}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '10px',
                                fontWeight: activeTab === 'ai' ? 700 : 600,
                                fontSize: '0.86rem',
                                border: 'none',
                                background: activeTab === 'ai' ? '#ffffff' : 'transparent',
                                color: activeTab === 'ai' ? '#7A1228' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap',
                                boxShadow: activeTab === 'ai' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                            }}
                        >
                            <FiCpu style={{ fontSize: '1rem', color: activeTab === 'ai' ? '#7A1228' : '#94a3b8' }} />
                            AI Resume Parser
                        </button>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* ========================================================= */}
                    {/* TAB 1: MATCH SCORE THRESHOLDS                             */}
                    {/* ========================================================= */}
                    {activeTab === 'score' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                            
                            {/* SECTION 1: CANDIDATE MATCH LEVELS & THRESHOLDS */}
                            <div style={{
                                background: '#ffffff',
                                padding: '28px 30px',
                                borderRadius: '20px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 24px -2px rgba(15, 23, 42, 0.04)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px'
                            }}>
                                <div>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(122, 18, 40, 0.06)',
                                        color: '#7A1228',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                        marginBottom: '6px'
                                    }}>
                                        <FiTarget style={{ fontSize: '0.85rem' }} /> Evaluation Benchmarks
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                        Candidate Match Levels &amp; Cutoff Thresholds
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b', lineHeight: '1.45' }}>
                                        Applicants are automatically categorized into three hiring tiers based on their overall match score:
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
                                    
                                    {/* 1. HIGH MATCH CARD */}
                                    <div style={{
                                        background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 60%)',
                                        padding: '20px 18px',
                                        borderRadius: '16px',
                                        border: '1px solid #bbf7d0',
                                        boxShadow: '0 2px 12px rgba(22, 163, 74, 0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '10px',
                                                background: '#dcfce7',
                                                color: '#16a34a',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)',
                                                flexShrink: 0
                                            }}>
                                                <FiCheckCircle size={20} />
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    background: '#dcfce7',
                                                    color: '#15803d',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                    marginBottom: '2px'
                                                }}>
                                                    High Match
                                                </span>
                                                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                                    ≥ {settings.min_high_match_score}%
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                                                Top Recommended
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.45' }}>
                                                Strongest alignment with job criteria. Fast-tracked for immediate interview shortlisting.
                                            </p>
                                        </div>

                                        {isEditing && (
                                            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#15803d' }}>Cutoff Threshold</label>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d' }}>{settings.min_high_match_score}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="55"
                                                    max="95"
                                                    value={settings.min_high_match_score}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, min_high_match_score: e.target.value }))}
                                                    style={{ width: '100%', accentColor: '#16a34a', cursor: 'pointer' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. MEDIUM MATCH CARD */}
                                    <div style={{
                                        background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 60%)',
                                        padding: '20px 18px',
                                        borderRadius: '16px',
                                        border: '1px solid #fde68a',
                                        boxShadow: '0 2px 12px rgba(217, 119, 6, 0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '10px',
                                                background: '#fef3c7',
                                                color: '#d97706',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)',
                                                flexShrink: 0
                                            }}>
                                                <FiClock size={20} />
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    background: '#fef3c7',
                                                    color: '#b45309',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                    marginBottom: '2px'
                                                }}>
                                                    Medium Match
                                                </span>
                                                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                                    {settings.min_medium_match_score}% – {parseInt(settings.min_high_match_score, 10) - 1}%
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                                                Potential for Review
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.45' }}>
                                                Meets primary criteria. Recommended for secondary screening or talent pool retention.
                                            </p>
                                        </div>

                                        {isEditing && (
                                            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#b45309' }}>Cutoff Threshold</label>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#b45309' }}>{settings.min_medium_match_score}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="25"
                                                    max={parseInt(settings.min_high_match_score, 10) - 5}
                                                    value={settings.min_medium_match_score}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, min_medium_match_score: e.target.value }))}
                                                    style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. LOW MATCH CARD */}
                                    <div style={{
                                        background: 'linear-gradient(180deg, #fff1f2 0%, #ffffff 60%)',
                                        padding: '20px 18px',
                                        borderRadius: '16px',
                                        border: '1px solid #fecdd3',
                                        boxShadow: '0 2px 12px rgba(225, 29, 72, 0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '10px',
                                                background: '#ffe4e6',
                                                color: '#e11d48',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 8px rgba(225, 29, 72, 0.12)',
                                                flexShrink: 0
                                            }}>
                                                <FiAlertTriangle size={20} />
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    background: '#ffe4e6',
                                                    color: '#be123c',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                    marginBottom: '2px'
                                                }}>
                                                    Low Match
                                                </span>
                                                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#be123c', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                                    &lt; {settings.min_medium_match_score}%
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                                                Low Alignment
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.45' }}>
                                                Below minimum skills or experience limit. Automatically flagged for recruiter review.
                                            </p>
                                        </div>

                                        {isEditing && (
                                            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic' }}>
                                                Auto-calculated below Medium cutoff
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>

                            {/* SECTION 3: CALCULATION WEIGHTS (5 DIMENSIONS) */}
                            {(() => {
                                const totalWeights = (parseInt(settings.weight_skills, 10) || 0) +
                                                     (parseInt(settings.weight_experience, 10) || 0) +
                                                     (parseInt(settings.weight_qualification, 10) || 0) +
                                                     (parseInt(settings.weight_jd_alignment, 10) || 0) +
                                                     (parseInt(settings.weight_salary, 10) || 0);
                                const isWeightValid = totalWeights === 100;

                                return (
                                    <div style={{
                                        background: '#ffffff',
                                        padding: '28px 30px',
                                        borderRadius: '20px',
                                        border: isWeightValid ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                                        boxShadow: '0 4px 24px -2px rgba(15, 23, 42, 0.04)',
                                        transition: 'border-color 0.2s ease',
                                        position: 'relative'
                                    }}>
                                        <style>{`
                                            .simple-dim-card {
                                                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease;
                                            }
                                            .simple-dim-card:hover {
                                                transform: translateY(-2px);
                                                box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.06);
                                                border-color: #cbd5e1 !important;
                                            }
                                            .criteria-btn {
                                                transition: all 0.15s ease;
                                            }
                                            .criteria-btn:hover {
                                                background: #ffffff !important;
                                                border-color: #cbd5e1 !important;
                                                color: #7A1228 !important;
                                                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
                                            }
                                            @keyframes modalSlideUp {
                                                from {
                                                    opacity: 0;
                                                    transform: translateY(12px) scale(0.98);
                                                }
                                                to {
                                                    opacity: 1;
                                                    transform: translateY(0) scale(1);
                                                }
                                            }
                                            @media (min-width: 960px) {
                                                .dimensions-grid-5 {
                                                    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
                                                }
                                            }
                                            @media (max-width: 959px) and (min-width: 600px) {
                                                .dimensions-grid-5 {
                                                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                                                }
                                            }
                                            @media (max-width: 599px) {
                                                .dimensions-grid-5 {
                                                    grid-template-columns: 1fr !important;
                                                }
                                            }
                                            @media (max-width: 640px) {
                                                .dimension-section-header {
                                                    flex-direction: column !important;
                                                    align-items: flex-start !important;
                                                    gap: 14px !important;
                                                }
                                            }
                                        `}</style>

                                        {/* Section Header */}
                                        <div 
                                            className="dimension-section-header"
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'flex-start', 
                                                paddingBottom: '18px', 
                                                borderBottom: '1px solid #f1f5f9',
                                                marginBottom: '18px',
                                                gap: '16px' 
                                            }}
                                        >
                                            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: 'rgba(122, 18, 40, 0.06)',
                                                    color: '#7A1228',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                    marginBottom: '6px'
                                                }}>
                                                    <FiSliders style={{ fontSize: '0.85rem' }} /> Scoring Architecture
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                                    How Candidate Scores Are Calculated (5 Dimensions)
                                                </h3>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b', lineHeight: '1.45' }}>
                                                    Candidate scores (0% – 100%) are evaluated across these 5 essential recruitment dimensions. Total allocation must equal exactly 100%.
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginTop: '2px' }}>
                                                {isEditing && isSuperAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSettings(prev => ({
                                                            ...prev,
                                                            weight_skills: 35,
                                                            weight_experience: 30,
                                                            weight_qualification: 20,
                                                            weight_jd_alignment: 10,
                                                            weight_salary: 5
                                                        }))}
                                                        style={{
                                                            background: '#f8fafc',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '8px',
                                                            padding: '6px 12px',
                                                            fontSize: '0.74rem',
                                                            fontWeight: 700,
                                                            color: '#475569',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title="Reset weights to default: 35%, 30%, 20%, 10%, 5%"
                                                    >
                                                        <FiRefreshCw style={{ fontSize: '0.74rem' }} /> Reset Defaults
                                                    </button>
                                                )}
                                                <div style={{
                                                    background: isWeightValid ? '#ecfdf5' : '#fff1f2',
                                                    color: isWeightValid ? '#047857' : '#be123c',
                                                    fontSize: '0.76rem',
                                                    fontWeight: 800,
                                                    padding: '6px 14px',
                                                    borderRadius: '20px',
                                                    border: isWeightValid ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    letterSpacing: '0.02em',
                                                    whiteSpace: 'nowrap',
                                                    boxShadow: isWeightValid ? '0 1px 2px rgba(16, 185, 129, 0.08)' : '0 1px 2px rgba(225, 29, 72, 0.08)'
                                                }}>
                                                    {isWeightValid ? (
                                                        <>
                                                            <FiCheckCircle style={{ fontSize: '0.88rem', color: '#10b981' }} /> TOTAL ALLOCATION: 100%
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiAlertTriangle style={{ fontSize: '0.88rem', color: '#ef4444' }} /> TOTAL: {totalWeights}% (MUST BE 100%)
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Validation Alert when total != 100% in edit mode for Super Admin */}
                                        {isEditing && isSuperAdmin && !isWeightValid && (
                                            <div style={{
                                                background: '#fff1f2',
                                                border: '1px solid #fecdd3',
                                                borderRadius: '10px',
                                                padding: '10px 14px',
                                                marginTop: '14px',
                                                marginBottom: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '0.8rem',
                                                color: '#be123c',
                                                fontWeight: 600
                                            }}>
                                                <FiAlertTriangle style={{ fontSize: '1rem', flexShrink: 0 }} />
                                                <span>
                                                    Total weights must equal exactly 100%. Currently allocated: <strong>{totalWeights}%</strong> ({100 - totalWeights > 0 ? `${100 - totalWeights}% remaining to allocate` : `${totalWeights - 100}% over allocated`}).
                                                </span>
                                            </div>
                                        )}

                                        {/* 5 DIMENSIONS GRID */}
                                        <div 
                                            className="dimensions-grid-5"
                                            style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                                                gap: '14px', 
                                                marginTop: '18px'
                                            }}
                                        >
                                            {DIMENSION_CONFIG.map((dim) => {
                                                const currentWeight = parseInt(settings[dim.key], 10) || 0;

                                                return (
                                                    <div 
                                                        key={dim.id}
                                                        className="simple-dim-card"
                                                        style={{ 
                                                            background: '#ffffff', 
                                                            padding: '18px 16px', 
                                                            borderRadius: '14px', 
                                                            border: '1px solid #e2e8f0', 
                                                            display: 'flex', 
                                                            flexDirection: 'column', 
                                                            gap: '12px',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        {/* Card Top: Icon & Title */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{
                                                                width: '36px',
                                                                height: '36px',
                                                                borderRadius: '10px',
                                                                background: '#f8fafc',
                                                                border: '1px solid #e2e8f0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '1.15rem',
                                                                flexShrink: 0
                                                            }}>
                                                                {dim.icon}
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, display: 'block' }}>
                                                                    {dim.title}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Card Middle: Percentage & Progress */}
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                                                    {currentWeight}%
                                                                </span>
                                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    Weight
                                                                </span>
                                                            </div>
                                                            <div style={{ height: '4px', width: '100%', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, currentWeight))}%`, background: '#7A1228', borderRadius: '8px', transition: 'width 0.25s ease' }}></div>
                                                            </div>
                                                        </div>

                                                        {/* Card Subtitle */}
                                                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.35, minHeight: '28px' }}>
                                                            {dim.shortTag}
                                                        </p>

                                                        {/* Card Bottom: Single Clean Criteria Details Button */}
                                                        <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedDimensionModal(dim)}
                                                                className="criteria-btn"
                                                                style={{
                                                                    width: '100%',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px',
                                                                    padding: '7px 12px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #e2e8f0',
                                                                    background: '#f8fafc',
                                                                    color: '#475569',
                                                                    fontSize: '0.74rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                <FiInfo size={13} style={{ color: '#7A1228' }} /> Criteria Details
                                                            </button>
                                                        </div>

                                                        {/* Edit Controls (Super Admin Only in Edit Mode) */}
                                                        {isEditing && isSuperAdmin && (
                                                            <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Adjust Weight</label>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={currentWeight}
                                                                            onChange={(e) => setSettings(prev => ({ ...prev, [dim.key]: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                                                                            style={{ width: '46px', padding: '2px 4px', fontSize: '0.76rem', fontWeight: 800, textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a' }}
                                                                        />
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>%</span>
                                                                    </div>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="100"
                                                                    step="1"
                                                                    value={currentWeight}
                                                                    onChange={(e) => setSettings(prev => ({ ...prev, [dim.key]: parseInt(e.target.value, 10) || 0 }))}
                                                                    style={{ width: '100%', accentColor: '#7A1228', cursor: 'pointer' }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* CRITERIA DETAILS MODAL POPUP */}
                                        {selectedDimensionModal && (
                                            <div
                                                style={{
                                                    position: 'fixed',
                                                    inset: 0,
                                                    zIndex: 9999,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '16px'
                                                }}
                                            >
                                                {/* Dimmed Blurred Backdrop */}
                                                <div
                                                    onClick={() => setSelectedDimensionModal(null)}
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background: 'rgba(15, 23, 42, 0.45)',
                                                        backdropFilter: 'blur(4px)',
                                                        cursor: 'pointer'
                                                    }}
                                                />

                                                {/* Modal Dialog Card */}
                                                <div
                                                    style={{
                                                        position: 'relative',
                                                        background: '#ffffff',
                                                        borderRadius: '18px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 4px 12px rgba(0,0,0,0.06)',
                                                        width: '100%',
                                                        maxWidth: '520px',
                                                        zIndex: 10000,
                                                        overflow: 'hidden',
                                                        animation: 'modalSlideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {/* Modal Header */}
                                                    <div style={{
                                                        padding: '20px 24px',
                                                        borderBottom: '1px solid #f1f5f9',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        background: '#ffffff'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                width: '42px',
                                                                height: '42px',
                                                                borderRadius: '12px',
                                                                background: '#f8fafc',
                                                                border: '1px solid #e2e8f0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '1.35rem',
                                                                flexShrink: 0
                                                            }}>
                                                                {selectedDimensionModal.icon}
                                                            </div>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#0f172a' }}>
                                                                        {selectedDimensionModal.title}
                                                                    </h3>
                                                                    <span style={{
                                                                        background: 'rgba(122, 18, 40, 0.08)',
                                                                        color: '#7A1228',
                                                                        fontSize: '0.74rem',
                                                                        fontWeight: 800,
                                                                        padding: '2px 8px',
                                                                        borderRadius: '8px'
                                                                    }}>
                                                                        {parseInt(settings[selectedDimensionModal.key], 10) || 0}% Allocation
                                                                    </span>
                                                                </div>
                                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                                    {selectedDimensionModal.shortTag}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Close Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedDimensionModal(null)}
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e2e8f0',
                                                                background: '#f8fafc',
                                                                color: '#64748b',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#b91c1c'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
                                                            title="Close (Esc)"
                                                        >
                                                            <FiX size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Modal Body */}
                                                    <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '70vh', overflowY: 'auto' }}>
                                                        {/* 1. What It Checks */}
                                                        <div>
                                                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <FiCheckCircle style={{ color: '#7A1228' }} /> What This Dimension Evaluates
                                                            </h5>
                                                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: '1.55' }}>
                                                                {selectedDimensionModal.whatItChecks}
                                                            </p>
                                                        </div>

                                                        {/* 2. Key Rules & Logic */}
                                                        <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                            <h5 style={{ margin: '0 0 10px 0', fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                ⚡ Scoring Rules &amp; Evaluation Logic
                                                            </h5>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {selectedDimensionModal.keyPoints.map((pt, pIdx) => (
                                                                    <div key={pIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: '#475569', lineHeight: '1.45' }}>
                                                                        <span style={{ color: '#7A1228', fontWeight: 800, flexShrink: 0 }}>•</span>
                                                                        <span>{pt}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Modal Footer */}
                                                    <div style={{
                                                        padding: '14px 24px',
                                                        borderTop: '1px solid #f1f5f9',
                                                        background: '#f8fafc',
                                                        display: 'flex',
                                                        justifyContent: 'flex-end'
                                                    }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedDimensionModal(null)}
                                                            style={{
                                                                padding: '8px 20px',
                                                                borderRadius: '10px',
                                                                border: '1px solid #cbd5e1',
                                                                background: '#ffffff',
                                                                color: '#0f172a',
                                                                fontSize: '0.84rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            Close
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* SECTION 4: HOW IT WORKS SUMMARY & TRANSPARENT RULES */}
                            {(() => {
                                const wSkills = parseInt(settings.weight_skills, 10) || 35;
                                const wExp = parseInt(settings.weight_experience, 10) || 30;
                                const wQual = parseInt(settings.weight_qualification, 10) || 20;
                                const wJd = parseInt(settings.weight_jd_alignment, 10) || 10;
                                const wSal = parseInt(settings.weight_salary, 10) || 5;

                                return (
                                    <div style={{
                                        background: '#ffffff',
                                        padding: '24px',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.03)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FiZap style={{ color: '#7A1228' }} /> Overall Calculation Formula &amp; Scoring Principles
                                            </h4>
                                            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px' }}>
                                                SYSTEM STANDARD
                                            </span>
                                        </div>

                                        {/* Formula Card */}
                                        <div style={{
                                            background: '#0f172a',
                                            borderRadius: '12px',
                                            padding: '16px 20px',
                                            marginBottom: '18px',
                                            borderLeft: '4px solid #7A1228',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px'
                                        }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                CALCULATION FORMULA
                                            </span>
                                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', wordBreak: 'break-word', lineHeight: '1.6' }}>
                                                Total Score (0–100%) = <span style={{ color: '#f87171' }}>Skills × {wSkills}%</span> + <span style={{ color: '#93c5fd' }}>Experience × {wExp}%</span> + <span style={{ color: '#c084fc' }}>Qualification × {wQual}%</span> + <span style={{ color: '#fbbf24' }}>JD Alignment × {wJd}%</span> + <span style={{ color: '#4ade80' }}>Salary × {wSal}%</span>
                                            </div>
                                        </div>

                                        {/* 3 Core Principles */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                                            
                                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FiCheckCircle size={15} /> 100% Resume-Based Scoring
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.77rem', color: '#15803d', lineHeight: '1.45' }}>
                                                    Every candidate score is calculated strictly from verified evidence in the submitted CV, ensuring an objective, unbiased evaluation for every applicant.
                                                </p>
                                            </div>

                                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e40af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FiTarget size={15} /> Fair Scaling for Entry Roles
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.77rem', color: '#1d4ed8', lineHeight: '1.45' }}>
                                                    For junior or trainee roles, applicants with matching degrees and relevant project history are awarded high match rankings without penalizing for overqualification.
                                                </p>
                                            </div>

                                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FiAlertTriangle size={15} /> Domain Mismatch Protection
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.77rem', color: '#b45309', lineHeight: '1.45' }}>
                                                    Applicants from completely unrelated professions (e.g., HR background applying for Software Developer) are automatically flagged with a clear mismatch notice.
                                                </p>
                                            </div>

                                        </div>

                                    </div>
                                );
                            })()}

                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 2: MAIL & SMTP                                       */}
                    {/* ========================================================= */}
                    {activeTab === 'mail' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* ACTIVE SENDER CARD */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                padding: '20px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '42px', height: '42px', borderRadius: '12px',
                                        background: '#fffbeb', color: '#d97706',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.25rem', border: '1px solid #fde68a'
                                    }}>
                                        <FiMail />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                                            Active System Sender Address
                                        </span>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                                            {settings.system_email || settings.smtp_user || settings.default_email}
                                        </h3>
                                    </div>
                                </div>

                                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                                    ✓ SMTP Active
                                </span>
                            </div>

                            {/* SMTP CONFIGURATION FORM CARD */}
                            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800 }}>
                                    SMTP Mail Server Credentials
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 20px 0' }}>
                                    Outbound mail server configuration for automated candidate invitations.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                    
                                    <div>
                                        <label htmlFor="system_email" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            Sender Email Address <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            id="system_email"
                                            name="system_email"
                                            type="email"
                                            value={settings.system_email}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="careers@company.com"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="smtp_from_name" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            Sender Display Name
                                        </label>
                                        <input
                                            id="smtp_from_name"
                                            name="smtp_from_name"
                                            type="text"
                                            value={settings.smtp_from_name}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="GS Careers HR Team"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="smtp_host" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            SMTP Host Server
                                        </label>
                                        <input
                                            id="smtp_host"
                                            name="smtp_host"
                                            type="text"
                                            value={settings.smtp_host}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="smtp.office365.com"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="smtp_port" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            SMTP Port
                                        </label>
                                        <input
                                            id="smtp_port"
                                            name="smtp_port"
                                            type="text"
                                            value={settings.smtp_port}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="587"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="smtp_secure" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            Security Encryption
                                        </label>
                                        <select
                                            id="smtp_secure"
                                            name="smtp_secure"
                                            value={settings.smtp_secure}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        >
                                            <option value="tls">TLS (STARTTLS - Recommended)</option>
                                            <option value="ssl">SSL (Implicit SSL)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="smtp_user" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            SMTP Account Username
                                        </label>
                                        <input
                                            id="smtp_user"
                                            name="smtp_user"
                                            type="text"
                                            value={settings.smtp_user}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="user@domain.com"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="smtp_pass" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            SMTP Account Password
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="smtp_pass"
                                                name="smtp_pass"
                                                type={showPassword ? 'text' : 'password'}
                                                value={settings.smtp_pass}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="••••••••"
                                                style={{ width: '100%', padding: '10px 42px 10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                disabled={!isEditing}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
                                            >
                                                {showPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a' }}>Automated Candidate Emails</strong>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Send confirmation &amp; invite emails</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            id="enable_candidate_emails"
                                            name="enable_candidate_emails"
                                            checked={settings.enable_candidate_emails == '1'}
                                            onChange={(e) => setSettings(prev => ({ ...prev, enable_candidate_emails: e.target.checked ? '1' : '0' }))}
                                            disabled={!isEditing}
                                            style={{ width: '18px', height: '18px', accentColor: '#7A1228', cursor: isEditing ? 'pointer' : 'default' }}
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* DIAGNOSTICS TEST DRAWER */}
                            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800 }}>
                                    Live SMTP Diagnostic Tester
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 16px 0' }}>
                                    Send a live test email to verify server connection and credentials.
                                </p>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1, minWidth: '260px' }}>
                                        <label htmlFor="test_recipient" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            Recipient Email Address
                                        </label>
                                        <input
                                            id="test_recipient"
                                            name="test_recipient"
                                            type="email"
                                            value={testRecipient}
                                            onChange={(e) => setTestRecipient(e.target.value)}
                                            placeholder="test@example.com"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem' }}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleTestSmtp}
                                        disabled={testing}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            fontSize: '0.88rem',
                                            border: 'none',
                                            background: '#7A1228',
                                            color: '#ffffff',
                                            cursor: testing ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            height: '42px',
                                            boxShadow: '0 2px 8px rgba(122, 18, 40, 0.2)'
                                        }}
                                    >
                                        {testing ? 'Testing...' : <><FiPlay /> Run Diagnostic Test</>}
                                    </button>
                                </div>

                                {testResult && (
                                    <div style={{
                                        border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                                        background: testResult.success ? '#f0fdf4' : '#fef2f2',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        marginTop: '16px'
                                    }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            {testResult.success ? (
                                                <FiCheckCircle style={{ color: '#16a34a', fontSize: '1.3rem', flexShrink: 0 }} />
                                            ) : (
                                                <FiAlertTriangle style={{ color: '#dc2626', fontSize: '1.3rem', flexShrink: 0 }} />
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: '0.88rem', color: testResult.success ? '#15803d' : '#991b1b' }}>
                                                    {testResult.success ? 'SMTP Connection Successful!' : 'SMTP Connection Failed'}
                                                </strong>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: testResult.success ? '#166534' : '#7f1d1d' }}>
                                                    {testResult.message}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${testResult.success ? '#dcfce7' : '#fee2e2'}` }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowDebug(!showDebug)}
                                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: testResult.success ? '#166534' : '#7f1d1d', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                {showDebug ? <><FiChevronUp /> Hide Diagnostic Logs</> : <><FiChevronDown /> Show Diagnostic Logs</>}
                                            </button>

                                            {showDebug && (
                                                <pre style={{ marginTop: '10px', padding: '12px', background: '#0f172a', color: '#38bdf8', borderRadius: '10px', fontSize: '0.75rem', fontFamily: 'monospace', overflowX: 'auto', maxHeight: '240px', overflowY: 'auto' }}>
                                                    {testResult.debug}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 3: EMAIL TEMPLATES                                    */}
                    {/* ========================================================= */}
                    {isSuperAdmin && activeTab === 'email' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* SUB TAB SELECTOR */}
                            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', width: 'fit-content', border: '1px solid #e2e8f0' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveEmailSubTab('candidate')}
                                    style={{
                                        padding: '7px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: activeEmailSubTab === 'candidate' ? 700 : 600,
                                        border: 'none',
                                        background: activeEmailSubTab === 'candidate' ? '#ffffff' : 'transparent',
                                        color: activeEmailSubTab === 'candidate' ? '#7A1228' : '#64748b',
                                        cursor: 'pointer',
                                        boxShadow: activeEmailSubTab === 'candidate' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none'
                                    }}
                                >
                                    Candidate Notifications
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveEmailSubTab('vacancy')}
                                    style={{
                                        padding: '7px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: activeEmailSubTab === 'vacancy' ? 700 : 600,
                                        border: 'none',
                                        background: activeEmailSubTab === 'vacancy' ? '#ffffff' : 'transparent',
                                        color: activeEmailSubTab === 'vacancy' ? '#7A1228' : '#64748b',
                                        cursor: 'pointer',
                                        boxShadow: activeEmailSubTab === 'vacancy' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none'
                                    }}
                                >
                                    Vacancy Requisition Workflow Alerts
                                </button>
                            </div>

                            {/* CANDIDATE NOTIFICATIONS */}
                            {activeEmailSubTab === 'candidate' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    
                                    {/* Application Confirmation */}
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                            Application Confirmation Template
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Subject Line</label>
                                                <input
                                                    name="email_template_confirmation_subject"
                                                    type="text"
                                                    value={settings.email_template_confirmation_subject}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.88rem' }}
                                                />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Email Body</label>
                                                    {isEditing && (
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {['{candidate_name}', '{job_title}', '{company_name}'].map(tag => (
                                                                <button key={tag} type="button" onClick={() => insertTag('email_template_confirmation_body', tag)} style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
                                                                    + {tag}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <textarea
                                                    name="email_template_confirmation_body"
                                                    rows="5"
                                                    value={settings.email_template_confirmation_body}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.84rem', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shortlist Template */}
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>
                                            Shortlisted / Interview Invitation Template
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Subject Line</label>
                                                <input
                                                    name="email_template_shortlist_subject"
                                                    type="text"
                                                    value={settings.email_template_shortlist_subject}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.88rem' }}
                                                />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Email Body</label>
                                                    {isEditing && (
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {['{candidate_name}', '{job_title}', '{interview_date}', '{interview_time}'].map(tag => (
                                                                <button key={tag} type="button" onClick={() => insertTag('email_template_shortlist_body', tag)} style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
                                                                    + {tag}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <textarea
                                                    name="email_template_shortlist_body"
                                                    rows="6"
                                                    value={settings.email_template_shortlist_body}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.84rem', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rejection Template */}
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#b91c1c' }}>
                                            Rejection Template
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Subject Line</label>
                                                <input
                                                    name="email_template_rejection_subject"
                                                    type="text"
                                                    value={settings.email_template_rejection_subject}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.88rem' }}
                                                />
                                            </div>
                                            <div>
                                                <textarea
                                                    name="email_template_rejection_body"
                                                    rows="5"
                                                    value={settings.email_template_rejection_body}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.84rem', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* VACANCY WORKFLOW ALERTS */}
                            {activeEmailSubTab === 'vacancy' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    
                                    {/* Vacancy Pending Approval */}
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#d97706' }}>
                                            Vacancy Requisition Pending Approval Alert
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <input
                                                name="email_template_vacancy_pending_subject"
                                                type="text"
                                                value={settings.email_template_vacancy_pending_subject}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.88rem' }}
                                            />
                                            <textarea
                                                name="email_template_vacancy_pending_body"
                                                rows="5"
                                                value={settings.email_template_vacancy_pending_body}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.84rem', fontFamily: 'monospace' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Vacancy Approved */}
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>
                                            Vacancy Requisition Approved &amp; Published Alert
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <input
                                                name="email_template_vacancy_approved_subject"
                                                type="text"
                                                value={settings.email_template_vacancy_approved_subject}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.88rem' }}
                                            />
                                            <textarea
                                                name="email_template_vacancy_approved_body"
                                                rows="5"
                                                value={settings.email_template_vacancy_approved_body}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.84rem', fontFamily: 'monospace' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Vacancy Rejected */}
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
                                            Vacancy Requisition Returned for Revision Alert
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <input
                                                name="email_template_vacancy_rejected_subject"
                                                type="text"
                                                value={settings.email_template_vacancy_rejected_subject}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.88rem' }}
                                            />
                                            <textarea
                                                name="email_template_vacancy_rejected_body"
                                                rows="5"
                                                value={settings.email_template_vacancy_rejected_body}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.84rem', fontFamily: 'monospace' }}
                                            />
                                        </div>
                                    </div>

                                </div>
                            )}

                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 4: PDPA DATA CONSENT                                  */}
                    {/* ========================================================= */}
                    {activeTab === 'pdpa' && (
                        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                            <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800 }}>
                                Personal Data Protection Act (PDPA) Consent Policies
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 20px 0' }}>
                                Candidate data privacy statements and consent policy texts.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Policy Title</label>
                                    <input
                                        name="pdpa_title"
                                        type="text"
                                        value={settings.pdpa_title}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Overview Description</label>
                                    <input
                                        name="pdpa_description"
                                        type="text"
                                        value={settings.pdpa_description}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Purpose of Collection</label>
                                    <textarea
                                        name="pdpa_purpose"
                                        rows="4"
                                        value={settings.pdpa_purpose}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.85rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Data Retention Policy</label>
                                    <textarea
                                        name="pdpa_retention"
                                        rows="4"
                                        value={settings.pdpa_retention}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.85rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Data Security Protocols</label>
                                    <textarea
                                        name="pdpa_security"
                                        rows="4"
                                        value={settings.pdpa_security}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.85rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Candidate Statutory Rights</label>
                                    <textarea
                                        name="pdpa_rights"
                                        rows="4"
                                        value={settings.pdpa_rights}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.85rem' }}
                                    />
                                </div>

                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 5: AI RESUME PARSER                                   */}
                    {/* ========================================================= */}
                    {isSuperAdmin && activeTab === 'ai' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* QUICK AI ENGINE SWITCHER */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#ffffff',
                                padding: '16px 20px',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a' }}>Active AI Resume Parser Engine</strong>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                        Current engine: <strong>{settings.ai_provider === 'gemini' ? 'Google Gemini Cloud API' : 'Local Ollama Server'}</strong>
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickAiSwitch('gemini')}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            border: 'none',
                                            background: settings.ai_provider === 'gemini' ? '#ffffff' : 'transparent',
                                            color: settings.ai_provider === 'gemini' ? '#7A1228' : '#64748b',
                                            boxShadow: settings.ai_provider === 'gemini' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ☁️ Gemini (Cloud)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickAiSwitch('ollama')}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            border: 'none',
                                            background: settings.ai_provider === 'ollama' ? '#ffffff' : 'transparent',
                                            color: settings.ai_provider === 'ollama' ? '#7A1228' : '#64748b',
                                            boxShadow: settings.ai_provider === 'ollama' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        💻 Ollama (Local)
                                    </button>
                                </div>
                            </div>

                            {/* DUAL ENGINE CONFIG CARDS */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                                
                                {/* 1. GOOGLE GEMINI CONFIG CARD */}
                                <div style={{
                                    background: '#ffffff',
                                    borderRadius: '16px',
                                    border: settings.ai_provider === 'gemini' ? '2px solid #7A1228' : '1px solid #e2e8f0',
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Google Gemini Cloud Settings</h4>
                                        {settings.ai_provider === 'gemini' && (
                                            <span style={{ background: '#7A1228', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>LIVE ROUTING</span>
                                        )}
                                    </div>

                                    {/* Primary Key Input */}
                                    <div>
                                        <label htmlFor="gemini_api_key" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            Google Gemini Primary API Key
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="gemini_api_key"
                                                name="gemini_api_key"
                                                type={showPassword ? 'text' : 'password'}
                                                value={settings.gemini_api_key}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="••••••••"
                                                style={{ width: '100%', padding: '10px 42px 10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                disabled={!isEditing}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
                                            >
                                                {showPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Backup / Secondary Key Input (Auto-Failover) */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <label htmlFor="gemini_api_key_backup" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                                Google Gemini Backup API Key (Secondary / Auto-Failover)
                                            </label>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: settings.gemini_api_key_backup ? '#15803d' : '#94a3b8', background: settings.gemini_api_key_backup ? '#dcfce7' : '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>
                                                {settings.gemini_api_key_backup ? 'AUTO-FAILOVER READY' : 'OPTIONAL'}
                                            </span>
                                        </div>
                                        <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginBottom: '6px' }}>
                                            Automatically activated if the Primary Key hits daily limits or rate exhaustion (HTTP 429).
                                        </span>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="gemini_api_key_backup"
                                                name="gemini_api_key_backup"
                                                type={showBackupPassword ? 'text' : 'password'}
                                                value={settings.gemini_api_key_backup}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="••••••••"
                                                style={{ width: '100%', padding: '10px 42px 10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowBackupPassword(!showBackupPassword)}
                                                disabled={!isEditing}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
                                            >
                                                {showBackupPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="gemini_model" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            Gemini Model Version
                                        </label>
                                        <select
                                            id="gemini_model"
                                            name="gemini_model"
                                            value={settings.gemini_model}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        >
                                            <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended - Fast &amp; Accurate)</option>
                                            <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Fast &amp; light)</option>
                                            <option value="gemini-2.5-pro">gemini-2.5-pro (High quality reasoning)</option>
                                            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                                        </select>
                                    </div>

                                    {/* GEMINI QUOTA & TOKEN HEALTH MONITOR CARD */}
                                    <div style={{
                                        marginTop: '6px',
                                        padding: '16px',
                                        background: quotaData?.is_exhausted ? '#fef2f2' : (quotaData?.is_warning ? '#fffbeb' : '#f0fdf4'),
                                        borderRadius: '14px',
                                        border: `1px solid ${quotaData?.is_exhausted ? '#fecaca' : (quotaData?.is_warning ? '#fde68a' : '#bbf7d0')}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FiActivity style={{ color: quotaData?.is_exhausted ? '#dc2626' : (quotaData?.is_warning ? '#d97706' : '#16a34a') }} />
                                                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Gemini Quota &amp; API Monitor</strong>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleCheckQuota}
                                                disabled={checkingQuota}
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    border: '1px solid #cbd5e1',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    cursor: checkingQuota ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <FiRefreshCw style={{ animation: checkingQuota ? 'spin 1s linear infinite' : 'none' }} />
                                                {checkingQuota ? 'Testing...' : 'Check Quota'}
                                            </button>
                                        </div>

                                        {quotaData ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                                        <span>Daily Extractions Quota (Free Tier):</span>
                                                        <span style={{ color: quotaData.is_exhausted ? '#dc2626' : (quotaData.is_warning ? '#d97706' : '#16a34a') }}>
                                                            {quotaData.used_today} / {quotaData.daily_limit} Requests ({quotaData.percentage}%)
                                                        </span>
                                                    </div>
                                                    <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${Math.max(4, quotaData.percentage)}%`,
                                                            background: quotaData.is_exhausted ? '#dc2626' : (quotaData.is_warning ? '#d97706' : '#16a34a'),
                                                            borderRadius: '20px'
                                                        }}></div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                                                    <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Primary Key</span>
                                                        <span style={{ display: 'block', marginTop: '2px', fontSize: '0.75rem', fontWeight: 800, color: quotaData.status === 'healthy' ? '#16a34a' : '#dc2626' }}>
                                                            {quotaData.status === 'healthy' ? '🟢 Active' : '🔴 429 Limit'}
                                                        </span>
                                                    </div>
                                                    <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Backup Key</span>
                                                        <span style={{ display: 'block', marginTop: '2px', fontSize: '0.75rem', fontWeight: 800, color: settings.gemini_api_key_backup ? (backupQuotaData?.status === 'healthy' ? '#16a34a' : (backupQuotaData?.is_exhausted ? '#dc2626' : '#0284c7')) : '#94a3b8' }}>
                                                            {settings.gemini_api_key_backup ? (backupQuotaData ? (backupQuotaData.status === 'healthy' ? '🟢 Standby' : '🔴 Limit') : '🟢 Standby') : '⚪ Not Set'}
                                                        </span>
                                                    </div>
                                                    <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Remaining</span>
                                                        <span style={{ display: 'block', marginTop: '2px', fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                                                             {quotaData.remaining_today} reqs
                                                        </span>
                                                    </div>
                                                    <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Daily Reset</span>
                                                        <span style={{ display: 'block', marginTop: '2px', fontSize: '0.78rem', fontWeight: 800, color: '#78350f' }}>
                                                            in {quotaData.reset_in}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                                Click "Check Quota" to test key health and daily request limits.
                                            </p>
                                        )}
                                    </div>

                                </div>

                                {/* 2. LOCAL OLLAMA CONFIG CARD */}
                                <div style={{
                                    background: '#ffffff',
                                    borderRadius: '16px',
                                    border: settings.ai_provider === 'ollama' ? '2px solid #7A1228' : '1px solid #e2e8f0',
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Local Ollama Server Settings</h4>
                                        {settings.ai_provider === 'ollama' && (
                                            <span style={{ background: '#7A1228', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>LIVE ROUTING</span>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="ollama_server" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            Ollama Server Base URL
                                        </label>
                                        <input
                                            id="ollama_server"
                                            name="ollama_server"
                                            type="text"
                                            value={settings.ollama_server}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="http://172.16.7.21:11434"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="ollama_model" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                            Ollama Model Name
                                        </label>
                                        <select
                                            id="ollama_model"
                                            name="ollama_model"
                                            value={settings.ollama_model}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', fontSize: '0.9rem' }}
                                        >
                                            <option value="qwen2.5:3b">qwen2.5:3b (Recommended - Fast &amp; Offline)</option>
                                            <option value="qwen2.5:7b">qwen2.5:7b (High Accuracy - Slower)</option>
                                        </select>
                                    </div>
                                </div>

                            </div>

                        </div>
                    )}

                </div>
            </form>
        </div>
    );
}

export default SettingsPage;
