import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    createVacancy, 
    updateVacancy, 
    getVacancy, 
    getCompanies, 
    getCandidateCount, 
    getMatchingCandidates, 
    getNextReferenceNumber, 
    API_BASE 
} from '../../services/api';
import { EMPLOYMENT_TYPES } from '../../utils/constants';
import { toast } from 'react-toastify';
import { 
    FiArrowLeft, 
    FiSave, 
    FiCheckCircle, 
    FiBriefcase, 
    FiMapPin, 
    FiCalendar, 
    FiTarget, 
    FiUsers, 
    FiX, 
    FiUser, 
    FiFileText, 
    FiMail, 
    FiExternalLink, 
    FiTag, 
    FiPlus, 
    FiList, 
    FiHelpCircle,
    FiAlertCircle,
    FiClock,
    FiDollarSign,
    FiLayers,
    FiAward,
    FiMinus,
    FiRotateCcw,
    FiSliders
} from 'react-icons/fi';

const BACKEND_ROOT = API_BASE.replace('/api', '');

function CreateVacancy({ admin }) {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditing);
    const [companies, setCompanies] = useState([]);
    const [matchCount, setMatchCount] = useState(0);
    const [matchingCandidates, setMatchingCandidates] = useState([]);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [approvalSubmitModal, setApprovalSubmitModal] = useState(null);
    const [searchingMatches, setSearchingMatches] = useState(false);
    const [loadingMatches, setLoadingMatches] = useState(false);

    const [form, setForm] = useState({
        company_id: (admin.role !== 'super_admin' && admin.role !== 'admin') ? admin.company_id : '',
        reference_number: '',
        title: '',
        designation: '',
        description: '',
        requirements: '',
        required_skills: '',
        location: '',
        employment_type: 'Full-Time',
        min_experience: '0 years',
        min_relevant_experience: '0 years',
        min_salary: '',
        max_salary: '',
        publish_date: new Date().toISOString().split('T')[0],
        expire_date: '',
        is_active: 1,
        approval_status: '',
        rejection_reason: '',
        use_custom_weights: false,
        weight_skills: 35,
        weight_experience: 30,
        weight_qualification: 20,
        weight_jd_alignment: 10,
        weight_salary: 5
    });

    const [skillInput, setSkillInput] = useState('');
    const skillInputRef = useRef(null);
    const descriptionRef = useRef(null);
    const requirementsRef = useRef(null);

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (form.designation || form.title || form.company_id) {
            const delayDebounceFn = setTimeout(() => {
                fetchMatchCount();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [form.designation, form.title, form.company_id]);

    const fetchMatchCount = async () => {
        try {
            setSearchingMatches(true);
            const res = await getCandidateCount({
                designation: form.designation,
                title: form.title,
                company_id: form.company_id
            });
            setMatchCount(res.data?.data?.count || 0);
        } catch (err) {
            console.error('Match count error:', err);
        } finally {
            setSearchingMatches(false);
        }
    };

    const handleViewMatches = async () => {
        try {
            setLoadingMatches(true);
            setShowMatchModal(true);
            const res = await getMatchingCandidates({
                designation: form.designation,
                title: form.title,
                company_id: form.company_id
            });
            setMatchingCandidates(res.data?.data || []);
        } catch (err) {
            toast.error('Failed to load matching candidates');
            setShowMatchModal(false);
        } finally {
            setLoadingMatches(false);
        }
    };

    const fetchRefNumber = async (companyId) => {
        if (!companyId) return;
        try {
            const refRes = await getNextReferenceNumber(companyId);
            const generatedRef = refRes.data?.data?.reference_number;
            if (generatedRef) {
                setForm(prev => ({
                    ...prev,
                    reference_number: generatedRef
                }));
            }
        } catch (err) {
            console.error('Failed to auto-generate reference number:', err);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const compRes = await getCompanies();
            const fetchedCompanies = compRes.data.data || [];
            setCompanies(fetchedCompanies);

            if (isEditing) {
                const vacRes = await getVacancy(id);
                const vacancy = vacRes.data.data;
                if (vacancy) {
                    setForm({
                        company_id: vacancy.company_id,
                        reference_number: vacancy.reference_number || '',
                        title: vacancy.title || '',
                        designation: vacancy.designation || '',
                        description: vacancy.description || '',
                        requirements: vacancy.requirements || '',
                        required_skills: vacancy.required_skills || '',
                        location: vacancy.location || '',
                        employment_type: vacancy.employment_type || 'Full-Time',
                        min_experience: vacancy.min_experience || '0 years',
                        min_relevant_experience: vacancy.min_relevant_experience || '0 years',
                        min_salary: vacancy.min_salary || '',
                        max_salary: vacancy.max_salary || '',
                        publish_date: vacancy.publish_date || new Date().toISOString().split('T')[0],
                        expire_date: vacancy.expire_date || '',
                        is_active: vacancy.is_active ?? 1,
                        approval_status: vacancy.approval_status || '',
                        rejection_reason: vacancy.rejection_reason || '',
                        use_custom_weights: Boolean(vacancy.weight_skills !== null && vacancy.weight_skills !== undefined && vacancy.weight_skills !== ''),
                        weight_skills: (vacancy.weight_skills !== null && vacancy.weight_skills !== undefined && vacancy.weight_skills !== '') ? Number(vacancy.weight_skills) : 35,
                        weight_experience: (vacancy.weight_experience !== null && vacancy.weight_experience !== undefined && vacancy.weight_experience !== '') ? Number(vacancy.weight_experience) : 30,
                        weight_qualification: (vacancy.weight_qualification !== null && vacancy.weight_qualification !== undefined && vacancy.weight_qualification !== '') ? Number(vacancy.weight_qualification) : 20,
                        weight_jd_alignment: (vacancy.weight_jd_alignment !== null && vacancy.weight_jd_alignment !== undefined && vacancy.weight_jd_alignment !== '') ? Number(vacancy.weight_jd_alignment) : 10,
                        weight_salary: (vacancy.weight_salary !== null && vacancy.weight_salary !== undefined && vacancy.weight_salary !== '') ? Number(vacancy.weight_salary) : 5
                    });
                }
            } else {
                const preselectedCompanyId = (admin.role !== 'super_admin' && admin.role !== 'admin') ? admin.company_id : '';
                let updatedLocation = '';
                if (preselectedCompanyId) {
                    const selectedComp = fetchedCompanies.find(c => c.id == preselectedCompanyId);
                    if (selectedComp && selectedComp.location) {
                        updatedLocation = selectedComp.location;
                    }
                }
                
                let generatedRef = '';
                if (preselectedCompanyId) {
                    try {
                        const refRes = await getNextReferenceNumber(preselectedCompanyId);
                        generatedRef = refRes.data?.data?.reference_number || '';
                    } catch (err) {
                        console.error('Failed to auto-generate reference number:', err);
                    }
                }

                setForm(prev => ({
                    ...prev,
                    location: updatedLocation || prev.location,
                    reference_number: generatedRef || prev.reference_number
                }));
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load dependency data');
        } finally {
            setLoading(false);
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'company_id') {
            const selectedComp = companies.find(c => c.id == value);
            setForm(prev => ({ 
                ...prev, 
                company_id: value,
                location: selectedComp && selectedComp.location ? selectedComp.location : ''
            }));
            if (value) {
                fetchRefNumber(value);
            } else {
                setForm(prev => ({ ...prev, reference_number: '' }));
            }
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const toggleBullets = (fieldName, ref) => {
        const textarea = ref.current;
        const val = form[fieldName] || '';

        if (!textarea) {
            if (!val.trim()) {
                setForm(prev => ({ ...prev, [fieldName]: '• ' }));
                return;
            }
            const lines = val.split('\n');
            const allBulleted = lines.filter(l => l.trim()).every(l => l.trim().startsWith('•'));
            const newLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;
                if (allBulleted) {
                    return line.replace(/^\s*[•\-*]\s*/, '');
                } else {
                    return line.startsWith('• ') ? line : `• ${line.replace(/^\s*[•\-*]\s*/, '')}`;
                }
            });
            setForm(prev => ({ ...prev, [fieldName]: newLines.join('\n') }));
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start !== end) {
            const selectedText = val.substring(start, end);
            const lines = selectedText.split('\n');
            const allBulleted = lines.filter(l => l.trim()).every(l => l.trim().startsWith('•'));

            const formattedLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;
                if (allBulleted) {
                    return line.replace(/^\s*[•\-*]\s*/, '');
                } else {
                    return line.startsWith('• ') ? line : `• ${line.replace(/^\s*[•\-*]\s*/, '')}`;
                }
            });

            const replacement = formattedLines.join('\n');
            const newText = val.substring(0, start) + replacement + val.substring(end);
            setForm(prev => ({ ...prev, [fieldName]: newText }));

            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start, start + replacement.length);
            }, 0);
        } else {
            if (!val.trim()) {
                setForm(prev => ({ ...prev, [fieldName]: '• ' }));
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(2, 2);
                }, 0);
                return;
            }

            const lines = val.split('\n');
            const allBulleted = lines.filter(l => l.trim()).every(l => l.trim().startsWith('•'));

            const formattedLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;
                if (allBulleted) {
                    return line.replace(/^\s*[•\-*]\s*/, '');
                } else {
                    return line.startsWith('• ') ? line : `• ${line.replace(/^\s*[•\-*]\s*/, '')}`;
                }
            });

            const newText = formattedLines.join('\n');
            setForm(prev => ({ ...prev, [fieldName]: newText }));

            setTimeout(() => {
                textarea.focus();
            }, 0);
        }
    };

    const handleKeyDownBullet = (e, fieldName) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const textarea = e.target;
            const start = textarea.selectionStart;
            const val = textarea.value;

            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            const currentLine = val.substring(lineStart, start);

            const bulletMatch = currentLine.match(/^\s*([•\-*])\s*/);

            if (bulletMatch) {
                const bulletChar = bulletMatch[1] === '•' ? '•' : bulletMatch[1];
                const lineAfterBullet = currentLine.replace(/^\s*[•\-*]\s*/, '');

                if (!lineAfterBullet.trim()) {
                    e.preventDefault();
                    const newText = val.substring(0, lineStart) + val.substring(start);
                    setForm(prev => ({ ...prev, [fieldName]: newText }));
                    setTimeout(() => {
                        textarea.setSelectionRange(lineStart, lineStart);
                    }, 0);
                    return;
                }

                e.preventDefault();
                const insertStr = `\n${bulletChar} `;
                const newText = val.substring(0, start) + insertStr + val.substring(start);
                setForm(prev => ({ ...prev, [fieldName]: newText }));

                setTimeout(() => {
                    const newCursor = start + insertStr.length;
                    textarea.setSelectionRange(newCursor, newCursor);
                }, 0);
            }
        }
    };

    const handleSave = async (submitForApproval) => {
        if (!form.company_id || !form.title || !form.designation || !form.description || !form.publish_date || !form.expire_date || !form.min_salary || !form.max_salary) {
            toast.error('Please fill in all required fields (Company, Title, Designation, Salary, Description, Dates)');
            return;
        }

        if (parseFloat(form.min_salary) > parseFloat(form.max_salary)) {
            toast.error('Min. Salary cannot be greater than Max. Salary');
            return;
        }

        if (form.use_custom_weights) {
            const totalWeights = (parseInt(form.weight_skills, 10) || 0) +
                                 (parseInt(form.weight_experience, 10) || 0) +
                                 (parseInt(form.weight_qualification, 10) || 0) +
                                 (parseInt(form.weight_jd_alignment, 10) || 0) +
                                 (parseInt(form.weight_salary, 10) || 0);
            if (totalWeights !== 100) {
                toast.error(`Custom scoring weights must equal exactly 100% (Current: ${totalWeights}%)`);
                return;
            }
        }

        try {
            setLoading(true);
            
            let finalSkills = form.required_skills;
            if (skillInput.trim()) {
                const skillsToAdd = skillInput.split(/[,,;]/).map(s => s.trim()).filter(Boolean);
                if (skillsToAdd.length > 0) {
                    const existing = form.required_skills.split(',').map(s => s.trim()).filter(Boolean);
                    const updated = [...existing];
                    skillsToAdd.forEach(s => {
                        if (!updated.includes(s)) {
                            updated.push(s);
                        }
                    });
                    finalSkills = updated.join(',');
                }
            }

            const payload = {
                ...form,
                required_skills: finalSkills,
                weight_skills: form.use_custom_weights ? (parseInt(form.weight_skills, 10) || 0) : null,
                weight_experience: form.use_custom_weights ? (parseInt(form.weight_experience, 10) || 0) : null,
                weight_qualification: form.use_custom_weights ? (parseInt(form.weight_qualification, 10) || 0) : null,
                weight_jd_alignment: form.use_custom_weights ? (parseInt(form.weight_jd_alignment, 10) || 0) : null,
                weight_salary: form.use_custom_weights ? (parseInt(form.weight_salary, 10) || 0) : null,
                submit_for_approval: submitForApproval
            };

            let newId = id;
            if (isEditing) {
                await updateVacancy({ ...payload, id });
                toast.success(submitForApproval ? 'Vacancy submitted for approval' : 'Vacancy draft saved');
            } else {
                const res = await createVacancy(payload);
                newId = res.data?.data?.id;
                toast.success(submitForApproval ? 'Vacancy created and submitted for approval' : 'Vacancy draft saved');
            }

            if (submitForApproval && (admin.role === 'sub_admin2' || admin.role === 'sub_admin1' || admin.role === 'admin') && newId) {
                setApprovalSubmitModal({
                    id: newId,
                    title: form.title,
                    reference_number: form.reference_number
                });
            } else {
                navigate('/admin/vacancies');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: '#7A1228', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Loading vacancy details...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="cv-page-wrapper">
            {/* Top Navigation & Action Header */}
            <header className="cv-top-bar">
                <div className="cv-header-left">
                    <button 
                        type="button" 
                        className="cv-back-btn" 
                        onClick={() => navigate('/admin/vacancies')}
                        title="Back to vacancies"
                    >
                        <FiArrowLeft />
                    </button>
                    <div>
                        <div className="cv-breadcrumb">
                            <span>Admin</span>
                            <span>/</span>
                            <span>Vacancies</span>
                            <span>/</span>
                            <span className="cv-active-crumb">{isEditing ? 'Edit' : 'Create'}</span>
                        </div>
                        <h1 className="cv-page-heading">
                            {isEditing ? (form.title ? `Edit: ${form.title}` : 'Edit Vacancy') : 'Create New Vacancy'}
                        </h1>
                    </div>
                </div>

                <div className="cv-header-actions">
                    {matchCount > 0 && (
                        <button 
                            type="button" 
                            className="cv-match-badge-btn" 
                            onClick={handleViewMatches}
                            title="View auto-matching candidates from talent pool"
                        >
                            <span>🔥</span>
                            <span><strong>{matchCount}</strong> Matched Candidates</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Rejection Notification Banner */}
            {form.approval_status === 'rejected' && (
                <div className="cv-rejection-card">
                    <div className="cv-rej-header">
                        <FiAlertCircle size={18} />
                        <strong>Requisition Revision Required</strong>
                    </div>
                    <p className="cv-rej-reason">
                        Reason: {form.rejection_reason || 'No specific reason provided.'}
                    </p>
                    <p className="cv-rej-subtext">
                        Please update the requested changes and click "Submit for Approval" to resubmit.
                    </p>
                </div>
            )}

            {/* Main Form Body */}
            <form onSubmit={(e) => e.preventDefault()} className="cv-form-container">
                <fieldset disabled={admin.role === 'super_admin'} style={{ border: 'none', padding: 0, margin: 0 }}>
                    
                    {/* SECTION 1: Job Details & Classification */}
                    <div className="cv-card">
                        <div className="cv-card-header">
                            <div className="cv-card-icon"><FiBriefcase /></div>
                            <div>
                                <h2 className="cv-card-title">Job Details &amp; Classification</h2>
                                <p className="cv-card-desc">Basic information, company assignment, and role requirements.</p>
                            </div>
                        </div>

                        {/* Core Role Information - Consistent 2-Column Grid */}
                        <div className="cv-grid cv-grid-2">
                            {/* Company Selection */}
                            <div className="cv-field">
                                <label htmlFor="company_id">
                                    Company <span className="cv-required">*</span>
                                </label>
                                <div className="cv-company-select-row">
                                    <select
                                        id="company_id"
                                        name="company_id"
                                        value={form.company_id}
                                        onChange={handleChange}
                                        disabled={admin.role !== 'admin'}
                                        className="cv-input"
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {form.company_id && (
                                        <div className="cv-company-logo-chip" title={companies.find(c => c.id == form.company_id)?.name}>
                                            <img 
                                                src={companies.find(c => c.id == form.company_id)?.logo ? `${BACKEND_ROOT}/uploads/logos/${companies.find(c => c.id == form.company_id).logo}` : "/gs-logo.png"} 
                                                alt="Company" 
                                                onError={(e) => { e.target.src = "/gs-logo.png"; }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reference Number */}
                            <div className="cv-field">
                                <label htmlFor="reference_number">Reference Number</label>
                                <input
                                    id="reference_number"
                                    type="text"
                                    name="reference_number"
                                    value={form.reference_number}
                                    onChange={handleChange}
                                    placeholder="e.g. GS/ENG/2026/001"
                                    className="cv-input"
                                />
                            </div>

                            {/* Job Title - Prominent Full Width */}
                            <div className="cv-field cv-col-span-2">
                                <label htmlFor="title">
                                    Job Title <span className="cv-required">*</span>
                                </label>
                                <input
                                    id="title"
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Senior Brand Executive / Accounts Manager"
                                    className="cv-input cv-input-lg"
                                />
                            </div>

                            {/* Designation / Function */}
                            <div className="cv-field">
                                <label htmlFor="designation">
                                    Designation / Function <span className="cv-required">*</span>
                                </label>
                                <input
                                    id="designation"
                                    type="text"
                                    name="designation"
                                    value={form.designation}
                                    onChange={handleChange}
                                    placeholder="e.g. Finance, Marketing, IT, Logistics"
                                    className="cv-input"
                                />
                            </div>

                            {/* Employment Type */}
                            <div className="cv-field">
                                <label htmlFor="employment_type">Employment Type</label>
                                <select
                                    id="employment_type"
                                    name="employment_type"
                                    value={form.employment_type}
                                    onChange={handleChange}
                                    className="cv-input"
                                >
                                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {/* Location - Full Width */}
                            <div className="cv-field cv-col-span-2">
                                <label htmlFor="location">Work Location</label>
                                <div className="cv-input-icon-wrap">
                                    <FiMapPin className="cv-field-icon" />
                                    <input
                                        id="location"
                                        type="text"
                                        name="location"
                                        value={form.location}
                                        onChange={handleChange}
                                        placeholder="e.g. GS Corporate Office, Colombo 03 (or Remote / Hybrid)"
                                        className="cv-input cv-has-icon"
                                        list="company-locations-datalist"
                                        autoComplete="off"
                                    />
                                    <datalist id="company-locations-datalist">
                                        {(() => {
                                            const currComp = companies.find(c => String(c.id) === String(form.company_id));
                                            if (!currComp?.locations_list) return null;
                                            return currComp.locations_list.split(',').map((loc, lIdx) => {
                                                const trimmed = loc.trim();
                                                return trimmed ? <option key={lIdx} value={trimmed} /> : null;
                                            });
                                        })()}
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        {/* Experience Requirements Divider */}
                        <div className="cv-group-divider">
                            <div className="cv-group-divider-label">
                                <FiClock size={14} style={{ color: '#7A1228' }} />
                                <span>Experience Requirements</span>
                            </div>
                        </div>

                        {/* Experience Fields - 2 Columns */}
                        <div className="cv-grid cv-grid-2">
                            <div className="cv-field">
                                <label htmlFor="min_experience">Min. Overall Experience</label>
                                <select
                                    id="min_experience"
                                    name="min_experience"
                                    value={form.min_experience}
                                    onChange={handleChange}
                                    className="cv-input"
                                >
                                    <option value="0 years">0 years (Freshers)</option>
                                    <option value="0-1 years">0–1 years</option>
                                    <option value="1-2 years">1–2 years</option>
                                    <option value="3-4 years">3–4 years</option>
                                    <option value="5-7 years">5–7 years</option>
                                    <option value="8-10 years">8–10 years</option>
                                    <option value="10+ years">10+ years</option>
                                </select>
                            </div>

                            <div className="cv-field">
                                <label htmlFor="min_relevant_experience">Min. Relevant Experience</label>
                                <select
                                    id="min_relevant_experience"
                                    name="min_relevant_experience"
                                    value={form.min_relevant_experience}
                                    onChange={handleChange}
                                    className="cv-input"
                                >
                                    <option value="0 years">0 years (Freshers)</option>
                                    <option value="0-1 years">0–1 years</option>
                                    <option value="1-2 years">1–2 years</option>
                                    <option value="3-4 years">3–4 years</option>
                                    <option value="5-7 years">5–7 years</option>
                                    <option value="8-10 years">8–10 years</option>
                                    <option value="10+ years">10+ years</option>
                                </select>
                            </div>
                        </div>

                        {/* Remuneration Divider */}
                        <div className="cv-group-divider">
                            <div className="cv-group-divider-label">
                                <FiDollarSign size={14} style={{ color: '#7A1228' }} />
                                <span>Salary (LKR)</span>
                                <span className="cv-required">*</span>
                            </div>
                        </div>

                        {/* Remuneration Fields - 2 Columns */}
                        <div className="cv-grid cv-grid-2">
                            <div className="cv-field">
                                <label htmlFor="min_salary">
                                    Min. Salary (LKR) <span className="cv-required">*</span>
                                </label>
                                <input
                                    id="min_salary"
                                    type="number"
                                    name="min_salary"
                                    value={form.min_salary}
                                    onChange={handleChange}
                                    placeholder="e.g. 100,000"
                                    className="cv-input"
                                    min="0"
                                    step="5000"
                                    required
                                />
                            </div>

                            <div className="cv-field">
                                <label htmlFor="max_salary">
                                    Max. Salary (LKR) <span className="cv-required">*</span>
                                </label>
                                <input
                                    id="max_salary"
                                    type="number"
                                    name="max_salary"
                                    value={form.max_salary}
                                    onChange={handleChange}
                                    placeholder="e.g. 180,000"
                                    className="cv-input"
                                    min="0"
                                    step="5000"
                                    required
                                />
                            </div>
                        </div>

                        {/* Mandatory Skills Divider */}
                        <div className="cv-group-divider">
                            <div className="cv-group-divider-label">
                                <FiTag size={14} style={{ color: '#7A1228' }} />
                                <span>Mandatory Skills &amp; Competencies</span>
                            </div>
                            <span className="cv-group-divider-hint">Type skill and press Enter or comma</span>
                        </div>

                        {/* Mandatory Skills Tag Box */}
                        <div className="cv-field">
                            <div className="cv-skills-container" onClick={() => skillInputRef.current?.focus()}>
                                {form.required_skills.split(',').filter(s => s.trim()).map((skill, idx) => (
                                    <span key={idx} className="cv-skill-pill">
                                        {skill.trim()}
                                        <button
                                            type="button"
                                            className="cv-skill-del"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const arr = form.required_skills.split(',').filter(s => s.trim());
                                                arr.splice(idx, 1);
                                                setForm(prev => ({ ...prev, required_skills: arr.join(',') }));
                                            }}
                                            aria-label={`Remove ${skill.trim()}`}
                                        >
                                            <FiX size={12} />
                                        </button>
                                    </span>
                                ))}

                                <input
                                    ref={skillInputRef}
                                    id="skill_input"
                                    type="text"
                                    className="cv-skill-text-input"
                                    placeholder={form.required_skills ? '' : 'e.g. Budgeting, ERP, Communication, Sales Management...'}
                                    value={skillInput}
                                    onChange={e => setSkillInput(e.target.value)}
                                    onBlur={() => {
                                        if (skillInput.trim()) {
                                            const skillsToAdd = skillInput.split(/[,,;]/).map(s => s.trim()).filter(Boolean);
                                            if (skillsToAdd.length > 0) {
                                                const existing = form.required_skills.split(',').map(s => s.trim()).filter(Boolean);
                                                const updated = [...existing];
                                                skillsToAdd.forEach(s => {
                                                    if (!updated.includes(s)) updated.push(s);
                                                });
                                                setForm(prev => ({ ...prev, required_skills: updated.join(',') }));
                                            }
                                            setSkillInput('');
                                        }
                                    }}
                                    onKeyDown={e => {
                                        if ((e.key === 'Enter' || e.key === ',' || e.key === ';') && skillInput.trim()) {
                                            e.preventDefault();
                                            const skillsToAdd = skillInput.split(/[,,;]/).map(s => s.trim()).filter(Boolean);
                                            if (skillsToAdd.length === 0) return;
                                            const existing = form.required_skills.split(',').map(s => s.trim()).filter(Boolean);
                                            const updated = [...existing];
                                            skillsToAdd.forEach(s => {
                                                if (!updated.includes(s)) updated.push(s);
                                            });
                                            setForm(prev => ({ ...prev, required_skills: updated.join(',') }));
                                            setSkillInput('');
                                        } else if (e.key === 'Backspace' && !skillInput) {
                                            const arr = form.required_skills.split(',').filter(s => s.trim());
                                            if (arr.length > 0) {
                                                arr.pop();
                                                setForm(prev => ({ ...prev, required_skills: arr.join(',') }));
                                            }
                                        }
                                    }}
                                />

                                {skillInput.trim() && (
                                    <button
                                        type="button"
                                        className="cv-skill-add-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const skillsToAdd = skillInput.split(/[,,;]/).map(s => s.trim()).filter(Boolean);
                                            if (skillsToAdd.length > 0) {
                                                const existing = form.required_skills.split(',').map(s => s.trim()).filter(Boolean);
                                                const updated = [...existing];
                                                skillsToAdd.forEach(s => {
                                                    if (!updated.includes(s)) updated.push(s);
                                                });
                                                setForm(prev => ({ ...prev, required_skills: updated.join(',') }));
                                            }
                                            setSkillInput('');
                                            skillInputRef.current?.focus();
                                        }}
                                    >
                                        <FiPlus size={12} /> Add
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Job Description & Requirements */}
                    <div className="cv-card cv-mt-card">
                        <div className="cv-card-header">
                            <div className="cv-card-icon"><FiFileText /></div>
                            <div>
                                <h2 className="cv-card-title">Job Description &amp; Requirements</h2>
                                <p className="cv-card-desc">Detailed responsibilities, scope of work, and applicant criteria.</p>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="cv-field">
                            <div className="cv-field-toolbar-row">
                                <label htmlFor="description">
                                    Job Description &amp; Responsibilities <span className="cv-required">*</span>
                                </label>
                                <button
                                    type="button"
                                    className="cv-bullet-btn"
                                    onClick={() => toggleBullets('description', descriptionRef)}
                                    title="Toggle bullet points for selected text"
                                >
                                    <FiList /> Format Bullets
                                </button>
                            </div>
                            <textarea
                                ref={descriptionRef}
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDownBullet(e, 'description')}
                                rows="7"
                                placeholder="Describe key roles, day-to-day duties, and objectives of this position..."
                                className="cv-textarea"
                            />
                        </div>

                        {/* Requirements */}
                        <div className="cv-field cv-mt">
                            <div className="cv-field-toolbar-row">
                                <label htmlFor="requirements">Requirements &amp; Qualifications</label>
                                <button
                                    type="button"
                                    className="cv-bullet-btn"
                                    onClick={() => toggleBullets('requirements', requirementsRef)}
                                    title="Toggle bullet points for selected text"
                                >
                                    <FiList /> Format Bullets
                                </button>
                            </div>
                            <textarea
                                ref={requirementsRef}
                                id="requirements"
                                name="requirements"
                                value={form.requirements}
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDownBullet(e, 'requirements')}
                                rows="6"
                                placeholder="List educational qualifications, certifications, industry experience, and attributes required..."
                                className="cv-textarea"
                            />
                        </div>
                    </div>

                    {/* SECTION 3: Candidate Scoring Formula & Evaluation Weights */}
                    <div className="cv-card cv-mt-card">
                        <div className="cv-card-header">
                            <div className="cv-card-icon"><FiTarget /></div>
                            <div>
                                <h2 className="cv-card-title">Candidate Scoring Formula</h2>
                                <p className="cv-card-desc">Configure how AI evaluates and weights candidate CVs for this vacancy.</p>
                            </div>
                        </div>

                        {/* Mode Switcher & Status */}
                        <div className="cv-formula-top-bar">
                            <div className="cv-segmented-toggle">
                                <button
                                    type="button"
                                    className={`cv-seg-btn ${!form.use_custom_weights ? 'active' : ''}`}
                                    onClick={() => setForm(prev => ({ ...prev, use_custom_weights: false }))}
                                >
                                    <span>⚡</span>
                                    <span>Use System Default Formula</span>
                                </button>

                                <button
                                    type="button"
                                    className={`cv-seg-btn ${form.use_custom_weights ? 'active' : ''}`}
                                    onClick={() => setForm(prev => ({ ...prev, use_custom_weights: true }))}
                                >
                                    <span>⚙️</span>
                                    <span>Customize Formula for this Job</span>
                                </button>
                            </div>

                            {(() => {
                                const total = form.use_custom_weights 
                                    ? ((parseInt(form.weight_skills, 10) || 0) +
                                       (parseInt(form.weight_experience, 10) || 0) +
                                       (parseInt(form.weight_qualification, 10) || 0) +
                                       (parseInt(form.weight_jd_alignment, 10) || 0) +
                                       (parseInt(form.weight_salary, 10) || 0))
                                    : 100;
                                const isBalanced = total === 100;
                                return (
                                    <div className={`cv-formula-badge ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                                        <span className="cv-badge-dot" />
                                        <span>{isBalanced ? '100% Balanced' : `${total}% Total Weight`}</span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* VIEW 1: Default Formula Active */}
                        {!form.use_custom_weights ? (
                            <div className="cv-formula-default-view">
                                <div className="cv-f-cards-grid">
                                    {/* 1. Skills */}
                                    <div className="cv-f-card">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiLayers /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">Skills</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-left">
                                                            <span className="cv-tip-title">Skills &amp; Competencies</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates role-specific practical skills, functional expertise, tools, and key competencies.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-f-value-box">
                                            <span className="cv-f-val-num">35</span>
                                            <span className="cv-f-val-pct">%</span>
                                        </div>
                                        <div className="cv-f-progress-track">
                                            <div className="cv-f-progress-fill" style={{ width: '35%' }} />
                                        </div>
                                    </div>

                                    {/* 2. Experience */}
                                    <div className="cv-f-card">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiClock /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">Experience</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-left">
                                                            <span className="cv-tip-title">Work Experience</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates total career duration, relevant industry background, and past job exposure.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-f-value-box">
                                            <span className="cv-f-val-num">30</span>
                                            <span className="cv-f-val-pct">%</span>
                                        </div>
                                        <div className="cv-f-progress-track">
                                            <div className="cv-f-progress-fill" style={{ width: '30%' }} />
                                        </div>
                                    </div>

                                    {/* 3. Qualification */}
                                    <div className="cv-f-card">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiAward /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">Qualification</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-center">
                                                            <span className="cv-tip-title">Education &amp; Qualifications</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates academic degrees, diplomas, professional credentials (e.g. CIMA, ACCA, CIM, SLIM), and certifications.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-f-value-box">
                                            <span className="cv-f-val-num">20</span>
                                            <span className="cv-f-val-pct">%</span>
                                        </div>
                                        <div className="cv-f-progress-track">
                                            <div className="cv-f-progress-fill" style={{ width: '20%' }} />
                                        </div>
                                    </div>

                                    {/* 4. JD Alignment */}
                                    <div className="cv-f-card">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiTarget /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">JD Match</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-right">
                                                            <span className="cv-tip-title">Job Description Alignment</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates how closely the candidate's actual responsibilities and duties match this vacancy's JD.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-f-value-box">
                                            <span className="cv-f-val-num">10</span>
                                            <span className="cv-f-val-pct">%</span>
                                        </div>
                                        <div className="cv-f-progress-track">
                                            <div className="cv-f-progress-fill" style={{ width: '10%' }} />
                                        </div>
                                    </div>

                                    {/* 5. Salary Fit */}
                                    <div className="cv-f-card">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiDollarSign /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">Salary Fit</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-right">
                                                            <span className="cv-tip-title">Salary Fit</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates whether the candidate's expected compensation fits comfortably within the designated budget.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-f-value-box">
                                            <span className="cv-f-val-num">5</span>
                                            <span className="cv-f-val-pct">%</span>
                                        </div>
                                        <div className="cv-f-progress-track">
                                            <div className="cv-f-progress-fill" style={{ width: '5%' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="cv-default-footer-banner">
                                    <div className="cv-df-info">
                                        <FiCheckCircle className="cv-df-check" />
                                        <span>Standard formula balances skills, tenure, education, JD match, and salary. Recommended for standard roles.</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="cv-btn-sm-primary"
                                        onClick={() => setForm(prev => ({ ...prev, use_custom_weights: true }))}
                                    >
                                        <FiSliders size={13} /> Customize Weights
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* VIEW 2: Custom Formula Editor */
                            <div className="cv-formula-custom-view">
                                {/* Preset Buttons */}
                                <div className="cv-preset-bar">
                                    <span className="cv-preset-label">Quick Presets:</span>
                                    <div className="cv-preset-buttons">
                                        <button
                                            type="button"
                                            className="cv-preset-chip"
                                            onClick={() => setForm(prev => ({
                                                ...prev,
                                                weight_skills: 35,
                                                weight_experience: 30,
                                                weight_qualification: 20,
                                                weight_jd_alignment: 10,
                                                weight_salary: 5
                                            }))}
                                        >
                                            Standard Balanced (35/30/20/10/5)
                                        </button>
                                        <button
                                            type="button"
                                            className="cv-preset-chip"
                                            onClick={() => setForm(prev => ({
                                                ...prev,
                                                weight_skills: 40,
                                                weight_experience: 0,
                                                weight_qualification: 35,
                                                weight_jd_alignment: 15,
                                                weight_salary: 10
                                            }))}
                                        >
                                            Intern / Fresher (0% Exp)
                                        </button>
                                        <button
                                            type="button"
                                            className="cv-preset-chip"
                                            onClick={() => setForm(prev => ({
                                                ...prev,
                                                weight_skills: 25,
                                                weight_experience: 45,
                                                weight_qualification: 15,
                                                weight_jd_alignment: 10,
                                                weight_salary: 5
                                            }))}
                                        >
                                            Senior / Leadership
                                        </button>
                                        <button
                                            type="button"
                                            className="cv-preset-chip"
                                            onClick={() => setForm(prev => ({
                                                ...prev,
                                                weight_skills: 50,
                                                weight_experience: 20,
                                                weight_qualification: 15,
                                                weight_jd_alignment: 10,
                                                weight_salary: 5
                                            }))}
                                        >
                                            Technical / Skills First
                                        </button>
                                    </div>
                                </div>

                                {/* Custom 5-Card Grid */}
                                <div className="cv-f-cards-grid">
                                    {/* 1. Skills */}
                                    <div className="cv-f-card cv-f-card-interactive">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiLayers /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">Skills</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-left">
                                                            <span className="cv-tip-title">Skills &amp; Competencies</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates role-specific practical skills, functional expertise, tools, and key competencies.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-stepper-wrap">
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_skills: Math.max(0, (parseInt(prev.weight_skills, 10) || 0) - 5) }))}
                                                aria-label="Decrease Skills Weight"
                                            >
                                                <FiMinus size={12} />
                                            </button>
                                            <div className="cv-step-input-box">
                                                <input
                                                    id="weight_skills"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={form.weight_skills}
                                                    onChange={(e) => setForm(prev => ({ ...prev, weight_skills: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                                                    className="cv-step-input"
                                                />
                                                <span className="cv-step-unit">%</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_skills: Math.min(100, (parseInt(prev.weight_skills, 10) || 0) + 5) }))}
                                                aria-label="Increase Skills Weight"
                                            >
                                                <FiPlus size={12} />
                                            </button>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={form.weight_skills}
                                            onChange={(e) => setForm(prev => ({ ...prev, weight_skills: parseInt(e.target.value, 10) }))}
                                            className="cv-range-slider"
                                        />
                                    </div>

                                    {/* 2. Experience */}
                                    <div className="cv-f-card cv-f-card-interactive">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiClock /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">Experience</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-left">
                                                            <span className="cv-tip-title">Work Experience</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates total career duration, relevant industry background, and past job exposure.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-stepper-wrap">
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_experience: Math.max(0, (parseInt(prev.weight_experience, 10) || 0) - 5) }))}
                                                aria-label="Decrease Experience Weight"
                                            >
                                                <FiMinus size={12} />
                                            </button>
                                            <div className="cv-step-input-box">
                                                <input
                                                    id="weight_experience"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={form.weight_experience}
                                                    onChange={(e) => setForm(prev => ({ ...prev, weight_experience: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                                                    className="cv-step-input"
                                                />
                                                <span className="cv-step-unit">%</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_experience: Math.min(100, (parseInt(prev.weight_experience, 10) || 0) + 5) }))}
                                                aria-label="Increase Experience Weight"
                                            >
                                                <FiPlus size={12} />
                                            </button>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={form.weight_experience}
                                            onChange={(e) => setForm(prev => ({ ...prev, weight_experience: parseInt(e.target.value, 10) }))}
                                            className="cv-range-slider"
                                        />
                                    </div>

                                    {/* 3. Qualification */}
                                    <div className="cv-f-card cv-f-card-interactive">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiAward /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">Qualification</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-center">
                                                            <span className="cv-tip-title">Education &amp; Qualifications</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates academic degrees, diplomas, professional credentials (e.g. CIMA, ACCA, CIM, SLIM), and certifications.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-stepper-wrap">
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_qualification: Math.max(0, (parseInt(prev.weight_qualification, 10) || 0) - 5) }))}
                                                aria-label="Decrease Qualification Weight"
                                            >
                                                <FiMinus size={12} />
                                            </button>
                                            <div className="cv-step-input-box">
                                                <input
                                                    id="weight_qualification"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={form.weight_qualification}
                                                    onChange={(e) => setForm(prev => ({ ...prev, weight_qualification: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                                                    className="cv-step-input"
                                                />
                                                <span className="cv-step-unit">%</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_qualification: Math.min(100, (parseInt(prev.weight_qualification, 10) || 0) + 5) }))}
                                                aria-label="Increase Qualification Weight"
                                            >
                                                <FiPlus size={12} />
                                            </button>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={form.weight_qualification}
                                            onChange={(e) => setForm(prev => ({ ...prev, weight_qualification: parseInt(e.target.value, 10) }))}
                                            className="cv-range-slider"
                                        />
                                    </div>

                                    {/* 4. JD Alignment */}
                                    <div className="cv-f-card cv-f-card-interactive">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiTarget /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">JD Match</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-right">
                                                            <span className="cv-tip-title">Job Description Alignment</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates how closely the candidate's actual responsibilities and duties match this vacancy's JD.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-stepper-wrap">
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_jd_alignment: Math.max(0, (parseInt(prev.weight_jd_alignment, 10) || 0) - 5) }))}
                                                aria-label="Decrease JD Match Weight"
                                            >
                                                <FiMinus size={12} />
                                            </button>
                                            <div className="cv-step-input-box">
                                                <input
                                                    id="weight_jd_alignment"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={form.weight_jd_alignment}
                                                    onChange={(e) => setForm(prev => ({ ...prev, weight_jd_alignment: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                                                    className="cv-step-input"
                                                />
                                                <span className="cv-step-unit">%</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_jd_alignment: Math.min(100, (parseInt(prev.weight_jd_alignment, 10) || 0) + 5) }))}
                                                aria-label="Increase JD Match Weight"
                                            >
                                                <FiPlus size={12} />
                                            </button>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={form.weight_jd_alignment}
                                            onChange={(e) => setForm(prev => ({ ...prev, weight_jd_alignment: parseInt(e.target.value, 10) }))}
                                            className="cv-range-slider"
                                        />
                                    </div>

                                    {/* 5. Salary Fit */}
                                    <div className="cv-f-card cv-f-card-interactive">
                                        <div className="cv-f-card-top">
                                            <div className="cv-f-icon"><FiDollarSign /></div>
                                            <div className="cv-f-meta">
                                                <div className="cv-f-title-row">
                                                    <span className="cv-f-name">Salary Fit</span>
                                                    <span className="cv-tooltip-trigger">
                                                        <FiHelpCircle className="cv-help-icon" />
                                                        <span className="cv-tooltip-body cv-tip-right">
                                                            <span className="cv-tip-title">Salary Fit</span>
                                                            <span className="cv-tip-text">
                                                                Evaluates whether the candidate's expected compensation fits comfortably within the designated budget.
                                                            </span>
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cv-stepper-wrap">
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_salary: Math.max(0, (parseInt(prev.weight_salary, 10) || 0) - 5) }))}
                                                aria-label="Decrease Salary Fit Weight"
                                            >
                                                <FiMinus size={12} />
                                            </button>
                                            <div className="cv-step-input-box">
                                                <input
                                                    id="weight_salary"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={form.weight_salary}
                                                    onChange={(e) => setForm(prev => ({ ...prev, weight_salary: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                                                    className="cv-step-input"
                                                />
                                                <span className="cv-step-unit">%</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="cv-step-btn"
                                                onClick={() => setForm(prev => ({ ...prev, weight_salary: Math.min(100, (parseInt(prev.weight_salary, 10) || 0) + 5) }))}
                                                aria-label="Increase Salary Fit Weight"
                                            >
                                                <FiPlus size={12} />
                                            </button>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={form.weight_salary}
                                            onChange={(e) => setForm(prev => ({ ...prev, weight_salary: parseInt(e.target.value, 10) }))}
                                            className="cv-range-slider"
                                        />
                                    </div>
                                </div>

                                {/* Live Balance Indicator */}
                                {(() => {
                                    const total = (parseInt(form.weight_skills, 10) || 0) +
                                                  (parseInt(form.weight_experience, 10) || 0) +
                                                  (parseInt(form.weight_qualification, 10) || 0) +
                                                  (parseInt(form.weight_jd_alignment, 10) || 0) +
                                                  (parseInt(form.weight_salary, 10) || 0);
                                    const isExact = total === 100;

                                    return (
                                        <div className={`cv-balance-bar ${isExact ? 'balanced' : 'unbalanced'}`}>
                                            <div className="cv-bal-info">
                                                <span className="cv-bal-icon">{isExact ? '✓' : '⚠️'}</span>
                                                <div>
                                                    <strong>Total Weight: {total}%</strong>
                                                    <span className="cv-bal-status-text">
                                                        {isExact 
                                                            ? ' — Properly Balanced & Ready for AI Candidate Scoring' 
                                                            : ` — Must equal 100% (${100 - total > 0 ? `Need +${100 - total}%` : `${Math.abs(100 - total)}% over`})`}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="cv-reset-link"
                                                onClick={() => setForm(prev => ({
                                                    ...prev,
                                                    weight_skills: 35,
                                                    weight_experience: 30,
                                                    weight_qualification: 20,
                                                    weight_jd_alignment: 10,
                                                    weight_salary: 5
                                                }))}
                                            >
                                                <FiRotateCcw size={12} /> Reset to Default
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* SECTION 4: Schedule, Visibility & Active Status */}
                    <div className="cv-card cv-mt-card">
                        <div className="cv-card-header">
                            <div className="cv-card-icon"><FiCalendar /></div>
                            <div>
                                <h2 className="cv-card-title">Schedule &amp; Visibility</h2>
                                <p className="cv-card-desc">Publication window and public listing status.</p>
                            </div>
                        </div>

                        <div className="cv-grid cv-grid-3">
                            <div className="cv-field">
                                <label htmlFor="publish_date">
                                    Publish Date <span className="cv-required">*</span>
                                </label>
                                <div className="cv-input-icon-wrap">
                                    <FiCalendar className="cv-field-icon" />
                                    <input
                                        id="publish_date"
                                        type="date"
                                        name="publish_date"
                                        value={form.publish_date}
                                        onChange={handleChange}
                                        className="cv-input cv-has-icon"
                                    />
                                </div>
                            </div>

                            <div className="cv-field">
                                <label htmlFor="expire_date">
                                    Expiration Date <span className="cv-required">*</span>
                                </label>
                                <div className="cv-input-icon-wrap">
                                    <FiClock className="cv-field-icon" />
                                    <input
                                        id="expire_date"
                                        type="date"
                                        name="expire_date"
                                        value={form.expire_date}
                                        onChange={handleChange}
                                        className="cv-input cv-has-icon"
                                    />
                                </div>
                            </div>

                            <div className="cv-field">
                                <label htmlFor="is_active">Listing Status</label>
                                <select
                                    id="is_active"
                                    name="is_active"
                                    value={form.is_active}
                                    onChange={(e) => setForm(prev => ({ ...prev, is_active: parseInt(e.target.value, 10) }))}
                                    className="cv-input"
                                >
                                    <option value={1}>🟢 Active (Accepting Applications)</option>
                                    <option value={0}>⚪ Inactive (Draft / On Hold)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="cv-bottom-bar">
                        <div className="cv-bottom-summary">
                            <span className="cv-bs-item"><strong>Title:</strong> {form.title || 'Untitled Role'}</span>
                            <span className="cv-bs-item"><strong>Company:</strong> {companies.find(c => c.id == form.company_id)?.name || 'Not selected'}</span>
                            <span className="cv-bs-item"><strong>Ref:</strong> {form.reference_number || 'Auto'}</span>
                        </div>

                        <div className="cv-bottom-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                className="cv-btn-secondary"
                                onClick={() => navigate('/admin/vacancies')}
                                disabled={loading}
                            >
                                Cancel
                            </button>

                            {admin.role !== 'super_admin' && (
                                <>
                                    <button
                                        type="button"
                                        className="cv-btn-outline"
                                        onClick={() => handleSave(false)}
                                        disabled={loading}
                                    >
                                        <FiSave />
                                        <span>Save Draft</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="cv-btn-primary"
                                        onClick={() => handleSave(true)}
                                        disabled={loading}
                                    >
                                        <FiCheckCircle />
                                        <span>{admin.role === 'admin' ? 'Publish Vacancy' : 'Submit for Approval'}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </fieldset>
            </form>

            {/* Candidate Matching Modal */}
            {showMatchModal && (
                <div className="cv-modal-backdrop" onClick={() => setShowMatchModal(false)}>
                    <div className="cv-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="cv-modal-header">
                            <div className="cv-modal-title-group">
                                <div className="cv-modal-icon-wrap"><FiUsers /></div>
                                <div>
                                    <h3>Matching Candidates from Talent Pool</h3>
                                    <p>Showing applicants with matching designations or related experience for "{form.designation || form.title || 'this role'}".</p>
                                </div>
                            </div>
                            <button type="button" className="cv-modal-close-btn" onClick={() => setShowMatchModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        <div className="cv-modal-content">
                            {loadingMatches ? (
                                <div className="cv-modal-empty">
                                    <div className="cv-spinner" />
                                    <p>Searching candidates in database...</p>
                                </div>
                            ) : matchingCandidates.length === 0 ? (
                                <div className="cv-modal-empty">
                                    <FiUsers size={40} style={{ color: '#94a3b8', marginBottom: '10px' }} />
                                    <p>No candidates found matching the current criteria in the talent pool.</p>
                                </div>
                            ) : (
                                <div className="cv-cand-list">
                                    {matchingCandidates.map((cand, idx) => (
                                        <div key={idx} className="cv-cand-item">
                                            <div className="cv-cand-avatar">
                                                <FiUser />
                                            </div>
                                            <div className="cv-cand-info">
                                                <h4>{cand.first_name} {cand.last_name}</h4>
                                                <p className="cv-cand-applied">
                                                    Last applied for: <strong>{cand.last_applied_vacancy}</strong> ({cand.last_applied_company})
                                                </p>
                                                <div className="cv-cand-badges">
                                                    <span className="cv-badge">{cand.overall_experience} Exp</span>
                                                    <span className="cv-badge">{cand.qualification}</span>
                                                </div>
                                            </div>
                                            <div className="cv-cand-buttons">
                                                <a
                                                    href={`${API_BASE}/applications.php?action=view_cv&file=${encodeURIComponent(cand.cv_path)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="cv-btn-sm-primary"
                                                >
                                                    <FiFileText /> View CV
                                                </a>
                                                <a 
                                                    href={`mailto:${cand.email}?subject=Career Opportunity: ${form.title} at George Steuart`} 
                                                    className="cv-btn-sm-outline"
                                                >
                                                    <FiMail /> Contact
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Submission Modal */}
            {approvalSubmitModal && (
                <div className="cv-modal-backdrop">
                    <div className="cv-modal-card cv-modal-success" onClick={e => e.stopPropagation()}>
                        <div className="cv-success-icon-wrap">
                            <FiCheckCircle />
                        </div>
                        <h2>{admin.role === 'admin' ? 'Vacancy Published Live' : 'Requisition Submitted'}</h2>
                        <p className="cv-success-desc">
                            {admin.role === 'admin' 
                                ? <>Your vacancy for <strong>{approvalSubmitModal.title}</strong> (Ref: #{approvalSubmitModal.reference_number || 'N/A'}) is now live on the careers portal.</>
                                : <>Your vacancy for <strong>{approvalSubmitModal.title}</strong> (Ref: #{approvalSubmitModal.reference_number || 'N/A'}) has been submitted into the approval pipeline.</>
                            }
                        </p>

                        <div className="cv-approval-status-box">
                            <div className="cv-as-dot" />
                            <div>
                                <div className="cv-as-title">
                                    {admin.role === 'admin' && 'Status: LIVE & Published'}
                                    {admin.role === 'sub_admin1' && 'Awaiting: GS Admin Final Approval'}
                                    {admin.role === 'sub_admin2' && 'Awaiting: Sub Admin 1 Review'}
                                </div>
                                <div className="cv-as-desc">
                                    {admin.role === 'admin' && 'Applicants can now view and apply for this vacancy.'}
                                    {admin.role === 'sub_admin1' && 'Reviewers have been notified by email for approval.'}
                                    {admin.role === 'sub_admin2' && 'Requisition has entered the initial verification stage.'}
                                </div>
                            </div>
                        </div>

                        <div className="cv-success-actions">
                            <button
                                type="button"
                                className="cv-btn-primary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={() => {
                                    const targetId = approvalSubmitModal.id;
                                    setApprovalSubmitModal(null);
                                    if (admin.role === 'admin') {
                                        navigate(`/admin/vacancies?highlight=${targetId}`);
                                    } else {
                                        navigate(`/admin/approvals?highlight=${targetId}`);
                                    }
                                }}
                            >
                                {admin.role === 'admin' ? 'View Published Vacancy' : 'Track in Approval Pipeline'}
                            </button>

                            <button
                                type="button"
                                className="cv-btn-secondary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={() => {
                                    setApprovalSubmitModal(null);
                                    navigate('/admin/vacancies');
                                }}
                            >
                                Go to Vacancy List
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium, Clean Modern SaaS Styling */}
            <style jsx="true">{`
                .cv-page-wrapper {
                    max-width: 1040px;
                    margin: 0 auto;
                    padding: 16px 20px 60px;
                    font-family: inherit;
                    color: #0f172a;
                }

                /* ── TOP ACTION BAR ── */
                .cv-top-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .cv-header-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .cv-back-btn {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                }
                .cv-back-btn:hover {
                    background: #f8fafc;
                    color: #7A1228;
                    border-color: #cbd5e1;
                    transform: translateX(-2px);
                }
                .cv-breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.74rem;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 3px;
                }
                .cv-active-crumb {
                    color: #7A1228;
                }
                .cv-page-heading {
                    font-size: 1.35rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                    line-height: 1.25;
                    letter-spacing: -0.3px;
                }
                .cv-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .cv-match-badge-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #fffbeb;
                    border: 1px solid #fde68a;
                    color: #b45309;
                    font-size: 0.78rem;
                    padding: 7px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.15s ease;
                }
                .cv-match-badge-btn:hover {
                    background: #fef3c7;
                    border-color: #f59e0b;
                }
                .cv-btn-secondary {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                    font-size: 0.84rem;
                    font-weight: 600;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .cv-btn-secondary:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #0f172a;
                }
                .cv-btn-outline {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    background: #ffffff;
                    border: 1.5px solid #7A1228;
                    color: #7A1228;
                    font-size: 0.84rem;
                    font-weight: 700;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .cv-btn-outline:hover {
                    background: rgba(122, 18, 40, 0.04);
                }
                .cv-btn-primary {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    background: linear-gradient(135deg, #7A1228 0%, #9B1B30 100%);
                    border: none;
                    color: #ffffff;
                    font-size: 0.84rem;
                    font-weight: 700;
                    padding: 9px 18px;
                    border-radius: 8px;
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(122, 18, 40, 0.25);
                    transition: all 0.15s ease;
                }
                .cv-btn-primary:hover {
                    background: linear-gradient(135deg, #600e1f 0%, #821526 100%);
                    box-shadow: 0 4px 12px rgba(122, 18, 40, 0.35);
                    transform: translateY(-1px);
                }

                /* ── REJECTION CARD ── */
                .cv-rejection-card {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 12px;
                    padding: 16px 20px;
                    margin-bottom: 20px;
                }
                .cv-rej-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #b91c1c;
                    font-size: 0.86rem;
                    margin-bottom: 4px;
                }
                .cv-rej-reason {
                    margin: 0;
                    color: #991b1b;
                    font-size: 0.84rem;
                    font-weight: 600;
                }
                .cv-rej-subtext {
                    margin: 4px 0 0;
                    color: #b91c1c;
                    font-size: 0.76rem;
                    opacity: 0.85;
                }

                /* ── CARDS & SECTIONS ── */
                .cv-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 22px 24px;
                    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
                }
                .cv-mt-card {
                    margin-top: 20px;
                }
                .cv-card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding-bottom: 16px;
                    margin-bottom: 18px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .cv-card-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    background: rgba(122, 18, 40, 0.08);
                    color: #7A1228;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.15rem;
                    flex-shrink: 0;
                }
                .cv-card-title {
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                    line-height: 1.25;
                }
                .cv-card-desc {
                    font-size: 0.78rem;
                    color: #64748b;
                    margin: 2px 0 0;
                }

                /* ── GRIDS & FIELDS ── */
                .cv-grid {
                    display: grid;
                    gap: 16px;
                }
                .cv-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .cv-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                .cv-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
                .cv-col-span-2 { grid-column: span 2; }
                .cv-mt { margin-top: 16px; }

                @media (max-width: 768px) {
                    .cv-grid-2,
                    .cv-grid-3,
                    .cv-grid-4 {
                        grid-template-columns: 1fr;
                        gap: 14px;
                    }
                    .cv-col-span-2 {
                        grid-column: span 1;
                    }
                }

                .cv-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .cv-field label {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #334155;
                    text-transform: none;
                    letter-spacing: normal;
                }
                .cv-required {
                    color: #dc2626;
                }
                .cv-sub-label {
                    font-size: 0.72rem;
                    color: #94a3b8;
                    font-weight: 400;
                    margin-left: 4px;
                }

                .cv-input {
                    width: 100%;
                    padding: 9px 12px;
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 0.88rem;
                    color: #0f172a;
                    outline: none;
                    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
                    font-family: inherit;
                    box-sizing: border-box;
                }
                .cv-input:focus {
                    background: #ffffff;
                    border-color: #7A1228;
                    box-shadow: 0 0 0 3px rgba(122, 18, 40, 0.08);
                }
                .cv-input-lg {
                    font-size: 0.98rem;
                    font-weight: 600;
                    padding: 10px 14px;
                }

                .cv-input-icon-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .cv-field-icon {
                    position: absolute;
                    left: 11px;
                    color: #94a3b8;
                    font-size: 0.95rem;
                    pointer-events: none;
                }
                .cv-input.cv-has-icon {
                    padding-left: 36px;
                }

                .cv-company-select-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .cv-company-logo-chip {
                    width: 38px;
                    height: 38px;
                    border-radius: 8px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3px;
                    flex-shrink: 0;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                }
                .cv-company-logo-chip img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                /* ── GROUP DIVIDERS & PREFIX INPUTS ── */
                .cv-group-divider {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-top: 22px;
                    margin-bottom: 14px;
                    padding-top: 18px;
                    border-top: 1px solid #f1f5f9;
                }
                .cv-group-divider-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                .cv-group-divider-hint {
                    font-size: 0.72rem;
                    color: #94a3b8;
                    font-weight: 400;
                }
                .cv-opt-badge {
                    font-size: 0.68rem;
                    font-weight: 600;
                    color: #64748b;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    padding: 1px 6px;
                    border-radius: 4px;
                    margin-left: 6px;
                    letter-spacing: 0.2px;
                }
                .cv-field-hint {
                    font-size: 0.72rem;
                    color: #94a3b8;
                    margin-top: 4px;
                    line-height: 1.35;
                }
                .cv-input-prefix-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                }
                .cv-input-prefix {
                    position: absolute;
                    left: 1px;
                    top: 1px;
                    bottom: 1px;
                    width: 44px;
                    background: #f1f5f9;
                    border-right: 1px solid #cbd5e1;
                    border-top-left-radius: 7px;
                    border-bottom-left-radius: 7px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #64748b;
                    letter-spacing: 0.5px;
                    pointer-events: none;
                    user-select: none;
                }
                .cv-input.cv-has-prefix {
                    padding-left: 54px;
                }

                /* ── SKILLS TAGS ── */
                .cv-skills-label {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .cv-skills-container {
                    min-height: 46px;
                    padding: 6px 10px;
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-items: center;
                    cursor: text;
                    transition: all 0.15s ease;
                }
                .cv-skills-container:focus-within {
                    background: #ffffff;
                    border-color: #7A1228;
                    box-shadow: 0 0 0 3px rgba(122, 18, 40, 0.08);
                }
                .cv-skill-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 8px 3px 10px;
                    background: rgba(122, 18, 40, 0.08);
                    border: 1px solid rgba(122, 18, 40, 0.2);
                    border-radius: 16px;
                    font-size: 0.76rem;
                    font-weight: 700;
                    color: #7A1228;
                }
                .cv-skill-del {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #7A1228;
                    opacity: 0.6;
                    display: flex;
                    align-items: center;
                    padding: 0;
                    transition: opacity 0.15s;
                }
                .cv-skill-del:hover { opacity: 1; }
                .cv-skill-text-input {
                    border: none;
                    outline: none;
                    background: transparent;
                    font-size: 0.85rem;
                    color: #0f172a;
                    flex: 1;
                    min-width: 140px;
                    padding: 4px;
                }
                .cv-skill-add-btn {
                    background: #7A1228;
                    color: #ffffff;
                    border: none;
                    border-radius: 6px;
                    padding: 3px 9px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                }

                /* ── TEXTAREA & TOOLBAR ── */
                .cv-field-toolbar-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .cv-bullet-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    color: #475569;
                    font-size: 0.72rem;
                    font-weight: 600;
                    padding: 3px 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .cv-bullet-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .cv-textarea {
                    width: 100%;
                    padding: 10px 14px;
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 0.88rem;
                    color: #0f172a;
                    outline: none;
                    font-family: inherit;
                    line-height: 1.5;
                    resize: vertical;
                    transition: all 0.15s ease;
                    box-sizing: border-box;
                }
                .cv-textarea:focus {
                    background: #ffffff;
                    border-color: #7A1228;
                    box-shadow: 0 0 0 3px rgba(122, 18, 40, 0.08);
                }

                /* ── SEGMENTED SWITCHER ── */
                .cv-segmented-toggle {
                    display: inline-flex;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 10px;
                    gap: 4px;
                    margin-bottom: 16px;
                    border: 1px solid #e2e8f0;
                }
                /* ── CANDIDATE SCORING FORMULA UI ── */
                .cv-formula-top-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-bottom: 14px;
                }
                .cv-segmented-toggle {
                    display: inline-flex;
                    background: #f1f5f9;
                    padding: 3px;
                    border-radius: 9px;
                    gap: 3px;
                    border: 1px solid #e2e8f0;
                }
                .cv-seg-btn {
                    padding: 7px 14px;
                    border-radius: 7px;
                    border: none;
                    font-size: 0.8rem;
                    font-weight: 600;
                    background: transparent;
                    color: #64748b;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }
                .cv-seg-btn.active {
                    background: #ffffff;
                    color: #0f172a;
                    font-weight: 700;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                }
                .cv-formula-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.74rem;
                    font-weight: 700;
                }
                .cv-formula-badge.balanced {
                    background: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    color: #065f46;
                }
                .cv-formula-badge.unbalanced {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #991b1b;
                }
                .cv-badge-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: currentColor;
                }

                /* ── PRESET CHIPS BAR ── */
                .cv-preset-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 14px;
                    padding: 8px 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 9px;
                }
                .cv-preset-label {
                    font-size: 0.74rem;
                    font-weight: 700;
                    color: #475569;
                }
                .cv-preset-buttons {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }
                .cv-preset-chip {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #334155;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .cv-preset-chip:hover {
                    border-color: #D97706;
                    color: #B45309;
                    background: #FFFBEB;
                }

                /* ── 5-CARDS GRID ── */
                .cv-f-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                    gap: 10px;
                    margin-bottom: 14px;
                }
                @media (max-width: 900px) {
                    .cv-f-cards-grid {
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    }
                }
                .cv-f-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    transition: all 0.18s ease;
                    position: relative;
                }
                .cv-f-card:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.05);
                }
                .cv-f-card.cv-f-card-interactive:focus-within {
                    border-color: #D97706;
                    box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1);
                }
                .cv-f-card-top {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .cv-f-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.95rem;
                    flex-shrink: 0;
                    transition: all 0.15s ease;
                }
                .cv-f-card:hover .cv-f-icon {
                    background: #FFFDF5;
                    border-color: #FCD34D;
                    color: #D97706;
                }

                .cv-f-meta {
                    flex: 1;
                    min-width: 0;
                }
                .cv-f-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 4px;
                }
                .cv-f-name {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* ── VALUE BOX (DEFAULT VIEW) ── */
                .cv-f-value-box {
                    display: flex;
                    align-items: baseline;
                    justify-content: center;
                    gap: 2px;
                    padding: 8px 0;
                }
                .cv-f-val-num {
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1;
                }
                .cv-f-val-pct {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #64748b;
                }

                .cv-f-progress-track {
                    height: 6px;
                    background: #f1f5f9;
                    border-radius: 999px;
                    overflow: hidden;
                }
                .cv-f-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #F59E0B, #D97706);
                    border-radius: 999px;
                    transition: width 0.25s ease;
                }

                .cv-default-footer-banner {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 9px 16px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    flex-wrap: nowrap;
                }
                .cv-df-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.78rem;
                    color: #475569;
                    flex: 1;
                    min-width: 0;
                }
                .cv-df-check {
                    color: #059669;
                    font-size: 1rem;
                    flex-shrink: 0;
                }
                .cv-btn-sm-primary {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    color: #1e293b;
                    font-size: 0.76rem;
                    font-weight: 600;
                    font-family: inherit;
                    cursor: pointer;
                    white-space: nowrap;
                    flex-shrink: 0;
                    transition: all 0.15s ease;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
                }
                .cv-btn-sm-primary:hover {
                    background: #7A1228;
                    border-color: #7A1228;
                    color: #ffffff;
                    box-shadow: 0 2px 6px rgba(122, 18, 40, 0.18);
                }
                .cv-btn-sm-primary:active {
                    transform: translateY(1px);
                }

                /* ── STEPPER & RANGE SLIDER (CUSTOM VIEW) ── */
                .cv-stepper-wrap {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-bottom: 10px;
                }
                .cv-step-btn {
                    width: 26px;
                    height: 28px;
                    border-radius: 6px;
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    flex-shrink: 0;
                }
                .cv-step-btn:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }
                .cv-step-input-box {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .cv-step-input {
                    width: 100%;
                    text-align: center;
                    font-size: 1.05rem;
                    font-weight: 800;
                    color: #0f172a;
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    padding: 4px 16px 4px 4px;
                    outline: none;
                    transition: all 0.15s ease;
                    -moz-appearance: textfield;
                }
                .cv-step-input::-webkit-outer-spin-button,
                .cv-step-input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .cv-step-input:focus {
                    background: #ffffff;
                    border-color: #D97706;
                }
                .cv-step-unit {
                    position: absolute;
                    right: 6px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #94a3b8;
                    pointer-events: none;
                }

                .cv-range-slider {
                    width: 100%;
                    height: 5px;
                    border-radius: 999px;
                    outline: none;
                    appearance: none;
                    background: #e2e8f0;
                    cursor: pointer;
                    accent-color: #D97706;
                }
                .cv-range-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #F59E0B, #D97706);
                    border: 2px solid #ffffff;
                    box-shadow: 0 1px 4px rgba(217, 119, 6, 0.45);
                    cursor: pointer;
                    transition: transform 0.1s ease;
                }
                .cv-range-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.25);
                    background: #D97706;
                }

                /* ── TOOLTIPS ── */
                .cv-tooltip-trigger {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    cursor: pointer;
                }
                .cv-help-icon {
                    font-size: 0.82rem;
                    color: #94a3b8;
                    transition: color 0.15s, transform 0.15s;
                }
                .cv-tooltip-trigger:hover .cv-help-icon {
                    color: #7A1228;
                    transform: scale(1.15);
                }
                .cv-tooltip-body {
                    visibility: hidden;
                    opacity: 0;
                    position: absolute;
                    bottom: calc(100% + 8px);
                    background: #0f172a;
                    color: #f1f5f9;
                    padding: 9px 12px;
                    border-radius: 9px;
                    width: 220px;
                    box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.45);
                    border: 1px solid #334155;
                    z-index: 1000;
                    pointer-events: none;
                    transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
                    text-align: left;
                    white-space: normal;
                }
                .cv-tooltip-body::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    border-width: 6px;
                    border-style: solid;
                }
                .cv-tooltip-trigger:hover .cv-tooltip-body {
                    visibility: visible;
                    opacity: 1;
                    transform: translateY(0);
                }
                .cv-tip-left {
                    left: -8px;
                    transform: translateY(6px);
                }
                .cv-tip-left::after {
                    left: 12px;
                    border-color: #0f172a transparent transparent transparent;
                }
                .cv-tip-center {
                    left: 50% !important;
                    transform: translateX(-50%) translateY(6px) !important;
                }
                .cv-tooltip-trigger:hover .cv-tip-center {
                    transform: translateX(-50%) translateY(0) !important;
                }
                .cv-tip-center::after {
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    border-color: #0f172a transparent transparent transparent;
                }
                .cv-tip-right {
                    left: auto !important;
                    right: -8px !important;
                    transform: translateY(6px);
                }
                .cv-tip-right::after {
                    right: 12px !important;
                    border-color: #0f172a transparent transparent transparent;
                }
                .cv-tip-title {
                    display: block;
                    font-weight: 700;
                    font-size: 0.74rem;
                    color: #38bdf8;
                    margin-bottom: 3px;
                }
                .cv-tip-text {
                    display: block;
                    color: #cbd5e1;
                    font-size: 0.72rem;
                    line-height: 1.42;
                    font-weight: 400;
                }

                /* ── BALANCE STATUS BAR ── */
                .cv-balance-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding: 10px 14px;
                    border-radius: 9px;
                    font-size: 0.82rem;
                }
                .cv-balance-bar.balanced {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    color: #166534;
                }
                .cv-balance-bar.unbalanced {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #991b1b;
                }
                .cv-bal-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .cv-bal-icon {
                    font-size: 1rem;
                }
                .cv-reset-link {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    padding: 5px 10px;
                    border-radius: 6px;
                    color: #475569;
                    font-size: 0.74rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.15s ease;
                }
                .cv-reset-link:hover {
                    background: #f8fafc;
                    color: #0f172a;
                    border-color: #94a3b8;
                }

                /* ── BOTTOM DOCKED BAR ── */
                .cv-bottom-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-top: 24px;
                    padding: 16px 20px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .cv-bottom-summary {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    flex-wrap: wrap;
                    font-size: 0.8rem;
                    color: #64748b;
                }
                .cv-bs-item strong {
                    color: #1e293b;
                }
                .cv-bottom-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-left: auto;
                }

                /* ── MODALS ── */
                .cv-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 20px;
                }
                .cv-modal-card {
                    background: #ffffff;
                    width: 100%;
                    max-width: 680px;
                    max-height: 85vh;
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: cvModalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes cvModalIn {
                    from { opacity: 0; transform: scale(0.96) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .cv-modal-header {
                    padding: 18px 22px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .cv-modal-title-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .cv-modal-icon-wrap {
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    background: #fffbeb;
                    color: #b45309;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                }
                .cv-modal-header h3 {
                    margin: 0;
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #0f172a;
                }
                .cv-modal-header p {
                    margin: 2px 0 0;
                    font-size: 0.78rem;
                    color: #64748b;
                }
                .cv-modal-close-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: #f1f5f9;
                    border: none;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.1rem;
                }
                .cv-modal-close-btn:hover { background: #e2e8f0; color: #0f172a; }
                .cv-modal-content {
                    padding: 20px 22px;
                    overflow-y: auto;
                    flex: 1;
                }
                .cv-modal-empty {
                    text-align: center;
                    padding: 40px 20px;
                    color: #94a3b8;
                    font-size: 0.88rem;
                }
                .cv-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid #f1f5f9;
                    border-top-color: #7A1228;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 12px;
                }
                .cv-cand-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .cv-cand-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 12px 14px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                }
                .cv-cand-avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #7A1228;
                    font-size: 1.1rem;
                    flex-shrink: 0;
                }
                .cv-cand-info {
                    flex: 1;
                    min-width: 0;
                }
                .cv-cand-info h4 {
                    margin: 0;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #0f172a;
                }
                .cv-cand-applied {
                    margin: 2px 0 6px;
                    font-size: 0.74rem;
                    color: #64748b;
                }
                .cv-cand-badges {
                    display: flex;
                    gap: 6px;
                }
                .cv-badge {
                    font-size: 0.68rem;
                    font-weight: 600;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    padding: 1px 6px;
                    border-radius: 4px;
                    color: #475569;
                }
                .cv-cand-buttons {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .cv-btn-sm-outline {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    color: #334155;
                    font-size: 0.76rem;
                    font-weight: 600;
                    padding: 6px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    text-decoration: none;
                }
                .cv-btn-sm-outline:hover { background: #f8fafc; }

                /* ── SUCCESS MODAL ── */
                .cv-modal-success {
                    max-width: 440px;
                    text-align: center;
                    padding: 32px 28px;
                }
                .cv-success-icon-wrap {
                    width: 64px;
                    height: 64px;
                    border-radius: 18px;
                    background: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    color: #059669;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    margin: 0 auto 16px;
                }
                .cv-modal-success h2 {
                    margin: 0 0 8px;
                    font-size: 1.35rem;
                    font-weight: 800;
                    color: #0f172a;
                }
                .cv-success-desc {
                    margin: 0 0 20px;
                    font-size: 0.86rem;
                    color: #64748b;
                    line-height: 1.45;
                }
                .cv-approval-status-box {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 12px 14px;
                    margin-bottom: 24px;
                    text-align: left;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }
                .cv-as-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #10b981;
                    margin-top: 5px;
                    flex-shrink: 0;
                }
                .cv-as-title {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                .cv-as-desc {
                    font-size: 0.74rem;
                    color: #64748b;
                    margin-top: 2px;
                }
                .cv-success-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
            `}</style>
        </div>
    );
}

export default CreateVacancy;
