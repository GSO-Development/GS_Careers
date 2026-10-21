import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    FiPlus, FiEdit2, FiTrash2, FiX, FiShield, FiUserCheck,
    FiMail, FiUser, FiHome, FiCheckCircle, FiAlertCircle,
    FiActivity, FiTrendingUp, FiTarget, FiSearch, FiFilter, FiKey, FiChevronLeft, FiChevronRight,
    FiCopy, FiCheck, FiChevronDown, FiChevronUp, FiRotateCcw
} from 'react-icons/fi';
import './ManageAdmins.css';
import PaginationFooter from '../../components/PaginationFooter';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin, getCompanies, resetAdminPassword } from '../../services/api';
import { copyToClipboard } from '../../utils/constants';

function ManageAdmins({ admin }) {
    const [admins, setAdmins] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [confirmReset, setConfirmReset] = useState(null);
    const [tempPassword, setTempPassword] = useState(null);
    const [copiedPassword, setCopiedPassword] = useState(false);

    const handleCopyPassword = async () => {
        if (!tempPassword) return;
        const success = await copyToClipboard(tempPassword);
        if (success) {
            setCopiedPassword(true);
            toast.success('Temporary password copied to clipboard!');
            setTimeout(() => setCopiedPassword(false), 2500);
        } else {
            toast.error('Failed to copy password');
        }
    };
    const [form, setForm] = useState({
        username: '', email: '', full_name: '', role: 'sub_admin1', company_id: '', is_active: 1
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [admRes, compRes] = await Promise.all([
                getAdmins(),
                getCompanies()
            ]);
            setAdmins(admRes.data.data || []);
            setCompanies(compRes.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ username: '', email: '', full_name: '', role: 'sub_admin1', company_id: '', is_active: 1 });
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (a) => {
        setForm({
            username: a.username,
            email: a.email,
            full_name: a.full_name,
            role: a.role,
            company_id: a.company_id || '',
            is_active: parseInt(a.is_active)
        });
        setEditingId(a.id);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.full_name || !form.email || !form.username) {
            toast.error('Please fill in all required fields');
            return;
        }
        if ((form.role === 'sub_admin1' || form.role === 'sub_admin2') && !form.company_id) {
            toast.error('Company is required for this role');
            return;
        }

        if (editingId) {
            const currentEditing = admins.find(a => a.id === editingId);
            const totalSuperAdmins = admins.filter(a => a.role === 'super_admin').length;
            if (currentEditing?.role === 'super_admin' && form.role !== 'super_admin' && totalSuperAdmins <= 1) {
                toast.error('Cannot change the role of the last remaining Super Admin');
                return;
            }
            if (currentEditing?.role === 'super_admin' && parseInt(form.is_active) === 0 && totalSuperAdmins <= 1) {
                toast.error('Cannot deactivate the last remaining Super Admin');
                return;
            }
        }

        try {
            if (editingId) {
                const data = { ...form, id: editingId };
                await updateAdmin(data);
                toast.success('Admin updated');
                setShowModal(false);
                resetForm();
            } else {
                const res = await createAdmin(form);
                toast.success('Admin created');
                setTempPassword(res.data.data.temp_password);
                setShowModal(false);
                resetForm();
            }
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDeleteClick = (target) => {
        const totalSuperAdmins = admins.filter(a => a.role === 'super_admin').length;
        if (target.role === 'super_admin' && totalSuperAdmins <= 1) {
            toast.error('Cannot delete the last remaining Super Admin account in the system');
            return;
        }
        setConfirmDelete(target);
    };

    const handleDelete = async (id) => {
        const targetAdmin = admins.find(a => a.id === id);
        const totalSuperAdmins = admins.filter(a => a.role === 'super_admin').length;
        if (targetAdmin?.role === 'super_admin' && totalSuperAdmins <= 1) {
            toast.error('Cannot delete the last remaining Super Admin account in the system');
            setConfirmDelete(null);
            return;
        }

        try {
            const res = await deleteAdmin({ id });
            toast.success(targetAdmin?.role === 'super_admin' ? 'Super Admin deleted successfully' : 'Admin deleted successfully');
            setConfirmDelete(null);

            // If the user deleted their own account
            if (id === admin.id || res.data?.data?.is_self) {
                localStorage.removeItem('gs_admin_token');
                localStorage.removeItem('gs_admin_data');
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 1200);
                return;
            }

            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleResetPassword = async (id) => {
        try {
            const res = await resetAdminPassword({ id });
            toast.success('Password reset successfully');
            setTempPassword(res.data.data.temp_password);
            setConfirmReset(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reset failed');
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, companyFilter, statusFilter]);

    const filteredAdmins = admins.filter(a => {
        const matchesSearch = !searchTerm || (
            (a.full_name && a.full_name.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.username && a.username.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        const matchesRole = !roleFilter || a.role === roleFilter;
        const matchesCompany = !companyFilter || String(a.company_id) === String(companyFilter);

        let matchesStatus = true;
        if (statusFilter === 'active') {
            matchesStatus = !!a.is_active;
        } else if (statusFilter === 'inactive') {
            matchesStatus = !a.is_active;
        }
        
        return matchesSearch && matchesRole && matchesCompany && matchesStatus;
    });

    const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAdmins = filteredAdmins.slice(startIndex, startIndex + itemsPerPage);

    const stats = {
        total: admins.length,
        super: admins.filter(a => a.role === 'super_admin').length,
        adminRole: admins.filter(a => a.role === 'admin').length,
        sub: admins.filter(a => ['sub_admin1', 'sub_admin2', 'sub_admin'].includes(a.role)).length,
        active: admins.filter(a => a.is_active).length,
        companies: new Set(admins.filter(a => a.company_id).map(a => a.company_id)).size
    };

    return (
        <div className="premium-admins-page">
            {/* HERITAGE CINEMATIC HERO */}
            <div className="dashboard-hero-premium">
                <div className="hero-content-p">
                    <div className="hero-badge-p"><FiActivity /> System Executive Suite</div>
                    <h1 className="hero-title-p">Access Management</h1>
                    <p className="hero-subtitle-p">George Steuart Recruitment Orchestration | Identity & Access Control</p>
                </div>
                {(admin.role === 'super_admin' || admin.role === 'admin') && (
                    <div className="hero-actions-p">
                        <button className="btn-hero-p primary" onClick={openCreate}>
                            <FiPlus /> Establish New Admin
                        </button>
                    </div>
                )}
                <div className="hero-bg-accent"></div>
            </div>

            {/* PERFORMANCE SNAPSHOT */}
            <div className="stats-mosaic-grid admin-grid-4">
                <div className="db-stat-card gold">
                    <div className="db-s-header">
                        <span className="db-s-label">Total Administrators</span>
                        <div className="db-s-icon"><FiUser /></div>
                    </div>
                    <span className="db-s-value">{stats.total}</span>
                    <div className="db-s-trend"><FiTrendingUp /> Global Registry</div>
                </div>
                <div className="db-stat-card green">
                    <div className="db-s-header">
                        <span className="db-s-label">Strategic (Super)</span>
                        <div className="db-s-icon"><FiShield /></div>
                    </div>
                    <span className="db-s-value">{stats.super}</span>
                    <div className="db-s-trend positive"><FiTrendingUp /> Root Authority</div>
                </div>
                <div className="db-stat-card blue">
                    <div className="db-s-header">
                        <span className="db-s-label">Operational (Admin/Sub)</span>
                        <div className="db-s-icon"><FiUserCheck /></div>
                    </div>
                    <span className="db-s-value">{stats.adminRole} / {stats.sub}</span>
                    <div className="db-s-trend"><FiTrendingUp /> Company Scoped</div>
                </div>
                <div className="db-stat-card purple">
                    <div className="db-s-header">
                        <span className="db-s-label">Active Organizations</span>
                        <div className="db-s-icon"><FiTarget /></div>
                    </div>
                    <span className="db-s-value">{stats.companies}</span>
                    <div className="db-s-trend"><FiTrendingUp /> Stakeholders</div>
                </div>
            </div>

            {/* MODERN COLLAPSIBLE FILTER SUITE */}
            {(() => {
                const activeAdminFilterCount = [roleFilter, companyFilter, statusFilter].filter(Boolean).length;
                const hasAdminActiveFilters = Boolean(searchTerm || roleFilter || companyFilter || statusFilter);
                const activeAdminChips = [];
                if (searchTerm) activeAdminChips.push({ key: 'search', label: `Search: "${searchTerm}"`, clear: () => setSearchTerm('') });
                if (roleFilter) activeAdminChips.push({ key: 'role', label: `Role: ${roleFilter}`, clear: () => setRoleFilter('') });
                if (companyFilter) {
                    const comp = companies.find(c => String(c.id) === String(companyFilter))?.name || 'Establishment';
                    activeAdminChips.push({ key: 'company', label: `Entity: ${comp}`, clear: () => setCompanyFilter('') });
                }
                if (statusFilter) activeAdminChips.push({ key: 'status', label: `Status: ${statusFilter}`, clear: () => setStatusFilter('') });

                return (
                    <div className="applicant-filter-card">
                        <div className="filter-top-bar">
                            <div className="filter-search-wrapper">
                                <div className="search-input-box">
                                    <FiSearch className="search-lead-icon" />
                                    <input
                                        id="admin_search"
                                        name="admin_search"
                                        type="text"
                                        placeholder="Search by name, email, or @handle..."
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
                                    className={`btn-toggle-filters ${showFilterPanel ? 'active' : ''} ${activeAdminFilterCount > 0 ? 'has-active' : ''}`}
                                    onClick={() => setShowFilterPanel(prev => !prev)}
                                    title="Toggle filter options"
                                >
                                    <FiFilter className="btn-filter-icon" />
                                    <span>Filters</span>
                                    {activeAdminFilterCount > 0 && (
                                        <span className="filter-count-badge">{activeAdminFilterCount}</span>
                                    )}
                                    {showFilterPanel ? <FiChevronUp className="btn-chevron-icon" /> : <FiChevronDown className="btn-chevron-icon" />}
                                </button>

                                {hasAdminActiveFilters && (
                                    <button 
                                        type="button" 
                                        className="btn-clear-all-filters" 
                                        onClick={() => {
                                            setSearchTerm('');
                                            setRoleFilter('');
                                            setCompanyFilter('');
                                            setStatusFilter('');
                                        }}
                                        title="Reset all filters"
                                    >
                                        <FiRotateCcw size={13} /> Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeAdminChips.length > 0 && (
                            <div className="active-filter-chips-row">
                                <span className="chips-label">Active Filters:</span>
                                <div className="chips-list">
                                    {activeAdminChips.map(chip => (
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
                                    <span className="panel-title-text">Filter Administrative Registry</span>
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
                                    <div className={`filter-field-box ${roleFilter ? 'has-value' : ''}`}>
                                        <label htmlFor="role_filter">
                                            <FiFilter className="field-icon" /> Authority Role
                                        </label>
                                        <div className="custom-select-wrapper">
                                            <select 
                                                id="role_filter" 
                                                name="role_filter" 
                                                value={roleFilter} 
                                                onChange={(e) => setRoleFilter(e.target.value)}
                                            >
                                                <option value="">All Authority Roles</option>
                                                {admin.role === 'super_admin' && (
                                                    <>
                                                        <option value="super_admin">Super Admins Only</option>
                                                        <option value="admin">GS Admins Only</option>
                                                    </>
                                                )}
                                                <option value="sub_admin1">Sub Admins 1 Only</option>
                                                <option value="sub_admin2">Sub Admins 2 Only</option>
                                            </select>
                                        </div>
                                    </div>

                                    {(admin.role === 'super_admin' || admin.role === 'admin') && (
                                        <div className={`filter-field-box ${companyFilter ? 'has-value' : ''}`}>
                                            <label htmlFor="admin_company_filter">
                                                <FiHome className="field-icon" /> Establishment
                                            </label>
                                            <div className="custom-select-wrapper">
                                                <select 
                                                    id="admin_company_filter" 
                                                    name="company_filter" 
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
                                        <label htmlFor="admin_status_filter">
                                            <FiCheckCircle className="field-icon" /> Account Status
                                        </label>
                                        <div className="custom-select-wrapper">
                                            <select 
                                                id="admin_status_filter" 
                                                name="status_filter" 
                                                value={statusFilter} 
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="active">Active Only</option>
                                                <option value="inactive">Inactive Only</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Admins Table */}
            <div className="results-card-p orchestration-container">
                <div className="orchestration-header" style={{ flexWrap: 'wrap', gap: '20px', padding: '24px 32px' }}>
                    <div className="h-left">
                        <h3 style={{ fontSize: '1.4rem' }}>Identity Audit Log</h3>
                        <p style={{ fontSize: '0.85rem' }}>Authorized access points and administrative signatures.</p>
                    </div>
                    <div className="h-right">
                        <span className="count-badge">{filteredAdmins.length} Profiles Identified</span>
                    </div>
                </div>
                <div className="table-wrapper-p">
                    <table className="premium-table orchestration-table">
                        <colgroup>
                            <col style={{ width: '28%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '15%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>IDENTIFIER</th>
                                <th>AUTHORITY LEVEL</th>
                                <th>SCOPE OF ACCESS</th>
                                <th>SYSTEM STATUS</th>
                                <th style={{ textAlign: 'center' }}>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '60px', textAlign: 'center' }}>
                                        <div className="spinner-p"></div>
                                        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Synchronizing administrator registry...</p>
                                    </td>
                                </tr>
                            ) : paginatedAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="empty-cell">
                                        <div className="no-results" style={{ padding: '60px', textAlign: 'center' }}>
                                            <FiUser size={48} style={{ color: 'var(--border-light)', marginBottom: '16px' }} />
                                            <p style={{ color: 'var(--text-muted)' }}>No administrative profiles match your current decryption criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedAdmins.map(a => (
                                <tr key={a.id} className="orchestration-row">
                                    <td data-label="Identifier">
                                        <div className="admin-identity-cell">
                                            <div className="admin-avatar-p">{a.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
                                            <div className="admin-info-p">
                                                <span className="admin-name-p">{a.full_name}</span>
                                                <span className="admin-email-p"><FiMail size={11} /> {a.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Authority Level">
                                        <div className="role-cell">
                                            <span className={`role-badge-p ${a.role === 'super_admin' ? 'role-super' : (a.role === 'admin' ? 'role-admin' : 'role-sub')}`}>
                                                {a.role === 'super_admin' ? 'Super Admin' : (a.role === 'admin' ? 'GS Admin' : (a.role === 'sub_admin1' ? 'Sub Admin 1' : (a.role === 'sub_admin2' ? 'Sub Admin 2' : 'Sub Admin')))}
                                            </span>
                                            <div className="admin-email-p" style={{ marginTop: '4px' }}>@{a.username}</div>
                                        </div>
                                    </td>
                                    <td data-label="Scope of Access">
                                        <div className="company-cell" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            {a.company_name ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FiHome size={13} style={{ color: 'var(--gold-accent)' }} /> {a.company_name}
                                                </div>
                                            ) : (
                                                <span className="all-access" style={{ fontWeight: 700, color: 'var(--crimson)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System-wide Access</span>
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="System Status">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className={`status-pill ${a.is_active ? 'active' : 'inactive'}`} style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800, background: a.is_active ? '#ecfdf5' : '#fef2f2', color: a.is_active ? '#10b981' : '#ef4444' }}>
                                                {a.is_active ? 'Active' : 'Decommissioned'}
                                            </span>
                                        </div>
                                    </td>
                                    <td data-label="Operations">
                                        <div className="orchestration-actions" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            {/* super_admin rows are locked only for non-super_admin viewers */}
                                            {(admin.role !== 'super_admin' && (a.role === 'super_admin' || a.role === 'admin')) ? (
                                                <div className="protected-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--crimson)', display: 'flex', alignItems: 'center', gap: '6px' }}><FiShield /> CORE AUTHORITY</div>
                                            ) : (
                                                <>
                                                    <button className="o-btn edit" onClick={() => openEdit(a)} title="Update Credentials">
                                                        <FiEdit2 />
                                                    </button>
                                                    <button className="o-btn reset" onClick={() => setConfirmReset(a)} title="Reset Password" style={{ color: 'var(--gold-accent)' }}>
                                                        <FiKey />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="o-btn delete"
                                                        onClick={() => handleDeleteClick(a)}
                                                        title={a.role === 'super_admin' ? "Decommission Super Admin Profile" : "Decommission Profile"}
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <PaginationFooter
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredAdmins.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    label="administrators"
                />
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay-p" onClick={() => setShowModal(false)}>
                    <div className="admin-modal-p confirm-modal card-p animated-zoom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', textAlign: 'left', overflow: 'hidden' }}>
                        <div className="modal-header-p" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{editingId ? 'Update Credentials' : 'Create Administrator'}</h2>
                            <button className="close-btn-p" onClick={() => setShowModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body-p" style={{ padding: '32px', overflowY: 'auto', maxHeight: '70vh' }}>
                                <div className="form-grid-p" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
                                    <div className="form-group-p full-width" style={{ gridColumn: '1 / -1' }}>
                                        <label htmlFor="full_name">Full Name</label>
                                        <div className="input-with-icon">
                                            <FiUser className="i" />
                                            <input
                                                id="full_name"
                                                name="full_name"
                                                type="text"
                                                value={form.full_name}
                                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                                placeholder="e.g. John Doe"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group-p">
                                        <label htmlFor="username">Username</label>
                                        <input
                                            id="username"
                                            name="username"
                                            type="text"
                                            value={form.username}
                                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                                            placeholder="username"
                                            disabled={!!editingId}
                                            required
                                        />
                                    </div>

                                    <div className="form-group-p">
                                        <label htmlFor="email">Email Address</label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            placeholder="name@georgesteuart.com"
                                            required
                                        />
                                    </div>

                                    <div className="form-group-p">
                                        <label htmlFor="role">System Role</label>
                                        <select 
                                            id="role" 
                                            name="role" 
                                            value={form.role} 
                                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                                            disabled={Boolean(editingId && admins.find(a => a.id === editingId)?.role === 'super_admin' && admins.filter(a => a.role === 'super_admin').length <= 1)}
                                        >
                                            {admin.role === 'super_admin' && (
                                                <>
                                                    <option value="super_admin">Super Admin</option>
                                                    <option value="admin">GS Admin</option>
                                                </>
                                            )}
                                            <option value="sub_admin1">Sub Admin 1</option>
                                            <option value="sub_admin2">Sub Admin 2</option>
                                        </select>
                                        {Boolean(editingId && admins.find(a => a.id === editingId)?.role === 'super_admin' && admins.filter(a => a.role === 'super_admin').length <= 1) && (
                                            <small style={{ color: 'var(--crimson)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Role locked: This is the last remaining Super Admin.</small>
                                        )}
                                    </div>

                                    {(form.role === 'sub_admin1' || form.role === 'sub_admin2') && (
                                        <div className="form-group-p">
                                            <label htmlFor="company_id">Assign Company</label>
                                            <select
                                                id="company_id"
                                                name="company_id"
                                                value={form.company_id}
                                                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select company</option>
                                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {editingId && (
                                        <div className="form-group-p">
                                            <label htmlFor="is_active">Account Status</label>
                                            <select 
                                                id="is_active" 
                                                name="is_active" 
                                                value={form.is_active} 
                                                onChange={(e) => setForm({ ...form, is_active: parseInt(e.target.value) })}
                                                disabled={Boolean(admins.find(a => a.id === editingId)?.role === 'super_admin' && admins.filter(a => a.role === 'super_admin').length <= 1)}
                                            >
                                                <option value={1}>Active</option>
                                                <option value={0}>Inactive</option>
                                            </select>
                                            {Boolean(admins.find(a => a.id === editingId)?.role === 'super_admin' && admins.filter(a => a.role === 'super_admin').length <= 1) && (
                                                <small style={{ color: 'var(--crimson)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Status locked: Cannot deactivate the last remaining Super Admin.</small>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer-p">
                                <button type="button" className="btn-cancel-p" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-gold">{editingId ? 'Update Access' : 'Provision Account'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {confirmDelete && (
                <div className="modal-overlay-p" onClick={() => setConfirmDelete(null)}>
                    <div className="delete-modal-p" onClick={(e) => e.stopPropagation()}>
                        <div className="alert-vibe"><FiAlertCircle /></div>
                        <h3>{confirmDelete.role === 'super_admin' ? 'Delete Super Administrator?' : 'Revoke Access?'}</h3>
                        <p>
                            {confirmDelete.role === 'super_admin' ? (
                                <>You are about to delete Super Administrator <strong>{confirmDelete.full_name}</strong>. This account will immediately lose all system-wide access.</>
                            ) : (
                                <>You are about to delete <strong>{confirmDelete.full_name}</strong>. This person will immediately lose all administrative access.</>
                            )}
                        </p>
                        <div className="delete-actions-p">
                            <button className="btn-cancel-p" onClick={() => setConfirmDelete(null)}>No, Keep</button>
                            <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Yes, Revoke Access</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirmation */}
            {confirmReset && (
                <div className="modal-overlay-p" onClick={() => setConfirmReset(null)}>
                    <div className="delete-modal-p" onClick={(e) => e.stopPropagation()}>
                        <div className="alert-vibe" style={{ background: 'rgba(200, 169, 81, 0.1)', color: 'var(--gold-accent)' }}><FiKey /></div>
                        <h3>Reset Password?</h3>
                        <p>You are about to generate a new temporary password for <strong>{confirmReset.full_name}</strong>. Their current password will stop working immediately.</p>
                        <div className="delete-actions-p">
                            <button className="btn-cancel-p" onClick={() => setConfirmReset(null)}>Cancel</button>
                            <button className="btn btn-gold" onClick={() => handleResetPassword(confirmReset.id)}>Generate New Password</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Temp Password Modal */}
            {tempPassword && (
                <div className="modal-overlay-p">
                    <div className="success-modal-p">
                        <div className="success-vibe"><FiCheckCircle /></div>
                        <h3>Account Provisioned</h3>
                        <p>Access has been created. Use this temporary password for the first login:</p>
                        <div className="password-display-p" style={{ position: 'relative', cursor: 'pointer', paddingRight: '48px' }} onClick={handleCopyPassword} title="Click to Copy">
                            {tempPassword}
                            <div className="copy-hint" style={{ 
                                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', 
                                fontSize: '1.1rem', color: copiedPassword ? '#10b981' : '#c8a951',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease'
                            }}>
                                {copiedPassword ? <FiCheck /> : <FiCopy />}
                            </div>
                        </div>
                        <p className="note-p">This password will expire after one-time use.</p>
                        <button className="btn btn-gold full-btn" onClick={() => setTempPassword(null)}>Done. I have copied it.</button>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                .premium-admins-page {
                    animation: fadeIn 0.4s ease-out;
                    max-width: 1300px;
                    margin: 0 auto;
                }

                /* HERITAGE CINEMATIC HERO */
                .dashboard-hero-premium {
                    position: relative;
                    background: linear-gradient(135deg, var(--crimson-dark) 0%, var(--crimson) 100%);
                    border-radius: 20px;
                    padding: 24px;
                    overflow: hidden;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .hero-content-p { position: relative; z-index: 2; }
                .hero-badge-p {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(200, 169, 81, 0.1);
                    border: 1px solid rgba(200, 169, 81, 0.2);
                    padding: 6px 16px;
                    border-radius: 100px;
                    color: var(--gold-accent);
                    font-size: 0.75rem;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                }

                .hero-title-p {
                    color: #fff;
                    font-family: var(--font-heading);
                    font-size: 1.8rem;
                    margin: 0;
                    letter-spacing: -0.5px;
                    line-height: 1.1;
                }

                .hero-subtitle-p {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.9rem;
                    margin-top: 8px;
                }

                .btn-hero-p {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border: none;
                }

                .btn-hero-p.primary {
                    background: var(--gold-accent);
                    color: #2a050b;
                    box-shadow: 0 10px 30px rgba(200, 169, 81, 0.3);
                }

                .btn-hero-p:hover { transform: translateY(-5px); box-shadow: 0 15px 40px rgba(0,0,0,0.3); }

                .hero-bg-accent {
                    position: absolute;
                    top: -100px; right: -100px;
                    width: 500px; height: 500px;
                    background: radial-gradient(circle, rgba(200, 169, 81, 0.15) 0%, transparent 70%);
                    z-index: 1;
                    pointer-events: none;
                }

                /* STATS MOSAIC */
                .stats-mosaic-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .stat-glass-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 20px;
                    border: 1px solid #fff;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
                    transition: transform 0.3s;
                }

                .stat-glass-card:hover { transform: translateY(-8px); }
                .stat-glass-card .s-icon {
                    width: 48px; height: 48px; border-radius: 14px;
                    display: flex; items: center; justify-content: center; font-size: 1.4rem;
                }

                .stat-glass-card.gold .s-icon { background: #fffbeb; color: #b45309; }
                .stat-glass-card.green .s-icon { background: #f0fdf4; color: #166534; }
                .stat-glass-card.blue .s-icon { background: #eff6ff; color: #1e40af; }
                .stat-glass-card.purple .s-icon { background: #faf5ff; color: #6b21a8; }

                .s-info .s-label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                .s-info .s-value { display: block; font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-top: 4px; }
                .s-trend { font-size: 0.75rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 6px; }

                /* REFINED CONSOLE TOOLBAR */
                .console-toolbar-p {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 24px;
                    background: #fff;
                    padding: 20px;
                    border-radius: 20px;
                    border: 1px solid var(--border-light);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                }

                .toolbar-search-row {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .search-orchestrator {
                    position: relative;
                    flex: 1;
                }

                .search-orchestrator .s-icon {
                    position: absolute;
                    left: 18px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    font-size: 1.1rem;
                    z-index: 10;
                }

                .search-orchestrator input {
                    width: 100%;
                    padding: 12px 20px 12px 48px;
                    border-radius: 12px;
                    border: 1.5px solid #f1f5f9;
                    background: #f8fafc;
                    font-size: 0.9rem;
                    transition: all 0.3s;
                }

                .search-orchestrator input:focus {
                    outline: none;
                    background: #fff;
                    border-color: var(--crimson);
                    box-shadow: 0 0 0 4px rgba(139, 26, 43, 0.05);
                }

                .btn-reset-p {
                    background: #fff;
                    color: var(--text-muted);
                    border: 1.5px solid #f1f5f9;
                    padding: 0 20px;
                    height: 48px;
                    border-radius: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.85rem;
                    flex-shrink: 0;
                }

                .btn-reset-p:hover {
                    background: #fef2f2;
                    color: var(--crimson);
                    border-color: #fee2e2;
                }

                .toolbar-filters-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    padding-top: 16px;
                    border-top: 1px solid #f1f5f9;
                }

                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .filter-group label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    padding-left: 4px;
                }

                .select-orchestrator {
                    position: relative;
                }

                .f-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--crimson);
                    pointer-events: none;
                    z-index: 10;
                }

                .select-orchestrator select {
                    padding: 0 40px 0 38px;
                    height: 46px;
                    border-radius: 12px;
                    border: 1.5px solid #f1f5f9;
                    background: #f8fafc;
                    font-size: 0.85rem;
                    font-weight: 700;
                    appearance: none;
                    cursor: pointer;
                    color: var(--text-primary);
                    transition: all 0.2s;
                }

                .select-orchestrator select:focus {
                    outline: none;
                    border-color: var(--crimson);
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(139, 26, 43, 0.05);
                }

                .select-lg { min-width: 200px; }

                /* ORCHESTRATION TABLE */
                .orchestration-container { 
                    border-radius: 20px; 
                    padding: 0 !important;
                    background: #fff;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03);
                    border: 1px solid rgba(0,0,0,0.03);
                }

                .orchestration-header {
                    padding: 20px 24px; 
                    border-bottom: 1px solid #f1f5f9;
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    background: linear-gradient(to right, #fff, #fafafa);
                }

                .orchestration-header h3 { 
                    font-family: var(--font-heading); 
                    font-size: 1.2rem; 
                    margin: 0; 
                    color: #1e293b; 
                    letter-spacing: -0.5px;
                }

                .orchestration-header p { 
                    margin: 4px 0 0; 
                    color: #94a3b8; 
                    font-size: 0.85rem; 
                    font-weight: 500;
                }

                .count-badge { 
                    padding: 8px 18px; 
                    background: rgba(148, 163, 184, 0.1); 
                    border-radius: 100px; 
                    font-weight: 700; 
                    font-size: 0.8rem; 
                    color: #64748b; 
                    border: 1px solid rgba(148, 163, 184, 0.1);
                }

                .table-wrapper-p {
                    overflow-x: auto;
                    width: 100%;
                }

                .premium-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    min-width: 800px;
                }
                .premium-table th { 
                    padding: 20px 32px; 
                    text-align: left; 
                    font-size: 0.75rem; 
                    font-weight: 800; 
                    color: #94a3b8; 
                    text-transform: uppercase; 
                    letter-spacing: 1.5px;
                    background: #fcfcfd;
                    border-bottom: 2px solid #f1f5f9;
                }

                .orchestration-row { 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border-bottom: 1px solid #f8fafc;
                }

                .orchestration-row:hover { 
                    background: rgba(139, 26, 43, 0.015);
                    transform: translateX(4px);
                    box-shadow: inset 4px 0 0 var(--crimson), 0 10px 30px rgba(0,0,0,0.02);
                }

                .orchestration-row td { 
                    padding: 12px 16px; 
                    vertical-align: middle;
                }

                /* Admin Identifier Cell */
                .admin-cell { display: flex; align-items: center; gap: 20px; }
                .avatar-p { 
                    width: 52px; height: 52px; border-radius: 18px; 
                    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                    display: flex; items: center; justify-content: center;
                    color: #64748b; font-size: 1.5rem;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.03);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .orchestration-row:hover .avatar-p {
                    background: var(--crimson);
                    color: #fff;
                    border-color: var(--crimson);
                    transform: rotate(-8deg) scale(1.1);
                    box-shadow: 0 10px 20px rgba(139, 26, 43, 0.2);
                }

                .info-p { display: flex; flex-direction: column; gap: 4px; }
                .name-p { font-weight: 800; color: #1e293b; font-size: 0.95rem; letter-spacing: -0.2px; }
                .email-p { font-size: 0.85rem; color: #94a3b8; font-weight: 500; display: flex; align-items: center; gap: 6px; }

                /* Authority Cell */
                .role-cell { display: flex; flex-direction: column; gap: 8px; }
                .role-pill {
                    display: inline-flex; items: center; gap: 8px;
                    padding: 6px 14px; border-radius: 10px;
                    font-size: 0.8rem; font-weight: 800; letter-spacing: 0.5px;
                    width: fit-content;
                }
                .role-pill.super { background: rgba(139, 26, 43, 0.08); color: var(--crimson); }
                .role-pill.sub { background: rgba(30, 64, 175, 0.08); color: #1e40af; }
                
                .username-p { font-size: 0.8rem; color: #64748b; font-weight: 600; opacity: 0.7; }

                /* Scope & Status */
                .company-cell { font-size: 0.95rem; color: #475569; font-weight: 600; display: flex; align-items: center; gap: 10px; }
                .all-access { color: var(--crimson); font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }

                .status-pill {
                    padding: 6px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 800;
                    text-transform: uppercase; letter-spacing: 1px;
                    border: 1px solid transparent;
                }
                .status-pill.active { 
                    background: #f0fdf4; 
                    color: #166534; 
                    border-color: rgba(22, 101, 52, 0.1);
                }
                .status-pill.inactive { 
                    background: #fff1f2; 
                    color: #be123c; 
                    border-color: rgba(190, 18, 60, 0.1);
                }

                /* Operations */
                .orchestration-actions { display: flex; gap: 14px; justify-content: center; }
                .o-btn {
                    width: 42px; height: 42px; border-radius: 12px;
                    display: flex; items: center; justify-content: center;
                    border: none; background: #f8fafc; cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
                    font-size: 1.1rem;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.02);
                }

                .o-btn.edit { 
                    color: #6366f1; 
                    background: rgba(99, 102, 241, 0.08); 
                }
                .o-btn.edit:hover { 
                    background: #6366f1; 
                    color: #fff; 
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
                }

                .o-btn.delete { 
                    color: #ef4444; 
                    background: rgba(239, 68, 68, 0.08); 
                }
                .o-btn.delete:hover { 
                    background: #ef4444; 
                    color: #fff; 
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.25);
                }

                .o-btn.reset { 
                    color: var(--gold-accent); 
                    background: rgba(200, 169, 81, 0.08); 
                }
                .o-btn.reset:hover { 
                    background: var(--gold-accent); 
                    color: #fff; 
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 8px 20px rgba(200, 169, 81, 0.25);
                }

                .protected-label {
                    font-size: 0.7rem; font-weight: 900; color: #94a3b8; 
                    background: #f8fafc; padding: 10px 18px; border-radius: 12px;
                    border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px;
                    letter-spacing: 1.5px;
                }

                .no-results { text-align: center; padding: 60px 0; color: #94a3b8; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                /* RESPONSIVENESS */
                @media (max-width: 1024px) {
                    .dashboard-hero-premium {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 30px;
                        padding: 40px;
                    }
                    
                    .hero-title-p { font-size: 2.5rem; }
                    
                    /* Removed redundant stats-mosaic-grid media query */
                }

                @media (max-width: 768px) {
                    .orchestration-toolbar {
                        grid-template-columns: 1fr 1fr;
                    }
                    
                    .filter-orchestrator { width: 100%; }
                    .f-group { width: 100%; justify-content: space-between; }
                    
                    .orchestration-header {
                        padding: 25px;
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 15px;
                    }
                    
                    .premium-table thead { display: none; }
                    
                    .orchestration-row {
                        display: block;
                        padding: 20px;
                        border-bottom: 8px solid #f1f5f9;
                    }
                    
                    .orchestration-row td {
                        display: block;
                        padding: 10px 0;
                        border: none;
                        width: 100%;
                    }
                    
                    .orchestration-row td::before {
                        content: attr(data-label);
                        display: block;
                        font-size: 0.7rem;
                        font-weight: 800;
                        color: #94a3b8;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-bottom: 5px;
                    }
                    
                    .orchestration-actions {
                        justify-content: flex-start;
                        margin-top: 10px;
                    }
                }

                @media (max-width: 480px) {
                    /* Moved to global utility classes */
                    
                    .hero-title-p { font-size: 2rem; }
                    
                    .form-grid-p { grid-template-columns: 1fr; }
                    .full-width { grid-column: span 1; }
                }

                /* Reuse existing modal styles... */


                /* Premium Modal */
                .modal-overlay-p {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }

                .admin-modal-p {
                    background: #fff;
                    width: 100%;
                    max-width: 600px;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: modalEntry 0.3s ease-out;
                }

                .modal-header-p {
                    padding: 24px 30px;
                    background: #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e2e8f0;
                }

                .modal-header-p h2 { font-family: var(--font-heading); font-size: 1.5rem; margin: 0; color: var(--text-primary); }

                .modal-body-p { padding: 30px; }
                .form-grid-p { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .full-width { grid-column: span 2; }

                .form-group-p label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .form-group-p input, .form-group-p select {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    font-size: 0.95rem;
                    background: #f8fafc;
                }

                .input-with-icon { position: relative; }
                .input-with-icon .i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .input-with-icon input { padding-left: 42px; }

                .modal-footer-p {
                    padding: 20px 30px;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    border-top: 1px solid #e2e8f0;
                }

                .btn-cancel-p { 
                    background: transparent; border: none; 
                    font-weight: 700; color: var(--text-muted); 
                    padding: 10px 20px; cursor: pointer;
                }

                /* Delete Modal */
                .delete-modal-p {
                    background: #fff;
                    width: 100%;
                    max-width: 400px;
                    padding: 40px;
                    border-radius: 24px;
                    text-align: center;
                }
                .alert-vibe { 
                    width: 60px; height: 60px; 
                    background: #fef2f2; color: #ef4444; 
                    border-radius: 50%; display: flex; 
                    align-items: center; justify-content: center; 
                    font-size: 2rem; margin: 0 auto 20px;
                }
                .delete-actions-p { display: flex; gap: 12px; margin-top: 30px; }

                /* Success Modal */
                .success-modal-p {
                    background: #fff;
                    width: 100%;
                    max-width: 400px;
                    padding: 40px;
                    border-radius: 24px;
                    text-align: center;
                }
                .success-vibe {
                    width: 60px; height: 60px;
                    background: #dcfce7; color: #16a34a;
                    border-radius: 50%; display: flex;
                    align-items: center; justify-content: center;
                    font-size: 2rem; margin: 0 auto 20px;
                }
                .password-display-p {
                    background: #1a1a2e;
                    color: var(--gold-accent);
                    padding: 20px;
                    border-radius: 16px;
                    font-family: monospace;
                    font-size: 1.8rem;
                    font-weight: 700;
                    letter-spacing: 4px;
                    margin: 20px 0;
                    transition: all 0.2s;
                }
                .password-display-p:hover {
                    background: #252545;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
                .password-display-p:active {
                    transform: translateY(0);
                }
                .password-display-p:hover .copy-hint {
                    opacity: 1 !important;
                }
                .note-p { font-size: 0.8rem; color: var(--text-muted); }
                .full-btn { width: 100%; margin-top: 20px; }

                @keyframes modalEntry {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .spinner-p {
                    width: 30px; height: 30px;
                    border: 2px solid #f1f5f9;
                    border-top-color: var(--crimson);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 40px auto;
                }

                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default ManageAdmins;
