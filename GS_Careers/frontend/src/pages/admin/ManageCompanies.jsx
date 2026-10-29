import useHorizontalDragScroll from '../../utils/useHorizontalDragScroll';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    FiPlus, FiEdit2, FiTrash2, FiX, FiShield,
    FiHome, FiCheckCircle, FiAlertCircle,
    FiActivity, FiTrendingUp, FiSearch, FiMapPin, FiInfo, FiExternalLink, FiUploadCloud, FiTrash
} from 'react-icons/fi';
import './ManageAdmins.css'; // Leverage existing premium admin panel styling
import './ManageCompanies.css';
import PaginationFooter from '../../components/PaginationFooter';
import { 
    getCompanies, createCompany, updateCompany, deleteCompany, API_BASE,
    getCompanyLocations, addCompanyLocation, updateCompanyLocation, deleteCompanyLocation
} from '../../services/api';

const BACKEND_ROOT = API_BASE.replace('/api', '');

function ManageCompanies({ admin }) {
    const companyTableDragScroll = useHorizontalDragScroll();
    const locationTableDragScroll = useHorizontalDragScroll();
    const isSubAdmin = admin?.role === 'sub_admin1' || admin?.role === 'sub_admin2' || admin?.role === 'sub_admin';
    const userCompanyId = admin?.company_id ? Number(admin.company_id) : null;

    const [companies, setCompanies] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    const [form, setForm] = useState({
        name: '',
        location: '',
        description: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Location Management States
    const [showLocModal, setShowLocModal] = useState(false);
    const [locCompanySelect, setLocCompanySelect] = useState('');
    const [newLocName, setNewLocName] = useState('');
    const [editingLocId, setEditingLocId] = useState(null);
    const [editingLocValue, setEditingLocValue] = useState('');
    const [confirmDeleteLoc, setConfirmDeleteLoc] = useState(null);
    const [locSearchTerm, setLocSearchTerm] = useState('');
    const [locCurrentPage, setLocCurrentPage] = useState(1);
    const locItemsPerPage = 8;

    useEffect(() => {
        if (isSubAdmin && userCompanyId) {
            setLocCompanySelect(String(userCompanyId));
        }
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Load companies
            try {
                const res = await getCompanies();
                setCompanies(res.data.data || []);
            } catch (err) {
                console.error('Failed to load companies:', err);
                toast.error('Failed to retrieve companies registry');
            }

            // Load locations
            try {
                const locRes = await getCompanyLocations();
                setLocations(locRes.data.data || []);
            } catch (err) {
                console.error('Failed to load locations:', err);
                toast.error('Failed to retrieve locations registry');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ name: '', location: '', description: '' });
        setEditingId(null);
        setLogoPreview(null);
        setLogoFile(null);
    };

    const openCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (c) => {
        if (!c) return;
        setForm({
            name: c.name || admin?.company_name || '',
            location: c.location || '',
            description: c.description || ''
        });
        setEditingId(c.id || userCompanyId);
        setLogoPreview(c.logo ? `${BACKEND_ROOT}/uploads/logos/${c.logo}` : null);
        setLogoFile(null);
        setShowModal(true);
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Only JPG, PNG, GIF, WEBP, and SVG logo images are allowed');
                return;
            }

            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.location) {
            toast.error('Company Name and Location are required');
            return;
        }

        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('location', form.location);
        formData.append('description', form.description);

        if (editingId) {
            formData.append('id', editingId);
        }
        if (logoFile) {
            formData.append('logo', logoFile);
        }

        try {
            setLoading(true);
            if (editingId) {
                await updateCompany(formData);
                toast.success('Company details updated successfully');
            } else {
                await createCompany(formData);
                toast.success('New company registered successfully');
            }
            setShowModal(false);
            resetForm();
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            setLoading(true);
            await deleteCompany({ id });
            toast.success('Company and cascade vacancies deleted successfully');
            setConfirmDelete(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete operation failed');
        } finally {
            setLoading(false);
        }
    };

    // Sub-locations handlers
    const openManageLocations = (targetCompId = null) => {
        if (isSubAdmin && userCompanyId) {
            setLocCompanySelect(String(userCompanyId));
        } else if (targetCompId) {
            setLocCompanySelect(String(targetCompId));
        } else {
            setLocCompanySelect('');
        }
        setNewLocName('');
        setShowLocModal(true);
    };

    const handleAddLocation = async (e) => {
        e.preventDefault();
        const effectiveCompanyId = (isSubAdmin && userCompanyId) ? userCompanyId : parseInt(locCompanySelect);
        if (!effectiveCompanyId) {
            toast.error('Please select a company entity first');
            return;
        }
        if (!newLocName.trim()) {
            toast.error('Location name cannot be empty');
            return;
        }
        try {
            setLoading(true);
            await addCompanyLocation({
                company_id: effectiveCompanyId,
                location: newLocName.trim()
            });
            toast.success('Company location added successfully');
            setNewLocName('');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add location');
        } finally {
            setLoading(false);
        }
    };

    const handleEditLocation = async (e) => {
        e.preventDefault();
        if (!editingLocValue.trim()) {
            toast.error('Location name cannot be empty');
            return;
        }
        try {
            setLoading(true);
            await updateCompanyLocation({
                id: editingLocId,
                location: editingLocValue.trim()
            });
            toast.success('Location updated successfully');
            setEditingLocId(null);
            setEditingLocValue('');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update location');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLocation = async (id) => {
        try {
            setLoading(true);
            await deleteCompanyLocation({ id });
            toast.success('Location deleted successfully');
            setConfirmDeleteLoc(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete location');
        } finally {
            setLoading(false);
        }
    };

    // Scoped entities and locations (only own subsidiary for subadmin1 & subadmin2)
    const accessibleCompanies = isSubAdmin && userCompanyId
        ? companies.filter(c => Number(c.id) === userCompanyId)
        : companies;

    const accessibleLocations = isSubAdmin && userCompanyId
        ? locations.filter(l => Number(l.company_id) === userCompanyId)
        : locations;

    const filteredCompanies = accessibleCompanies.filter(c => {
        const matchesSearch =
            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

    // Locations filtering and pagination
    const filteredLocations = accessibleLocations.filter(loc => {
        const matchesSearch =
            loc.company_name?.toLowerCase().includes(locSearchTerm.toLowerCase()) ||
            loc.location?.toLowerCase().includes(locSearchTerm.toLowerCase());
        return matchesSearch;
    });

    const locTotalPages = Math.ceil(filteredLocations.length / locItemsPerPage);
    const locStartIndex = (locCurrentPage - 1) * locItemsPerPage;
    const paginatedLocations = filteredLocations.slice(locStartIndex, locStartIndex + locItemsPerPage);

    const stats = {
        total: accessibleCompanies.length,
        insideLocations: accessibleLocations.length,
        recent: isSubAdmin
            ? (accessibleLocations.map(l => l.location).join(', ') || 'No locations added yet')
            : (companies.slice(-3).map(c => c.name).join(', ') || 'None')
    };

    const currentCompany = accessibleCompanies[0] || companies.find(c => Number(c.id) === userCompanyId) || {
        id: userCompanyId,
        name: admin?.company_name || 'My Corporate Subsidiary',
        location: '',
        description: '',
        logo: null
    };

    const filteredSubAdminLocations = accessibleLocations.filter(loc =>
        loc.location?.toLowerCase().includes(locSearchTerm.toLowerCase())
    );

    const handleQuickAddLocation = async (e) => {
        if (e) e.preventDefault();
        const effectiveCompanyId = (isSubAdmin && userCompanyId) ? userCompanyId : parseInt(locCompanySelect);
        if (!effectiveCompanyId) {
            toast.error('Subsidiary entity identifier is missing');
            return;
        }
        if (!newLocName.trim()) {
            toast.error('Please enter a location or place name');
            return;
        }
        try {
            setLoading(true);
            await addCompanyLocation({
                company_id: effectiveCompanyId,
                location: newLocName.trim()
            });
            toast.success(`"${newLocName.trim()}" added to subsidiary places`);
            setNewLocName('');
            await loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add location');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="premium-admins-page">
            {isSubAdmin ? (
                <>
                    {/* SUB ADMIN MINIMALIST HERO PANEL */}
                    <div className="dashboard-hero-premium" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                        <div className="hero-content-p" style={{ flex: 1, minWidth: '280px' }}>
                            <div className="hero-badge-p"><FiActivity /> Subsidiary Workspace</div>
                            <h1 className="hero-title-p">Subsidiary Management</h1>
                            <p className="hero-subtitle-p">
                                Manage corporate profile, headquarters details, and operational branches for <strong>{currentCompany?.name || admin?.company_name || 'your subsidiary'}</strong>.
                            </p>
                        </div>
                        <div className="hero-actions-p" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            <button className="btn-hero-p primary" onClick={() => {
                                const el = document.getElementById('quick-add-place-input');
                                if (el) {
                                    el.focus();
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}>
                                <FiPlus /> Add Place
                            </button>
                        </div>
                    </div>

                    {/* SUBSIDIARY IDENTITY & CORPORATE PROFILE CARD */}
                    <div className="subsidiary-profile-hero-card">
                        <div className="subsidiary-profile-header">
                            <div className="subsidiary-brand-group">
                                <div className="subsidiary-avatar-box">
                                    <img
                                        src={currentCompany?.logo ? `${BACKEND_ROOT}/uploads/logos/${currentCompany.logo}` : "/gs-logo.png"}
                                        alt={currentCompany?.name || 'Company'}
                                        onError={(e) => e.target.src = "/gs-logo.png"}
                                    />
                                    <div className="subsidiary-verified-badge" title="Verified Corporate Subsidiary">
                                        <FiCheckCircle size={13} />
                                    </div>
                                </div>
                                <div className="subsidiary-titles">
                                    <div className="subsidiary-badges-row">
                                        <span className="subs-pill active">
                                            <span className="pulse-dot-green"></span> Active Subsidiary
                                        </span>
                                        <span className="subs-pill id">
                                            ID: #{String(currentCompany?.id || userCompanyId || 1).padStart(4, '0')}
                                        </span>
                                        <span className="subs-pill role">
                                            <FiShield size={12} /> Sub Admin Workspace
                                        </span>
                                    </div>
                                    <h2 className="subsidiary-main-title">{currentCompany?.name || admin?.company_name || 'My Corporate Subsidiary'}</h2>
                                </div>
                            </div>
                            <button className="btn-edit-profile-p" onClick={() => openEdit(currentCompany)}>
                                <FiEdit2 /> Edit Profile
                            </button>
                        </div>

                        {/* EXECUTIVE SHOWCASE TILES */}
                        <div className="subsidiary-showcase-grid">
                            {/* Card 1: Operational Headquarters */}
                            <div className="subs-showcase-card hq-card">
                                <div className="showcase-card-header">
                                    <div className="showcase-icon-badge gold">
                                        <FiMapPin />
                                    </div>
                                    <div className="showcase-header-text">
                                        <span className="showcase-subtitle">Operational Headquarters</span>
                                        <span className="showcase-tag">Primary Registered Office</span>
                                    </div>
                                </div>
                                <div className="showcase-card-body">
                                    <p className="showcase-address-text">
                                        {currentCompany?.location || 'Not Specified'}
                                    </p>
                                </div>
                                <div className="showcase-card-footer">
                                    <span className="showcase-footer-pill">
                                        <FiMapPin size={11} /> Official Registered Base
                                    </span>
                                </div>
                            </div>

                            {/* Card 2: Registered Operational Places */}
                            <div className="subs-showcase-card places-card">
                                <div className="showcase-card-header">
                                    <div className="showcase-icon-badge crimson">
                                        <FiHome />
                                    </div>
                                    <div className="showcase-header-text">
                                        <span className="showcase-subtitle">Operational Places & Branches</span>
                                        <span className="showcase-tag">Vacancy Locations</span>
                                    </div>
                                </div>
                                <div className="showcase-card-body metric-body">
                                    <div className="showcase-metric-number">{accessibleLocations.length}</div>
                                    <div className="showcase-metric-info">
                                        <span className="showcase-metric-title">
                                            {accessibleLocations.length === 1 ? 'Location Configured' : 'Locations Configured'}
                                        </span>
                                        <span className="showcase-metric-desc">
                                            Branches, meeting rooms & workplace floors
                                        </span>
                                    </div>
                                </div>
                                <div className="showcase-card-footer">
                                    <button 
                                        type="button" 
                                        className="showcase-action-link"
                                        onClick={() => {
                                            const el = document.getElementById('places-workspace-card');
                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        <span>View & Manage Places Below</span>
                                        <span className="arrow-down">↓</span>
                                    </button>
                                </div>
                            </div>

                            {/* Card 3: Corporate Overview */}
                            <div className="subs-showcase-card overview-card full-span">
                                <div className="showcase-card-header">
                                    <div className="showcase-icon-badge blue">
                                        <FiInfo />
                                    </div>
                                    <div className="showcase-header-text">
                                        <span className="showcase-subtitle">Corporate Overview & Business Scope</span>
                                        <span className="showcase-tag">Strategic Profile</span>
                                    </div>
                                </div>
                                <div className="showcase-card-body">
                                    <div className="showcase-overview-quote">
                                        <p className="showcase-overview-text">
                                            {currentCompany?.description || 'No corporate description added yet. Click "Edit Profile" to provide strategic overview details for this subsidiary.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OPERATIONAL PLACES & LOCATIONS WORKSPACE */}
                    <div className="places-workspace-card" id="places-workspace-card">
                        <div className="places-workspace-header">
                            <div className="places-header-left">
                                <h3><FiMapPin /> Operational Places & Branches</h3>
                                <p>Workplace locations, branches, and interview venues used when publishing job vacancies.</p>
                            </div>
                            <div className="places-header-right">
                                <div className="places-search-box">
                                    <FiSearch className="places-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search places..."
                                        value={locSearchTerm}
                                        onChange={(e) => setLocSearchTerm(e.target.value)}
                                    />
                                </div>
                                <span className="places-count-pill">
                                    {filteredSubAdminLocations.length} Places Active
                                </span>
                            </div>
                        </div>

                        {/* Quick Add Bar */}
                        <div className="places-quick-add-section">
                            <form onSubmit={handleQuickAddLocation} className="quick-add-form">
                                <div className="quick-add-input-wrapper">
                                    <FiMapPin className="quick-add-pin-icon" />
                                    <input
                                        id="quick-add-place-input"
                                        type="text"
                                        placeholder="Enter new place or branch name (e.g. 4th Floor Boardroom, Kandy Branch, Head Office)..."
                                        value={newLocName}
                                        onChange={(e) => setNewLocName(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn-quick-add" disabled={loading}>
                                    <FiPlus /> Add Place
                                </button>
                            </form>
                        </div>

                        {/* Places Grid */}
                        <div className="places-content-area">
                            {loading && accessibleLocations.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <div className="spinner-p"></div>
                                    <p style={{ marginTop: '12px', color: '#94a3b8', fontSize: '0.85rem' }}>Loading subsidiary places...</p>
                                </div>
                            ) : filteredSubAdminLocations.length === 0 ? (
                                <div className="places-empty-state">
                                    <div className="empty-pin-icon-wrap">
                                        <FiMapPin />
                                    </div>
                                    <h4>{locSearchTerm ? 'No matching places found' : 'No Operational Places Registered Yet'}</h4>
                                    <p>
                                        {locSearchTerm
                                            ? 'Try searching with a different keyword or clear your search input.'
                                            : 'Add workplace branches, meeting rooms, or interview venues above so you can select them when publishing job vacancies.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="places-cards-grid">
                                    {filteredSubAdminLocations.map(loc => (
                                        <div className="place-item-card" key={loc.id}>
                                            {editingLocId === loc.id ? (
                                                <form onSubmit={handleEditLocation} className="place-inline-edit-form">
                                                    <input
                                                        type="text"
                                                        value={editingLocValue}
                                                        onChange={(e) => setEditingLocValue(e.target.value)}
                                                        autoFocus
                                                        required
                                                        className="place-inline-edit-input"
                                                        placeholder="Enter place name..."
                                                    />
                                                    <button type="submit" className="place-btn-save" title="Save Changes">
                                                        <FiCheckCircle size={15} />
                                                    </button>
                                                    <button type="button" className="place-btn-cancel" onClick={() => setEditingLocId(null)} title="Cancel">
                                                        <FiX size={15} />
                                                    </button>
                                                </form>
                                            ) : (
                                                <>
                                                    <div className="place-card-left">
                                                        <div className="place-icon-bubble">
                                                            <FiMapPin />
                                                        </div>
                                                        <div className="place-details">
                                                            <span className="place-title-text" title={loc.location}>{loc.location}</span>
                                                            <span className="place-subtitle-tag">
                                                                <FiCheckCircle size={10} style={{ color: '#10b981' }} /> Active Operational Place
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="place-card-actions">
                                                        <button
                                                            type="button"
                                                            className="place-action-btn edit"
                                                            onClick={() => { setEditingLocId(loc.id); setEditingLocValue(loc.location); }}
                                                            title="Rename / Update Place"
                                                        >
                                                            <FiEdit2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="place-action-btn delete"
                                                            onClick={() => setConfirmDeleteLoc(loc)}
                                                            title="Delete Place"
                                                        >
                                                            <FiTrash2 size={13} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* GLOBAL SUPER ADMIN MULTI-COMPANY VIEW */}
                    <div className="dashboard-hero-premium" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: '20px' }}>
                        <div className="hero-content-p" style={{ flex: 1, minWidth: 0 }}>
                            <div className="hero-badge-p"><FiActivity /> Enterprise Registry</div>
                            <h1 className="hero-title-p">Manage Corporate Entities</h1>
                            <p className="hero-subtitle-p">
                                George Steuart Group | Configure and govern subsidiaries and parent entities
                            </p>
                        </div>
                        <div className="hero-actions-p" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'nowrap' }}>
                            <button className="btn-hero-p primary" onClick={openCreate}>
                                <FiPlus /> Register New Entity
                            </button>
                            <button className="btn-hero-p secondary" onClick={() => openManageLocations()}>
                                <FiMapPin /> Manage Company Location
                            </button>
                        </div>
                    </div>

                    {/* PERFORMANCE SNAPSHOT */}
                    <div className="stats-mosaic-grid admin-grid-3">
                        <div className="db-stat-card">
                            <div className="db-s-header">
                                <span className="db-s-label">Registered Subsidiaries</span>
                                <div className="db-s-icon"><FiHome /></div>
                            </div>
                            <span className="db-s-value">{stats.total}</span>
                        </div>
                        <div className="db-stat-card">
                            <div className="db-s-header">
                                <span className="db-s-label">Inside Locations</span>
                                <div className="db-s-icon green"><FiMapPin /></div>
                            </div>
                            <span className="db-s-value">{stats.insideLocations}</span>
                        </div>
                        <div className="db-stat-card">
                            <div className="db-s-header">
                                <span className="db-s-label">Lately Seeded</span>
                                <div className="db-s-icon blue"><FiInfo /></div>
                            </div>
                            <span className="db-s-value text-value" title={stats.recent}>
                                {stats.recent}
                            </span>
                        </div>
                    </div>

                    {/* SEARCH CONSOLE TOOLBAR */}
                    <div className="console-toolbar-p">
                        <div className="toolbar-search-row">
                            <div className="search-orchestrator">
                                <FiSearch className="s-icon" />
                                <input
                                    id="company_search"
                                    name="company_search"
                                    type="text"
                                    placeholder="Search by company name, location, or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button className="btn-reset-p" onClick={() => setSearchTerm('')}>
                                <FiX /> <span>Clear Filters</span>
                            </button>
                        </div>
                    </div>

                    {/* COMPANIES AUDIT TABLE */}
                    <div className="results-card-p orchestration-container">
                        <div className="orchestration-header" style={{ flexWrap: 'wrap', gap: '20px', padding: '24px 32px' }}>
                            <div className="h-left">
                                <h3 style={{ fontSize: '1.4rem' }}>Strategic Corporate Directory</h3>
                                <p style={{ fontSize: '0.85rem' }}>View, modify, and manage information relating to corporate divisions.</p>
                            </div>
                            <div className="h-right">
                                <span className="count-badge">{filteredCompanies.length} Entities Registered</span>
                            </div>
                        </div>
                        <div className="table-wrapper-p horizontal-drag-scroll" {...companyTableDragScroll}>
                            <table className="premium-table orchestration-table">
                                <colgroup>
                                    <col style={{ width: '26%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '12%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>COMPANY ENTITY</th>
                                        <th>OPERATIONAL HEADQUARTERS</th>
                                        <th>TOTAL LOCATIONS</th>
                                        <th>CORPORATE PROFILE</th>
                                        <th style={{ textAlign: 'center' }}>OPERATIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                                                <div className="spinner-p"></div>
                                                <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Synchronizing strategic corporate logs...</p>
                                            </td>
                                        </tr>
                                    ) : paginatedCompanies.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-cell">
                                                <div className="no-results" style={{ padding: '60px', textAlign: 'center' }}>
                                                    <FiHome size={48} style={{ color: 'var(--border-light)', marginBottom: '16px' }} />
                                                    <p style={{ color: 'var(--text-muted)' }}>No strategic companies found matching your search term.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedCompanies.map(c => (
                                        <tr key={c.id} className="orchestration-row">
                                            <td data-label="Company Entity">
                                                <div className="admin-identity-cell">
                                                    <div className="company-logo-circle" style={{ width: '45px', height: '45px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
                                                        <img
                                                            src={c.logo ? `${BACKEND_ROOT}/uploads/logos/${c.logo}` : "/gs-logo.png"}
                                                            alt={c.name}
                                                            onError={(e) => e.target.src = "/gs-logo.png"}
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        />
                                                    </div>
                                                    <div className="admin-info-p">
                                                        <span className="admin-name-p" style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</span>
                                                        <span className="admin-email-p" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {String(c.id).padStart(4, '0')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Operational Headquarters">
                                                <div className="location-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a1a2e', fontWeight: 600 }}>
                                                    <FiMapPin style={{ color: 'var(--gold-accent)' }} />
                                                    <span>{c.location || 'Not Specified'}</span>
                                                </div>
                                            </td>
                                            <td data-label="Total Locations">
                                                <div className="tooltip-trigger" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(200, 169, 81, 0.1)', color: 'var(--gold-accent)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700 }}>
                                                    <span>{c.total_locations || 0}</span>
                                                    {c.total_locations > 0 && (
                                                        <div className="tooltip-content">
                                                            {c.locations_list}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label="Corporate Profile">
                                                <p style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                                                    {c.description || 'No corporate description added.'}
                                                </p>
                                            </td>
                                            <td data-label="Operations">
                                                <div className="orchestration-actions" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <button className="o-btn edit" onClick={() => openEdit(c)} title="Update Company Info">
                                                        <FiEdit2 />
                                                    </button>
                                                    <button className="o-btn delete" onClick={() => setConfirmDelete(c)} title="Delete Corporate Division">
                                                        <FiTrash2 />
                                                    </button>
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
                            totalItems={filteredCompanies.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            label="divisions"
                        />
                    </div>

                    {/* LOCATIONS REGISTRY TABLE CARD */}
                    <div className="results-card-p orchestration-container" style={{ marginTop: '32px' }}>
                        <div className="orchestration-header" style={{ flexWrap: 'wrap', gap: '20px', padding: '24px 32px' }}>
                            <div className="h-left">
                                <h3 style={{ fontSize: '1.4rem' }}>Locations Registry</h3>
                                <p style={{ fontSize: '0.85rem' }}>View, search, edit and remove locations registered under subsidiaries.</p>
                            </div>
                            <div className="h-right" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <div className="search-orchestrator" style={{ width: '260px', position: 'relative' }}>
                                    <FiSearch className="s-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Search locations..."
                                        value={locSearchTerm}
                                        onChange={(e) => setLocSearchTerm(e.target.value)}
                                        style={{ padding: '8px 16px 8px 40px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.85rem', width: '100%' }}
                                    />
                                </div>
                                <button className="btn btn-gold" onClick={() => openManageLocations()} style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                                    <FiPlus /> Add Place
                                </button>
                                <span className="count-badge">{filteredLocations.length} Locations Active</span>
                            </div>
                        </div>
                        <div className="table-wrapper-p horizontal-drag-scroll" {...locationTableDragScroll}>
                            <table className="premium-table orchestration-table">
                                <thead>
                                    <tr>
                                        <th>COMPANY ENTITY</th>
                                        <th>OPERATIONAL LOCATION</th>
                                        <th style={{ textAlign: 'center' }}>OPERATIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} style={{ padding: '60px', textAlign: 'center' }}>
                                                <div className="spinner-p"></div>
                                                <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Synchronizing location registers...</p>
                                            </td>
                                        </tr>
                                    ) : paginatedLocations.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="empty-cell">
                                                <div className="no-results" style={{ padding: '60px', textAlign: 'center' }}>
                                                    <FiMapPin size={48} style={{ color: 'var(--border-light)', marginBottom: '16px' }} />
                                                    <p style={{ color: 'var(--text-muted)' }}>{locSearchTerm ? 'No location records found matching your search term.' : 'No locations registered yet.'}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedLocations.map(loc => (
                                        <tr key={loc.id} className="orchestration-row">
                                            <td data-label="Company Entity">
                                                <div className="admin-identity-cell">
                                                    <div className="company-logo-circle" style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden', padding: '3px', flexShrink: 0 }}>
                                                        <img
                                                            src={loc.company_logo ? `${BACKEND_ROOT}/uploads/logos/${loc.company_logo}` : "/gs-logo.png"}
                                                            alt={loc.company_name}
                                                            onError={(e) => e.target.src = "/gs-logo.png"}
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        />
                                                    </div>
                                                    <div className="admin-info-p">
                                                        <span className="admin-name-p" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{loc.company_name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Operational Location">
                                                {editingLocId === loc.id ? (
                                                    <form onSubmit={handleEditLocation} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            value={editingLocValue}
                                                            onChange={(e) => setEditingLocValue(e.target.value)}
                                                            required
                                                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid var(--crimson)', fontSize: '0.85rem', background: '#fff' }}
                                                        />
                                                        <button type="submit" className="btn btn-gold" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}>Save</button>
                                                        <button type="button" className="btn-cancel-p" onClick={() => setEditingLocId(null)} style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}>Cancel</button>
                                                    </form>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a1a2e', fontWeight: 600 }}>
                                                        <FiMapPin style={{ color: 'var(--crimson)' }} />
                                                        <span>{loc.location}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td data-label="Operations">
                                                <div className="orchestration-actions" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <button className="o-btn edit" onClick={() => { setEditingLocId(loc.id); setEditingLocValue(loc.location); }} title="Update Location">
                                                        <FiEdit2 />
                                                    </button>
                                                    <button className="o-btn delete" onClick={() => setConfirmDeleteLoc(loc)} title="Delete Location">
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <PaginationFooter
                            currentPage={locCurrentPage}
                            totalPages={locTotalPages}
                            totalItems={filteredLocations.length}
                            itemsPerPage={locItemsPerPage}
                            onPageChange={setLocCurrentPage}
                            label="locations"
                        />
                    </div>
                </>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay-p" onClick={() => setShowModal(false)}>
                    <div className="admin-modal-p confirm-modal card-p animated-zoom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '90%', textAlign: 'left', overflow: 'hidden' }}>
                        <div className="modal-header-p" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
                                {editingId ? (isSubAdmin ? 'Update Subsidiary Information' : 'Modify Entity Credentials') : 'Register Corporate Entity'}
                            </h2>
                            <button className="close-btn-p" onClick={() => setShowModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body-p" style={{ padding: '32px', overflowY: 'auto', maxHeight: '70vh' }}>
                                <div className="form-grid-p" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

                                    <div className="form-group-p">
                                        <label htmlFor="company_name">Company Name <span style={{ color: 'var(--crimson)' }}>*</span></label>
                                        <input
                                            id="company_name"
                                            name="company_name"
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="e.g. George Steuart & Company Ltd"
                                            disabled={isSubAdmin}
                                            style={isSubAdmin ? { background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' } : {}}
                                            required
                                        />
                                        {isSubAdmin && (
                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                                Entity name is governed by group corporate affairs and locked for editing.
                                            </span>
                                        )}
                                    </div>

                                    <div className="form-group-p">
                                        <label htmlFor="company_location">Operational Location / Headquarters <span style={{ color: 'var(--crimson)' }}>*</span></label>
                                        <div className="input-with-icon" style={{ position: 'relative' }}>
                                            <FiMapPin style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                id="company_location"
                                                name="company_location"
                                                type="text"
                                                value={form.location}
                                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                                placeholder="e.g. Colombo 03, Sri Lanka"
                                                style={{ paddingLeft: '44px' }}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group-p">
                                        <label htmlFor="company_description">Corporate Description</label>
                                        <textarea
                                            id="company_description"
                                            name="company_description"
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            placeholder="Provide a brief strategic summary of this corporate division..."
                                            rows="4"
                                            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontStyle: 'normal' }}
                                        />
                                    </div>

                                    <div className="form-group-p">
                                        <label>Corporate Logo Image</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                            <div className="logo-upload-zone" style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: '240px', background: '#f8fafc', transition: 'border-color 0.2s', textAlign: 'center' }} onClick={() => document.getElementById('logo-file-input').click()}>
                                                <FiUploadCloud size={28} style={{ color: 'var(--crimson)' }} />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Click to Upload Corporate Logo</span>
                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PNG, JPG, SVG, WebP (Max: 2MB)</span>
                                                <input
                                                    id="logo-file-input"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoChange}
                                                    style={{ display: 'none' }}
                                                />
                                            </div>

                                            {logoPreview && (
                                                <div className="logo-preview-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                    <div style={{ width: '100px', height: '100px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                        <img
                                                            src={logoPreview}
                                                            alt="Logo Preview"
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        />
                                                    </div>
                                                    <button type="button" className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#dc2626', borderColor: 'transparent' }} onClick={() => { setLogoPreview(null); setLogoFile(null); }}>
                                                        <FiTrash /> Remove Logo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                            <div className="modal-footer-p" style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="btn-cancel-p" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-gold" disabled={loading}>
                                    {loading ? 'Processing...' : (editingId ? 'Save Changes' : 'Establish Division')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cascade Warning Delete Confirmation */}
            {confirmDelete && (
                <div className="modal-overlay-p" onClick={() => setConfirmDelete(null)}>
                    <div className="delete-modal-p" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div className="alert-vibe" style={{ background: '#fef2f2', color: '#ef4444' }}><FiAlertCircle /></div>
                        <h3 style={{ fontSize: '1.3rem', margin: '16px 0 8px', color: '#1e293b' }}>Decommission Corporate Division?</h3>
                        <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                            You are about to delete <strong>{confirmDelete.name}</strong>.
                        </p>
                        <div className="cascade-warning" style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start', margin: '16px 0', textAlign: 'left' }}>
                            <FiInfo size={18} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#b45309' }}>CASCADE DELETE WARNING</h4>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#b45309', lineHeight: 1.4 }}>
                                    Deleting this entity will automatically purge **all associated vacancies and candidate job applications** registered under it. This action is irreversible.
                                </p>
                            </div>
                        </div>
                        <div className="delete-actions-p" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn-cancel-p" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Confirm Deletion</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Company Locations Modal */}
            {showLocModal && (
                <div className="modal-overlay-p" onClick={() => setShowLocModal(false)}>
                    <div className="admin-modal-p confirm-modal card-p animated-zoom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', textAlign: 'left', overflow: 'hidden' }}>
                        <div className="modal-header-p" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: 'var(--crimson)', color: '#fff' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FiMapPin /> {isSubAdmin ? `Manage Locations — ${admin?.company_name || 'My Subsidiary'}` : 'Manage Company Locations'}
                            </h2>
                            <button className="close-btn-p" onClick={() => setShowLocModal(false)} style={{ color: '#fff' }}><FiX /></button>
                        </div>
                        <form onSubmit={handleAddLocation}>
                            <div className="modal-body-p" style={{ padding: '32px', overflowY: 'auto', maxHeight: '70vh' }}>
                                <div className="form-grid-p" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                    
                                    <div className="form-group-p">
                                        <label htmlFor="loc_company_select">Select Company Entity <span style={{ color: 'var(--crimson)' }}>*</span></label>
                                        {isSubAdmin ? (
                                            <div style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#f1f5f9', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <FiHome style={{ color: 'var(--crimson)' }} />
                                                <span>{admin?.company_name || accessibleCompanies[0]?.name || 'My Subsidiary'}</span>
                                                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', padding: '3px 10px', borderRadius: '20px', fontWeight: 800 }}>Own Subsidiary</span>
                                            </div>
                                        ) : (
                                            <select
                                                id="loc_company_select"
                                                value={locCompanySelect}
                                                onChange={(e) => setLocCompanySelect(e.target.value)}
                                                required
                                                style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#f8fafc' }}
                                            >
                                                <option value="">-- Choose Corporate Entity --</option>
                                                {companies.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="form-group-p">
                                        <label htmlFor="new_location_name">Add New Location / Place Name <span style={{ color: 'var(--crimson)' }}>*</span></label>
                                        <div className="input-with-icon" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <FiMapPin style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                <input
                                                    id="new_location_name"
                                                    type="text"
                                                    value={newLocName}
                                                    onChange={(e) => setNewLocName(e.target.value)}
                                                    placeholder="e.g. Galle Branch, BoardRoom, 4th Floor..."
                                                    style={{ paddingLeft: '44px' }}
                                                />
                                            </div>
                                            <button type="submit" className="btn btn-gold" style={{ whiteSpace: 'nowrap', height: '100%', padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700 }} disabled={loading}>
                                                Add Location
                                            </button>
                                        </div>
                                    </div>

                                    {((isSubAdmin && userCompanyId) || locCompanySelect) && (
                                        <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Registered Locations for {isSubAdmin ? (admin?.company_name || 'My Subsidiary') : 'Selected Entity'}
                                            </h4>
                                            {locations.filter(l => l.company_id === (isSubAdmin ? userCompanyId : parseInt(locCompanySelect))).length === 0 ? (
                                                <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No locations registered for this entity yet.</p>
                                            ) : (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {locations.filter(l => l.company_id === (isSubAdmin ? userCompanyId : parseInt(locCompanySelect))).map(l => (
                                                        <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                                                            <FiMapPin size={12} style={{ color: 'var(--crimson)' }} />
                                                            <span>{l.location}</span>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setConfirmDeleteLoc(l)}
                                                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', padding: '2px', borderRadius: '4px', marginLeft: '4px', transition: 'background-color 0.2s' }}
                                                                title="Delete Location"
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                <FiX size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                            <div className="modal-footer-p" style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-cancel-p" onClick={() => setShowLocModal(false)}>Close Registry</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Location Confirmation */}
            {confirmDeleteLoc && (
                <div className="modal-overlay-p" onClick={() => setConfirmDeleteLoc(null)}>
                    <div className="delete-modal-p" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div className="alert-vibe" style={{ background: '#fef2f2', color: '#ef4444' }}><FiAlertCircle /></div>
                        <h3 style={{ fontSize: '1.3rem', margin: '16px 0 8px', color: '#1e293b' }}>Remove Location?</h3>
                        <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                            You are about to delete location <strong>{confirmDeleteLoc.location}</strong> registered under <strong>{confirmDeleteLoc.company_name}</strong>.
                        </p>
                        <div className="delete-actions-p" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn-cancel-p" onClick={() => setConfirmDeleteLoc(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => handleDeleteLocation(confirmDeleteLoc.id)}>Confirm Deletion</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageCompanies;

