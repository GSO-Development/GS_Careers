import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, getAllVacancies, API_BASE } from '../../services/api';
import {
    FiBriefcase, FiUsers, FiTrendingUp, FiActivity, FiSearch,
    FiMapPin, FiBarChart2, FiArrowLeft, FiArrowRight, FiInfo, FiExternalLink, FiPercent, FiX, FiAward, FiGlobe
} from 'react-icons/fi';
import './ManageAdmins.css'; // Utilize shared premium administration layout styles

const BACKEND_ROOT = API_BASE.replace('/api', '');

function CompanyReports({ admin }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [vacancies, setVacancies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [compRes, vacRes] = await Promise.all([
                getCompanies(),
                getAllVacancies()
            ]);
            setCompanies(compRes.data.data || []);
            setVacancies(vacRes.data.data || []);
        } catch (err) {
            console.error('Failed to load reports data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate company-wise stats
    const reportData = companies.map(company => {
        const companyVacancies = vacancies.filter(v => v.company_id === company.id);
        const totalVacancies = companyVacancies.length;
        const activeVacancies = companyVacancies.filter(v => {
            const days = (new Date(v.expire_date) - new Date()) / (1000 * 60 * 60 * 24);
            return v.is_active && days > 0;
        }).length;
        
        const totalApplications = companyVacancies.reduce((sum, v) => sum + (v.application_count || 0), 0);
        const avgApplicationsPerJob = totalVacancies > 0 ? (totalApplications / totalVacancies).toFixed(1) : '0.0';

        return {
            ...company,
            totalVacancies,
            activeVacancies,
            totalApplications,
            avgApplicationsPerJob,
            vacanciesList: companyVacancies
        };
    }).sort((a, b) => b.totalApplications - a.totalApplications); // Sort by highest applications

    // Filter report by search term
    const filteredReports = reportData.filter(r =>
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group-wide aggregates
    const totalGroupApplications = reportData.reduce((sum, r) => sum + r.totalApplications, 0);
    const totalGroupVacancies = reportData.reduce((sum, r) => sum + r.totalVacancies, 0);
    const totalActiveVacancies = reportData.reduce((sum, r) => sum + r.activeVacancies, 0);
    const activeCompaniesCount = reportData.filter(r => r.totalVacancies > 0).length;

    // Highest engagement company
    const topPerformer = [...reportData].sort((a, b) => parseFloat(b.avgApplicationsPerJob) - parseFloat(a.avgApplicationsPerJob))[0];

    const selectedCompanyReport = reportData.find(r => r.id === selectedCompanyId);

    return (
        <div className="premium-admins-page">
            {/* MINIMALIST HERO */}
            <div className="dashboard-hero-premium">
                <div className="hero-content-p">
                    <div className="hero-badge-p"><FiActivity /> Divisional Recruitment Intelligence</div>
                    <h1 className="hero-title-p">Company-Wise Application Analytics</h1>
                    <p className="hero-subtitle-p">George Steuart Group | Group-wide summary of job postings, applicant pipelines, and subsidiary engagement volume.</p>
                </div>
                <div className="hero-actions-p">
                    <button className="btn-hero-p primary" onClick={() => navigate('/admin')}>
                        <FiArrowLeft /> Back to Suite
                    </button>
                </div>
            </div>

            {/* PERFORMANCE SNAPSHOT */}
            <div className="stats-mosaic-grid admin-grid-4">
                <div className="db-stat-card">
                    <div className="db-s-header">
                        <span className="db-s-label">Total Submissions</span>
                        <div className="db-s-icon"><FiUsers /></div>
                    </div>
                    <span className="db-s-value">{totalGroupApplications}</span>
                </div>
                <div className="db-stat-card">
                    <div className="db-s-header">
                        <span className="db-s-label">Active Channels</span>
                        <div className="db-s-icon green"><FiBriefcase /></div>
                    </div>
                    <span className="db-s-value">{totalActiveVacancies} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>/ {totalGroupVacancies}</span></span>
                </div>
                <div className="db-stat-card">
                    <div className="db-s-header">
                        <span className="db-s-label">Engagement Rate</span>
                        <div className="db-s-icon blue"><FiPercent /></div>
                    </div>
                    <span className="db-s-value">
                        {topPerformer && topPerformer.totalVacancies > 0 ? (
                            <>
                                {topPerformer.avgApplicationsPerJob} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>apps/job</span>
                            </>
                        ) : 'N/A'}
                    </span>
                </div>
                <div className="db-stat-card">
                    <div className="db-s-header">
                        <span className="db-s-label">Corporate Divisions</span>
                        <div className="db-s-icon purple"><FiBarChart2 /></div>
                    </div>
                    <span className="db-s-value">{activeCompaniesCount} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>/ {companies.length}</span></span>
                </div>
            </div>

            {/* SEARCH CONSOLE TOOLBAR */}
            <div className="console-toolbar-p">
                <div className="toolbar-search-row">
                    <div className="search-orchestrator">
                        <FiSearch className="s-icon" />
                        <input
                            id="report_search"
                            name="report_search"
                            type="text"
                            placeholder="Filter reports by subsidiary division name or headquarters..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className={`analytics-layout-split ${selectedCompanyId ? 'has-sidebar' : ''}`}>
                
                {/* LEFT COLUMN: MAIN COMPARATIVE LIST */}
                <div className="results-card-p orchestration-container">
                    <div className="orchestration-header" style={{ flexWrap: 'wrap', gap: '20px', padding: '24px 32px' }}>
                        <div className="h-left">
                            <h3 style={{ fontSize: '1.4rem' }}>Strategic Corporate Directory</h3>
                            <p style={{ fontSize: '0.85rem' }}>Comparative matrix of candidates and pipeline volumes across child establishments.</p>
                        </div>
                        <div className="h-right">
                            <span className="count-badge">{filteredReports.length} Entities Compiled</span>
                        </div>
                    </div>
                    
                    <div className="table-wrapper-p">
                        <table className="premium-table orchestration-table">
                            <thead>
                                <tr>
                                    <th>SUBSIDIARY COMPANY</th>
                                    <th>HEADQUARTERS</th>
                                    <th style={{ textAlign: 'center' }}>JOB LISTINGS</th>
                                    <th style={{ textAlign: 'center' }}>APPLICATIONS</th>
                                    <th style={{ textAlign: 'center' }}>ANALYSIS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '60px', textAlign: 'center' }}>
                                            <div className="spinner-p"></div>
                                            <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Aggregating divisional telemetry...</p>
                                        </td>
                                    </tr>
                                ) : filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="empty-cell">
                                            <div className="no-results" style={{ padding: '60px', textAlign: 'center' }}>
                                                <FiBriefcase size={48} style={{ color: 'var(--border-light)', marginBottom: '16px' }} />
                                                <p style={{ color: 'var(--text-muted)' }}>No group companies match your search criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredReports.map((c, idx) => {
                                    const appSharePercent = totalGroupApplications > 0 ? Math.round((c.totalApplications / totalGroupApplications) * 100) : 0;
                                    const isSelected = selectedCompanyId === c.id;
                                    
                                    return (
                                        <tr key={c.id} className={`orchestration-row ${isSelected ? 'selected-row-active' : ''}`} style={{ cursor: 'pointer', background: isSelected ? 'rgba(139,26,43,0.02)' : 'transparent' }} onClick={() => setSelectedCompanyId(isSelected ? null : c.id)}>
                                            <td data-label="Subsidiary Company">
                                                <div className="admin-identity-cell">
                                                    <div className="company-logo-circle" style={{ width: '42px', height: '42px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', flexShrink: 0 }}>
                                                        <img
                                                            src={c.logo ? `${BACKEND_ROOT}/uploads/logos/${c.logo}` : "/gs-logo.png"}
                                                            alt={c.name}
                                                            onError={(e) => e.target.src = "/gs-logo.png"}
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        />
                                                    </div>
                                                    <div className="admin-info-p">
                                                        <span className="admin-name-p" style={{ fontWeight: 800, fontSize: '0.92rem' }}>{c.name}</span>
                                                        <span className="admin-email-p" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: {String(c.id).padStart(4, '0')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Headquarters">
                                                <div className="location-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>
                                                    <FiMapPin style={{ color: 'var(--gold-accent)' }} />
                                                    <span>{c.location || 'Not Specified'}</span>
                                                </div>
                                            </td>
                                            <td data-label="Job Listings" style={{ textAlign: 'center' }}>
                                                <span 
                                                    className="count-badge-p" 
                                                    style={{ 
                                                        background: c.activeVacancies > 0 ? 'rgba(22, 163, 74, 0.06)' : '#f8fafc', 
                                                        border: c.activeVacancies > 0 ? '1px solid rgba(22, 163, 74, 0.25)' : '1px solid #e2e8f0', 
                                                        padding: '4px 10px', 
                                                        borderRadius: '8px', 
                                                        fontWeight: 700, 
                                                        color: '#334155', 
                                                        fontSize: '0.85rem' 
                                                    }}
                                                >
                                                    {c.totalVacancies}{' '}
                                                    <span 
                                                        style={{ 
                                                            fontSize: '0.75rem', 
                                                            fontWeight: c.activeVacancies > 0 ? 700 : 500, 
                                                            color: c.activeVacancies > 0 ? '#16a34a' : '#94a3b8' 
                                                        }}
                                                    >
                                                        ({c.activeVacancies} Live)
                                                    </span>
                                                </span>
                                            </td>
                                            <td data-label="Applications" style={{ textAlign: 'center' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: 800, color: c.totalApplications > 0 ? 'var(--crimson)' : '#64748b' }}>
                                                    {c.totalApplications}
                                                </span>
                                            </td>
                                            <td data-label="Analysis" style={{ textAlign: 'center' }}>
                                                <button className="o-btn view mobile-analysis-btn" title="Expand Recruitment Breakdown" style={{ border: 'none', background: isSelected ? 'var(--crimson)' : 'rgba(139,26,43,0.05)', color: isSelected ? '#fff' : 'var(--crimson)', transition: 'all 0.2s', margin: '0 auto' }}>
                                                    <FiExternalLink />
                                                    <span className="mobile-btn-text" style={{ display: 'none' }}>{isSelected ? 'Close Details' : 'View Details'}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT COLUMN: DIVISION DETAIL BREAKDOWN PANEL */}
                {selectedCompanyId && selectedCompanyReport && (
                    <div className="results-card-p animate-slide-left breakdown-sidebar-panel" style={{ border: '1px solid rgba(200, 169, 81, 0.2)', boxShadow: '0 12px 36px rgba(0,0,0,0.06)' }}>
                        <div className="orchestration-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #fff, #fafafa)', position: 'relative' }}>
                            <button className="close-btn-p" style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }} onClick={(e) => { e.stopPropagation(); setSelectedCompanyId(null); }}>
                                <FiX size={14} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden', padding: '4px', flexShrink: 0 }}>
                                    <img
                                        src={selectedCompanyReport.logo ? `${BACKEND_ROOT}/uploads/logos/${selectedCompanyReport.logo}` : "/gs-logo.png"}
                                        alt={selectedCompanyReport.name}
                                        onError={(e) => e.target.src = "/gs-logo.png"}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                </div>
                                <div style={{ minWidth: 0, flex: 1, paddingRight: '24px' }}>
                                    <h3 style={{ fontSize: '1.05rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b', fontWeight: 800 }}>{selectedCompanyReport.name}</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{selectedCompanyReport.location || 'Colombo, Sri Lanka'}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 24px' }}>
                            <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--crimson)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Active Pipelines ({selectedCompanyReport.totalVacancies})</h4>
                            
                            {selectedCompanyReport.vacanciesList.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                                    <FiBriefcase size={28} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>No vacancies registered under this subsidiary.</p>
                                </div>
                            ) : (
                                <div className="pipeline-drilldown-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {selectedCompanyReport.vacanciesList.map(v => {
                                        const isActive = new Date(v.expire_date) > new Date() && v.is_active;
                                        return (
                                            <div key={v.id} className="drilldown-card" style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => navigate(`/admin/applicants?vacancy_id=${v.id}`)}>
                                                <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                                                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</strong>
                                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>Ref: {v.reference_number || `ID: ${v.id}`}</span>
                                                    <span className={`drilldown-status-dot ${isActive ? 'active' : 'expired'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: isActive ? '#10b981' : '#94a3b8', marginTop: '6px' }}>
                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isActive ? '#10b981' : '#94a3b8' }}></span>
                                                        {isActive ? 'Live' : 'Ended'}
                                                    </span>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--crimson)' }}>{v.application_count || 0}</span>
                                                    <span style={{ display: 'block', fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Applicants</span>
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

            <style jsx="true">{`
                .selected-row-active td {
                    border-top: 1px solid rgba(139,26,43,0.15) !important;
                    border-bottom: 1px solid rgba(139,26,43,0.15) !important;
                }
                .selected-row-active td:first-child {
                    border-left: 3px solid var(--crimson) !important;
                }
                
                .drilldown-card:hover {
                    background: #fff !important;
                    border-color: rgba(200, 169, 81, 0.3) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
                }

                .pipeline-drilldown-list::-webkit-scrollbar {
                    width: 4px;
                }
                .pipeline-drilldown-list::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .pipeline-drilldown-list::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }

                /* ── RESPONSIVE COMPONENT STYLES ── */
                .premium-admins-page {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }

                /* 1. HERO BANNER RESPONSIVENESS */
                @media (max-width: 768px) {
                    .dashboard-hero-premium {
                        padding: 20px 18px !important;
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 16px !important;
                        border-radius: 16px !important;
                    }
                    .hero-badge-p {
                        font-size: 0.68rem !important;
                        padding: 4px 12px !important;
                        margin-bottom: 10px !important;
                    }
                    .hero-title-p {
                        font-size: 1.35rem !important;
                        line-height: 1.25 !important;
                    }
                    .hero-subtitle-p {
                        font-size: 0.8rem !important;
                        margin-top: 6px !important;
                        line-height: 1.4 !important;
                    }
                    .hero-actions-p {
                        width: 100% !important;
                        margin-top: 4px !important;
                    }
                    .hero-actions-p .btn-hero-p {
                        width: 100% !important;
                        justify-content: center !important;
                        padding: 10px 16px !important;
                        font-size: 0.85rem !important;
                        border-radius: 10px !important;
                    }
                }

                /* 2. STATS MOSAIC GRID RESPONSIVENESS */
                @media (min-width: 1025px) {
                    .stats-mosaic-grid.admin-grid-4 {
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 16px !important;
                    }
                }

                @media (max-width: 1024px) and (min-width: 601px) {
                    .stats-mosaic-grid.admin-grid-4 {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 14px !important;
                    }
                }

                @media (max-width: 600px) {
                    .stats-mosaic-grid.admin-grid-4 {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 10px !important;
                    }
                }

                @media (max-width: 440px) {
                    .stats-mosaic-grid.admin-grid-4 {
                        grid-template-columns: 1fr !important;
                        gap: 10px !important;
                    }
                }

                /* 3. SEARCH TOOLBAR RESPONSIVENESS */
                @media (max-width: 768px) {
                    .console-toolbar-p {
                        padding: 10px 12px !important;
                        margin-bottom: 16px !important;
                        border-radius: 14px !important;
                    }
                    .console-toolbar-p input {
                        font-size: 0.82rem !important;
                        padding-top: 10px !important;
                        padding-bottom: 10px !important;
                    }
                }

                /* 4. SPLIT LAYOUT RESPONSIVENESS */
                .analytics-layout-split {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 20px;
                    align-items: start;
                    transition: all 0.3s ease;
                }

                @media (min-width: 1100px) {
                    .analytics-layout-split.has-sidebar {
                        grid-template-columns: 1fr 380px !important;
                    }
                }

                @media (max-width: 1099px) {
                    .analytics-layout-split.has-sidebar {
                        grid-template-columns: 1fr !important;
                    }
                }

                /* 5. TABLE & DESKTOP STYLING */
                .table-wrapper-p {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                .premium-table.orchestration-table th {
                    font-size: 0.68rem;
                    letter-spacing: 1.2px;
                    padding: 12px 14px;
                    white-space: nowrap;
                }

                .premium-table.orchestration-table td {
                    padding: 12px 14px;
                    vertical-align: middle;
                }

                /* 6. MOBILE CARD TRANSFORM FOR TABLE (SCREENS <= 768px) */
                @media (max-width: 768px) {
                    .table-wrapper-p {
                        overflow-x: visible !important;
                    }

                    .premium-table.orchestration-table {
                        min-width: 0 !important;
                        width: 100% !important;
                        display: block !important;
                    }

                    .premium-table.orchestration-table thead {
                        display: none !important;
                    }

                    .premium-table.orchestration-table tbody {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 12px !important;
                    }

                    .premium-table.orchestration-table tbody tr.orchestration-row {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 10px 12px !important;
                        background: #ffffff !important;
                        border-radius: 16px !important;
                        border: 1px solid #e2e8f0 !important;
                        padding: 14px 16px !important;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
                        box-sizing: border-box !important;
                    }

                    .premium-table.orchestration-table tbody tr.orchestration-row.selected-row-active {
                        border-color: var(--crimson) !important;
                        background: rgba(139,26,43,0.02) !important;
                    }

                    .premium-table.orchestration-table tbody tr td[data-label="Subsidiary Company"] {
                        grid-column: 1 / -1 !important;
                        padding-bottom: 8px !important;
                        border-bottom: 1px dashed #e2e8f0 !important;
                    }

                    .premium-table.orchestration-table tbody tr td[data-label="Headquarters"] {
                        grid-column: 1 / -1 !important;
                    }


                    .premium-table.orchestration-table tbody tr td[data-label="Analysis"] {
                        grid-column: 1 / -1 !important;
                        padding-top: 8px !important;
                        border-top: 1px solid #f1f5f9 !important;
                        display: flex !important;
                        justify-content: flex-end !important;
                    }

                    .premium-table.orchestration-table tbody tr td {
                        display: block !important;
                        padding: 0 !important;
                        border: none !important;
                        text-align: left !important;
                    }

                    .premium-table.orchestration-table tbody tr td::before {
                        content: attr(data-label);
                        display: block;
                        font-size: 0.65rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.8px;
                        color: #94a3b8;
                        margin-bottom: 4px;
                    }

                    .premium-table.orchestration-table tbody tr td[data-label="Subsidiary Company"]::before,
                    .premium-table.orchestration-table tbody tr td[data-label="Analysis"]::before {
                        display: none !important;
                    }

                    .share-metric-container {
                        width: 100% !important;
                    }

                    .mobile-analysis-btn {
                        width: 100% !important;
                        height: 38px !important;
                        border-radius: 10px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 8px !important;
                        font-size: 0.82rem !important;
                        font-weight: 700 !important;
                    }

                    .mobile-btn-text {
                        display: inline-block !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default CompanyReports;
