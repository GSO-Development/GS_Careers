import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getTalentPool, getCompanies, updateCandidateTags, API_BASE, deleteApplication, blockCandidate, unblockCandidate } from '../../services/api';
import { OVERALL_EXPERIENCE_OPTIONS, QUALIFICATION_OPTIONS, formatDate } from '../../utils/constants';
import { FiSearch, FiMail, FiPhone, FiFileText, FiUser, FiBriefcase, FiCalendar, FiExternalLink, FiX, FiHome, FiUserCheck, FiChevronRight, FiChevronLeft, FiTag, FiPlus, FiAlertCircle, FiBarChart, FiBookOpen, FiDownload, FiTrash2, FiSlash, FiShield, FiFilter, FiChevronDown, FiChevronUp, FiRotateCcw } from 'react-icons/fi';
import './TalentPool.css';
import PaginationFooter from '../../components/PaginationFooter';
import { renderAsync } from 'docx-preview';
import axios from 'axios';

const BACKEND_ROOT = API_BASE.replace('/api', '');
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
                
                const response = await axios.get(url, { 
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('gs_admin_token')}`
                    }
                });
                
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

function TalentPool({ admin }) {
    const isReadOnly = ['super_admin', 'sub_admin', 'sub_admin2'].includes(admin.role);
    const [candidates, setCandidates] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(null);
    const [newTag, setNewTag] = useState('');
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);
    const [viewingCV, setViewingCV] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [selectedCandidateForDelete, setSelectedCandidateForDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [activeCount, setActiveCount] = useState(0);
    const [blockedCount, setBlockedCount] = useState(0);

    const [filters, setFilters] = useState({
        company_id: '',
        search: '',
        overall_experience: '',
        qualification: '',
        tag: '',
        status: '',
        show_blocked: ''
    });
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    const [showBlockModal, setShowBlockModal] = useState(null);
    const [blockReason, setBlockReason] = useState('');
    const [blocking, setBlocking] = useState(false);
    const [unblocking, setUnblocking] = useState(false);

    useEffect(() => {
        loadMeta();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        loadTalentPool();
    }, [filters.company_id, filters.search, filters.overall_experience, filters.qualification, filters.tag, filters.status, filters.show_blocked]);

    const loadMeta = async () => {
        try {
            const compRes = await getCompanies();
            setCompanies(compRes.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadTalentPool = async () => {
        try {
            setLoading(true);
            const params = {};
            Object.entries(filters).forEach(([k, v]) => {
                if (v) params[k] = v;
            });

            const res = await getTalentPool(params);
            const data = res.data.data || {};
            setCandidates(data.candidates || []);
            setActiveCount(data.active_count || 0);
            setBlockedCount(data.blocked_count || 0);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load talent pool');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = async () => {
        if (!newTag.trim() || !showDetail) return;
        
        try {
            setIsUpdatingTags(true);
            const currentTags = showDetail.tags ? showDetail.tags.split(',').map(t => t.trim()) : [];
            const tagToAdd = newTag.trim();
            
            if (currentTags.includes(tagToAdd)) {
                toast.warning('Tag already exists');
                return;
            }
            
            const updatedTags = [...currentTags, tagToAdd].join(',');
            await updateCandidateTags({ id: showDetail.id, tags: updatedTags });
            
            const updatedCand = { ...showDetail, tags: updatedTags };
            setShowDetail(updatedCand);
            setCandidates(candidates.map(c => c.id === showDetail.id ? updatedCand : c));
            setNewTag('');
            toast.success('Tag added successfully');
        } catch (err) {
            toast.error('Failed to update tags');
        } finally {
            setIsUpdatingTags(false);
        }
    };

    const removeTag = async (tagToRemove) => {
        try {
            setIsUpdatingTags(true);
            const currentTags = showDetail.tags.split(',').map(t => t.trim());
            const updatedTags = currentTags.filter(t => t !== tagToRemove).join(',');
            
            await updateCandidateTags({ id: showDetail.id, tags: updatedTags });
            
            const updatedCand = { ...showDetail, tags: updatedTags };
            setShowDetail(updatedCand);
            setCandidates(candidates.map(c => c.id === showDetail.id ? updatedCand : c));
            toast.success('Tag removed');
        } catch (err) {
            toast.error('Failed to remove tag');
        } finally {
            setIsUpdatingTags(false);
        }
    };
    
    const handleDeleteCandidate = async () => {
        if (!selectedCandidateForDelete) return;
        
        try {
            setDeleting(true);
            await deleteApplication({ id: selectedCandidateForDelete.id });
            setCandidates(candidates.filter(c => c.id !== selectedCandidateForDelete.id));
            toast.success('Candidate removed from talent pool');
            setSelectedCandidateForDelete(null);
        } catch (err) {
            toast.error('Failed to delete candidate');
        } finally {
            setDeleting(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            company_id: '',
            search: '',
            overall_experience: '',
            qualification: '',
            tag: '',
            status: '',
            show_blocked: ''
        });
    };

    const handleBlockCandidate = async () => {
        if (!showBlockModal || !blockReason.trim()) return;
        try {
            setBlocking(true);
            await blockCandidate({ email: showBlockModal.email, block_reason: blockReason.trim() });
            toast.success(`${showBlockModal.first_name} ${showBlockModal.last_name} has been blocked`);
            setShowBlockModal(null);
            setBlockReason('');
            setShowDetail(null);
            loadTalentPool();
        } catch (err) {
            toast.error('Failed to block candidate');
        } finally {
            setBlocking(false);
        }
    };

    const handleUnblockCandidate = async (cand) => {
        try {
            setUnblocking(true);
            await unblockCandidate({ email: cand.email });
            toast.success(`${cand.first_name} ${cand.last_name} has been unblocked`);
            setShowDetail(null);
            loadTalentPool();
        } catch (err) {
            toast.error('Failed to unblock candidate');
        } finally {
            setUnblocking(false);
        }
    };

    // Creative: Extract unique tags from all candidates for the filter
    const uniqueTags = [...new Set(candidates.flatMap(c => c.tags ? c.tags.split(',').map(t => t.trim()) : []))].sort();

    const totalPages = Math.ceil(candidates.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCandidates = candidates.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="manage-vacancies-console">
            {/* ... same header and toolbar ... */}
            <div className="vacancies-orchestration-header">
                <div className="header-content-p">
                    <div className="badge-p">
                        <span className="dot pulse"></span>
                        TALENT POOL ORCHESTRATOR
                    </div>
                    <h1 className="hero-title-p">Talent Pool</h1>
                    <p className="hero-subtitle-p">Intelligent Candidate Management & Heritage Talent Acquisition</p>
                </div>

                <div className="hero-stats-glass">
                    <div className="h-stat-item">
                        <span className="h-label">TOTAL TALENT</span>
                        <span className="h-value">{activeCount + blockedCount}</span>
                    </div>
                    <div className="h-divider"></div>
                    <div className="h-stat-item">
                        <span className="h-label">HIGHLY QUALIFIED</span>
                        <span className="h-value">
                            {candidates.filter(c => /master|msc|mba|phd|doctorate|postgraduate/i.test(c.qualification || '')).length}
                        </span>
                    </div>
                </div>
            </div>

            {/* MODERN COLLAPSIBLE FILTER SUITE */}
            {(() => {
                const activeTalentFilterCount = [filters.company_id, filters.overall_experience, filters.qualification, filters.tag, filters.status].filter(Boolean).length;
                const hasTalentActiveFilters = Boolean(filters.search || filters.company_id || filters.overall_experience || filters.tag || filters.qualification || filters.status);
                const activeTalentChips = [];
                if (filters.search) activeTalentChips.push({ key: 'search', label: `Search: "${filters.search}"`, clear: () => setFilters(prev => ({ ...prev, search: '' })) });
                if (filters.company_id) {
                    const comp = companies.find(c => String(c.id) === String(filters.company_id))?.name || 'Unit';
                    activeTalentChips.push({ key: 'company', label: `Unit: ${comp}`, clear: () => setFilters(prev => ({ ...prev, company_id: '' })) });
                }
                if (filters.overall_experience) activeTalentChips.push({ key: 'exp', label: `Exp: ${filters.overall_experience}`, clear: () => setFilters(prev => ({ ...prev, overall_experience: '' })) });
                if (filters.qualification) activeTalentChips.push({ key: 'qual', label: `Qual: ${filters.qualification}`, clear: () => setFilters(prev => ({ ...prev, qualification: '' })) });
                if (filters.status) activeTalentChips.push({ key: 'status', label: `Status: ${filters.status}`, clear: () => setFilters(prev => ({ ...prev, status: '' })) });

                return (
                    <div className="applicant-filter-card">
                        <div className="filter-top-bar">
                            <div className="filter-search-wrapper">
                                <div className="search-input-box">
                                    <FiSearch className="search-lead-icon" />
                                    <input
                                        id="talent_search"
                                        name="talent_search"
                                        type="text"
                                        placeholder="Discover by candidate name, email, expertise or tags..."
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

                            <div className="filter-top-actions">
                                <button
                                    type="button"
                                    className={`btn-toggle-filters ${showFilterPanel ? 'active' : ''} ${activeTalentFilterCount > 0 ? 'has-active' : ''}`}
                                    onClick={() => setShowFilterPanel(prev => !prev)}
                                    title="Toggle filter options"
                                >
                                    <FiFilter className="btn-filter-icon" />
                                    <span>Filters</span>
                                    {activeTalentFilterCount > 0 && (
                                        <span className="filter-count-badge">{activeTalentFilterCount}</span>
                                    )}
                                    {showFilterPanel ? <FiChevronUp className="btn-chevron-icon" /> : <FiChevronDown className="btn-chevron-icon" />}
                                </button>

                                {/* Pool Mode Toggle */}
                                <div className="pool-toggle-group" style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e2e8f0', flexShrink: 0, height: 48 }}>
                                    <button
                                        type="button"
                                        onClick={() => setFilters({ ...filters, show_blocked: '' })}
                                        style={{
                                            padding: '0 16px', height: '100%', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                                            background: filters.show_blocked !== '1' ? 'linear-gradient(135deg, #1a1a2e, #2a050b)' : '#fff',
                                            color: filters.show_blocked !== '1' ? '#c8a951' : '#94a3b8',
                                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <FiUserCheck size={14} /> Active ({activeCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilters({ ...filters, show_blocked: '1' })}
                                        style={{
                                            padding: '0 16px', height: '100%', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                                            borderLeft: '1.5px solid #e2e8f0',
                                            background: filters.show_blocked === '1' ? '#fef2f2' : '#fff',
                                            color: filters.show_blocked === '1' ? '#dc2626' : '#94a3b8',
                                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <FiSlash size={14} /> Blocked ({blockedCount})
                                    </button>
                                </div>

                                {hasTalentActiveFilters && (
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

                        {activeTalentChips.length > 0 && (
                            <div className="active-filter-chips-row">
                                <span className="chips-label">Active Filters:</span>
                                <div className="chips-list">
                                    {activeTalentChips.map(chip => (
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
                                    <span className="panel-title-text">Filter & Refine Talent Pool Candidates</span>
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
                                        <div className={`filter-field-box ${filters.company_id ? 'has-value' : ''}`}>
                                            <label htmlFor="company_filter">
                                                <FiHome className="field-icon" /> Business Unit
                                            </label>
                                            <div className="custom-select-wrapper">
                                                <select 
                                                    id="company_filter" 
                                                    name="company_id" 
                                                    value={filters.company_id} 
                                                    onChange={(e) => setFilters({ ...filters, company_id: e.target.value })}
                                                >
                                                    <option value="">All Business Units</option>
                                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className={`filter-field-box ${filters.overall_experience ? 'has-value' : ''}`}>
                                        <label htmlFor="experience_filter">
                                            <FiBriefcase className="field-icon" /> Min. Experience
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

                                    <div className={`filter-field-box ${filters.status ? 'has-value' : ''}`}>
                                        <label htmlFor="status_filter">
                                            <FiUserCheck className="field-icon" /> Search Outcome
                                        </label>
                                        <div className="custom-select-wrapper">
                                            <select 
                                                id="status_filter" 
                                                name="status" 
                                                value={filters.status} 
                                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                            >
                                                <option value="">All Outcomes</option>
                                                <option value="pending">Pending Review</option>
                                                <option value="shortlisted">Shortlisted</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Data Orchestration Table */}
            <div className="premium-table-container">
                <table className="premium-table">
                    <colgroup>
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Candidate Identity</th>
                            <th>Credentials &amp; Tags</th>
                            <th>Prior Submission</th>
                            <th>Timeline &amp; Seniority</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                                    <div className="loading-state-p">
                                        <div className="spinner-p"></div>
                                        <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Synchronizing talent pool...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : candidates.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '60px', textAlign: 'center' }}>
                                    <div className="empty-state-p">
                                        <div className="empty-icon" style={{ fontSize: '3rem', color: 'var(--border-light)', marginBottom: '16px' }}><FiUserCheck /></div>
                                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Talent Found</h3>
                                        <p style={{ color: 'var(--text-muted)' }}>Adjust your discovery filters to find candidates.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedCandidates.map((cand, idx) => (
                            <tr key={idx} onClick={() => setShowDetail(cand)} style={{ cursor: 'pointer' }}>
                                <td>
                                    <div className="candidate-cell">
                                        <div className="avatar-p">
                                            {cand.first_name ? cand.first_name[0].toUpperCase() : <FiUser />}
                                        </div>
                                        <div className="info-p">
                                            <div className="name-row-p">
                                                <span className="name-p">{cand.first_name} {cand.last_name}</span>
                                                {cand.is_blocked == 1 && (
                                                    <span className="blocked-pill" title={cand.block_reason || 'Candidate is blocked'}>
                                                        <FiSlash size={9} /> Blocked
                                                    </span>
                                                )}
                                            </div>
                                            {cand.last_status && (
                                                <div className="status-row-p">
                                                    {cand.last_status === 'shortlisted' && (
                                                        <span className="status-badge-p badge-shortlisted">
                                                            <FiUserCheck size={10} /> Favored
                                                        </span>
                                                    )}
                                                    {cand.last_status === 'rejected' && (
                                                        <span className="status-badge-p badge-rejected">
                                                            Refused
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="classification-cell">
                                        {cand.qualification && cand.qualification.trim() ? (
                                            <div className="class-badge-wrap">
                                                <span className="class-badge" title={`Highest Qualification: ${cand.qualification}`}>
                                                    <FiBookOpen size={11} className="class-badge-icon" />
                                                    <span>{cand.qualification}</span>
                                                </span>
                                            </div>
                                        ) : null}
                                        {(() => {
                                            const tagList = (cand.tags || '').split(',').map(t => t.trim()).filter(Boolean);
                                            if (tagList.length === 0 && (!cand.qualification || !cand.qualification.trim())) {
                                                return <span className="empty-dash">—</span>;
                                            }
                                            if (tagList.length === 0) return null;
                                            return (
                                                <div className="talent-tags-wrap">
                                                    {tagList.slice(0, 3).map((tag, i) => (
                                                        <span key={i} className="tag-chip" title={tag}>
                                                            <span className="tag-hash">#</span>{tag}
                                                        </span>
                                                    ))}
                                                    {tagList.length > 3 && (
                                                        <span 
                                                            className="tag-chip-more" 
                                                            title={`Additional tags: ${tagList.slice(3).join(', ')}`}
                                                        >
                                                            +{tagList.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </td>
                                <td>
                                    <div className="pos-entity-cell">
                                        <span className="pos-name" title={cand.last_applied_vacancy || 'Direct Application'}>
                                            {cand.last_applied_vacancy || 'Direct Application'}
                                        </span>
                                        <span className="entity-name" title={cand.last_applied_company || 'George Steuart'}>
                                            <FiBriefcase size={11} className="entity-icon" />
                                            <span>{cand.last_applied_company || 'George Steuart'}</span>
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div className="timeline-cell">
                                        <div className="exp-highlight">
                                            <span className="exp-val">{cand.overall_experience || '0 years'}</span>
                                            {cand.relevant_experience && cand.relevant_experience !== cand.overall_experience && (
                                                <span className="exp-rel-sub" title={`${cand.relevant_experience} relevant experience`}>
                                                    ({cand.relevant_experience} rel.)
                                                </span>
                                            )}
                                        </div>
                                        <span className="applied-date-sub" title={`Applied on ${formatDate(cand.applied_at)}`}>
                                            <FiCalendar size={11} /> {formatDate(cand.applied_at)}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div className="table-actions-cluster">
                                        {cand.cv_path && (
                                            <button 
                                                type="button"
                                                className="action-btn-p cv-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewingCV(cand);
                                                }}
                                                title="Preview Candidate CV"
                                            >
                                                <FiFileText size={15} />
                                            </button>
                                        )}
                                        {!isReadOnly && (
                                            <button 
                                                type="button"
                                                className="action-btn-p danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCandidateForDelete(cand);
                                                }}
                                                title="Remove from Pool"
                                            >
                                                <FiTrash2 size={15} />
                                            </button>
                                        )}
                                        <button 
                                            type="button"
                                            className="action-btn-p view"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDetail(cand);
                                            }}
                                            title="View Details"
                                        >
                                            <FiChevronRight size={16} />
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
                    totalItems={candidates.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    label="candidates"
                />
            </div>

            {/* Detail Modal - Fixing the Top/Bottom cut-off issue */}
            {showDetail && (
                <div className="confirm-overlay" onClick={() => setShowDetail(null)}>
                    <div className="confirm-modal card-p animated-zoom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', textAlign: 'left', overflow: 'hidden' }}>
                        {/* Header stays at the top */}
                        <div className="modal-header-p" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 32px' }}>
                            <div className="header-info-p" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div className="modal-avatar" style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--ivory-dark)', color: 'var(--crimson)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid rgba(200, 169, 81, 0.3)', flexShrink: 0 }}><FiUser /></div>
                                <div>
                                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', letterSpacing: '-0.5px', margin: 0, color: 'var(--text-primary)' }}>{showDetail.first_name} {showDetail.last_name}</h2>
                                    <p style={{ color: 'var(--gold-accent)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '1px', margin: '2px 0 0 0' }}>Talent Pool candidate</p>
                                </div>
                            </div>
                            <button className="o-btn delete" onClick={() => setShowDetail(null)}><FiX /></button>
                        </div>

                        {/* Body scrolls smoothly */}
                        <div className="modal-body-p" style={{ overflowY: 'auto', maxHeight: '65vh', padding: '28px 32px' }}>
                            <div className="detail-grid-p admin-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '28px' }}>
                                <div className="detail-section-p">
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b1a2b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '20px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>Contact Information</label>
                                    <div className="contact-list-p" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="contact-item-p" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                            <FiMail style={{ marginTop: '3px', color: '#c8a951', fontSize: '1.2rem', flexShrink: 0 }} />
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.5px' }}>Email Address</span>
                                                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '0.95rem', wordBreak: 'break-all' }}>{showDetail.email}</p>
                                            </div>
                                        </div>
                                        <div className="contact-item-p" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                            <FiPhone style={{ marginTop: '3px', color: '#c8a951', fontSize: '1.2rem', flexShrink: 0 }} />
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.5px' }}>Phone Number</span>
                                                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{showDetail.contact_number}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section-p">
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b1a2b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '20px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>Professional Profile</label>
                                    <div className="professional-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                        <div className="stat-pill-item" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <FiBriefcase className="stat-i" style={{ color: '#8b1a2b', fontSize: '1.2rem', flexShrink: 0 }} />
                                            <div className="stat-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', lineHeight: 1.2 }}>Overall Experience</span>
                                                <strong style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.3 }}>{showDetail.overall_experience || 'Not Specified'}</strong>
                                            </div>
                                        </div>
                                        <div className="stat-pill-item" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <FiBarChart className="stat-i" style={{ color: '#8b1a2b', fontSize: '1.2rem', flexShrink: 0 }} />
                                            <div className="stat-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', lineHeight: 1.2 }}>Relevant Experience</span>
                                                <strong style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.3 }}>{showDetail.relevant_experience || 'Not Specified'}</strong>
                                            </div>
                                        </div>
                                        <div className="stat-pill-item full-w" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                                            <FiBookOpen className="stat-i" style={{ color: '#8b1a2b', fontSize: '1.2rem', flexShrink: 0 }} />
                                            <div className="stat-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', lineHeight: 1.2 }}>Highest Qualification</span>
                                                <strong style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.3 }}>{showDetail.qualification || 'Not Specified'}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section-p">
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b1a2b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '20px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>Candidate Talent Tags</label>
                                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '100px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                            {showDetail.tags ? showDetail.tags.split(',').map((t, i) => (
                                                <span key={i} style={{ background: 'rgba(200,169,81,0.18)', color: '#997b28', border: '1px solid rgba(200,169,81,0.3)', fontSize: '0.72rem', padding: '4px 10px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                                                    #{t.trim()}
                                                    {!isReadOnly && <FiX onClick={() => removeTag(t.trim())} style={{ cursor: 'pointer', opacity: 0.7 }} />}
                                                </span>
                                            )) : <span style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#94a3b8' }}>No tags assigned yet.</span>}
                                        </div>
                                        {!isReadOnly && (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="Add new skill tag..." 
                                                    value={newTag}
                                                    onChange={(e) => setNewTag(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: '#ffffff' }}
                                                />
                                                <button 
                                                    onClick={handleAddTag} 
                                                    disabled={isUpdatingTags}
                                                    style={{ background: '#8b1a2b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <FiPlus /> Add
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="detail-section-p">
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b1a2b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '20px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>Submission History</label>
                                    <div className="submission-box-p" style={{ gridTemplateColumns: '1fr', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                        <div className="sm-item" style={{ marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Previously Applied Position</span>
                                            <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{showDetail.last_applied_vacancy || 'Direct Application'}</p>
                                        </div>
                                        <div className="sm-item">
                                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Subsidiary Company</span>
                                            <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#475569', fontSize: '0.84rem' }}>{showDetail.last_applied_company || 'George Steuart'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section-p full-width" style={{ gridColumn: '1 / -1' }}>
                                    <div className="cv-banner-p" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '18px 24px', borderRadius: '16px', color: '#ffffff' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div className="cb-icon" style={{ width: '44px', height: '44px', background: 'rgba(200, 169, 81, 0.15)', border: '1px solid rgba(200, 169, 81, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8a951', fontSize: '1.3rem' }}><FiFileText /></div>
                                            <div className="cb-text">
                                                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>Candidate Curriculum Vitae</span>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>{showDetail.first_name}_CV_Pool.{(showDetail.cv_path || '').split('.').pop() || 'pdf'}</p>
                                            </div>
                                        </div>
                                        <button
                                            className="btn"
                                            style={{ background: '#c8a951', color: '#1e293b', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                            onClick={() => setViewingCV(showDetail)}
                                        >
                                            <FiExternalLink /> View Document
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Footer stays fixed at bottom of modal */}
                        <div className="modal-actions-footer-p" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px 28px', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                            {showDetail.is_blocked == 1 ? (
                                <>
                                    <button className="btn page-btn" style={{ padding: '8px 18px', height: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowDetail(null)}>Close Window</button>
                                    <div style={{ background: '#fef2f2', padding: '8px 14px', borderRadius: 10, border: '1px solid #fecaca', flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                                        <FiSlash size={14} /> Blocked: {showDetail.block_reason}
                                    </div>
                                    {!isReadOnly && (
                                        <button
                                            className="btn"
                                            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onClick={() => handleUnblockCandidate(showDetail)}
                                            disabled={unblocking}
                                        >
                                            <FiShield /> {unblocking ? 'Unblocking...' : 'Unblock Candidate'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button className="btn page-btn" style={{ padding: '8px 18px', height: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', color: '#475569' }} onClick={() => setShowDetail(null)}>Close Window</button>
                                    {!isReadOnly && (
                                        <button
                                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
                                            onClick={() => { setShowBlockModal(showDetail); }}
                                        >
                                            <FiSlash size={14} /> Block Candidate
                                        </button>
                                    )}
                                    <a
                                        href={`mailto:${showDetail.email}?subject=Career Opportunity: George Steuart`}
                                        className="btn"
                                        style={{ background: '#8b1a2b', color: '#fff', textDecoration: 'none', padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <FiMail /> Send Outreach Email
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CV Viewer Modal */}
            {viewingCV && (() => {
                const cvUrl = `${API_BASE}/applications.php?action=view_cv&file=${encodeURIComponent(viewingCV.cv_path)}`;
                const ext = (viewingCV.cv_path || '').split('.').pop().toLowerCase();
                const isPdf = ext === 'pdf';
                const isDocx = ext === 'docx' || ext === 'doc';
                return (
                    <div className="confirm-overlay" style={{ zIndex: 1200 }} onClick={() => setViewingCV(null)}>
                        <div className="confirm-modal card-p animated-zoom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px', width: '95%', height: '90vh', padding: 0, textAlign: 'left', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {/* Header */}
                            <div style={{ background: 'linear-gradient(135deg, #2a050b 0%, var(--crimson-dark) 100%)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(200,169,81,0.15)', border: '1px solid rgba(200,169,81,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-accent)', fontSize: '1.2rem' }}>
                                        <FiFileText />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>{viewingCV.first_name} {viewingCV.last_name} — CV</h3>
                                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ext.toUpperCase()} Document</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <a
                                        href={cvUrl}
                                        download
                                        className="btn"
                                        style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <FiDownload size={14} /> Download
                                    </a>
                                    <button
                                        onClick={() => setViewingCV(null)}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem' }}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, overflow: 'hidden', background: '#f1f5f9' }}>
                                {isPdf && (
                                    <iframe
                                        src={cvUrl}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        title="CV Preview"
                                    />
                                )}
                                {isDocx && (
                                    <DocxViewer url={cvUrl} />
                                )}
                                {!isPdf && !isDocx && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
                                        <FiAlertCircle size={48} />
                                        <p style={{ fontWeight: 600 }}>Unsupported file format (.{ext})</p>
                                        <a href={cvUrl} download className="btn btn-gold" style={{ textDecoration: 'none' }}>
                                            <FiDownload /> Download to View
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Delete Confirmation Modal */}
            {selectedCandidateForDelete && (
                <div className="confirm-overlay animated-fade-in" style={{ zIndex: 1210 }} onClick={() => setSelectedCandidateForDelete(null)}>
                    <div className="confirm-modal card-p animated-zoom" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
                        <div className="warning-visual" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '1.5rem' }}>
                            <FiTrash2 />
                        </div>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--text-primary)' }}>Remove Candidate?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Are you sure you want to remove <strong>{selectedCandidateForDelete.first_name}</strong> from the talent pool? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                className="btn btn-outline" 
                                onClick={() => setSelectedCandidateForDelete(null)}
                                style={{ flex: 1, padding: '12px' }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn" 
                                onClick={handleDeleteCandidate}
                                disabled={deleting}
                                style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '12px' }}
                            >
                                {deleting ? 'Removing...' : 'Confirm Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Confirmation Modal */}
            {showBlockModal && (
                <div className="confirm-overlay animated-fade-in" style={{ zIndex: 1210 }} onClick={() => { setShowBlockModal(null); setBlockReason(''); }}>
                    <div className="confirm-modal card-p animated-zoom" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', textAlign: 'center', padding: '40px' }}>
                        <div style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '1.6rem' }}>
                            <FiSlash />
                        </div>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--text-primary)' }}>Block Candidate?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.6, fontSize: '0.9rem' }}>
                            You are about to block <strong style={{ color: 'var(--text-primary)' }}>{showBlockModal.first_name} {showBlockModal.last_name}</strong> ({showBlockModal.email}).
                        </p>
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: '0.8rem', color: '#92400e', textAlign: 'left' }}>
                            ⚠️ This will remove them from:<br/>
                            • All future vacancy suggestions<br/>
                            • The Talent Pool active listing<br/>
                            • New applications will show a warning badge
                        </div>
                        <textarea
                            placeholder="Reason for blocking (required)... e.g. Provided false experience details"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            rows={3}
                            style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.85rem', resize: 'none', marginBottom: 20, fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => { setShowBlockModal(null); setBlockReason(''); }}
                                style={{ flex: 1, padding: '12px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBlockCandidate}
                                disabled={blocking || !blockReason.trim()}
                                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit', opacity: (!blockReason.trim() || blocking) ? 0.5 : 1 }}
                            >
                                {blocking ? 'Blocking...' : '🚫 Confirm Block'}
                            </button>
                        </div>
                    </div>
                </div>
            )}




        </div>
    );
}

export default TalentPool;
