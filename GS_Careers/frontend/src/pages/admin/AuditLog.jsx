import useHorizontalDragScroll from '../../utils/useHorizontalDragScroll';
import { useState, useEffect } from 'react';
import { getAllVacancyAuditLogs } from '../../services/api';
import { formatDateTime } from '../../utils/constants';
import { 
    FiActivity, FiSearch, FiClock, FiUser, FiBriefcase, FiAlertCircle, 
    FiCheckCircle, FiXCircle, FiCalendar, FiUsers, FiTag, FiBook, 
    FiRotateCcw, FiFilter, FiChevronDown, FiChevronUp, FiX, FiSliders, 
    FiShield, FiUserCheck, FiFileText, FiLayers, FiEye, FiDownload, 
    FiArrowRight, FiInfo, FiKey
} from 'react-icons/fi';

function AuditLog({ admin }) {
    const tableDragScroll = useHorizontalDragScroll();
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        recruitment: 0,
        candidate: 0,
        settings: 0,
        user_management: 0,
        security: 0
    });
    const [loading, setLoading] = useState(true);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 'all', 'today', '7days', '30days'
    const [myActivityOnly, setMyActivityOnly] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Modal state for Before vs After Diff
    const [selectedDiffLog, setSelectedDiffLog] = useState(null);

    const isSuperAdmin = admin?.role === 'super_admin';
    const isHrAdmin = admin?.role === 'admin';
    const isSubAdmin = admin?.role === 'sub_admin1' || admin?.role === 'sub_admin2' || admin?.role === 'sub_admin';

    useEffect(() => {
        loadAuditLogs();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedDiffLog(null);
        };
        if (selectedDiffLog) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDiffLog]);

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            const res = await getAllVacancyAuditLogs();
            const data = res.data?.data;
            if (Array.isArray(data)) {
                setLogs(data);
            } else if (data && Array.isArray(data.logs)) {
                setLogs(data.logs);
                if (data.summary) setSummary(data.summary);
            } else {
                setLogs([]);
            }
        } catch (err) {
            console.error('Failed to retrieve audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter logs based on UI filters
    const filteredLogs = logs.filter(log => {
        const query = searchTerm.toLowerCase();
        const matchesSearch = 
            (log.entity_name && log.entity_name.toLowerCase().includes(query)) ||
            (log.details && log.details.toLowerCase().includes(query)) ||
            (log.display_admin_name && log.display_admin_name.toLowerCase().includes(query)) ||
            (log.admin_name && log.admin_name.toLowerCase().includes(query)) ||
            (log.action && log.action.toLowerCase().includes(query)) ||
            (log.company_name && log.company_name.toLowerCase().includes(query));

        const matchesCategory = categoryFilter === '' || log.category === categoryFilter;
        const matchesMyActivity = !myActivityOnly || String(log.admin_id) === String(admin?.id);
        const matchesAction = actionFilter === '' || log.action === actionFilter;
        const matchesRole = roleFilter === '' || (log.display_admin_role || log.admin_role) === roleFilter;
        const matchesCompany = companyFilter === '' || log.company_name === companyFilter;

        // Date filter
        let matchesDate = true;
        if (dateRangeFilter !== 'all' && log.created_at) {
            const logDate = new Date(log.created_at);
            const now = new Date();
            if (dateRangeFilter === 'today') {
                matchesDate = logDate.toDateString() === now.toDateString();
            } else if (dateRangeFilter === '7days') {
                const diffTime = Math.abs(now - logDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                matchesDate = diffDays <= 7;
            } else if (dateRangeFilter === '30days') {
                const diffTime = Math.abs(now - logDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                matchesDate = diffDays <= 30;
            }
        }

        return matchesSearch && matchesCategory && matchesMyActivity && matchesAction && matchesRole && matchesCompany && matchesDate;
    });

    const uniqueCompanies = Array.from(new Set(logs.map(log => log.company_name).filter(Boolean)));
    const uniqueActions = Array.from(new Set(logs.map(log => log.action).filter(Boolean)));
    const uniqueRoles = Array.from(new Set(logs.map(log => log.display_admin_role || log.admin_role).filter(Boolean)));

    const getCategoryBadge = (category) => {
        const config = {
            recruitment: { label: 'Recruitment', bg: '#eff6ff', color: '#1d4ed8', border: '#dbeafe', icon: <FiBriefcase /> },
            candidate: { label: 'Candidate', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: <FiUsers /> },
            settings: { label: 'Settings & Weights', bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8', icon: <FiSliders /> },
            user_management: { label: 'User Admin', bg: '#faf5ff', color: '#7e22ce', border: '#f3e8ff', icon: <FiUserCheck /> },
            security: { label: 'Security', bg: '#fefce8', color: '#a16207', border: '#fef08a', icon: <FiShield /> }
        };
        const c = config[category] || { label: category || 'General', bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: <FiActivity /> };
        return (
            <span style={{
                background: c.bg,
                color: c.color,
                border: `1px solid ${c.border}`,
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
            }}>
                {c.icon} {c.label}
            </span>
        );
    };

    const getActionBadge = (action) => {
        const config = {
            // Settings & System
            update_weights: { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8', label: 'Weights Changed', icon: <FiSliders /> },
            update_thresholds: { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', label: 'Cutoffs Updated', icon: <FiSliders /> },
            update_settings: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: 'Settings Updated', icon: <FiActivity /> },
            // Security & Auth
            admin_login: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Admin Login', icon: <FiKey /> },
            change_password: { bg: '#fefce8', color: '#a16207', border: '#fef08a', label: 'Password Changed', icon: <FiKey /> },
            // User Management
            create_admin: { bg: '#eff6ff', color: '#1d4ed8', border: '#dbeafe', label: 'Admin Created', icon: <FiUserCheck /> },
            update_admin: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Admin Updated', icon: <FiUserCheck /> },
            delete_admin: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', label: 'Admin Deleted', icon: <FiXCircle /> },
            // Recruitment & Vacancies
            initiated: { bg: '#eff6ff', color: '#1d4ed8', border: '#dbeafe', label: 'Draft Initiated', icon: <FiFileText /> },
            submitted: { bg: '#faf5ff', color: '#6b21a8', border: '#f3e8ff', label: 'Submitted Approval', icon: <FiBriefcase /> },
            edited: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: 'Vacancy Edited', icon: <FiFileText /> },
            sub1_approved: { bg: '#fffbeb', color: '#b45309', border: '#fef3c7', label: 'Sub1 Approved', icon: <FiCheckCircle /> },
            global_approved: { bg: '#ecfdf5', color: '#047857', border: '#d1fae5', label: 'Published & Live', icon: <FiCheckCircle /> },
            approved: { bg: '#ecfdf5', color: '#047857', border: '#d1fae5', label: 'Approved', icon: <FiCheckCircle /> },
            rejected: { bg: '#fff1f2', color: '#be123c', border: '#ffe4e6', label: 'Requisition Rejected', icon: <FiXCircle /> },
            // Candidates
            candidate_shortlisted: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', label: 'Shortlisted', icon: <FiCheckCircle /> },
            candidate_under_review: { bg: '#f0fdfa', color: '#0f766e', border: '#ccfbf1', label: 'Under Review', icon: <FiActivity /> },
            candidate_rejected: { bg: '#fff1f2', color: '#be123c', border: '#ffe4e6', label: 'Candidate Rejected', icon: <FiXCircle /> },
            interview_scheduled: { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', label: 'Interview Scheduled', icon: <FiCalendar /> },
            interview_confirmed_yes: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Interview Confirmed', icon: <FiCheckCircle /> },
            interview_confirmed_no: { bg: '#fff1f2', color: '#be123c', border: '#ffe4e6', label: 'Interview Declined', icon: <FiXCircle /> },
            candidate_hired: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Candidate Hired', icon: <FiUsers /> },
            candidate_unassigned: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'Hired Unassigned', icon: <FiUsers /> },
            download_cv: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', label: 'CV Download (PDPA)', icon: <FiDownload /> }
        };

        const c = config[action] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: action.replace(/_/g, ' '), icon: <FiActivity /> };
        return (
            <span style={{
                background: c.bg,
                color: c.color,
                border: `1px solid ${c.border}`,
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
            }}>
                {c.icon} {c.label}
            </span>
        );
    };

    const getRoleBadge = (role) => {
        const mapping = {
            super_admin: { label: 'Super Admin', color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
            admin: { label: 'GS Admin (HR)', color: '#1d4ed8', bg: '#eff6ff', border: '#dbeafe' },
            sub_admin1: { label: 'Sub Admin 1', color: '#b45309', bg: '#fffbeb', border: '#fef3c7' },
            sub_admin2: { label: 'Sub Admin 2', color: '#6d28d9', bg: '#f5f3ff', border: '#ede9fe' },
            system: { label: 'System', color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' }
        };
        const r = mapping[role] || { label: role || 'User', color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };
        return (
            <span style={{
                background: r.bg,
                color: r.color,
                border: `1px solid ${r.border}`,
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 700
            }}>
                {r.label}
            </span>
        );
    };

    // Helper to render JSON diff cleanly
    const parseValues = (val) => {
        if (!val) return null;
        try {
            return typeof val === 'object' ? val : JSON.parse(val);
        } catch (e) {
            return val;
        }
    };

    return (
        <div className="audit-log-page" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            
            {/* ── HERO BANNER ── */}
            <div className="dashboard-hero-premium" style={{ marginBottom: '20px' }}>
                <div className="hero-content-p">
                    <div className="hero-badge-p">
                        <FiActivity /> Multi-Tier Activity Audit Trail
                    </div>
                    <h1 className="hero-title-p">Audit &amp; Compliance Logs</h1>
                    <p className="hero-subtitle-p">
                        {isSuperAdmin && 'Complete organizational audit trail. Monitor 100% of recruitment workflows, candidate progressions, formula weights, and security logs.'}
                        {isHrAdmin && 'HR operational audit trail. Track candidate status changes, interview communications, and job requisition lifecycles.'}
                        {isSubAdmin && `Departmental audit trail for ${admin?.company_name || 'assigned subsidiary'}. Track candidate screening notes and review history.`}
                    </p>
                </div>
                <div style={{
                    position: 'absolute',
                    top: '-100px', right: '-100px',
                    width: '450px', height: '450px',
                    background: 'radial-gradient(circle, rgba(200, 169, 81, 0.1) 0%, transparent 70%)',
                    zIndex: 1,
                    pointerEvents: 'none'
                }}></div>
            </div>

            {/* ── STATS OVERVIEW CARDS ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                marginBottom: '20px'
            }}>
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(122, 18, 40, 0.08)', color: '#7A1228', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                        <FiActivity />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Logged Events</div>
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>{summary.total || logs.length}</div>
                    </div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                        <FiBriefcase />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recruitment Actions</div>
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>{summary.recruitment || logs.filter(l => l.category === 'recruitment').length}</div>
                    </div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                        <FiUsers />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Candidate Progressions</div>
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>{summary.candidate || logs.filter(l => l.category === 'candidate').length}</div>
                    </div>
                </div>

                {isSuperAdmin && (
                    <div style={{
                        background: '#ffffff',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                    }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fdf2f8', color: '#9d174d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                            <FiSliders />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Formula &amp; Settings</div>
                            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>{summary.settings || logs.filter(l => l.category === 'settings').length}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── FILTER BAR ── */}
            <div className="applicant-filter-card" style={{ marginBottom: '16px' }}>
                <div className="filter-top-bar">
                    <div className="filter-search-wrapper">
                        <div className="search-input-box">
                            <FiSearch className="search-lead-icon" />
                            <input
                                type="text"
                                placeholder="Search actor, candidate name, job title, reference, or details..."
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
                            className={`btn-toggle-filters ${showFilterPanel ? 'active' : ''} ${[categoryFilter, actionFilter, roleFilter, companyFilter, dateRangeFilter !== 'all' ? dateRangeFilter : '', myActivityOnly ? 'my' : ''].filter(Boolean).length > 0 ? 'has-active' : ''}`}
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            title="Toggle filter options"
                        >
                            <FiFilter className="btn-filter-icon" />
                            <span>Filters</span>
                            {([categoryFilter, actionFilter, roleFilter, companyFilter, dateRangeFilter !== 'all' ? dateRangeFilter : '', myActivityOnly ? 'my' : ''].filter(Boolean).length > 0) && (
                                <span className="filter-count-badge">
                                    {[categoryFilter, actionFilter, roleFilter, companyFilter, dateRangeFilter !== 'all' ? dateRangeFilter : '', myActivityOnly ? 'my' : ''].filter(Boolean).length}
                                </span>
                            )}
                            {showFilterPanel ? <FiChevronUp className="btn-chevron-icon" /> : <FiChevronDown className="btn-chevron-icon" />}
                        </button>
                    </div>
                </div>

                {/* ACTIVE FILTER CHIPS */}
                {(categoryFilter || myActivityOnly || actionFilter || roleFilter || companyFilter || dateRangeFilter !== 'all' || searchTerm) && (
                    <div className="active-filter-chips-row">
                        <span className="chips-label">Active Filters:</span>
                        <div className="chips-list">
                            {categoryFilter && (
                                <span className="filter-chip" onClick={() => setCategoryFilter('')}>
                                    Category: {categoryFilter.replace(/_/g, ' ').toUpperCase()}
                                    <FiX className="chip-remove" size={12} />
                                </span>
                            )}
                            {myActivityOnly && (
                                <span className="filter-chip" onClick={() => setMyActivityOnly(false)}>
                                    My Activity Only
                                    <FiX className="chip-remove" size={12} />
                                </span>
                            )}
                            {actionFilter && (
                                <span className="filter-chip" onClick={() => setActionFilter('')}>
                                    Action: {actionFilter.replace(/_/g, ' ').toUpperCase()}
                                    <FiX className="chip-remove" size={12} />
                                </span>
                            )}
                            {roleFilter && (
                                <span className="filter-chip" onClick={() => setRoleFilter('')}>
                                    Role: {roleFilter.replace(/_/g, ' ').toUpperCase()}
                                    <FiX className="chip-remove" size={12} />
                                </span>
                            )}
                            {companyFilter && (
                                <span className="filter-chip" onClick={() => setCompanyFilter('')}>
                                    Subsidiary: {companyFilter}
                                    <FiX className="chip-remove" size={12} />
                                </span>
                            )}
                            {dateRangeFilter !== 'all' && (
                                <span className="filter-chip" onClick={() => setDateRangeFilter('all')}>
                                    Time: {dateRangeFilter.toUpperCase()}
                                    <FiX className="chip-remove" size={12} />
                                </span>
                            )}
                            {searchTerm && (
                                <span className="filter-chip" onClick={() => setSearchTerm('')}>
                                    Search: "{searchTerm}"
                                    <FiX className="chip-remove" size={12} />
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn-clear-all-filters"
                                onClick={() => {
                                    setCategoryFilter('');
                                    setActionFilter('');
                                    setRoleFilter('');
                                    setCompanyFilter('');
                                    setDateRangeFilter('all');
                                    setMyActivityOnly(false);
                                    setSearchTerm('');
                                }}
                            >
                                <FiRotateCcw size={12} /> Reset All
                            </button>
                        </div>
                    </div>
                )}

                {/* EXPANDABLE DROPDOWNS PANEL */}
                {showFilterPanel && (
                    <div className="filter-dropdowns-expandable">
                        <div className="filter-dropdowns-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div className="filter-field-box">
                                <label><FiLayers className="field-icon" /> Activity Category</label>
                                <div className="custom-select-wrapper">
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                    >
                                        <option value="">All Categories</option>
                                        <option value="recruitment">Recruitment &amp; Jobs</option>
                                        <option value="candidate">Candidates &amp; Screening</option>
                                        {isSuperAdmin && <option value="settings">Settings &amp; Weights</option>}
                                        {(isSuperAdmin || isHrAdmin) && <option value="user_management">User Admin</option>}
                                        {(isSuperAdmin || isHrAdmin) && <option value="security">Security &amp; Access</option>}
                                    </select>
                                </div>
                            </div>

                            <div className="filter-field-box">
                                <label><FiActivity className="field-icon" /> Specific Action</label>
                                <div className="custom-select-wrapper">
                                    <select
                                        value={actionFilter}
                                        onChange={(e) => setActionFilter(e.target.value)}
                                    >
                                        <option value="">All Actions</option>
                                        {uniqueActions.map(action => (
                                            <option key={action} value={action}>{action.replace(/_/g, ' ').toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="filter-field-box">
                                <label><FiUser className="field-icon" /> Actor Role</label>
                                <div className="custom-select-wrapper">
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                    >
                                        <option value="">All Roles</option>
                                        {uniqueRoles.map(role => (
                                            <option key={role} value={role}>{role.replace(/_/g, ' ').toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="filter-field-box">
                                <label><FiClock className="field-icon" /> Time Range</label>
                                <div className="custom-select-wrapper">
                                    <select
                                        value={dateRangeFilter}
                                        onChange={(e) => setDateRangeFilter(e.target.value)}
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today Only</option>
                                        <option value="7days">Last 7 Days</option>
                                        <option value="30days">Last 30 Days</option>
                                    </select>
                                </div>
                            </div>

                            {(isSuperAdmin || isHrAdmin) && (
                                <div className="filter-field-box">
                                    <label><FiBriefcase className="field-icon" /> Subsidiary Company</label>
                                    <div className="custom-select-wrapper">
                                        <select
                                            value={companyFilter}
                                            onChange={(e) => setCompanyFilter(e.target.value)}
                                        >
                                            <option value="">All Subsidiaries</option>
                                            {uniqueCompanies.map(company => (
                                                <option key={company} value={company}>{company}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="filter-field-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    padding: '11px 14px',
                                    background: myActivityOnly ? '#fff1f2' : '#f8fafc',
                                    borderRadius: '12px',
                                    border: myActivityOnly ? '1.5px solid #fecdd3' : '1.5px solid #e2e8f0',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: myActivityOnly ? '#7A1228' : '#475569',
                                    userSelect: 'none',
                                    transition: 'all 0.15s ease'
                                }}>
                                    <input 
                                        type="checkbox" 
                                        checked={myActivityOnly} 
                                        onChange={(e) => setMyActivityOnly(e.target.checked)} 
                                        style={{ accentColor: '#7A1228', cursor: 'pointer' }}
                                    />
                                    <span>Only My Activity</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── LOGS TABLE ── */}
            <div className="card-p audit-table-card" style={{ padding: '0px', overflow: 'hidden', borderRadius: '20px', background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '320px', gap: '12px' }}>
                        <div className="loading-orb" style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: '3px solid rgba(122,18,40,0.1)',
                            borderTopColor: '#7A1228',
                            animation: 'spin 0.8s linear infinite'
                        }}></div>
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Loading activity audit records...</span>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                        <FiBook size={48} style={{ marginBottom: '14px', opacity: 0.6 }} />
                        <h3 style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '1.1rem' }}>No Audit Logs Found</h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem' }}>No activity records match your selected filter criteria.</p>
                        {(searchTerm || actionFilter || roleFilter || companyFilter || dateRangeFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setActionFilter('');
                                    setRoleFilter('');
                                    setCompanyFilter('');
                                    setDateRangeFilter('all');
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #fee2e2',
                                    background: '#fef2f2',
                                    color: '#ef4444',
                                    fontSize: '0.82rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                <FiRotateCcw size={14} /> Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="premium-table-container horizontal-drag-scroll" {...tableDragScroll} style={{ margin: 0, border: 'none', boxShadow: 'none', borderRadius: 0 }}>
                        <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                    <th style={{ padding: '16px 18px', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', width: '170px' }}>Timestamp</th>
                                    <th style={{ padding: '16px 18px', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', width: '140px' }}>Category</th>
                                    <th style={{ padding: '16px 18px', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', width: '240px' }}>Target / Entity</th>
                                    <th style={{ padding: '16px 18px', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', width: '180px' }}>Action</th>
                                    <th style={{ padding: '16px 18px', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', width: '180px' }}>Actor (Who)</th>
                                    <th style={{ padding: '16px 18px', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', width: '280px' }}>Details &amp; Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => {
                                    const hasDiff = Boolean(log.old_values || log.new_values);
                                    return (
                                        <tr 
                                            key={log.id} 
                                            style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease', cursor: hasDiff ? 'pointer' : 'default' }} 
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafbfc'} 
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            onClick={() => {
                                                if (hasDiff) setSelectedDiffLog(log);
                                            }}
                                        >
                                            {/* Timestamp & IP */}
                                            <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FiClock size={12} style={{ color: '#94a3b8' }} />
                                                    <span>{formatDateTime(log.created_at)}</span>
                                                </div>
                                                {log.ip_address && (
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                                                        IP: {log.ip_address}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Category */}
                                            <td style={{ padding: '14px 18px' }}>
                                                {getCategoryBadge(log.category)}
                                            </td>

                                            {/* Target / Entity */}
                                            <td style={{ padding: '14px 18px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.3 }}>
                                                        {log.entity_name || log.vacancy_title || 'System'}
                                                    </strong>
                                                    {log.company_name && (
                                                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                                                            {log.company_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Action */}
                                            <td style={{ padding: '14px 18px' }}>
                                                {getActionBadge(log.action)}
                                            </td>

                                            {/* Actor (Who) */}
                                            <td style={{ padding: '14px 18px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    <span style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <FiUser size={12} style={{ color: '#94a3b8' }} /> 
                                                        {log.display_admin_name || log.admin_name || 'System / Candidate'}
                                                    </span>
                                                    <div>
                                                        {getRoleBadge(log.display_admin_role || log.admin_role)}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Details & Diff Trigger */}
                                            <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: '#334155' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                    <span style={{ 
                                                        fontSize: '0.78rem', 
                                                        color: '#475569', 
                                                        lineHeight: '1.4',
                                                        maxWidth: '220px',
                                                        wordBreak: 'break-word',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {log.details || log.reason || 'Activity recorded'}
                                                    </span>

                                                    {hasDiff && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDiffLog(log);
                                                            }}
                                                            style={{
                                                                background: '#f8fafc',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '6px',
                                                                padding: '4px 8px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                color: '#475569',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                whiteSpace: 'nowrap',
                                                                flexShrink: 0
                                                            }}
                                                            title="View state before & after change"
                                                        >
                                                            <FiEye size={11} /> Diff
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
                )}
            </div>

            {/* ── BEFORE VS AFTER DIFF MODAL ── */}
            {selectedDiffLog && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.55)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                    onClick={() => setSelectedDiffLog(null)}
                >
                    <div 
                        style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            maxWidth: '680px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            border: '1px solid #e2e8f0',
                            animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    {getCategoryBadge(selectedDiffLog.category)}
                                    {getActionBadge(selectedDiffLog.action)}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                                    Audit Change Record &amp; Diff
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                    Tracked on {formatDateTime(selectedDiffLog.created_at)}
                                    {selectedDiffLog.ip_address && ` • IP: ${selectedDiffLog.ip_address}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDiffLog(null)}
                                style={{
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: '1rem'
                                }}
                            >
                                <FiX />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Actor & Entity Info */}
                            <div style={{
                                background: '#f8fafc',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                border: '1px solid #e2e8f0',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '12px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Target Entity</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                        {selectedDiffLog.entity_name || 'System'}
                                    </div>
                                    {selectedDiffLog.company_name && (
                                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{selectedDiffLog.company_name}</div>
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Performed By</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FiUser size={13} style={{ color: '#7A1228' }} />
                                        {selectedDiffLog.display_admin_name || selectedDiffLog.admin_name || 'System'}
                                    </div>
                                    <div style={{ marginTop: '3px' }}>
                                        {getRoleBadge(selectedDiffLog.display_admin_role || selectedDiffLog.admin_role)}
                                    </div>
                                </div>
                            </div>

                            {/* Details text */}
                            {selectedDiffLog.details && (
                                <div>
                                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                                        Action Summary
                                    </label>
                                    <div style={{
                                        background: '#fffbeb',
                                        border: '1px solid #fef3c7',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        fontSize: '0.84rem',
                                        color: '#92400e',
                                        fontWeight: 600,
                                        lineHeight: 1.45
                                    }}>
                                        {selectedDiffLog.details}
                                    </div>
                                </div>
                            )}

                            {/* SIDE-BY-SIDE DIFF */}
                            <div>
                                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                                    Before vs After Comparison
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {/* Old Values */}
                                    <div style={{
                                        background: '#fff1f2',
                                        border: '1px solid #fecdd3',
                                        borderRadius: '12px',
                                        padding: '14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FiXCircle /> Previous Value (Old State)
                                        </div>
                                        <pre style={{
                                            margin: 0,
                                            fontSize: '0.78rem',
                                            color: '#881337',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            background: '#ffffff',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid #fbcfe8',
                                            maxHeight: '160px',
                                            overflowY: 'auto'
                                        }}>
                                            {selectedDiffLog.old_values ? (
                                                typeof parseValues(selectedDiffLog.old_values) === 'object'
                                                    ? JSON.stringify(parseValues(selectedDiffLog.old_values), null, 2)
                                                    : String(selectedDiffLog.old_values)
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None / Initial Creation</span>
                                            )}
                                        </pre>
                                    </div>

                                    {/* New Values */}
                                    <div style={{
                                        background: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        borderRadius: '12px',
                                        padding: '14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FiCheckCircle /> Updated Value (New State)
                                        </div>
                                        <pre style={{
                                            margin: 0,
                                            fontSize: '0.78rem',
                                            color: '#14532d',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            background: '#ffffff',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid #a7f3d0',
                                            maxHeight: '160px',
                                            overflowY: 'auto'
                                        }}>
                                            {selectedDiffLog.new_values ? (
                                                typeof parseValues(selectedDiffLog.new_values) === 'object'
                                                    ? JSON.stringify(parseValues(selectedDiffLog.new_values), null, 2)
                                                    : String(selectedDiffLog.new_values)
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None / Deleted</span>
                                            )}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid #f1f5f9',
                            background: '#f8fafc',
                            borderBottomLeftRadius: '20px',
                            borderBottomRightRadius: '20px',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                type="button"
                                onClick={() => setSelectedDiffLog(null)}
                                style={{
                                    background: '#7A1228',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '8px 20px',
                                    fontSize: '0.84rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
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
                .premium-table-container {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    background: #fff;
                    border-radius: 12px;
                }
                .audit-table-card .premium-table {
                    table-layout: auto !important;
                    min-width: 1000px !important;
                    width: 100% !important;
                }
                .premium-table-container::-webkit-scrollbar {
                    height: 6px;
                }
                .premium-table-container::-webkit-scrollbar-track {
                    background: #f8fafc;
                    border-radius: 3px;
                }
                .premium-table-container::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                .premium-table-container::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                @media (max-width: 768px) {
                    .dashboard-hero-premium {
                        padding: 24px 20px !important;
                        margin-bottom: 20px !important;
                        border-radius: 16px !important;
                    }
                    .dashboard-hero-premium h1 {
                        font-size: 1.4rem !important;
                    }
                    .dashboard-hero-premium p {
                        font-size: 0.78rem !important;
                    }
                    .premium-table th, .premium-table td {
                        padding: 12px 14px !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default AuditLog;
