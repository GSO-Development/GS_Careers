import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    FiSearch, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle,
    FiUser, FiBriefcase, FiCalendar, FiArrowRight, FiActivity, FiInfo, FiHash
} from 'react-icons/fi';
import { getAllVacancies, getVacancy, getVacancyAuditLog, getCompanies } from '../../services/api';
import { formatDate } from '../../utils/constants';
import './ApprovalTracker.css';

function ApprovalTracker({ admin }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [vacanciesList, setVacanciesList] = useState([]);
    const [searchRef, setSearchRef] = useState(searchParams.get('ref') || searchParams.get('id') || '');
    const [selectedVacancy, setSelectedVacancy] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [companiesList, setCompaniesList] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');

    // Load list of all vacancies for the dropdown
    useEffect(() => {
        const fetchVacancies = async () => {
            try {
                setLoadingList(true);
                const res = await getAllVacancies();
                setVacanciesList(res.data.data || []);
            } catch (err) {
                console.error('Error fetching vacancies:', err);
                toast.error('Failed to load vacancies list.');
            } finally {
                setLoadingList(false);
            }
        };
        fetchVacancies();
    }, []);

    // Load list of all companies (subsidiaries) for GS Admins
    useEffect(() => {
        const fetchCompanies = async () => {
            if (admin && (admin.role === 'super_admin' || admin.role === 'admin')) {
                try {
                    const res = await getCompanies();
                    setCompaniesList(res.data.data || []);
                } catch (err) {
                    console.error('Error fetching companies:', err);
                }
            }
        };
        fetchCompanies();
    }, [admin]);

    // Fetch details of a selected vacancy and its audit logs
    const fetchVacancyDetails = async (refOrId) => {
        if (!refOrId) return;
        try {
            setLoadingData(true);
            const vacRes = await getVacancy(refOrId);
            const vacancyData = vacRes.data.data || vacRes.data;
            setSelectedVacancy(vacancyData);

            const logsRes = await getVacancyAuditLog(refOrId);
            setAuditLogs(logsRes.data.data || []);
        } catch (err) {
            console.error('Error loading vacancy tracker data:', err);
            setSelectedVacancy(null);
            setAuditLogs([]);
            if (err.response?.status === 403) {
                toast.error('You do not have permission to view this vacancy status.');
            } else {
                toast.error('Job Reference Number not found or error loading status.');
            }
        } finally {
            setLoadingData(false);
        }
    };

    // Trigger details fetch on search parameter change
    useEffect(() => {
        const refParam = searchParams.get('ref') || searchParams.get('id');
        if (refParam) {
            fetchVacancyDetails(refParam);
            setSearchRef(refParam);
        } else {
            setSelectedVacancy(null);
            setAuditLogs([]);
        }
    }, [searchParams]);

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        const trimmed = searchRef.trim();
        if (!trimmed) {
            toast.warn('Please enter a Job Reference Number');
            return;
        }
        setSearchParams({ ref: trimmed });
    };

    const handleDropdownSelect = (e) => {
        const val = e.target.value;
        setSearchRef(val);
        if (val) {
            setSearchParams({ ref: val });
        } else {
            setSearchParams({});
        }
    };

    const handleCompanyChange = (e) => {
        const companyId = e.target.value;
        setSelectedCompany(companyId);
        if (companyId && selectedVacancy) {
            if (String(selectedVacancy.company_id) !== String(companyId)) {
                setSearchParams({});
            }
        }
    };

    const filteredVacancies = vacanciesList.filter((v) => {
        if (!selectedCompany) return true;
        return String(v.company_id) === String(selectedCompany);
    });

    // Helper: translate roles to readable titles
    const getRoleLabel = (role) => {
        if (role === 'sub_admin2') return 'Manager';
        if (role === 'sub_admin1') return 'HOD';
        if (role === 'admin' || role === 'super_admin') return 'GS Admin';
        return 'Admin';
    };

    // Calculate current owner of the vacancy approval workflow
    const getCurrentOwner = (vac) => {
        if (!vac) return null;
        if (vac.approval_status === 'pending_subadmin1') {
            return {
                title: 'HOD (Sub Admin 1)',
                desc: 'Reviewing requisition details and skills matching.'
            };
        }
        if (vac.approval_status === 'pending_global') {
            return {
                title: 'GS Admin (Admin)',
                desc: 'Final authorization to publish the job posting live.'
            };
        }
        if (vac.approval_status === 'rejected') {
            return {
                title: `${getRoleLabel(vac.creator_role)} (Requisition Creator)`,
                desc: 'Needs to revise the requisition based on rejection feedback and resubmit.'
            };
        }
        if (vac.approval_status === 'draft') {
            return {
                title: 'Requisition Creator',
                desc: 'Requisition is currently in draft. Needs to submit for approval.'
            };
        }
        return null;
    };

    const currentOwner = getCurrentOwner(selectedVacancy);

    // Build steps array for drawing box flowchart diagram
    const buildFlowchartSteps = (vac) => {
        if (!vac) return [];
        const steps = [];

        // 1. Requisition Submitted
        steps.push({
            id: 'submitted',
            title: '1. Requisition Submitted',
            subtitle: `By: ${vac.creator_name || 'Creator'} (${getRoleLabel(vac.creator_role)})`,
            status: 'completed',
            info: vac.created_at ? formatDate(vac.created_at) : ''
        });

        // 2. Sub Admin 1 (HOD) Approval
        const requiresSub1 = vac.creator_role === 'sub_admin2';
        if (requiresSub1) {
            let status = 'pending';
            let subtitle = 'Reviewer: HOD';
            let info = 'Awaiting review';
            
            if (vac.sub1_approved_by) {
                status = 'completed';
                subtitle = `Approved by: ${vac.sub1_approved_by_name}`;
                info = formatDate(vac.sub1_approved_at);
            } else if (vac.approval_status === 'pending_subadmin1') {
                status = 'active';
                subtitle = 'Reviewer: HOD';
                info = 'Awaiting HOD Approval';
            } else if (vac.approval_status === 'rejected' && vac.rejected_by_role === 'sub_admin1') {
                status = 'rejected';
                subtitle = `Rejected by: ${vac.rejected_by_name}`;
                info = vac.rejected_at ? formatDate(vac.rejected_at) : '';
            }

            steps.push({
                id: 'hod_review',
                title: '2. Tier-1 HOD Approval',
                subtitle: subtitle,
                status: status,
                info: info
            });
        } else {
            steps.push({
                id: 'hod_review',
                title: '2. Tier-1 HOD Approval',
                subtitle: 'Direct Submission',
                status: 'skipped',
                info: 'Bypassed (Created by HOD/Admin)'
            });
        }

        // 3. GS Admin Approval
        let globalStatus = 'pending';
        let globalSubtitle = 'Authorizer: GS Admin';
        let globalInfo = 'Awaiting preceding steps';

        const sub1Done = !requiresSub1 || vac.sub1_approved_by;

        if (vac.global_approved_by) {
            globalStatus = 'completed';
            globalSubtitle = `Authorized by: ${vac.global_approved_by_name}`;
            globalInfo = formatDate(vac.global_approved_at);
        } else if (vac.approval_status === 'pending_global') {
            globalStatus = 'active';
            globalSubtitle = 'Authorizer: GS Admin';
            globalInfo = 'Awaiting Authorization';
        } else if (vac.approval_status === 'rejected' && (vac.rejected_by_role === 'admin' || vac.rejected_by_role === 'super_admin' || sub1Done)) {
            globalStatus = 'rejected';
            globalSubtitle = `Rejected by: ${vac.rejected_by_name}`;
            globalInfo = vac.rejected_at ? formatDate(vac.rejected_at) : '';
        } else if (sub1Done) {
            globalStatus = 'pending';
            globalSubtitle = 'Authorizer: GS Admin';
            globalInfo = 'Awaiting review';
        }

        steps.push({
            id: 'global_auth',
            title: '3. Global Authorization',
            subtitle: globalSubtitle,
            status: globalStatus,
            info: globalInfo
        });

        // 4. Vacancy Live / Publication
        let liveStatus = 'pending';
        let liveSubtitle = 'Publication Status';
        let liveInfo = 'Awaiting final approval';

        if (vac.approval_status === 'approved') {
            liveStatus = 'completed';
            liveSubtitle = vac.is_active ? 'Vacancy is Live' : 'Vacancy Expired';
            liveInfo = vac.expire_date ? `Closes: ${formatDate(vac.expire_date)}` : 'Active';
        }

        steps.push({
            id: 'publication',
            title: '4. Vacancy Live',
            subtitle: liveSubtitle,
            status: liveStatus,
            info: liveInfo
        });

        return steps;
    };

    const flowchartSteps = buildFlowchartSteps(selectedVacancy);

    // Get color code classes for timeline logs
    const getLogActionClass = (action) => {
        const lower = action.toLowerCase();
        if (lower.includes('submit') || lower.includes('create')) return 'submitted';
        if (lower.includes('approve') || lower.includes('authoriz')) return 'approved';
        if (lower.includes('reject')) return 'rejected';
        return 'default';
    };

    // Format audit transition displays
    const formatTransition = (fromState, toState) => {
        if (!fromState && !toState) return null;
        return (
            <span className="log-transition">
                <code>{fromState || 'init'}</code> <FiArrowRight size={10} /> <code>{toState || 'draft'}</code>
            </span>
        );
    };

    return (
        <div className="tracker-wrapper">
            <div className="tracker-header-bar">
                <div className="tracker-title-area">
                    <h2>Job Approval & Requisition Status Tracker</h2>
                    <p>Search and monitor the lifecycle stages of job requisition approvals at George Steuart & Co.</p>
                </div>
            </div>

            {/* Search Card */}
            <div className="tracker-card search-card-premium">
                <form onSubmit={handleSearchSubmit} className="tracker-search-form">
                    <div className="search-primary-row">
                        <div className="search-field search-field-id">
                            <label className="search-field-label">Search by Job Reference Number</label>
                            <div className="seamless-search-group">
                                <div className="input-prefix-box">
                                    <FiHash className="prefix-hash-icon" />
                                </div>
                                <input
                                    id="tracker_job_ref"
                                    name="tracker_job_ref"
                                    type="text"
                                    placeholder="Enter Job Reference Number (e.g. GSH/2026/25/003)"
                                    value={searchRef}
                                    onChange={(e) => setSearchRef(e.target.value)}
                                    className="seamless-search-input"
                                />
                                <button type="submit" className="seamless-search-btn">
                                    <FiSearch /> <span>Search Status</span>
                                </button>
                            </div>
                        </div>

                        <div className="search-or-divider">
                            <span>OR</span>
                        </div>

                        {admin && (admin.role === 'super_admin' || admin.role === 'admin') && (
                            <div className="search-field search-field-company">
                                <label className="search-field-label">Filter by Subsidiary</label>
                                <div className="select-wrapper-custom">
                                    <select
                                        id="tracker_subsidiary_filter"
                                        name="tracker_subsidiary_filter"
                                        value={selectedCompany}
                                        onChange={handleCompanyChange}
                                        className="custom-select-control"
                                    >
                                        <option value="">All Subsidiaries</option>
                                        {companiesList.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="search-field search-field-pipeline">
                        <label className="search-field-label">Select From Active Pipeline Requisitions</label>
                        <div className="select-wrapper-custom">
                            <select 
                                id="tracker_pipeline_select"
                                name="tracker_pipeline_select"
                                value={searchParams.get('ref') || searchParams.get('id') || ''} 
                                onChange={handleDropdownSelect}
                                disabled={loadingList}
                                className="custom-select-control"
                            >
                                <option value="">-- Choose a vacancy --</option>
                                {filteredVacancies.map((v) => (
                                    <option key={v.id} value={v.reference_number || v.id}>
                                        {v.reference_number || `ID ${v.id}`} - {v.title} ({v.company_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </form>
            </div>

            {loadingData && (
                <div className="tracker-loader">
                    <div className="spinner"></div>
                    <p>Fetching vacancy requisition history...</p>
                </div>
            )}

            {!loadingData && !selectedVacancy && (searchParams.get('ref') || searchParams.get('id')) && (
                <div className="tracker-card error-card">
                    <FiAlertCircle size={28} className="error-icon" />
                    <div>
                        <h3>Job Reference Number Not Found</h3>
                        <p>We could not find a vacancy requisition with Reference Number "{searchParams.get('ref') || searchParams.get('id')}". Please verify the Job Reference Number or pick a vacancy from the dropdown selection list.</p>
                    </div>
                </div>
            )}

            {!loadingData && !selectedVacancy && !(searchParams.get('ref') || searchParams.get('id')) && (
                <div className="tracker-card welcome-card">
                    <div className="tracker-welcome-visual">
                        <FiActivity />
                    </div>
                    <h3>Approval Tracker Dashboard</h3>
                    <p className="welcome-description">
                        Please enter a Job Reference Number above or choose a vacancy from the dropdown list to visualize the approval pipeline, view pending action owners, and review audit trail logs.
                    </p>
                    <div className="tracker-welcome-steps">
                        <div className="welcome-step">
                            <span className="step-num">1</span>
                            <span className="step-txt">Enter Ref No. or Select Job</span>
                        </div>
                        <div className="step-divider"><FiArrowRight /></div>
                        <div className="welcome-step">
                            <span className="step-num">2</span>
                            <span className="step-txt">Track Pipeline Status</span>
                        </div>
                        <div className="step-divider"><FiArrowRight /></div>
                        <div className="welcome-step">
                            <span className="step-num">3</span>
                            <span className="step-txt">Review Audit Trails</span>
                        </div>
                    </div>
                </div>
            )}

            {!loadingData && selectedVacancy && (
                <div className="tracker-main-content animate-fade-in">
                    
                    {/* Requisition Status Header Card */}
                    <div className={`tracker-card status-info-card ${selectedVacancy.approval_status}`}>
                        <div className="status-info-header">
                            <div>
                                <span className="ref-badge">{selectedVacancy.reference_number || `ID: ${selectedVacancy.id}`}</span>
                                <h3 className="vacancy-title-main">{selectedVacancy.title}</h3>
                                <p className="vacancy-meta-sub">
                                    <span><strong>Designation:</strong> {selectedVacancy.designation}</span>
                                    <span className="dot-sep"></span>
                                    <span><strong>Company:</strong> {selectedVacancy.company_name}</span>
                                </p>
                            </div>
                            <div className="status-badge-container">
                                <span className={`status-pill-large ${selectedVacancy.approval_status}`}>
                                    {selectedVacancy.approval_status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {currentOwner && (
                            <div className="current-owner-alert">
                                <div className="owner-avatar">
                                    <FiUser size={18} />
                                </div>
                                <div className="owner-details">
                                    <strong>Current Stage Pending: {currentOwner.title}</strong>
                                    <p>{currentOwner.desc}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Flowchart Box Diagram */}
                    <div className="tracker-card flowchart-card-container">
                        <h4 className="card-section-title">Requisition Stages Flowchart</h4>
                        <div className="flowchart-box-grid">
                            {flowchartSteps.map((step, idx) => {
                                const isLast = idx === flowchartSteps.length - 1;
                                return (
                                    <div key={step.id} className="flowchart-step-wrapper">
                                        <div className={`flowchart-box ${step.status}`}>
                                            <div className="flowchart-box-header">
                                                <span className="flowchart-box-title">{step.title}</span>
                                                <span className="flowchart-status-icon">
                                                    {step.status === 'completed' && <FiCheckCircle />}
                                                    {step.status === 'active' && <FiClock className="pulse-active" />}
                                                    {step.status === 'rejected' && <FiXCircle />}
                                                    {step.status === 'skipped' && <FiCheckCircle style={{ opacity: 0.5 }} />}
                                                    {step.status === 'pending' && <FiClock style={{ opacity: 0.3 }} />}
                                                </span>
                                            </div>
                                            <div className="flowchart-box-body">
                                                <div className="flowchart-subtitle">{step.subtitle}</div>
                                                {step.info && <div className="flowchart-info">{step.info}</div>}
                                            </div>
                                        </div>
                                        {!isLast && (
                                            <div className={`flowchart-arrow-connector ${step.status === 'completed' ? 'completed' : ''}`}>
                                                <FiArrowRight size={18} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Audit Logs Trail */}
                    <div className="tracker-card audit-logs-card">
                        <div className="audit-logs-header">
                            <FiActivity size={18} className="section-icon" />
                            <h4>Detailed Action Audit Log Trail</h4>
                        </div>

                        {auditLogs.length === 0 ? (
                            <div className="no-logs-view">
                                <FiInfo size={16} />
                                <span>No audit history logs recorded for this requisition vacancy yet.</span>
                            </div>
                        ) : (
                            <div className="audit-logs-list-wrapper">
                                {auditLogs.map((log, index) => {
                                    const actionClass = getLogActionClass(log.action);
                                    
                                    return (
                                        <div key={log.id} className={`audit-log-item-box border-${actionClass}`}>
                                            <div className="audit-log-header">
                                                <h5 className={`log-title text-${actionClass}`}>
                                                    {log.action.replace(/_/g, ' ').toUpperCase()}
                                                </h5>
                                                <span className="log-time">
                                                    {log.created_at}
                                                </span>
                                            </div>
                                            
                                            <div className="audit-log-body">
                                                <div className="log-by-row">
                                                    <strong>By: {log.admin_name || 'System'}</strong> 
                                                    <span className="role-tag">({getRoleLabel(log.admin_role)})</span>
                                                </div>

                                                {(log.from_state || log.to_state) && (
                                                    <div className="log-transition-row">
                                                        <span>Transition:</span>
                                                        {formatTransition(log.from_state, log.to_state)}
                                                    </div>
                                                )}

                                                {log.action === 'rejected' && log.notes && (
                                                    <div className="rejection-feedback-block">
                                                        <span className="feedback-label">Feedback/Reason:</span>
                                                        <p className="feedback-text">"{log.notes}"</p>
                                                    </div>
                                                )}

                                                {log.action !== 'rejected' && log.notes && (
                                                    <div className="log-notes-block">
                                                        <p className="notes-text">{log.notes}</p>
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
            )}
        </div>
    );
}

export default ApprovalTracker;
