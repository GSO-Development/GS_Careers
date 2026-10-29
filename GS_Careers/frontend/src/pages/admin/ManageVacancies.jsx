import useHorizontalDragScroll from '../../utils/useHorizontalDragScroll';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllVacancies, deleteVacancy, updateVacancy, getCompanies, getStats, API_BASE, getApplications, assignVacancyCandidate, getVacancyAuditLog } from '../../services/api';

const BACKEND_ROOT = API_BASE.replace('/api', '');
import { formatDate, daysLeft } from '../../utils/constants';
import { toast } from 'react-toastify';
import {
    FiPlus, FiEdit2, FiTrash2, FiClock, FiUsers, FiSearch,
    FiFilter, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiArrowRight, FiBriefcase, FiTarget,
    FiEye, FiMapPin, FiX, FiCheck, FiXCircle, FiFileText, FiCalendar, FiChevronLeft, FiChevronRight, FiInfo, FiActivity, FiChevronDown, FiChevronUp, FiRotateCcw,
    FiUser, FiMail, FiPhone, FiHome, FiLayers, FiMoreVertical, FiSliders
} from 'react-icons/fi';
import './ManageVacancies.css';
import PaginationFooter from '../../components/PaginationFooter';

// Helper to render job description/requirements with better formatting
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

const renderApprovalTimeline = (v) => {
    if (!v) return null;

    const steps = [];

    // Step 1: Requisition Initiated
    steps.push({
        label: 'Requisition Initiated',
        status: 'completed',
        icon: 'FiPlus',
        color: '#16a34a',
        detail: `Created by ${v.creator_name || 'System'}`,
        time: v.created_at ? formatDate(v.created_at) : formatDate(v.publish_date)
    });

    // Step 2: Sub Admin 1 Approval
    const requiresSub1 = v.creator_role === 'sub_admin2' || (!v.creator_role && (v.sub1_approved_by || v.approval_status === 'pending_subadmin1' || (v.approval_status === 'rejected' && v.rejected_by_name && !v.sub1_approved_by && !v.global_approved_by)));
    
    if (requiresSub1) {
        let stepStatus = 'pending';
        let detail = 'Pending review by Sub Admin 1';
        let time = '';
        let color = '#94a3b8';

        if (v.sub1_approved_by) {
            stepStatus = 'completed';
            detail = `Approved by ${v.sub1_approved_by_name}`;
            time = formatDate(v.sub1_approved_at);
            color = '#16a34a';
        } else if (v.approval_status === 'pending_subadmin1') {
            stepStatus = 'active';
            detail = 'Awaiting review by Sub Admin 1';
            color = '#d97706';
        } else if (v.approval_status === 'rejected' && v.rejected_by_name && !v.global_approved_by_name) {
            stepStatus = 'rejected';
            detail = `Rejected by ${v.rejected_by_name}`;
            time = formatDate(v.rejected_at);
            color = '#dc2626';
        } else if (v.approval_status === 'draft') {
            stepStatus = 'pending';
            detail = 'Awaiting submission';
            color = '#94a3b8';
        }

        steps.push({
            label: 'Sub Admin 1 Approval',
            status: stepStatus,
            icon: 'FiCheckCircle',
            color: color,
            detail: detail,
            time: time
        });
    } else {
        steps.push({
            label: 'Sub Admin 1 Approval',
            status: 'skipped',
            icon: 'FiCheckCircle',
            color: '#64748b',
            detail: 'Bypassed (Direct submission by ' + (v.creator_role === 'sub_admin1' ? 'Sub Admin 1' : 'Admin') + ')',
            time: ''
        });
    }

    // Step 3: GS Admin Approval
    let step3Status = 'pending';
    let step3Detail = 'Awaiting previous step';
    let step3Time = '';
    let step3Color = '#94a3b8';

    const isSub1Done = !requiresSub1 || v.sub1_approved_by;
    
    if (v.global_approved_by) {
        step3Status = 'completed';
        step3Detail = `Approved by ${v.global_approved_by_name}`;
        step3Time = formatDate(v.global_approved_at);
        step3Color = '#16a34a';
    } else if (v.approval_status === 'pending_global') {
        step3Status = 'active';
        step3Detail = 'Awaiting review by GS Admin';
        step3Color = '#2563eb';
    } else if (v.approval_status === 'rejected' && v.rejected_by_name && (v.global_approved_by_name || !requiresSub1 || v.sub1_approved_by_name)) {
        step3Status = 'rejected';
        step3Detail = `Rejected by ${v.rejected_by_name}`;
        step3Time = formatDate(v.rejected_at);
        step3Color = '#dc2626';
    } else if (isSub1Done && v.approval_status !== 'draft') {
        step3Status = 'pending';
        step3Detail = 'Pending review by GS Admin';
    }

    steps.push({
        label: 'GS Admin Approval',
        status: step3Status,
        icon: 'FiCheckCircle',
        color: step3Color,
        detail: step3Detail,
        time: step3Time
    });

    // Step 4: Publication
    let step4Status = 'pending';
    let step4Detail = 'Awaiting final approval';
    let step4Color = '#94a3b8';
    
    if (v.approval_status === 'approved') {
        const isLive = v.is_active && daysLeft(v.expire_date) > 0;
        step4Status = 'completed';
        step4Detail = isLive ? 'Vacancy is LIVE and publishable' : 'Vacancy posting has ended';
        step4Color = isLive ? '#16a34a' : '#64748b';
    }

    steps.push({
        label: 'Vacancy Activation',
        status: step4Status,
        icon: 'FiBriefcase',
        color: step4Color,
        detail: step4Detail,
        time: v.approval_status === 'approved' && v.global_approved_at ? formatDate(v.global_approved_at) : ''
    });

    return (
        <div className="approval-stepper-timeline" style={{
            marginTop: '0px',
            marginBottom: '0px',
            padding: '24px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.025)'
        }}>
            <h4 style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#0f172a',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1.5px solid #e2e8f0',
                paddingBottom: '10px'
            }}>
                <FiClock size={16} style={{ color: '#0f172a' }} /> Requisition Approval Timeline
            </h4>
            <div className="stepper-track" style={{ display: 'flex', flexDirection: 'column', gap: '0px', position: 'relative' }}>
                {steps.map((step, idx) => {
                    const isLast = idx === steps.length - 1;
                    
                    // Determine custom icon or number inside step node
                    let stepIcon = idx + 1;
                    if (step.status === 'completed') stepIcon = <FiCheck size={16} />;
                    else if (step.status === 'active') stepIcon = <FiClock size={16} />;
                    else if (step.status === 'rejected') stepIcon = <FiX size={16} />;

                    // Enhanced Node Colors for high-contrast and visual appeal
                    const nodeBg = step.status === 'completed' ? '#22c55e' :
                                   step.status === 'active' ? '#3b82f6' :
                                   step.status === 'rejected' ? '#ef4444' :
                                   step.status === 'skipped' ? '#f8fafc' : '#f1f5f9';
                    const nodeBorder = step.status === 'completed' ? '#22c55e' :
                                       step.status === 'active' ? '#3b82f6' :
                                       step.status === 'rejected' ? '#ef4444' :
                                       step.status === 'skipped' ? '#94a3b8' : '#cbd5e1';
                    const nodeColor = (step.status === 'completed' || step.status === 'active' || step.status === 'rejected') ? '#ffffff' :
                                      step.status === 'skipped' ? '#94a3b8' : '#475569';

                    return (
                        <div key={idx} className={`stepper-item ${step.status}`} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: isLast ? '0' : '20px' }}>
                            {!isLast && (
                                <div className="stepper-line" style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '28px',
                                    bottom: '0',
                                    width: '2px',
                                    background: step.status === 'completed' ? '#22c55e' : '#cbd5e1',
                                    zIndex: 1
                                }}></div>
                            )}
                            
                            <div className="stepper-node" style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: nodeBg,
                                border: `2px solid ${nodeBorder}`,
                                color: nodeColor,
                                zIndex: 2,
                                flexShrink: 0,
                                fontSize: '0.85rem',
                                fontWeight: 'bold'
                            }}>
                                {stepIcon}
                            </div>
                            
                            <div className="stepper-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '4px' }}>
                                <span className="stepper-label" style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: (step.status === 'active' || step.status === 'completed') ? '#0f172a' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {step.label}
                                    {step.status === 'skipped' && <span style={{ fontSize: '0.7rem', color: '#64748b', padding: '2px 8px', background: '#e2e8f0', borderRadius: '4px', fontWeight: 600 }}>Skipped</span>}
                                    {step.status === 'active' && <span style={{ fontSize: '0.7rem', color: '#b45309', padding: '2px 8px', background: '#fef3c7', borderRadius: '4px', fontWeight: 600 }}>Awaiting Action</span>}
                                </span>
                                <span className="stepper-detail" style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500, marginTop: '2px' }}>
                                    {step.detail}
                                </span>
                                {step.time && (
                                    <span className="stepper-time" style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 500 }}>
                                        <FiCalendar size={12} /> {step.time}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

function ManageVacancies({ admin }) {
    const tableDragScroll = useHorizontalDragScroll();
    const navigate = useNavigate();
    const [vacancies, setVacancies] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [stats, setStats] = useState({ total_vacancies: 0, active_vacancies: 0, total_applications: 0 });
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [activeActionMenuId, setActiveActionMenuId] = useState(null);
    const [companyFilter, setCompanyFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [viewDetail, setViewDetail] = useState(null);
    const [modalTab, setModalTab] = useState('details'); // 'details', 'history'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
    const [loadingShortlisted, setLoadingShortlisted] = useState(false);
    const [searchCandidate, setSearchCandidate] = useState('');
    const [assigningAppId, setAssigningAppId] = useState(null);

    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEffect(() => {
        if (viewDetail && viewDetail.id) {
            fetchAuditLogs(viewDetail.id);
        } else {
            setAuditLogs([]);
        }
    }, [viewDetail]);

    useEffect(() => {
        const handleOutsideClick = () => setActiveActionMenuId(null);
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    const fetchAuditLogs = async (vacancyId) => {
        try {
            setLoadingLogs(true);
            const res = await getVacancyAuditLog(vacancyId);
            setAuditLogs(res.data.data || []);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleOpenAssignModal = async () => {
        try {
            setLoadingShortlisted(true);
            setShowAssignModal(true);
            setSearchCandidate('');
            setAssigningAppId(viewDetail?.selected_application_id || viewDetail?.hired_application_id || null);
            
            const res = await getApplications({ status: 'shortlisted' });
            setShortlistedCandidates(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load shortlisted candidates');
        } finally {
            setLoadingShortlisted(false);
        }
    };

    const handleConfirmAssignment = async () => {
        try {
            const data = {
                vacancy_id: viewDetail.id,
                application_id: assigningAppId
            };
            await assignVacancyCandidate(data);
            
            toast.success(assigningAppId ? 'Candidate assigned successfully!' : 'Assignment cleared successfully!');
            
            await loadData();
            
            if (assigningAppId) {
                const selected = shortlistedCandidates.find(c => c.id === assigningAppId);
                if (selected) {
                    setViewDetail(prev => ({
                        ...prev,
                        hired_application_id: selected.id,
                        selected_application_id: selected.id,
                        selected_first_name: selected.first_name,
                        selected_last_name: selected.last_name,
                        selected_email: selected.email,
                        selected_contact_number: selected.contact_number
                    }));
                }
            } else {
                setViewDetail(prev => ({
                    ...prev,
                    hired_application_id: null,
                    selected_application_id: null,
                    selected_first_name: null,
                    selected_last_name: null,
                    selected_email: null,
                    selected_contact_number: null
                }));
            }
            
            setShowAssignModal(false);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to assign candidate');
        }
    };

    useEffect(() => {
        loadData();
    }, [companyFilter]);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const highlightId = searchParams.get('highlight');
        if (highlightId && !loading && vacancies.length > 0) {
            const targetVac = vacancies.find(v => v.id == highlightId);
            if (targetVac) {
                setViewDetail(targetVac);
                setModalTab('details');
            }
            setTimeout(() => {
                const el = document.getElementById(`vacancy-card-${highlightId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlighted-card-active');
                }
            }, 300);
        }
    }, [loading, vacancies]);

    const loadData = async () => {
        try {
            setLoading(true);
            const params = {};
            if (companyFilter) params.company_id = companyFilter;

            const [vacRes, compRes, statsRes] = await Promise.all([
                getAllVacancies(params),
                getCompanies(),
                getStats()
            ]);

            const loadedVacancies = vacRes.data.data || [];
            setVacancies(loadedVacancies);
            setCompanies(compRes.data.data || []);
            setStats(statsRes.data.data || { total_vacancies: 0, active_vacancies: 0, total_applications: 0 });

            // Handle initial highlight page calculation
            const searchParams = new URLSearchParams(window.location.search);
            const highlightId = searchParams.get('highlight');
            if (highlightId && loadedVacancies.length > 0) {
                const filtered = loadedVacancies.filter(v =>
                    v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (v.reference_number && v.reference_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    v.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    v.designation.toLowerCase().includes(searchTerm.toLowerCase())
                );
                const targetIndex = filtered.findIndex(v => v.id == highlightId);
                if (targetIndex !== -1) {
                    const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
                    setCurrentPage(targetPage);
                }
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteVacancy({ id });
            toast.success('Vacancy deleted successfully');
            setConfirmDelete(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleQuickSubmit = async (vacancy) => {
        try {
            setLoading(true);
            await updateVacancy({
                ...vacancy,
                submit_for_approval: true
            });
            toast.success('Vacancy submitted for approval successfully!');
            await loadData();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to submit vacancy for approval');
        } finally {
            setLoading(false);
        }
    };

    const filteredVacancies = vacancies.filter(v => {
        const matchesSearch = !searchTerm || (
            v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.reference_number && v.reference_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (v.company_name && v.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (v.designation && v.designation.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const matchesCompany = !companyFilter || String(v.company_id) === String(companyFilter);

        let matchesStatus = true;
        if (statusFilter) {
            const isExpired = daysLeft(v.expire_date) <= 0;
            const isActive = v.is_active && !isExpired && v.approval_status === 'approved';
            if (statusFilter === 'active') {
                matchesStatus = isActive;
            } else if (statusFilter === 'pending') {
                matchesStatus = v.approval_status === 'pending_subadmin1' || v.approval_status === 'pending_global';
            } else if (statusFilter === 'draft') {
                matchesStatus = v.approval_status === 'draft';
            } else if (statusFilter === 'closed') {
                matchesStatus = isExpired || !v.is_active || v.approval_status === 'rejected';
            }
        }

        let matchesType = true;
        if (employmentTypeFilter) {
            matchesType = (v.employment_type || '').toLowerCase().includes(employmentTypeFilter.toLowerCase());
        }

        return matchesSearch && matchesCompany && matchesStatus && matchesType;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredVacancies.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedVacancies = filteredVacancies.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, companyFilter, statusFilter, employmentTypeFilter]);

    // Handle card/row highlighting and scroll into view when redirecting from email
    const searchParams = new URLSearchParams(window.location.search);
    const highlightId = searchParams.get('highlight');

    useEffect(() => {
        if (highlightId && !loading && vacancies.length > 0) {
            setTimeout(() => {
                const el = document.getElementById(`vacancy-card-${highlightId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlighted-row-active');
                }
            }, 300);
        }
    }, [loading, vacancies, highlightId]);

    return (
        <div className="manage-vacancies-console">
            {/* HEREO / HEADER SECTION */}
            <div className="vacancies-orchestration-header">
                <div className="header-content-p">
                    <div className="console-badge">
                        <span className="live-dot pulse"></span>
                        RECRUITMENT ORCHESTRATION CONSOLE
                    </div>
                    <h1 className="serif-title-p">Manage Vacancies</h1>
                    <p className="hero-subline">Track and publish job opportunities across George Steuart & Company establishments.</p>
                </div>
                {admin.role !== 'super_admin' && (
                    <button className="btn-establish-p" onClick={() => navigate('/admin/vacancies/create')}>
                        <FiPlus /> <span>Establish New Vacancy</span>
                    </button>
                )}
            </div>

            {/* STATS MOSAIC */}
            <div className="stats-mosaic-grid admin-grid-4">
                <div className="db-stat-card">
                    <div className="db-s-header">
                        <span className="db-s-label">Total Listings</span>
                        <div className="db-s-icon"><FiBriefcase /></div>
                    </div>
                    <span className="db-s-value">{stats.total_vacancies}</span>
                </div>
                <div className="db-stat-card">
                    <div className="db-s-header">
                        <span className="db-s-label">Live Channels</span>
                        <div className="db-s-icon green"><FiCheckCircle /></div>
                    </div>
                    <span className="db-s-value">{stats.active_vacancies}</span>
                </div>
                <div className="db-stat-card">
                    <div className="db-s-header">
                        <span className="db-s-label">Engagement</span>
                        <div className="db-s-icon blue"><FiUsers /></div>
                    </div>
                    <span className="db-s-value">{stats.total_applications}</span>
                </div>
                <div className="db-stat-card">
                    <div className="db-s-header">
                        <span className="db-s-label">Expiring Soon</span>
                        <div className="db-s-icon purple"><FiAlertCircle /></div>
                    </div>
                    <span className="db-s-value">
                        {vacancies.filter(v => daysLeft(v.expire_date) > 0 && daysLeft(v.expire_date) <= 7).length}
                    </span>
                </div>
            </div>

            {/* MODERN COLLAPSIBLE FILTER SUITE */}
            {(() => {
                const activeVacFilterCount = [companyFilter, statusFilter, employmentTypeFilter].filter(Boolean).length;
                const hasVacActiveFilters = Boolean(searchTerm || companyFilter || statusFilter || employmentTypeFilter);
                const activeVacChips = [];
                if (searchTerm) activeVacChips.push({ key: 'search', label: `Search: "${searchTerm}"`, clear: () => setSearchTerm('') });
                if (companyFilter) {
                    const comp = companies.find(c => String(c.id) === String(companyFilter))?.name || 'Establishment';
                    activeVacChips.push({ key: 'company', label: `Entity: ${comp}`, clear: () => setCompanyFilter('') });
                }
                if (statusFilter) activeVacChips.push({ key: 'status', label: `Status: ${statusFilter}`, clear: () => setStatusFilter('') });
                if (employmentTypeFilter) activeVacChips.push({ key: 'empType', label: `Type: ${employmentTypeFilter}`, clear: () => setEmploymentTypeFilter('') });

                return (
                    <div className="applicant-filter-card">
                        <div className="filter-top-bar">
                            <div className="filter-search-wrapper">
                                <div className="search-input-box">
                                    <FiSearch className="search-lead-icon" />
                                    <input
                                        id="vacancy_search"
                                        name="vacancy_search"
                                        type="text"
                                        placeholder="Search position, reference, designation or establishment..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            className="clear-search-trigger"
                                            onClick={() => setSearchTerm('')}
                                            title="Clear search"
                                        >
                                            <FiX size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="filter-top-actions">
                                <button
                                    type="button"
                                    className={`btn-toggle-filters ${showFilterPanel ? 'active' : ''} ${activeVacFilterCount > 0 ? 'has-active' : ''}`}
                                    onClick={() => setShowFilterPanel(prev => !prev)}
                                    title="Toggle filter options"
                                >
                                    <FiFilter className="btn-filter-icon" />
                                    <span>Filters</span>
                                    {activeVacFilterCount > 0 && (
                                        <span className="filter-count-badge">{activeVacFilterCount}</span>
                                    )}
                                    {showFilterPanel ? <FiChevronUp className="btn-chevron-icon" /> : <FiChevronDown className="btn-chevron-icon" />}
                                </button>

                                {hasVacActiveFilters && (
                                    <button 
                                        type="button" 
                                        className="btn-clear-all-filters" 
                                        onClick={() => {
                                            setSearchTerm('');
                                            setCompanyFilter('');
                                            setStatusFilter('');
                                            setEmploymentTypeFilter('');
                                        }}
                                        title="Reset all filters"
                                    >
                                        <FiRotateCcw size={13} /> Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeVacChips.length > 0 && (
                            <div className="active-filter-chips-row">
                                <span className="chips-label">Active Filters:</span>
                                <div className="chips-list">
                                    {activeVacChips.map(chip => (
                                        <button
                                            key={chip.key}
                                            type="button"
                                            className="filter-chip"
                                            onClick={chip.clear}
                                            title={`Remove ${chip.label}`}
                                        >
                                            <span>{chip.label}</span>
                                            <FiX size={12} className="chip-remove" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {showFilterPanel && (
                            <div className="filter-dropdowns-expandable animated-fade-in">
                                <div className="filter-panel-header">
                                    <span className="panel-title-text">Filter & Refine Vacancy Listings</span>
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
                                    {(admin.role === 'super_admin' || admin.role === 'admin') && (
                                        <div className={`filter-field-box ${companyFilter ? 'has-value' : ''}`}>
                                            <label htmlFor="company_filter">
                                                <FiHome className="field-icon" /> Establishment
                                            </label>
                                            <div className="custom-select-wrapper">
                                                <select 
                                                    id="company_filter" 
                                                    name="company_id" 
                                                    value={companyFilter} 
                                                    onChange={(e) => setCompanyFilter(e.target.value)}
                                                >
                                                    <option value="">All GS Entities</option>
                                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className={`filter-field-box ${statusFilter ? 'has-value' : ''}`}>
                                        <label htmlFor="status_filter">
                                            <FiActivity className="field-icon" /> Vacancy Status
                                        </label>
                                        <div className="custom-select-wrapper">
                                            <select 
                                                id="status_filter" 
                                                name="status_filter" 
                                                value={statusFilter} 
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="active">Active &amp; Live</option>
                                                <option value="pending">Pending Approval</option>
                                                <option value="draft">Draft Requisition</option>
                                                <option value="closed">Closed / Expired</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className={`filter-field-box ${employmentTypeFilter ? 'has-value' : ''}`}>
                                        <label htmlFor="employment_type_filter">
                                            <FiLayers className="field-icon" /> Employment Type
                                        </label>
                                        <div className="custom-select-wrapper">
                                            <select 
                                                id="employment_type_filter" 
                                                name="employment_type_filter" 
                                                value={employmentTypeFilter} 
                                                onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                                            >
                                                <option value="">All Classifications</option>
                                                <option value="Full Time">Full-Time</option>
                                                <option value="Part Time">Part-Time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Internship">Internship</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* DATA ORCHESTRATION TABLE */}
            <div className="orchestration-table-wrapper card-p">
                {loading ? (
                    <div className="loading-state-p">
                        <div className="spinner-p"></div>
                        <p>Synchronizing vacancy data...</p>
                    </div>
                ) : filteredVacancies.length === 0 ? (
                    <div className="empty-state-p">
                        <div className="empty-icon"><FiBriefcase /></div>
                        <h3>No matches found</h3>
                        <p>We couldn't find any vacancies matching your current filters.</p>
                        <button className="btn btn-outline" onClick={() => { setSearchTerm(''); setCompanyFilter(''); }}>Reset Console</button>
                    </div>
                ) : (
                    <div className="premium-table-container horizontal-drag-scroll" {...tableDragScroll}>
                        <table className="premium-table vacancies-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '24%' }}>Position</th>
                                    <th style={{ width: '18%' }}>Subsidiary</th>
                                    <th style={{ width: '22%' }}>Required Skills</th>
                                    <th style={{ width: '13%' }}>Applicants</th>
                                    <th style={{ width: '17%' }}>Status &amp; Dates</th>
                                    <th style={{ width: '6%', textAlign: 'right', paddingRight: '14px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedVacancies.map((v, idx) => {
                                    const active = v.is_active && daysLeft(v.expire_date) > 0;
                                    const skillsList = v.required_skills
                                        ? v.required_skills.split(',').map(s => s.trim()).filter(Boolean)
                                        : [];
                                    const isLowerHalf = idx >= Math.max(3, paginatedVacancies.length - 3);

                                    return (
                                        <tr key={v.id} id={`vacancy-card-${v.id}`} className={activeActionMenuId === v.id ? 'row-active-menu' : ''}>
                                            {/* POSITION */}
                                            <td>
                                                <div className="pos-entity-cell">
                                                    <span className="pos-name">{v.title}</span>
                                                    {v.reference_number && (
                                                        <span className="ref-badge-inline">#{v.reference_number}</span>
                                                    )}
                                                    {v.selected_first_name && (
                                                        <div className="table-emp-badge" title={`Assigned: ${v.selected_first_name} ${v.selected_last_name}`}>
                                                            <span className="te-dot"></span>
                                                            <span className="te-text">{v.selected_first_name} {v.selected_last_name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {/* SUBSIDIARY */}
                                            <td>
                                                <span className="entity-name" style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 500 }}>{v.company_name}</span>
                                            </td>
                                            <td>
                                                <div className="vac-skills-wrap">
                                                    {skillsList.length > 0 ? (
                                                        <div className="vac-skill-tags">
                                                            {skillsList.slice(0, 2).map((skill, idx) => (
                                                                <span key={idx} className="vac-skill-tag">{skill}</span>
                                                            ))}
                                                            {skillsList.length > 2 && (
                                                                <span className="vac-skill-more" title={skillsList.slice(2).join(', ')}>
                                                                    +{skillsList.length - 2}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="vac-no-skills">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="vac-applicants-cell">
                                                    <div className="vac-app-count">
                                                        <span className="vac-app-num">{v.application_count || 0}</span>
                                                        <span className="vac-app-lbl">applicants</span>
                                                    </div>
                                                    <div className="vac-app-pipeline">
                                                        <span className="vac-pending">{v.pending_count || 0} pending</span>
                                                        {v.shortlisted_count > 0 && (
                                                            <>
                                                                <span className="vac-sep">·</span>
                                                                <span className="vac-shortlisted">{v.shortlisted_count} shortlisted</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="vac-status-cell">
                                                    {v.approval_status === 'draft' && <span className="vac-status-badge draft"><span className="vac-status-dot"></span>Draft</span>}
                                                    {v.approval_status === 'pending_subadmin1' && <span className="vac-status-badge pending"><span className="vac-status-dot"></span>Pending Review</span>}
                                                    {v.approval_status === 'pending_global' && <span className="vac-status-badge pending"><span className="vac-status-dot"></span>Pending Approval</span>}
                                                    {v.approval_status === 'rejected' && <span className="vac-status-badge rejected" title={v.rejection_reason || ''}><span className="vac-status-dot"></span>Rejected</span>}
                                                    {v.approval_status === 'approved' && (
                                                        <span className={`vac-status-badge ${active ? 'live' : 'ended'}`}>
                                                            <span className="vac-status-dot"></span>{active ? 'Live' : 'Ended'}
                                                        </span>
                                                    )}
                                                    <div className="vac-date-range">
                                                        <FiCalendar size={11} className="vac-date-icon" />
                                                        <span>{formatDate(v.publish_date)} – {formatDate(v.expire_date)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className="vac-actions-menu-container">
                                                    <button
                                                        className={`vac-action-trigger ${activeActionMenuId === v.id ? 'active' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveActionMenuId(activeActionMenuId === v.id ? null : v.id);
                                                        }}
                                                        title="Actions"
                                                    >
                                                        <FiMoreVertical size={18} />
                                                    </button>

                                                    {activeActionMenuId === v.id && (
                                                        <div className={`vac-actions-dropdown ${isLowerHalf ? 'open-upwards' : ''}`} onClick={(e) => e.stopPropagation()}>
                                                            {admin?.role !== 'super_admin' && (v.approval_status === 'draft' || v.approval_status === 'rejected') && (
                                                                <button
                                                                    className="vac-dropdown-item approve"
                                                                    onClick={() => {
                                                                        setActiveActionMenuId(null);
                                                                        handleQuickSubmit(v);
                                                                    }}
                                                                >
                                                                    <FiCheckCircle size={15} />
                                                                    <span>Submit for Approval</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                className="vac-dropdown-item view"
                                                                onClick={() => {
                                                                    setActiveActionMenuId(null);
                                                                    setViewDetail(v);
                                                                    setModalTab('details');
                                                                }}
                                                            >
                                                                <FiEye size={15} />
                                                                <span>View Details</span>
                                                            </button>
                                                            <button
                                                                className="vac-dropdown-item pipeline"
                                                                onClick={() => {
                                                                    setActiveActionMenuId(null);
                                                                    navigate(`/admin/applicants?vacancy_id=${v.id}`);
                                                                }}
                                                            >
                                                                <FiUsers size={15} />
                                                                <span>View Applicants</span>
                                                            </button>
                                                            {admin?.role !== 'super_admin' && (
                                                                <button
                                                                    className="vac-dropdown-item edit"
                                                                    onClick={() => {
                                                                        setActiveActionMenuId(null);
                                                                        navigate(`/admin/vacancies/edit/${v.id}`);
                                                                    }}
                                                                >
                                                                    <FiEdit2 size={15} />
                                                                    <span>Edit Vacancy</span>
                                                                </button>
                                                            )}
                                                            {admin?.role !== 'super_admin' && (
                                                                <div className="vac-dropdown-divider" />
                                                            )}
                                                            {admin?.role !== 'super_admin' && (
                                                                <button
                                                                    className="vac-dropdown-item delete"
                                                                    onClick={() => {
                                                                        setActiveActionMenuId(null);
                                                                        setConfirmDelete(v.id);
                                                                    }}
                                                                >
                                                                    <FiTrash2 size={15} />
                                                                    <span>Delete Vacancy</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        <PaginationFooter
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredVacancies.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            label="vacancies"
                        />
                    </div>
                )}
            </div>

            {/* Modal remains same but styled */}
            {confirmDelete && (
                <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="confirm-modal card-p animated-zoom" onClick={e => e.stopPropagation()}>
                        <div className="warning-visual"><FiAlertCircle /></div>
                        <h3>Decommission Position?</h3>
                        <p>This action will permanently remove this vacancy and all associated records from the orchestration console. This cannot be undone.</p>
                        <div className="modal-actions-p">
                            <button className="btn-secondary-p" onClick={() => setConfirmDelete(null)}>Abort</button>
                            <button className="btn-danger-p" onClick={() => handleDelete(confirmDelete)}>Confirm Decommission</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Description Detail Modal */}
            {viewDetail && (
                <div className="vd-overlay" onClick={() => setViewDetail(null)}>
                    <div className="vd-modal" onClick={(e) => e.stopPropagation()}>

                        {/* ── MODAL HEADER ── */}
                        <div className="vd-header">
                            <div className="vd-header-glow"></div>

                            <div className="vd-header-top">
                                <div className="vd-status-badge">
                                    {viewDetail.approval_status === 'pending_subadmin1' && (
                                        <>
                                            <span className="vd-status-dot" style={{ background: '#d97706', boxShadow: '0 0 8px rgba(217,119,6,0.5)' }}></span>
                                            <span style={{ color: '#d97706' }}>PENDING SUB 1</span>
                                        </>
                                    )}
                                    {viewDetail.approval_status === 'pending_global' && (
                                        <>
                                            <span className="vd-status-dot" style={{ background: '#2563eb', boxShadow: '0 0 8px rgba(37,99,235,0.5)' }}></span>
                                            <span style={{ color: '#2563eb' }}>PENDING GLOBAL</span>
                                        </>
                                    )}
                                    {viewDetail.approval_status === 'rejected' && (
                                        <>
                                            <span className="vd-status-dot" style={{ background: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.5)' }}></span>
                                            <span style={{ color: '#dc2626' }}>REJECTED</span>
                                        </>
                                    )}
                                    {viewDetail.approval_status === 'approved' && (
                                        <>
                                            <span className={`vd-status-dot ${viewDetail.is_active && daysLeft(viewDetail.expire_date) > 0 ? 'live' : 'ended'}`}></span>
                                            {viewDetail.is_active && daysLeft(viewDetail.expire_date) > 0 ? 'LIVE POSTING' : 'ENDED'}
                                        </>
                                    )}
                                </div>
                                <button className="vd-close-btn" onClick={() => setViewDetail(null)} title="Close">
                                    <FiX />
                                </button>
                            </div>

                            <h2 className="vd-title">{viewDetail.title}</h2>

                            <div className="vd-company-row">
                                <img
                                    src={viewDetail.company_logo ? `${BACKEND_ROOT}/uploads/logos/${viewDetail.company_logo}` : '/gs-logo.png'}
                                    alt={viewDetail.company_name}
                                    onError={(e) => e.target.src = '/gs-logo.png'}
                                    className="vd-company-logo"
                                />
                                <span className="vd-company-name">{viewDetail.company_name}</span>
                            </div>

                            <div className="vd-pills">
                                {viewDetail.reference_number && (
                                    <span className="vd-pill ref">{viewDetail.reference_number}</span>
                                )}
                                <span className="vd-pill">
                                    <FiBriefcase size={11} /> {viewDetail.employment_type}
                                </span>
                                {viewDetail.location && (
                                    <span className="vd-pill">
                                        <FiMapPin size={11} /> {viewDetail.location}
                                    </span>
                                )}
                                <span className="vd-pill">
                                    <FiUsers size={11} /> {viewDetail.application_count || 0} Applicants
                                </span>
                            </div>
                        </div>

                        {/* Modal Tab Switcher */}
                        <div className="vd-tabs-header">
                            <button 
                                className={`vd-tab-btn ${modalTab === 'details' ? 'active' : ''}`}
                                onClick={() => setModalTab('details')}
                            >
                                <FiInfo /> Requisition Details
                            </button>
                            <button 
                                className={`vd-tab-btn ${modalTab === 'history' ? 'active' : ''}`}
                                onClick={() => setModalTab('history')}
                            >
                                <FiActivity /> Timeline & Audit Trail
                            </button>
                        </div>

                        {/* ── MODAL BODY ── */}
                        <div className="vd-body">
                            {modalTab === 'details' ? (
                                <div className="vd-details-layout">
                                    <div className="vd-details-left">
                                        {viewDetail.approval_status === 'rejected' && (
                                            <div className="vd-rejection-banner" style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.2)', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rejection Reason</span>
                                                <p style={{ fontSize: '0.9rem', color: '#dc2626', margin: 0, fontWeight: 600 }}>{viewDetail.rejection_reason || 'No reason provided'}</p>
                                            </div>
                                        )}

                                        {/* Selected Employee Section */}
                                        {viewDetail.approval_status === 'approved' && viewDetail.selected_first_name && (
                                            <div className="vd-form-section">
                                                <h3 className="vd-form-section-title">Assigned Placement</h3>
                                                <div className="vd-form-grid">
                                                        <div className="vd-form-field">
                                                            <div className="vd-field-icon"><FiUser /></div>
                                                            <div className="vd-field-content">
                                                                <span className="vd-form-label">Selected Employee</span>
                                                                <div className="vd-form-value">{viewDetail.selected_first_name} {viewDetail.selected_last_name}</div>
                                                            </div>
                                                        </div>
                                                        <div className="vd-form-field">
                                                            <div className="vd-field-icon"><FiMail /></div>
                                                            <div className="vd-field-content">
                                                                <span className="vd-form-label">Email Address</span>
                                                                <div className="vd-form-value">{viewDetail.selected_email}</div>
                                                            </div>
                                                        </div>
                                                        <div className="vd-form-field">
                                                            <div className="vd-field-icon"><FiPhone /></div>
                                                            <div className="vd-field-content">
                                                                <span className="vd-form-label">Contact Number</span>
                                                                <div className="vd-form-value">{viewDetail.selected_contact_number || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                        {admin.role !== 'super_admin' && (
                                                            <div className="vd-form-field-action" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                <button className="vd-emp-btn change" onClick={handleOpenAssignModal} style={{ width: 'fit-content', height: 'fit-content', marginTop: '6px' }}>
                                                                    Change Employee
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                            </div>
                                        )}

                                        <div className="vd-form-section">
                                            <h3 className="vd-form-section-title">General Information</h3>
                                            <div className="vd-form-grid">
                                                <div className="vd-form-field">
                                                    <div className="vd-field-icon"><FiBriefcase /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Position / Job Title</span>
                                                        <div className="vd-form-value">{viewDetail.title}</div>
                                                    </div>
                                                </div>
                                                <div className="vd-form-field">
                                                    <div className="vd-field-icon"><FiInfo /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Reference Number</span>
                                                        <div className="vd-form-value">{viewDetail.reference_number || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div className="vd-form-field">
                                                    <div className="vd-field-icon"><FiUsers /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Establishment Entity</span>
                                                        <div className="vd-form-value">{viewDetail.company_name}</div>
                                                    </div>
                                                </div>
                                                <div className="vd-form-field">
                                                    <div className="vd-field-icon"><FiTarget /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Designation Class</span>
                                                        <div className="vd-form-value">{viewDetail.designation || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="vd-form-section">
                                            <h3 className="vd-form-section-title">Operational Details</h3>
                                            <div className="vd-form-grid">
                                                <div className="vd-form-field">
                                                    <div className="vd-field-icon"><FiClock /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Employment Classification</span>
                                                        <div className="vd-form-value">{viewDetail.employment_type}</div>
                                                    </div>
                                                </div>
                                                <div className="vd-form-field">
                                                    <div className="vd-field-icon"><FiMapPin /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Work Location</span>
                                                        <div className="vd-form-value">{viewDetail.location || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div className="vd-form-field">
                                                    <div className="vd-field-icon"><FiTrendingUp /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Experience Tier Required</span>
                                                        <div className="vd-form-value">{viewDetail.min_experience || 'Not specified'}</div>
                                                    </div>
                                                </div>
                                                <div className="vd-form-field">
                                                    <div className="vd-field-icon"><FiBriefcase /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Salary Range (Budget)</span>
                                                        <div className="vd-form-value">
                                                            {viewDetail.min_salary || viewDetail.max_salary ? (
                                                                `LKR ${viewDetail.min_salary ? Number(viewDetail.min_salary).toLocaleString() : '0'} - ${viewDetail.max_salary ? Number(viewDetail.max_salary).toLocaleString() : 'Negotiable'}`
                                                            ) : 'Not Specified'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="vd-form-field col-span-2">
                                                    <div className="vd-field-icon"><FiCalendar /></div>
                                                    <div className="vd-field-content">
                                                        <span className="vd-form-label">Active Listing Period</span>
                                                        <div className="vd-form-value">
                                                            <span className="vd-period-date"><FiCalendar className="inline-icon" /> {formatDate(viewDetail.publish_date)}</span>
                                                            <span className="vd-period-arrow">&rarr;</span>
                                                            <span className="vd-period-date"><FiClock className="inline-icon" /> {formatDate(viewDetail.expire_date)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CANDIDATE EVALUATION & SCORING FORMULA */}
                                        {(() => {
                                            const wSkills = (viewDetail.weight_skills !== null && viewDetail.weight_skills !== undefined && viewDetail.weight_skills !== '') ? Number(viewDetail.weight_skills) : 35;
                                            const wExp = (viewDetail.weight_experience !== null && viewDetail.weight_experience !== undefined && viewDetail.weight_experience !== '') ? Number(viewDetail.weight_experience) : 30;
                                            const wQual = (viewDetail.weight_qualification !== null && viewDetail.weight_qualification !== undefined && viewDetail.weight_qualification !== '') ? Number(viewDetail.weight_qualification) : 20;
                                            const wJd = (viewDetail.weight_jd_alignment !== null && viewDetail.weight_jd_alignment !== undefined && viewDetail.weight_jd_alignment !== '') ? Number(viewDetail.weight_jd_alignment) : 10;
                                            const wSal = (viewDetail.weight_salary !== null && viewDetail.weight_salary !== undefined && viewDetail.weight_salary !== '') ? Number(viewDetail.weight_salary) : 5;
                                            const isCustomWeights = (viewDetail.weight_skills !== null && viewDetail.weight_skills !== undefined && viewDetail.weight_skills !== '');

                                            return (
                                                <div className="vd-form-section">
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                                                        <h3 className="vd-form-section-title" style={{ margin: 0 }}>
                                                            Candidate Scoring Formula &amp; Criteria
                                                        </h3>
                                                        <span style={{
                                                            background: isCustomWeights ? 'rgba(217, 119, 6, 0.08)' : 'rgba(15, 23, 42, 0.05)',
                                                            color: isCustomWeights ? '#b45309' : '#475569',
                                                            border: isCustomWeights ? '1px solid rgba(217, 119, 6, 0.25)' : '1px solid #e2e8f0',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 800,
                                                            padding: '3px 10px',
                                                            borderRadius: '20px',
                                                            letterSpacing: '0.04em',
                                                            textTransform: 'uppercase',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px'
                                                        }}>
                                                            <FiSliders size={12} /> {isCustomWeights ? 'Custom Vacancy Formula' : 'Standard Formula'}
                                                        </span>
                                                    </div>

                                                    {/* Formula Equation Banner */}
                                                    <div style={{
                                                        background: '#0f172a',
                                                        borderRadius: '12px',
                                                        padding: '14px 18px',
                                                        marginBottom: '14px',
                                                        borderLeft: '4px solid #7A1228',
                                                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)'
                                                    }}>
                                                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                                            AI MATCH CALCULATION FORMULA (100% SCALE)
                                                        </div>
                                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', lineHeight: '1.6', wordBreak: 'break-word' }}>
                                                            Score = <span style={{ color: '#f87171' }}>Skills × {wSkills}%</span> + <span style={{ color: '#93c5fd' }}>Experience × {wExp}%</span> + <span style={{ color: '#c084fc' }}>Qualifications × {wQual}%</span> + <span style={{ color: '#fbbf24' }}>JD Alignment × {wJd}%</span> + <span style={{ color: '#4ade80' }}>Salary × {wSal}%</span>
                                                        </div>
                                                    </div>

                                                    {/* 5 Weights Cards */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: viewDetail.required_skills ? '14px' : '0' }}>
                                                        
                                                        {/* Skills */}
                                                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>🎯 Skills</span>
                                                                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#7A1228' }}>{wSkills}%</span>
                                                            </div>
                                                            <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${Math.min(100, Math.max(0, wSkills))}%`, height: '100%', background: '#7A1228' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Resume skill match</span>
                                                        </div>

                                                        {/* Experience */}
                                                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>💼 Experience</span>
                                                                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{wExp}%</span>
                                                            </div>
                                                            <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${Math.min(100, Math.max(0, wExp))}%`, height: '100%', background: '#0f172a' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Tenure &amp; role history</span>
                                                        </div>

                                                        {/* Qualification */}
                                                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>🎓 Qualification</span>
                                                                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#4f46e5' }}>{wQual}%</span>
                                                            </div>
                                                            <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${Math.min(100, Math.max(0, wQual))}%`, height: '100%', background: '#4f46e5' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Degrees &amp; diplomas</span>
                                                        </div>

                                                        {/* JD Alignment */}
                                                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>📄 JD Fit</span>
                                                                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#d97706' }}>{wJd}%</span>
                                                            </div>
                                                            <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${Math.min(100, Math.max(0, wJd))}%`, height: '100%', background: '#d97706' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Role duties alignment</span>
                                                        </div>

                                                        {/* Salary */}
                                                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>💵 Salary</span>
                                                                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#16a34a' }}>{wSal}%</span>
                                                            </div>
                                                            <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${Math.min(100, Math.max(0, wSal))}%`, height: '100%', background: '#16a34a' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Budget compatibility</span>
                                                        </div>

                                                    </div>

                                                    {/* Evaluated Skills Badges */}
                                                    {viewDetail.required_skills && (
                                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px' }}>
                                                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <FiTarget size={13} style={{ color: '#7A1228' }} /> Mandatory / Evaluated Skills for this Role:
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {viewDetail.required_skills.split(',').map((skill, sIdx) => {
                                                                    const trimmed = skill.trim();
                                                                    if (!trimmed) return null;
                                                                    return (
                                                                        <span key={sIdx} style={{
                                                                            background: '#ffffff',
                                                                            color: '#0f172a',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 700,
                                                                            padding: '3px 10px',
                                                                            borderRadius: '16px',
                                                                            border: '1px solid #cbd5e1',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '5px',
                                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                                        }}>
                                                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7A1228' }}></span>
                                                                            {trimmed}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="vd-details-right">
                                        <div className="vd-form-section">
                                            <h3 className="vd-form-section-title">Position Specification Sheets</h3>
                                            <div className="vd-form-grid">
                                                <div className="vd-form-field full-width" style={{ marginBottom: '16px' }}>
                                                    <span className="vd-form-label">Roles & Responsibilities (Job Description)</span>
                                                    <div className="vd-form-value-textarea">
                                                        {viewDetail.description ? renderFormattedText(viewDetail.description) : <em className="vd-empty-note">No description provided.</em>}
                                                    </div>
                                                </div>
                                                {viewDetail.requirements && (
                                                    <div className="vd-form-field full-width requirements-card">
                                                        <span className="vd-form-label" style={{ color: 'var(--gold-accent)' }}>Candidate Profile & Qualifications (Requirements)</span>
                                                        <div className="vd-form-value-textarea">
                                                            {renderFormattedText(viewDetail.requirements)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="vd-details-layout">
                                    <div className="vd-details-left">
                                        {/* Approval Timeline */}
                                        {renderApprovalTimeline(viewDetail)}
                                    </div>

                                    <div className="vd-details-right">
                                        {/* Audit History Log */}
                                        <div className="vd-section" style={{ marginTop: '0px' }}>
                                            <h3 className="vd-section-title" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                color: '#0f172a',
                                                fontSize: '0.95rem',
                                                fontWeight: 800,
                                                borderBottom: '1.5px solid #e2e8f0',
                                                paddingBottom: '10px',
                                                marginBottom: '16px'
                                            }}>
                                                <FiActivity size={16} /> Requisition History Audit Trail
                                            </h3>
                                            <div className="vd-section-body-enhanced" style={{
                                                padding: '24px',
                                                background: '#f8fafc',
                                                borderRadius: '16px',
                                                border: '1.5px solid #e2e8f0',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.025)'
                                            }}>
                                                {loadingLogs ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 500 }}>
                                                        <div className="spinner-small" style={{ borderTopColor: '#475569' }}></div>
                                                        Retrieving log entries...
                                                    </div>
                                                ) : auditLogs.length === 0 ? (
                                                    <p style={{ margin: 0, fontStyle: 'italic', color: '#64748b', fontSize: '0.85rem' }}>No audit logs recorded for this vacancy.</p>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                        {auditLogs.map((log) => {
                                                            const actionLabels = {
                                                                initiated: 'Draft Initiated',
                                                                submitted: 'Requisition Submitted',
                                                                edited: 'Details Revised',
                                                                sub1_approved: 'Approved by Tier-1 Reviewer',
                                                                global_approved: 'Authorized by GS Admin',
                                                                rejected: 'Requisition Rejected'
                                                            };
                                                            const actionColors = {
                                                                initiated: '#64748b',
                                                                submitted: '#d97706',
                                                                edited: '#6b21a8',
                                                                sub1_approved: '#16a34a',
                                                                global_approved: '#16a34a',
                                                                rejected: '#dc2626'
                                                            };
                                                            return (
                                                                <div key={log.id} style={{ display: 'flex', gap: '14px', borderLeft: `3px solid ${actionColors[log.action] || '#cbd5e1'}`, paddingLeft: '14px' }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                                            <strong style={{ fontSize: '0.85rem', color: actionColors[log.action] || '#1e293b', fontWeight: 700 }}>
                                                                                {actionLabels[log.action] || log.action.toUpperCase()}
                                                                            </strong>
                                                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                                                                {log.created_at}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                                                                            By: <strong style={{ color: '#0f172a' }}>{log.admin_name}</strong> ({log.admin_role === 'super_admin' ? 'Super Admin' : log.admin_role === 'admin' ? 'GS Admin' : log.admin_role === 'sub_admin1' ? 'Sub Admin 1' : 'Sub Admin 2'})
                                                                        </div>
                                                                        {log.old_status && log.new_status && (
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                                                                Transition: <code style={{ background: '#e2e8f0', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem' }}>{log.old_status}</code> &rarr; <code style={{ background: '#e2e8f0', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem' }}>{log.new_status}</code>
                                                                            </div>
                                                                        )}
                                                                        {log.reason && (
                                                                            <div style={{
                                                                                marginTop: '8px',
                                                                                padding: '10px 14px',
                                                                                background: '#fff3f2',
                                                                                borderLeft: '4px solid #dc2626',
                                                                                borderRadius: '6px',
                                                                                fontSize: '0.8rem',
                                                                                fontStyle: 'italic',
                                                                                color: '#dc2626',
                                                                                fontWeight: 500,
                                                                                boxShadow: '0 1px 3px rgba(220,38,38,0.05)'
                                                                            }}>
                                                                                "{log.reason}"
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── MODAL FOOTER ── */}
                        <div className="vd-footer">
                            <button className="vd-btn cancel" onClick={() => setViewDetail(null)}>Close</button>
                            <button className="vd-btn primary" onClick={() => { setViewDetail(null); navigate(`/admin/applicants?vacancy_id=${viewDetail.id}`); }}>
                                <FiUsers size={14} /> View Applicants
                            </button>
                            {admin.role !== 'super_admin' && (
                                <button className="vd-btn gold" onClick={() => { setViewDetail(null); navigate(`/admin/vacancies/edit/${viewDetail.id}`); }}>
                                    <FiEdit2 size={14} /> Edit Vacancy
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Shortlisted Selection Modal */}
            {showAssignModal && (
                <div className="sam-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="sam-modal" onClick={e => e.stopPropagation()}>
                        <div className="sam-header">
                            <div className="sam-title-row">
                                <h3>Select Employee</h3>
                                <button className="sam-close-btn" onClick={() => setShowAssignModal(false)}>
                                    <FiX />
                                </button>
                            </div>
                            <p className="sam-subtitle">Assign a shortlisted candidate for <strong>{viewDetail.title}</strong></p>
                            
                            <div className="sam-search-bar">
                                <FiSearch className="sam-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or contact number..."
                                    value={searchCandidate}
                                    onChange={e => setSearchCandidate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="sam-body">
                            {loadingShortlisted ? (
                                <div className="sam-loading">
                                    <div className="spinner-p"></div>
                                    <p>Retrieving shortlisted candidates...</p>
                                </div>
                            ) : shortlistedCandidates.length === 0 ? (
                                <div className="sam-empty">
                                    <FiUsers size={32} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                                    <p className="sam-empty-title">No Shortlisted Candidates</p>
                                    <p className="sam-empty-text">No applicants have been shortlisted yet.</p>
                                </div>
                            ) : (() => {
                                const filtered = shortlistedCandidates.filter(c => 
                                    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchCandidate.toLowerCase()) ||
                                    c.email.toLowerCase().includes(searchCandidate.toLowerCase()) ||
                                    (c.contact_number && c.contact_number.includes(searchCandidate))
                                );
                                
                                if (filtered.length === 0) {
                                    return (
                                        <div className="sam-empty">
                                            <FiSearch size={28} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                                            <p className="sam-empty-title">No search matches</p>
                                            <p className="sam-empty-text">Try searching with a different keyword.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="sam-candidates-list">
                                        {filtered.map(c => {
                                            const isSelected = assigningAppId === c.id;
                                            return (
                                                <div 
                                                    key={c.id} 
                                                    className={`sam-candidate-item ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => setAssigningAppId(c.id)}
                                                >
                                                    <div className="sam-item-selection">
                                                        <input 
                                                            type="radio" 
                                                            name="assigning_candidate" 
                                                            checked={isSelected}
                                                            onChange={() => setAssigningAppId(c.id)}
                                                        />
                                                    </div>
                                                    <div className="sam-item-details">
                                                        <div className="sam-item-name">{c.first_name} {c.last_name}</div>
                                                        <div className="sam-item-meta">
                                                            <span>{c.email}</span>
                                                            <span className="sam-meta-divider">•</span>
                                                            <span>{c.contact_number}</span>
                                                            {c.vacancy_title && (
                                                                <>
                                                                    <span className="sam-meta-divider">•</span>
                                                                    <span className="sam-vacancy-badge" title={`Shortlisted vacancy: ${c.vacancy_title}`}>
                                                                        {c.vacancy_title}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="sam-check-icon">
                                                            <FiCheckCircle />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="sam-footer">
                            {(viewDetail.hired_application_id || viewDetail.selected_application_id) && (
                                <button 
                                    className="sam-btn danger" 
                                    onClick={() => setAssigningAppId(null)}
                                    style={{ marginRight: 'auto' }}
                                    title="Unassign current employee"
                                >
                                    Clear Assignment
                                </button>
                            )}
                            <button className="sam-btn secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                            <button 
                                className="sam-btn primary" 
                                onClick={handleConfirmAssignment}
                                disabled={loadingShortlisted || (assigningAppId === (viewDetail.selected_application_id || viewDetail.hired_application_id) && (viewDetail.selected_application_id || viewDetail.hired_application_id) !== null)}
                            >
                                Confirm Selection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                /* Details Modal Tab Navigation */
                .vd-tabs-header {
                    display: flex;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 0 24px;
                    gap: 4px;
                    flex-shrink: 0;
                }

                .vd-tab-btn {
                    padding: 10px 16px;
                    background: none;
                    border: none;
                    border-bottom: 3px solid transparent;
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #64748b;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                    font-family: var(--font-body);
                }

                .vd-tab-btn:hover {
                    color: var(--crimson);
                }

                .vd-tab-btn.active {
                    color: var(--crimson);
                    border-bottom-color: var(--crimson);
                    background: #fff;
                }

                @media (max-width: 768px) {
                    .vd-tabs-header {
                        padding: 0 20px;
                    }
                    .vd-tab-btn {
                        padding: 12px 14px;
                        font-size: 0.8rem;
                    }
                }

                .vd-form-section {
                    margin-bottom: 24px;
                    background: #fff;
                    border: 1px solid #f1f5f9;
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.01);
                }

                .vd-form-section-title {
                    font-family: var(--font-heading);
                    font-size: 0.95rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 18px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    position: relative;
                }

                .vd-form-section-title::before {
                    content: "";
                    display: inline-block;
                    width: 3px;
                    height: 14px;
                    background: var(--crimson);
                    border-radius: 1.5px;
                }

                .vd-form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px 20px;
                }

                @media (max-width: 600px) {
                    .vd-form-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .vd-form-field {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 14px;
                    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
                    border: 1.5px solid #f1f5f9;
                    border-radius: 14px;
                    padding: 12px 16px 12px 20px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
                    position: relative;
                    overflow: hidden;
                }

                .vd-form-field:hover {
                    border-color: rgba(139, 26, 43, 0.15);
                    box-shadow: 0 12px 24px rgba(139, 26, 43, 0.05), 0 2px 4px rgba(139, 26, 43, 0.02);
                    transform: translateY(-3px);
                }

                .vd-form-field::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: var(--crimson);
                    transition: all 0.3s ease;
                }

                .vd-form-field:hover::before {
                    width: 6px;
                }

                .vd-form-field.requirements-card:hover {
                    border-color: rgba(200, 169, 81, 0.25);
                    box-shadow: 0 12px 24px rgba(200, 169, 81, 0.06), 0 2px 4px rgba(200, 169, 81, 0.02);
                }

                .vd-field-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: rgba(139, 26, 43, 0.04);
                    color: var(--crimson);
                    font-size: 1.15rem;
                    flex-shrink: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .vd-form-field:hover .vd-field-icon {
                    background: var(--crimson);
                    color: #ffffff;
                    transform: scale(1.05);
                }

                .vd-form-field.requirements-card:hover .vd-field-icon {
                    background: var(--gold-accent);
                    color: #ffffff;
                    box-shadow: 0 4px 10px rgba(200, 169, 81, 0.2);
                }

                .vd-field-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    flex: 1;
                    text-align: left;
                }

                .vd-form-field.full-width {
                    grid-column: span 2;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 10px;
                    padding: 20px 20px 20px 24px;
                    border-radius: 16px;
                    position: relative;
                    overflow: hidden;
                    border: 1.5px solid #f1f5f9;
                }

                .vd-form-field.full-width::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: var(--crimson);
                    transition: all 0.3s ease;
                }

                .vd-form-field.full-width:hover::before {
                    width: 6px;
                }

                .vd-form-field.requirements-card::before {
                    background: var(--gold-accent);
                }

                @media (max-width: 600px) {
                    .vd-form-field.full-width {
                        grid-column: span 1;
                    }
                }

                .vd-form-label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }

                .vd-form-value {
                    padding: 0;
                    background: transparent;
                    border: none;
                    border-radius: 0;
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: #1e293b;
                    min-height: auto;
                    display: flex;
                    align-items: center;
                    transition: none;
                    box-shadow: none;
                }

                .vd-form-value:hover {
                    background: transparent;
                    border-color: transparent;
                    box-shadow: none;
                }

                .vd-period-date {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.82rem;
                    color: #475569;
                    font-weight: 700;
                    background: rgba(139, 26, 43, 0.03);
                    border: 1px solid rgba(139, 26, 43, 0.08);
                    padding: 4px 10px;
                    border-radius: 8px;
                    transition: all 0.25s ease;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .vd-form-field:hover .vd-period-date {
                    background: rgba(139, 26, 43, 0.05);
                    border-color: rgba(139, 26, 43, 0.15);
                }

                .vd-period-date .inline-icon {
                    font-size: 0.85rem;
                    color: var(--crimson);
                    opacity: 0.85;
                }

                .vd-period-arrow {
                    color: var(--gold-accent);
                    margin: 0 6px;
                    font-weight: 800;
                    font-size: 1.05rem;
                    display: inline-block;
                    transition: all 0.25s ease;
                }

                .vd-form-field:hover .vd-period-arrow {
                    transform: translateX(3px);
                }

                .vd-form-field.col-span-2 {
                    grid-column: span 2;
                }

                @media (max-width: 600px) {
                    .vd-form-field.col-span-2 {
                        grid-column: span 1;
                    }
                }

                .vd-form-value-textarea {
                    padding: 14px 18px;
                    background: #f8fafc;
                    border: 1px solid #f1f5f9;
                    border-radius: 10px;
                    font-size: 0.88rem;
                    color: #334155;
                    line-height: 1.65;
                    transition: all 0.2s ease;
                    max-height: 350px;
                    overflow-y: auto;
                    text-align: left;
                }

                .vd-form-value-textarea:hover {
                    background: #ffffff;
                    border-color: rgba(139, 26, 43, 0.1);
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.01);
                }

                /* Custom Scrollbar for Textareas */
                .vd-form-value-textarea::-webkit-scrollbar {
                    width: 6px;
                }

                .vd-form-value-textarea::-webkit-scrollbar-track {
                    background: transparent;
                }

                .vd-form-value-textarea::-webkit-scrollbar-thumb {
                    background: rgba(139, 26, 43, 0.12);
                    border-radius: 3px;
                }

                .vd-form-value-textarea::-webkit-scrollbar-thumb:hover {
                    background: var(--crimson);
                }

                .vd-form-field-empty {
                    grid-column: span 2;
                }

                .vd-form-field-action {
                    grid-column: span 2;
                    display: flex;
                    justify-content: center;
                    margin-top: 4px;
                }

                .vd-emp-btn {
                    border: none;
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                    font-family: var(--font-body);
                }
                .vd-emp-btn.assign {
                    background: #10b981;
                    color: #fff;
                    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2);
                }
                .vd-emp-btn.assign:hover {
                    background: #059669;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
                }
                .vd-emp-btn.change {
                    background: #10b981;
                    color: #fff;
                    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.15);
                }
                .vd-emp-btn.change:hover {
                    background: #059669;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
                }
                .table-emp-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(16, 185, 129, 0.06);
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    padding: 3px 8px;
                    border-radius: 6px;
                    font-size: 0.72rem;
                    color: #10b981;
                    font-weight: 700;
                    margin-top: 6px;
                    width: fit-content;
                }
                .te-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #10b981;
                }

                /* Skills column pills */
                .skills-cell {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                    max-width: 180px;
                }

                .skill-pill {
                    display: inline-block;
                    padding: 3px 9px;
                    background: linear-gradient(135deg, rgba(139,26,43,0.07), rgba(139,26,43,0.03));
                    border: 1px solid rgba(139,26,43,0.18);
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--crimson);
                    white-space: nowrap;
                }

                .skill-pill-more {
                    display: inline-block;
                    padding: 3px 9px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #64748b;
                }

                .no-skills {
                    color: #cbd5e1;
                    font-size: 0.85rem;
                }

                /* Selection Modal */
                .sam-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1100;
                    padding: 20px;
                    animation: fadeIn 0.25s ease-out;
                }
                .sam-modal {
                    background: #fff;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 580px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 30px 70px rgba(0,0,0,0.15);
                    animation: zoomInSpring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    border: 1px solid rgba(0,0,0,0.04);
                }
                .sam-header {
                    padding: 24px 28px 18px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .sam-title-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 6px;
                }
                .sam-title-row h3 {
                    font-family: var(--font-heading);
                    font-size: 1.35rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0;
                }
                .sam-close-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    background: #f1f5f9;
                    border: none;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                }
                .sam-close-btn:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }
                .sam-subtitle {
                    font-size: 0.85rem;
                    color: #64748b;
                    margin: 0 0 16px 0;
                }
                .sam-search-bar {
                    position: relative;
                    width: 100%;
                }
                .sam-search-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    font-size: 1rem;
                }
                .sam-search-bar input {
                    width: 100%;
                    padding: 10px 16px 10px 40px;
                    border-radius: 12px;
                    border: 1.5px solid #f1f5f9;
                    background: #f8fafc;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                }
                .sam-search-bar input:focus {
                    outline: none;
                    background: #fff;
                    border-color: #10b981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
                }
                .sam-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px 28px;
                }
                .sam-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 0;
                    gap: 12px;
                    color: #64748b;
                    font-size: 0.88rem;
                }
                .sam-empty {
                    text-align: center;
                    padding: 40px 0;
                }
                .sam-empty-title {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #475569;
                    margin: 0 0 4px 0;
                }
                .sam-empty-text {
                    font-size: 0.85rem;
                    color: #94a3b8;
                    margin: 0;
                }
                .sam-candidates-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .sam-candidate-item {
                    display: flex;
                    align-items: center;
                    padding: 14px 18px;
                    border-radius: 16px;
                    border: 1.5px solid #f1f5f9;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    gap: 14px;
                }
                .sam-candidate-item:hover {
                    border-color: rgba(16, 185, 129, 0.25);
                    background: rgba(16, 185, 129, 0.01);
                }
                .sam-candidate-item.selected {
                    border-color: #10b981;
                    background: rgba(16, 185, 129, 0.04);
                }
                .sam-item-selection input {
                    cursor: pointer;
                    accent-color: #10b981;
                    width: 16px;
                    height: 16px;
                }
                .sam-item-details {
                    flex: 1;
                }
                .sam-item-name {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 2px;
                }
                .sam-item-meta {
                    display: flex;
                    gap: 8px;
                    font-size: 0.78rem;
                    color: #64748b;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .sam-meta-divider {
                    color: #cbd5e1;
                }
                .sam-vacancy-badge {
                    background: #f1f5f9;
                    color: #475569;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    max-width: 120px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .sam-check-icon {
                    color: #10b981;
                    font-size: 1.25rem;
                    display: flex;
                }
                .sam-footer {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 12px;
                    padding: 18px 28px;
                    border-top: 1px solid #f1f5f9;
                    background: #fcfcfd;
                }
                .sam-btn {
                    padding: 9px 18px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: var(--font-body);
                    border: none;
                }
                .sam-btn.secondary {
                    background: transparent;
                    border: 1.5px solid #e2e8f0;
                    color: #64748b;
                }
                .sam-btn.secondary:hover {
                    background: #f8fafc;
                }
                .sam-btn.primary {
                    background: #10b981;
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                }
                .sam-btn.primary:hover:not(:disabled) {
                    background: #059669;
                    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
                }
                .sam-btn.primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    box-shadow: none;
                }
                .sam-btn.danger {
                    background: #fee2e2;
                    color: #dc2626;
                    border: 1.5px solid #fecaca;
                }
                .sam-btn.danger:hover {
                    background: #fecaca;
                }

                .manage-vacancies-console {
                    padding: 8px 0;
                    animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }

                /* ORCHESTRATION HEADER - MINIMALIST */
                .vacancies-orchestration-header {
                    background: linear-gradient(135deg, #7A1528 0%, #4D0A14 100%);
                    border-radius: 16px;
                    padding: 24px 30px;
                    margin-bottom: 20px;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
                }

                .console-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255, 255, 255, 0.12);
                    padding: 4px 12px;
                    border-radius: 100px;
                    font-size: 0.62rem;
                    font-weight: 700;
                    letter-spacing: 1px;
                    color: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    margin-bottom: 10px;
                }

                .serif-title-p {
                    font-family: var(--font-heading), 'Playfair Display', serif;
                    font-size: 1.75rem;
                    color: #ffffff;
                    font-weight: 700;
                    letter-spacing: -0.3px;
                    margin-bottom: 6px;
                    line-height: 1.1;
                }

                .hero-subline {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.82rem;
                    max-width: 520px;
                    margin: 0;
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

                /* REFINED MINIMALIST TOOLBAR */
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
                    gap: 10px;
                    align-items: center;
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
                    z-index: 10;
                }

                .search-orchestrator input {
                    width: 100%;
                    padding: 10px 16px 10px 42px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    font-size: 0.86rem;
                    color: #0f172a;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    box-shadow: none;
                }

                .search-orchestrator input:focus {
                    outline: none;
                    background: #ffffff;
                    border-color: #8B1A2B;
                    box-shadow: 0 0 0 3px rgba(139, 26, 43, 0.08);
                }

                .btn-reset-p {
                    background: #ffffff;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                    padding: 0 16px;
                    height: 40px;
                    border-radius: 10px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                    flex-shrink: 0;
                }

                .btn-reset-p:hover {
                    background: #fef2f2;
                    color: #dc2626;
                    border-color: #fecaca;
                }

                .toolbar-filters-row {
                    display: flex;
                    flex-direction: row;
                    align-items: flex-end;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    min-width: 0;
                    box-sizing: border-box;
                }

                .filter-group label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 2px;
                }

                .select-orchestrator {
                    position: relative;
                    min-width: 0;
                    box-sizing: border-box;
                }

                .f-icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #8B1A2B;
                    pointer-events: none;
                    z-index: 10;
                    font-size: 0.88rem;
                }

                .select-orchestrator select {
                    box-sizing: border-box;
                    padding: 0 22px 0 32px;
                    height: 40px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    font-size: 0.82rem;
                    font-weight: 600;
                    appearance: none;
                    cursor: pointer;
                    color: #0f172a;
                    transition: all 0.2s;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }

                .select-orchestrator select:focus {
                    outline: none;
                    border-color: #8B1A2B;
                    background: #ffffff;
                    box-shadow: 0 0 0 3px rgba(139, 26, 43, 0.08);
                }

                .select-lg { min-width: 200px; }

                /* ── CONFIRM / DELETE MODAL ── */
                .confirm-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                    animation: fadeIn 0.25s ease-out;
                }

                .confirm-modal {
                    background: #fff;
                    padding: 40px 36px;
                    border-radius: 28px;
                    width: 100%;
                    max-width: 450px;
                    text-align: center;
                    box-shadow: 0 32px 80px rgba(0,0,0,0.12);
                    animation: zoomInSpring 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    border: 1px solid rgba(0,0,0,0.04);
                }

                @keyframes zoomInSpring {
                    from { opacity: 0; transform: scale(0.88); }
                    to   { opacity: 1; transform: scale(1); }
                }

                .warning-visual {
                    width: 76px;
                    height: 76px;
                    background: rgba(139,26,43,0.07);
                    color: var(--crimson);
                    border-radius: 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.2rem;
                    margin: 0 auto 28px;
                    border: 1px solid rgba(139,26,43,0.1);
                }

                .confirm-modal h3 {
                    font-family: var(--font-heading);
                    font-size: 1.7rem;
                    margin-bottom: 12px;
                    font-weight: 800;
                    color: #1e293b;
                }
                .confirm-modal p {
                    color: #94a3b8;
                    line-height: 1.65;
                    margin-bottom: 36px;
                    font-size: 0.9rem;
                }

                .modal-actions-p { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
                .btn-secondary-p {
                    padding: 14px;
                    border-radius: 14px;
                    border: 1.5px solid #e2e8f0;
                    background: #fff;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: var(--font-body);
                    color: #475569;
                    font-size: 0.9rem;
                }
                .btn-secondary-p:hover { background: #f8fafc; border-color: #94a3b8; }
                .btn-danger-p {
                    padding: 14px;
                    border-radius: 14px;
                    border: none;
                    background: var(--crimson);
                    color: #fff;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: var(--font-body);
                    font-size: 0.9rem;
                }
                .btn-danger-p:hover { background: #6B1420; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(139,26,43,0.3); }

                /* ── VACANCY DETAIL MODAL ── */
                .vd-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.5);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    z-index: 1000;
                    padding: 40px 20px;
                    overflow-y: auto;
                    animation: fadeIn 0.25s ease-out;
                }
                .vd-modal {
                    background: #fff;
                    border-radius: 28px;
                    width: 95%;
                    max-width: 1400px;
                    height: auto;
                    max-height: none;
                    display: flex;
                    flex-direction: column;
                    overflow: visible;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.18);
                    animation: zoomInSpring 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    border: 1px solid rgba(0,0,0,0.04);
                }

                /* HEADER */
                .vd-header {
                    background: linear-gradient(135deg, #1a0208 0%, #2a050b 45%, #3d0813 100%);
                    padding: 10px 24px 8px;
                    position: relative;
                    overflow: hidden;
                    flex-shrink: 0;
                    border-radius: 30px 30px 0 0;
                }

                .vd-header-glow {
                    position: absolute;
                    top: -60px;
                    right: -60px;
                    width: 260px;
                    height: 260px;
                    background: radial-gradient(circle, rgba(200,169,81,0.25) 0%, transparent 70%);
                    pointer-events: none;
                }

                .vd-header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    position: relative;
                    z-index: 2;
                }

                .vd-status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.14);
                    padding: 5px 14px;
                    border-radius: 100px;
                    font-size: 0.62rem;
                    font-weight: 800;
                    color: rgba(255,255,255,0.8);
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                }

                .vd-status-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                .vd-status-dot.live  { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.6); animation: orbPulse 2s infinite; }
                .vd-status-dot.ended { background: #94a3b8; }

                .vd-close-btn {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.18);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.05rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0;
                }
                .vd-close-btn:hover {
                    background: rgba(255,255,255,0.22);
                    transform: rotate(90deg) scale(1.08);
                    box-shadow: 0 0 15px rgba(255, 255, 255, 0.15);
                }

                .vd-title {
                    font-family: var(--font-heading);
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: #fff;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.3px;
                    line-height: 1.2;
                    position: relative;
                    z-index: 2;
                }

                .vd-company-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                    position: relative;
                    z-index: 2;
                }

                .vd-company-logo {
                    width: 26px;
                    height: 26px;
                    object-fit: contain;
                    border-radius: 6px;
                    background: #fff;
                    border: 2px solid rgba(255,255,255,0.2);
                    padding: 2px;
                    flex-shrink: 0;
                }

                .vd-company-name {
                    color: rgba(255,255,255,0.7);
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .vd-pills {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    position: relative;
                    z-index: 2;
                }

                .vd-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.82);
                    padding: 5px 13px;
                    border-radius: 100px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .vd-pill.ref {
                    background: rgba(200,169,81,0.15);
                    color: #C8A951;
                    border-color: rgba(200,169,81,0.3);
                    font-family: 'JetBrains Mono', monospace;
                    letter-spacing: 0.5px;
                }

                /* BODY */
                .vd-body {
                    flex: 1;
                    overflow: visible;
                    padding: 16px 24px;
                }

                .vd-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 14px;
                    margin-bottom: 28px;
                }

                .vd-meta-item {
                    background: #f8fafc;
                    border: 1px solid #f1f5f9;
                    border-radius: 16px;
                    padding: 16px 18px;
                    transition: all 0.2s;
                }
                .vd-meta-item:hover {
                    background: #fff;
                    border-color: #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
                }

                .vd-meta-label {
                    display: block;
                    font-size: 0.62rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    margin-bottom: 7px;
                }

                .vd-meta-value {
                    margin: 0;
                    font-weight: 700;
                    color: #1e293b;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .vd-meta-value.urgent { color: var(--crimson); }

                .vd-section { margin-bottom: 24px; }

                .vd-section-title {
                    font-family: var(--font-heading);
                    font-size: 1.05rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0 0 14px 0;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }
                .vd-section-title svg { color: var(--crimson); }
                .vd-section-title.gold svg { color: var(--gold-accent, #C8A951); }

                .vd-section-body-enhanced {
                    background: #fff;
                    border: 1px solid #e9eef5;
                    border-radius: 20px;
                    padding: 24px 28px;
                    line-height: 1.8;
                    color: #475569;
                    font-size: 0.92rem;
                    transition: all 0.2s;
                }
                .vd-section-body-enhanced:hover {
                    border-color: #d1d9e6;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                }
                .vd-section-body-enhanced.green {
                    background: rgba(16, 185, 129, 0.01);
                }

                .formatted-list {
                    margin: 14px 0;
                    padding-left: 0;
                    list-style: none;
                }
                .formatted-list li {
                    position: relative;
                    margin-bottom: 10px;
                    padding-left: 24px;
                    line-height: 1.6;
                }
                .formatted-list li::before {
                    content: "•";
                    position: absolute;
                    left: 4px;
                    color: var(--crimson);
                    font-weight: 800;
                    font-size: 1.2rem;
                    line-height: 1;
                }
                .vd-section-body-enhanced.green .formatted-list li::before {
                    color: #10b981;
                }

                .formatted-heading {
                    font-weight: 800;
                    color: #1e293b;
                    margin: 20px 0 10px 0;
                    font-size: 0.95rem;
                    letter-spacing: -0.2px;
                    text-transform: uppercase;
                }
                .formatted-paragraph {
                    margin-bottom: 14px;
                }
                .formatted-spacer {
                    height: 14px;
                }

                .vd-empty-note {
                    color: #94a3b8;
                    font-style: italic;
                    font-size: 0.88rem;
                }

                /* FOOTER */
                .vd-footer {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 12px;
                    padding: 18px 28px;
                    border-top: 1px solid #f1f5f9;
                    background: #fcfcfd;
                    flex-shrink: 0;
                }

                .vd-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 22px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                    font-family: var(--font-body);
                    border: none;
                }
                .vd-btn:hover { transform: translateY(-2px); }

                .vd-btn.cancel {
                    background: transparent;
                    border: 1.5px solid #e2e8f0;
                    color: #64748b;
                }
                .vd-btn.cancel:hover { background: #f8fafc; border-color: #94a3b8; transform: none; }

                .vd-btn.primary {
                    background: var(--crimson);
                    color: #fff;
                    box-shadow: 0 4px 16px rgba(139,26,43,0.25);
                }
                .vd-btn.primary:hover { background: #6B1420; box-shadow: 0 8px 24px rgba(139,26,43,0.35); }

                .vd-btn.gold {
                    background: linear-gradient(135deg, #C8A951, #d4b86a);
                    color: #1a1a2e;
                    box-shadow: 0 4px 16px rgba(200,169,81,0.3);
                }
                .vd-btn.gold:hover { box-shadow: 0 8px 24px rgba(200,169,81,0.4); }

                @media (max-width: 640px) {
                    .vd-meta-grid { grid-template-columns: repeat(2, 1fr); }
                    .vd-title { font-size: 1.5rem; }
                    .vd-header { padding: 24px 20px 20px; }
                    .vd-body { padding: 20px; }
                    .vd-footer { flex-direction: column; align-items: stretch; }
                    .vd-btn { justify-content: center; }
                }                .vd-details-layout {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr;
                    gap: 24px;
                    align-items: start;
                    width: 100%;
                }

                .vd-details-left {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .vd-details-right {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    height: 100%;
                }

                @media (max-width: 1024px) {
                    .vd-details-layout {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                }

                /* RESPONSIVENESS */
                @media (max-width: 1024px) {
                    .vacancies-orchestration-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 16px;
                        padding: 20px;
                        border-radius: 16px;
                    }
                    
                    .serif-title-p { font-size: 1.9rem; }
                    
                    .stats-mosaic-p {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .console-toolbar-p {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                        padding: 16px;
                    }

                    .toolbar-search-row {
                        flex-wrap: wrap;
                        width: 100%;
                    }
                    
                    .search-orchestrator {
                        max-width: 100%;
                        width: 100%;
                    }

                    .btn-reset-p { flex-shrink: 0; }
                    
                    .select-orchestrator select {
                        width: 100%;
                    }

                    .toolbar-filters-row {
                        width: 100%;
                    }

                    .filter-group {
                        width: 100%;
                    }

                    .select-orchestrator {
                        width: 100%;
                    }
                }

                @media (max-width: 768px) {
                    .vacancies-orchestration-header {
                        padding: 16px;
                        gap: 14px;
                        border-radius: 14px;
                        margin-bottom: 16px;
                    }

                    .serif-title-p { font-size: 1.5rem; }

                    .hero-subline { font-size: 0.82rem; }

                    .stats-mosaic-p {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                        margin-bottom: 16px;
                    }

                    .mosaic-card-p {
                        padding: 14px;
                        gap: 8px;
                    }

                    .m-value { font-size: 1.3rem; }

                    .console-toolbar-p {
                        padding: 14px;
                        gap: 10px;
                        border-radius: 14px;
                        margin-bottom: 16px;
                    }

                    .orchestration-table-wrapper {
                        border-radius: 14px;
                    }

                    /* On mobile, make the premium table horizontally scrollable with min size */
                    .premium-table-container {
                        overflow-x: auto;
                        border-radius: 12px;
                    }

                    .premium-table {
                        min-width: 1320px;
                        table-layout: fixed;
                    }

                    .premium-table th,
                    .premium-table td {
                        padding: 10px 8px;
                        font-size: 0.75rem;
                    }

                    .orchestration-actions {
                        justify-content: flex-start;
                    }

                    .o-btn {
                        width: 28px !important;
                        height: 28px !important;
                        font-size: 0.8rem !important;
                    }

                    .pagination-footer {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                        padding: 12px 14px;
                    }
                }

                @media (max-width: 480px) {
                    .stats-mosaic-p {
                        grid-template-columns: 1fr 1fr;
                    }
                    
                    .serif-title-p { font-size: 1.3rem; }

                    .console-badge { font-size: 0.55rem; }

                    .btn-establish-p span { display: none; }
                    .btn-establish-p { padding: 10px 14px; }
                }
            `}</style>
        </div>
    );
}

export default ManageVacancies;
