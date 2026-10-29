import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    FiBell, FiCheckCircle, FiXCircle, FiClock, FiMail, FiCalendar, 
    FiMapPin, FiSearch, FiX, FiRefreshCw, FiCheck, FiEye, 
    FiTrash2, FiBriefcase, FiUser, FiPhone, FiCheckSquare, 
    FiExternalLink, FiTrendingUp, FiAlertCircle, FiVideo 
} from 'react-icons/fi';
import { 
    getNotifications, 
    markNotificationAsRead, 
    markNotificationAsUnread, 
    markAllNotificationsAsRead, 
    deleteNotification, 
    getCompanies, 
    API_BASE 
} from '../../services/api';
import './NotificationsPage.css';

const BACKEND_ROOT = API_BASE.replace('/api', '');

function NotificationsPage({ admin }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        confirmed: 0,
        declined: 0,
        invited: 0,
        unread: 0,
        response_rate: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [selectedModalNotif, setSelectedModalNotif] = useState(null);

    // Filters from URL or default
    const currentTab = searchParams.get('status') || 'all';
    const currentSearch = searchParams.get('search') || '';
    const currentCompany = searchParams.get('company_id') || '';
    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    const [searchInput, setSearchInput] = useState(currentSearch);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 1
    });

    const isSuperOrHr = admin?.role === 'super_admin' || admin?.role === 'admin';

    // Fetch companies list for HR & Super Admin filter dropdown
    useEffect(() => {
        if (isSuperOrHr) {
            getCompanies()
                .then(res => {
                    const list = res.data?.data || res.data || [];
                    setCompanies(list);
                })
                .catch(err => console.error('Failed to load companies:', err));
        }
    }, [isSuperOrHr]);

    // Fetch notifications
    const fetchNotifications = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const params = {
                status: currentTab,
                search: currentSearch,
                page: currentPage,
                limit: 25
            };
            if (isSuperOrHr && currentCompany) {
                params.company_id = currentCompany;
            }

            const res = await getNotifications(params);
            const data = res.data?.data || {};
            setNotifications(data.notifications || []);
            if (data.stats) {
                setStats(data.stats);
                window.dispatchEvent(new CustomEvent('gs-notifications-updated', {
                    detail: { unreadCount: data.stats.unread }
                }));
            }
            if (data.pagination) {
                setPagination(data.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentTab, currentSearch, currentCompany, currentPage, isSuperOrHr]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Auto-poll every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            fetchNotifications(true);
        }, 30000);
        return () => clearInterval(timer);
    }, [fetchNotifications]);

    // Update filter params
    const updateFilter = (newParams) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(newParams).forEach(([k, v]) => {
            if (v === '' || v === null || (k === 'status' && v === 'all') || (k === 'page' && v === 1)) {
                next.delete(k);
            } else {
                next.set(k, v);
            }
        });
        setSearchParams(next);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        updateFilter({ search: searchInput, page: 1 });
    };

    const handleClearSearch = () => {
        setSearchInput('');
        updateFilter({ search: '', page: 1 });
    };

    // Toggle read / unread
    const handleToggleRead = async (e, notif) => {
        e.stopPropagation();
        try {
            if (notif.is_read) {
                await markNotificationAsUnread(notif.id);
            } else {
                await markNotificationAsRead(notif.id);
            }
            // Update local state optimistically
            const newIsRead = !notif.is_read;
            const newUnread = notif.is_read ? stats.unread + 1 : Math.max(0, stats.unread - 1);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: newIsRead } : n));
            setStats(prev => ({
                ...prev,
                unread: newUnread
            }));
            window.dispatchEvent(new CustomEvent('gs-notifications-updated', {
                detail: { unreadCount: newUnread }
            }));
        } catch (err) {
            console.error('Failed to toggle read state:', err);
        }
    };

    // Mark all as read
    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setStats(prev => ({ ...prev, unread: 0 }));
            window.dispatchEvent(new CustomEvent('gs-notifications-updated', {
                detail: { unreadCount: 0 }
            }));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    // Delete single notification
    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to dismiss this notification?')) return;
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (selectedModalNotif?.id === id) setSelectedModalNotif(null);
            fetchNotifications(true);
            window.dispatchEvent(new CustomEvent('gs-notifications-updated'));
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    // Open detail modal and auto-mark as read
    const handleOpenDetail = (notif) => {
        setSelectedModalNotif(notif);
        if (!notif.is_read) {
            markNotificationAsRead(notif.id).then(() => {
                const newUnread = Math.max(0, stats.unread - 1);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                setStats(prev => ({ ...prev, unread: newUnread }));
                window.dispatchEvent(new CustomEvent('gs-notifications-updated', {
                    detail: { unreadCount: newUnread }
                }));
            }).catch(console.error);
        }
    };

    // Candidate initials
    const getInitials = (name) => {
        if (!name) return 'CA';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Date formatter
    const formatTimestamp = (raw) => {
        if (!raw) return '';
        const d = new Date(raw.replace(' ', 'T'));
        if (isNaN(d.getTime())) return raw;

        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24 && now.getDate() === d.getDate()) {
            return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (diffDays === 1 || (diffHours < 48 && (now.getDate() - d.getDate() === 1))) {
            return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
               ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatInterviewDate = (dateStr) => {
        if (!dateStr) return 'TBD';
        const d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="notifications-page-container">
            {/* ── Top Header Banner ── */}
            <div className="notif-header-banner">
                <div className="notif-header-content">
                    <div className="notif-header-title-area">
                        <div className="notif-pill-tag">
                            <span className="notif-pulse-dot"></span>
                            Live RSVP Tracking
                        </div>
                        <h1 className="notif-page-title">
                            Candidate Notifications
                        </h1>
                        <div className="notif-scope-badge">
                            {isSuperOrHr ? (
                                <span>
                                    Displaying candidate RSVP notifications across <strong>all subsidiaries</strong>
                                    {currentCompany && companies.length > 0 && (
                                        <> filtered to <span className="notif-scope-highlight">{companies.find(c => String(c.id) === String(currentCompany))?.name || 'Selected Subsidiary'}</span></>
                                    )}
                                </span>
                            ) : (
                                <span>
                                    Displaying candidate RSVP responses for <span className="notif-scope-highlight">{admin?.company_name || 'Your Subsidiary'}</span> positions only
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="notif-header-actions">
                        {stats.unread > 0 && (
                            <button 
                                className="notif-btn notif-btn-outline" 
                                onClick={handleMarkAllRead}
                                title="Mark all unread notifications as read"
                            >
                                <FiCheckSquare />
                                <span>Mark All as Read</span>
                            </button>
                        )}
                        <button 
                            className="notif-btn notif-btn-primary" 
                            onClick={() => fetchNotifications(true)}
                            disabled={refreshing}
                            title="Refresh notifications list"
                        >
                            <FiRefreshCw className={refreshing ? 'spin-icon' : ''} />
                            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Search & Filter Controls Bar ── */}
            <div className="notif-controls-bar">
                <div className="notif-controls-top">
                    {/* Search Form */}
                    <form className="notif-search-wrapper" onSubmit={handleSearchSubmit}>
                        <FiSearch className="notif-search-icon" size={16} />
                        <input
                            type="text"
                            className="notif-search-input"
                            placeholder="Search by candidate name, vacancy title, email, ref #..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        {searchInput && (
                            <button 
                                type="button" 
                                className="notif-search-clear" 
                                onClick={handleClearSearch}
                                aria-label="Clear search"
                            >
                                <FiX size={14} />
                            </button>
                        )}
                    </form>

                    {/* Company Filter (Super Admin & HR) */}
                    {isSuperOrHr && companies.length > 0 && (
                        <div className="notif-filter-dropdowns">
                            <select
                                className="notif-select"
                                value={currentCompany}
                                onChange={(e) => updateFilter({ company_id: e.target.value, page: 1 })}
                            >
                                <option value="">All Subsidiaries</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="notif-tabs-row">
                    <button
                        className={`notif-tab ${currentTab === 'all' ? 'active' : ''}`}
                        onClick={() => updateFilter({ status: 'all', page: 1 })}
                    >
                        <span>All Updates</span>
                        <span className="notif-tab-badge">{stats.total}</span>
                    </button>

                    <button
                        className={`notif-tab ${currentTab === 'confirmed' ? 'active active-confirmed' : ''}`}
                        onClick={() => updateFilter({ status: 'confirmed', page: 1 })}
                    >
                        <FiCheck size={14} />
                        <span>Confirmed</span>
                        <span className="notif-tab-badge">{stats.confirmed}</span>
                    </button>

                    <button
                        className={`notif-tab ${currentTab === 'declined' ? 'active active-declined' : ''}`}
                        onClick={() => updateFilter({ status: 'declined', page: 1 })}
                    >
                        <FiX size={14} />
                        <span>Declined</span>
                        <span className="notif-tab-badge">{stats.declined}</span>
                    </button>

                    <button
                        className={`notif-tab ${currentTab === 'invited' ? 'active' : ''}`}
                        onClick={() => updateFilter({ status: 'invited', page: 1 })}
                    >
                        <FiMail size={14} />
                        <span>Invited</span>
                        <span className="notif-tab-badge">{stats.invited}</span>
                    </button>

                    <button
                        className={`notif-tab ${currentTab === 'unread' ? 'active' : ''}`}
                        onClick={() => updateFilter({ status: 'unread', page: 1 })}
                    >
                        <FiBell size={14} />
                        <span>Unread Only</span>
                        <span className="notif-tab-badge">{stats.unread}</span>
                    </button>
                </div>
            </div>

            {/* ── Notifications Feed ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px', width: '40px', height: '40px' }}></div>
                    <p style={{ color: 'var(--notif-text-muted)', fontSize: '0.9rem' }}>Loading candidate notifications...</p>
                </div>
            ) : notifications.length === 0 ? (
                <div className="notif-empty-state">
                    <div className="notif-empty-icon">
                        <FiBell />
                    </div>
                    <h3 className="notif-empty-title">No notifications found</h3>
                    <p className="notif-empty-desc">
                        {currentSearch || currentTab !== 'all' || currentCompany
                            ? 'No candidate RSVP updates match your current filters. Try resetting your search or selecting another tab.'
                            : 'When shortlisted candidates confirm or decline interview invitations, their notifications will appear here in real-time.'}
                    </p>
                    {(currentSearch || currentTab !== 'all' || currentCompany) && (
                        <button 
                            className="notif-btn notif-btn-outline" 
                            style={{ marginTop: '8px' }}
                            onClick={() => {
                                setSearchInput('');
                                setSearchParams(new URLSearchParams());
                            }}
                        >
                            Reset All Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="notif-feed-container">
                    {notifications.map((notif) => {
                        const isConfirmed = notif.response_status === 'confirmed';
                        const isDeclined = notif.response_status === 'declined';
                        const isInvited = notif.response_status === 'invited';

                        return (
                            <div 
                                key={notif.id} 
                                className={`notif-card ${!notif.is_read ? 'is-unread' : ''}`}
                                onClick={() => handleOpenDetail(notif)}
                            >
                                {/* Left Color Strip */}
                                <div className={`notif-card-strip ${isConfirmed ? 'strip-confirmed' : isDeclined ? 'strip-declined' : 'strip-invited'}`}></div>

                                {/* Avatar */}
                                <div className="notif-avatar-wrapper">
                                    <div className={`notif-avatar ${isConfirmed ? 'avatar-confirmed' : isDeclined ? 'avatar-declined' : 'avatar-invited'}`}>
                                        {getInitials(notif.candidate_name)}
                                    </div>
                                    <div className={`notif-status-icon-dot ${isConfirmed ? 'dot-confirmed' : isDeclined ? 'dot-declined' : 'dot-invited'}`}>
                                        {isConfirmed ? <FiCheck size={11} strokeWidth={3} /> : isDeclined ? <FiX size={11} strokeWidth={3} /> : <FiClock size={11} />}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="notif-card-body">
                                    <div className="notif-card-top-row">
                                        <span className="notif-candidate-name">{notif.candidate_name}</span>
                                        {!notif.is_read && (
                                            <span className="notif-unread-badge-dot" title="Unread notification"></span>
                                        )}
                                        {/* Status Pill Badge (Styled exactly like Applicants table) */}
                                        {isConfirmed && (
                                            <span className="notif-rsvp-pill confirmed">
                                                <FiCheck size={12} strokeWidth={2.5} /> Confirmed
                                            </span>
                                        )}
                                        {isDeclined && (
                                            <span className="notif-rsvp-pill declined">
                                                <FiX size={12} strokeWidth={2.5} /> Declined
                                            </span>
                                        )}
                                        {isInvited && (
                                            <span className="notif-rsvp-pill invited">
                                                <FiClock size={12} /> Invited
                                            </span>
                                        )}
                                    </div>

                                    {/* Mid Row: Job title, reference, company */}
                                    <div className="notif-card-mid-row">
                                        <span className="notif-job-title">{notif.vacancy_title}</span>
                                        {notif.vacancy_ref && (
                                            <span className="notif-job-ref-tag">{notif.vacancy_ref}</span>
                                        )}
                                        {notif.company_name && (
                                            <span className="notif-company-tag">
                                                {notif.company_logo ? (
                                                    <img 
                                                        src={`${BACKEND_ROOT}/uploads/logos/${notif.company_logo}`} 
                                                        alt="" 
                                                        className="notif-company-mini-logo" 
                                                        onError={(e) => e.target.style.display = 'none'} 
                                                    />
                                                ) : (
                                                    <FiBriefcase size={12} />
                                                )}
                                                <span>{notif.company_name}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Schedule details */}
                                    {(notif.interview_date || notif.interview_time) && (
                                        <div className="notif-schedule-bar">
                                            <span className="notif-schedule-item date-item">
                                                <FiCalendar size={13} /> {formatInterviewDate(notif.interview_date)}
                                            </span>
                                            {notif.interview_time && (
                                                <span className="notif-schedule-item time-item">
                                                    <FiClock size={13} /> {notif.interview_time}
                                                </span>
                                            )}
                                            {notif.interview_type && (
                                                <span className="notif-schedule-item loc-item">
                                                    {notif.interview_type.toLowerCase().includes('online') ? <FiVideo size={13} /> : <FiMapPin size={13} />}
                                                    {notif.interview_type}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Area */}
                                <div className="notif-card-right">
                                    <span className="notif-timestamp" title={notif.created_at}>
                                        <FiClock size={12} /> {formatTimestamp(notif.created_at)}
                                    </span>

                                    <div className="notif-action-buttons">
                                        <button
                                            className="notif-view-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (notif.vacancy_id) {
                                                    navigate(`/admin/applicants?vacancy_id=${notif.vacancy_id}&search=${encodeURIComponent(notif.candidate_name)}`);
                                                } else {
                                                    navigate(`/admin/applicants?search=${encodeURIComponent(notif.candidate_name)}`);
                                                }
                                            }}
                                            title="View Candidate in Applicants"
                                        >
                                            <FiEye size={13} />
                                            <span>Applicant</span>
                                        </button>

                                        <button
                                            className="notif-icon-action-btn"
                                            onClick={(e) => handleToggleRead(e, notif)}
                                            title={notif.is_read ? "Mark as unread" : "Mark as read"}
                                        >
                                            <FiCheck size={15} style={{ opacity: notif.is_read ? 0.35 : 1, color: notif.is_read ? 'inherit' : '#059669' }} />
                                        </button>

                                        <button
                                            className="notif-icon-action-btn delete-btn"
                                            onClick={(e) => handleDelete(e, notif.id)}
                                            title="Dismiss notification"
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Pagination ── */}
            {pagination.totalPages > 1 && (
                <div className="notif-pagination-bar">
                    <div className="notif-pagination-info">
                        Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} notifications)
                    </div>
                    <div className="notif-pagination-controls">
                        <button
                            className="notif-page-btn"
                            disabled={pagination.page <= 1}
                            onClick={() => updateFilter({ page: pagination.page - 1 })}
                        >
                            Previous
                        </button>
                        <button
                            className="notif-page-btn"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => updateFilter({ page: pagination.page + 1 })}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* ── Rich Detail Modal ── */}
            {selectedModalNotif && (
                <div className="notif-modal-backdrop" onClick={() => setSelectedModalNotif(null)}>
                    <div className="notif-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="notif-modal-header">
                            <h3 className="notif-modal-title">Interview Notification Details</h3>
                            <button 
                                className="notif-modal-close-btn" 
                                onClick={() => setSelectedModalNotif(null)}
                                aria-label="Close modal"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="notif-modal-body">
                            {/* RSVP Status Banner */}
                            <div className={`notif-modal-status-banner ${
                                selectedModalNotif.response_status === 'confirmed' 
                                    ? 'banner-confirmed' 
                                    : selectedModalNotif.response_status === 'declined' 
                                        ? 'banner-declined' 
                                        : 'banner-invited'
                            }`}>
                                <div className="notif-modal-status-icon">
                                    {selectedModalNotif.response_status === 'confirmed' ? (
                                        <FiCheckCircle />
                                    ) : selectedModalNotif.response_status === 'declined' ? (
                                        <FiXCircle />
                                    ) : (
                                        <FiClock />
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', textTransform: 'capitalize' }}>
                                        Candidate RSVP: {selectedModalNotif.response_status}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', marginTop: '2px', opacity: 0.9 }}>
                                        {selectedModalNotif.message}
                                    </div>
                                </div>
                            </div>

                            {/* Candidate Info Box */}
                            <div>
                                <div className="notif-modal-section-title">Candidate Profile</div>
                                <div className="notif-modal-info-box">
                                    <div className="notif-modal-info-row">
                                        <span className="notif-modal-info-label">Full Name:</span>
                                        <span className="notif-modal-info-value">{selectedModalNotif.candidate_name}</span>
                                    </div>
                                    {selectedModalNotif.candidate_email && (
                                        <div className="notif-modal-info-row">
                                            <span className="notif-modal-info-label">Email Address:</span>
                                            <span className="notif-modal-info-value">
                                                <a href={`mailto:${selectedModalNotif.candidate_email}`} style={{ color: 'var(--notif-primary)', textDecoration: 'none' }}>
                                                    {selectedModalNotif.candidate_email}
                                                </a>
                                            </span>
                                        </div>
                                    )}
                                    {selectedModalNotif.candidate_phone && (
                                        <div className="notif-modal-info-row">
                                            <span className="notif-modal-info-label">Phone:</span>
                                            <span className="notif-modal-info-value">{selectedModalNotif.candidate_phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Position & Subsidiary Info */}
                            <div>
                                <div className="notif-modal-section-title">Position & Subsidiary</div>
                                <div className="notif-modal-info-box">
                                    <div className="notif-modal-info-row">
                                        <span className="notif-modal-info-label">Job Position:</span>
                                        <span className="notif-modal-info-value">{selectedModalNotif.vacancy_title}</span>
                                    </div>
                                    {selectedModalNotif.vacancy_ref && (
                                        <div className="notif-modal-info-row">
                                            <span className="notif-modal-info-label">Reference No:</span>
                                            <span className="notif-modal-info-value" style={{ fontFamily: 'monospace' }}>
                                                {selectedModalNotif.vacancy_ref}
                                            </span>
                                        </div>
                                    )}
                                    <div className="notif-modal-info-row">
                                        <span className="notif-modal-info-label">Subsidiary / Company:</span>
                                        <span className="notif-modal-info-value">{selectedModalNotif.company_name || 'George Steuart Group'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Interview Details */}
                            <div>
                                <div className="notif-modal-section-title">Interview Details</div>
                                <div className="notif-modal-info-box">
                                    <div className="notif-modal-info-row">
                                        <span className="notif-modal-info-label">Scheduled Date:</span>
                                        <span className="notif-modal-info-value" style={{ color: '#059669' }}>
                                            {formatInterviewDate(selectedModalNotif.interview_date)}
                                        </span>
                                    </div>
                                    <div className="notif-modal-info-row">
                                        <span className="notif-modal-info-label">Time:</span>
                                        <span className="notif-modal-info-value">{selectedModalNotif.interview_time || 'N/A'}</span>
                                    </div>
                                    <div className="notif-modal-info-row">
                                        <span className="notif-modal-info-label">Format / Type:</span>
                                        <span className="notif-modal-info-value">{selectedModalNotif.interview_type || 'N/A'}</span>
                                    </div>
                                    {selectedModalNotif.interview_location && (
                                        <div className="notif-modal-info-row">
                                            <span className="notif-modal-info-label">Location / Link:</span>
                                            <span className="notif-modal-info-value" style={{ maxWidth: '300px', wordBreak: 'break-all' }}>
                                                {selectedModalNotif.interview_location}
                                            </span>
                                        </div>
                                    )}
                                    <div className="notif-modal-info-row">
                                        <span className="notif-modal-info-label">Response Recorded:</span>
                                        <span className="notif-modal-info-value" style={{ color: '#64748b' }}>
                                            {formatTimestamp(selectedModalNotif.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="notif-modal-actions">
                            <button 
                                className="notif-btn notif-btn-outline" 
                                onClick={() => setSelectedModalNotif(null)}
                            >
                                Close
                            </button>
                            {selectedModalNotif.candidate_email && (
                                <a 
                                    href={`mailto:${selectedModalNotif.candidate_email}?subject=Regarding Your Interview for ${selectedModalNotif.vacancy_title}`}
                                    className="notif-btn notif-btn-outline"
                                    style={{ textDecoration: 'none' }}
                                >
                                    <FiMail />
                                    <span>Send Email</span>
                                </a>
                            )}
                            <button
                                className="notif-btn notif-btn-primary"
                                onClick={() => {
                                    setSelectedModalNotif(null);
                                    if (selectedModalNotif.vacancy_id) {
                                        navigate(`/admin/applicants?vacancy_id=${selectedModalNotif.vacancy_id}&search=${encodeURIComponent(selectedModalNotif.candidate_name)}`);
                                    } else {
                                        navigate(`/admin/applicants?search=${encodeURIComponent(selectedModalNotif.candidate_name)}`);
                                    }
                                }}
                            >
                                <FiExternalLink />
                                <span>Go to Applicant Profile</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationsPage;
