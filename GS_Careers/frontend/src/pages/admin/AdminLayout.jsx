import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
    FiGrid, FiBriefcase, FiUsers, FiUserPlus, FiLogOut, 
    FiMenu, FiX, FiTarget, FiChevronRight, FiSettings, 
    FiCheckCircle, FiActivity, FiChevronsLeft, FiChevronsRight, FiCpu 
} from 'react-icons/fi';
import { API_BASE, getPendingApprovals } from '../../services/api';

const BACKEND_ROOT = API_BASE.replace('/api', '');

function AdminLayout({ admin, children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [vacanciesExpanded, setVacanciesExpanded] = useState(
        location.pathname.startsWith('/admin/vacancies') || location.pathname.startsWith('/admin/companies')
    );
    const [approvalsExpanded, setApprovalsExpanded] = useState(location.pathname.startsWith('/admin/approvals'));
    const [pendingCount, setPendingCount] = useState(0);

    // Auto-close mobile drawer on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Handle ESC key to close mobile drawer
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Handle window resize past desktop breakpoint
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch live pending count
    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const res = await getPendingApprovals();
                const list = res.data.data || [];
                let count = 0;
                if (admin.role === 'sub_admin1') {
                    count = list.filter(v => v.approval_status === 'pending_subadmin1').length;
                } else if (admin.role === 'super_admin' || admin.role === 'admin') {
                    count = list.filter(v => v.approval_status === 'pending_global' || v.approval_status === 'pending_subadmin1').length;
                }
                setPendingCount(count);
            } catch (err) {
                console.error('Failed to fetch pending approvals count:', err);
            }
        };

        if (admin && admin.role !== 'sub_admin2') {
            fetchPendingCount();
            const interval = setInterval(fetchPendingCount, 30000);
            return () => clearInterval(interval);
        }
    }, [admin]);

    const handleLogout = () => {
        localStorage.removeItem('gs_admin_token');
        localStorage.removeItem('gs_admin_data');
        navigate('/admin/login');
    };

    const getRoleDisplayName = (role) => {
        const mapping = {
            super_admin: 'Super Admin',
            admin: 'GS Admin',
            sub_admin1: 'Sub Admin 1',
            sub_admin2: 'Sub Admin 2',
            sub_admin: 'Sub Admin 2'
        };
        return mapping[role] || 'Sub Admin';
    };

    const initials = (admin.full_name || 'Admin')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    const navItems = [
        { to: '/admin', icon: <FiGrid />, label: 'Dashboard', end: true, badge: null },
        { to: '/admin/vacancies', icon: <FiBriefcase />, label: 'Vacancies', badge: null },
        { to: '/admin/approvals', icon: <FiCheckCircle />, label: 'Approvals', badge: pendingCount > 0 ? pendingCount : null },
        { to: '/admin/applicants', icon: <FiUsers />, label: 'Applicants', badge: null },
        { to: '/admin/talent-pool', icon: <FiTarget />, label: 'Talent Pool', badge: null },
        { to: '/admin/audit-log', icon: <FiActivity />, label: 'Audit Log', badge: null },
    ];

    if (admin.role === 'super_admin' || admin.role === 'admin') {
        navItems.push({ to: '/admin/admins', icon: <FiUserPlus />, label: 'Manage Admins', badge: null });
    }
    navItems.push({ to: '/admin/cv-extractions', icon: <FiCpu />, label: 'CV Extractions', badge: null });
    navItems.push({ to: '/admin/settings', icon: <FiSettings />, label: 'Settings', badge: null });

    const currentPage = navItems.find(item => {
        if (item.end) return location.pathname === '/admin';
        return location.pathname.startsWith(item.to);
    })?.label || 'Dashboard';

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Mobile Header (Fixed Top Bar on screens <= 1024px) */}
            <div className="admin-mobile-header">
                <button 
                    className="hamburger-btn" 
                    onClick={() => setSidebarOpen(!sidebarOpen)} 
                    aria-label="Toggle Navigation Menu"
                >
                    {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                </button>
                <div className="mobile-brand">
                    <img 
                        src={admin.role !== 'super_admin' && admin.role !== 'admin' && admin.company_logo ? `${BACKEND_ROOT}/uploads/logos/${admin.company_logo}` : "/gs-logo.png"} 
                        alt="George Steuart" 
                        className="mobile-brand-logo" 
                        onError={(e) => e.target.src = "/gs-logo.png"} 
                    />
                    <span className="mobile-brand-title">
                        {admin.role !== 'super_admin' && admin.role !== 'admin' && admin.company_name ? admin.company_name : 'George Steuart'}
                    </span>
                </div>
                <div className="mobile-page-badge">
                    <span>{currentPage}</span>
                </div>
            </div>

            {/* Mobile Backdrop Overlay */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay" 
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
            )}

            {/* Admin Sidebar Drawer */}
            <aside className={`admin-sidebar enhanced-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-top-accent"></div>

                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <div className="sidebar-logo-wrapper">
                            <img 
                                src={admin.role !== 'super_admin' && admin.role !== 'admin' && admin.company_logo ? `${BACKEND_ROOT}/uploads/logos/${admin.company_logo}` : "/gs-logo.png"} 
                                alt="George Steuart & Co" 
                                className="sidebar-logo" 
                                onError={(e) => e.target.src = "/gs-logo.png"}
                            />
                        </div>
                        <div className="sidebar-brand-text">
                            <div className="sidebar-title">
                                {admin.role !== 'super_admin' && admin.role !== 'admin' && admin.company_name ? admin.company_name : 'George Steuart'}
                            </div>
                            <div className="sidebar-role">
                                <span className="role-dot"></span>
                                {getRoleDisplayName(admin.role)}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Collapse Toggle */}
                    <button 
                        className="sidebar-collapse-toggle desktop-toggle-btn" 
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        aria-label="Collapse Sidebar"
                        title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {sidebarCollapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
                    </button>

                    {/* Mobile Close Button */}
                    <button 
                        className="sidebar-mobile-close-btn" 
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close Sidebar"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="sidebar-nav-label">
                    <span>NAVIGATION</span>
                    <span className="nav-label-badge">SUITE</span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => {
                        if (item.label === 'Vacancies') {
                            const isVacanciesActive = location.pathname.startsWith('/admin/vacancies') || location.pathname.startsWith('/admin/companies');
                            return (
                                <div key={item.to} className="sidebar-dropdown-container">
                                    <div
                                        className={`sidebar-link ${isVacanciesActive ? 'active' : ''}`}
                                        title={sidebarCollapsed ? "Vacancies" : ""}
                                        onClick={() => {
                                            if (sidebarCollapsed) setSidebarCollapsed(false);
                                            setVacanciesExpanded(!vacanciesExpanded);
                                            navigate('/admin/vacancies');
                                            if (window.innerWidth <= 1024) setSidebarOpen(false);
                                        }}
                                    >
                                        <span className="sidebar-link-icon">{item.icon}</span>
                                        <span className="sidebar-link-text">{item.label}</span>
                                        <FiChevronRight 
                                            className="sidebar-link-arrow" 
                                            size={14} 
                                            style={{ 
                                                transform: vacanciesExpanded ? 'rotate(90deg)' : 'translateX(0)',
                                                opacity: 1,
                                                transition: 'transform 0.2s ease'
                                            }} 
                                        />
                                    </div>
                                    
                                    {vacanciesExpanded && (
                                        <div className="sidebar-submenu animate-slide-down">
                                            <NavLink
                                                to="/admin/vacancies"
                                                end
                                                className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <span className="sidebar-sublink-bullet"></span>
                                                <span>{admin?.role === 'super_admin' ? 'View Vacancy' : 'Add Vacancies'}</span>
                                            </NavLink>
                                            {(admin.role === 'super_admin' || admin.role === 'admin') && (
                                                <NavLink
                                                    to="/admin/vacancies/reports"
                                                    className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                                                    onClick={() => setSidebarOpen(false)}
                                                >
                                                    <span className="sidebar-sublink-bullet"></span>
                                                    <span>Manage Vacancies</span>
                                                </NavLink>
                                            )}
                                            <NavLink
                                                to="/admin/companies"
                                                className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <span className="sidebar-sublink-bullet"></span>
                                                <span>Manage Company</span>
                                            </NavLink>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        if (item.label === 'Approvals') {
                            const isApprovalsActive = location.pathname.startsWith('/admin/approvals');
                            return (
                                <div key={item.to} className="sidebar-dropdown-container">
                                    <div
                                        className={`sidebar-link ${isApprovalsActive ? 'active' : ''}`}
                                        title={sidebarCollapsed ? `Approvals ${item.badge ? `(${item.badge})` : ''}` : ""}
                                        onClick={() => {
                                            if (sidebarCollapsed) setSidebarCollapsed(false);
                                            setApprovalsExpanded(!approvalsExpanded);
                                            navigate('/admin/approvals');
                                            if (window.innerWidth <= 1024) setSidebarOpen(false);
                                        }}
                                    >
                                        <span className="sidebar-link-icon">{item.icon}</span>
                                        <span className="sidebar-link-text">{item.label}</span>
                                        {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                                        <FiChevronRight 
                                            className="sidebar-link-arrow" 
                                            size={14} 
                                            style={{ 
                                                transform: approvalsExpanded ? 'rotate(90deg)' : 'translateX(0)',
                                                opacity: 1,
                                                transition: 'transform 0.2s ease'
                                            }} 
                                        />
                                    </div>
                                    
                                    {approvalsExpanded && (
                                        <div className="sidebar-submenu animate-slide-down">
                                            <NavLink
                                                to="/admin/approvals"
                                                end
                                                className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <span className="sidebar-sublink-bullet"></span>
                                                <span>Pending Approvals</span>
                                            </NavLink>
                                            <NavLink
                                                to="/admin/approvals/tracker"
                                                className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <span className="sidebar-sublink-bullet"></span>
                                                <span>Approval Tracker</span>
                                            </NavLink>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                title={sidebarCollapsed ? item.label : ""}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                <span className="sidebar-link-text">{item.label}</span>
                                {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                                <FiChevronRight className="sidebar-link-arrow" size={14} />
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user-card" title={sidebarCollapsed ? `${admin.full_name} (${getRoleDisplayName(admin.role)})` : ""}>
                        <div className="sidebar-avatar-enhanced">
                            <span>{initials}</span>
                            <div className="avatar-online-dot"></div>
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{admin.full_name}</div>
                            <div className="sidebar-user-role">
                                {admin.role === 'super_admin' ? 'Super Admin' : (admin.role === 'admin' ? 'GS Admin' : `${getRoleDisplayName(admin.role)} · ${admin.company_name || ''}`)}
                            </div>
                        </div>
                    </div>
                    <button 
                        className="sidebar-logout-btn" 
                        onClick={handleLogout}
                        title={sidebarCollapsed ? "Sign Out" : ""}
                    >
                        <FiLogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="admin-content">
                {children}
            </main>

            <style jsx="true">{`
                /* ── ENHANCED ULTRA-MODERN SIDEBAR STYLES ── */
                .enhanced-sidebar {
                    background: #ffffff;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 4px 0 24px rgba(15, 23, 42, 0.03);
                    width: 260px;
                    display: flex;
                    flex-direction: column;
                    position: fixed;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    height: 100vh;
                    z-index: 1000;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                .sidebar-top-accent {
                    height: 3px;
                    background: linear-gradient(90deg, #8B1A2B 0%, #C8A951 50%, #8B1A2B 100%);
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 10;
                }

                .sidebar-header {
                    padding: 14px 14px 10px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    background: #ffffff;
                    flex-shrink: 0;
                }

                .sidebar-brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                }

                .sidebar-logo-wrapper {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #ffffff;
                    flex-shrink: 0;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
                }

                .sidebar-logo {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .sidebar-brand-text {
                    flex: 1;
                    min-width: 0;
                }

                .sidebar-title {
                    font-size: 0.86rem;
                    font-weight: 800;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1.2;
                    letter-spacing: -0.3px;
                }

                .sidebar-role {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #8B1A2B;
                    background: rgba(139, 26, 43, 0.06);
                    padding: 1px 7px;
                    border-radius: 100px;
                    margin-top: 2px;
                }

                .role-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #10b981;
                    box-shadow: 0 0 5px rgba(16,185,129,0.5);
                    animation: pulsate 2s infinite;
                    flex-shrink: 0;
                }

                @keyframes pulsate {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(0.85); }
                }

                .desktop-toggle-btn {
                    width: 28px;
                    height: 28px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    border-radius: 7px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }

                .desktop-toggle-btn:hover {
                    background: rgba(139, 26, 43, 0.08);
                    color: #8B1A2B;
                    border-color: rgba(139, 26, 43, 0.2);
                    transform: scale(1.04);
                }

                .sidebar-mobile-close-btn {
                    display: none;
                    width: 28px;
                    height: 28px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    border-radius: 7px;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .sidebar-nav-label {
                    font-size: 0.58rem;
                    font-weight: 800;
                    color: #94a3b8;
                    letter-spacing: 1.6px;
                    text-transform: uppercase;
                    padding: 8px 14px 4px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }

                .nav-label-badge {
                    font-size: 0.55rem;
                    font-weight: 800;
                    color: #C8A951;
                    background: rgba(200, 169, 81, 0.12);
                    padding: 1px 5px;
                    border-radius: 4px;
                    letter-spacing: 1px;
                }

                /* Scrollable Nav Container - Fit All Items Without Scrollbar */
                .sidebar-nav {
                    flex: 1 1 auto;
                    padding: 4px 8px;
                    overflow-y: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    gap: 1px;
                }

                .sidebar-nav::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }

                /* Navigation Links */
                .sidebar-link {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 7px 10px;
                    border-radius: 8px;
                    font-size: 0.83rem;
                    font-weight: 600;
                    color: #475569;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    border: none;
                    background: transparent;
                    width: 100%;
                    text-align: left;
                    font-family: var(--font-body);
                    position: relative;
                    margin-bottom: 1px;
                    text-decoration: none;
                    min-height: 35px;
                }

                .sidebar-link-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 1.05rem;
                    transition: all 0.2s ease;
                    width: 20px;
                    color: #64748b;
                }

                .sidebar-link-text {
                    flex: 1;
                    font-weight: 600;
                    font-size: 0.83rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .sidebar-link-arrow {
                    opacity: 0.5;
                    transition: all 0.2s ease;
                    color: #94a3b8;
                    flex-shrink: 0;
                }

                .sidebar-link:hover:not(.active) {
                    background: rgba(15, 23, 42, 0.04);
                    color: #0f172a;
                    transform: translateX(2px);
                }

                .sidebar-link:hover:not(.active) .sidebar-link-icon {
                    color: #0f172a;
                    transform: scale(1.05);
                }

                .sidebar-link:hover:not(.active) .sidebar-link-arrow {
                    opacity: 1;
                    color: #8B1A2B;
                }

                /* Active Link State - Unified Deep Crimson Gradient Matching Page Banner */
                .sidebar-link.active {
                    background: linear-gradient(135deg, #8B1A2B 0%, #6B1420 100%) !important;
                    color: #ffffff !important;
                    font-weight: 700 !important;
                    box-shadow: 0 4px 14px rgba(139, 26, 43, 0.28) !important;
                    border-radius: 8px !important;
                }

                .sidebar-link.active::before {
                    display: none !important;
                }

                .sidebar-link.active .sidebar-link-icon {
                    color: #F3E5AB !important;
                    transform: scale(1.1) !important;
                }

                .sidebar-link.active .sidebar-link-arrow {
                    opacity: 1 !important;
                    color: #F3E5AB !important;
                }

                .sidebar-badge {
                    background: #8B1A2B;
                    color: #ffffff;
                    font-size: 0.62rem;
                    font-weight: 800;
                    padding: 1px 6px;
                    border-radius: 100px;
                    min-width: 16px;
                    text-align: center;
                    box-shadow: 0 2px 5px rgba(139, 26, 43, 0.3);
                    flex-shrink: 0;
                }

                /* Submenu Tree Layout */
                .sidebar-submenu {
                    padding-left: 8px;
                    margin-top: 1px;
                    margin-bottom: 3px;
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                    border-left: 2px solid #f1f5f9;
                    margin-left: 18px;
                }

                .sidebar-sublink {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 5px 10px;
                    color: #64748b;
                    font-size: 0.78rem;
                    font-weight: 600;
                    text-decoration: none;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    min-height: 30px;
                }

                .sidebar-sublink-bullet {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #cbd5e1;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }

                .sidebar-sublink:hover {
                    color: #8B1A2B;
                    background: rgba(139, 26, 43, 0.04);
                    padding-left: 14px;
                }

                .sidebar-sublink:hover .sidebar-sublink-bullet {
                    background: #8B1A2B;
                    transform: scale(1.2);
                }

                .sidebar-sublink.active {
                    color: #8B1A2B;
                    background: linear-gradient(135deg, rgba(139, 26, 43, 0.08), rgba(139, 26, 43, 0.02));
                    font-weight: 700;
                }

                .sidebar-sublink.active .sidebar-sublink-bullet {
                    background: #8B1A2B;
                    transform: scale(1.3);
                    box-shadow: 0 0 5px rgba(139, 26, 43, 0.5);
                }

                .animate-slide-down {
                    animation: slideDown 0.22s ease-out;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-3px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Sidebar Footer & User Profile Card */
                .sidebar-footer {
                    padding: 10px 12px;
                    border-top: 1px solid #f1f5f9;
                    background: #ffffff;
                    flex-shrink: 0;
                }

                .sidebar-user-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 7px 10px;
                    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 6px;
                }

                .sidebar-avatar-enhanced {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #8B1A2B, #5c0f1b);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: #ffffff;
                    flex-shrink: 0;
                    position: relative;
                    box-shadow: 0 2px 7px rgba(139, 26, 43, 0.2);
                }

                .avatar-online-dot {
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                }

                .sidebar-user-info {
                    flex: 1;
                    min-width: 0;
                }

                .sidebar-user-name {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .sidebar-user-role {
                    font-size: 0.65rem;
                    color: #64748b;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .sidebar-logout-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    width: 100%;
                    padding: 7px 10px;
                    background: rgba(220, 38, 38, 0.05);
                    border: 1px solid rgba(220, 38, 38, 0.12);
                    color: #dc2626;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: var(--font-body);
                    min-height: 34px;
                }

                .sidebar-logout-btn:hover {
                    background: rgba(220, 38, 38, 0.12);
                    border-color: rgba(220, 38, 38, 0.25);
                    transform: translateY(-1px);
                    box-shadow: 0 3px 10px rgba(220, 38, 38, 0.12);
                }

                /* Mobile Header Styles */
                .admin-mobile-header {
                    display: none;
                }

                .mobile-brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }

                .mobile-brand-logo {
                    height: 32px;
                    width: auto;
                    object-fit: contain;
                }

                .mobile-brand-title {
                    font-weight: 800;
                    font-size: 0.85rem;
                    letter-spacing: 0.5px;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 160px;
                }

                .mobile-page-badge {
                    background: rgba(139, 26, 43, 0.08);
                    color: #8B1A2B;
                    font-size: 0.7rem;
                    font-weight: 800;
                    padding: 4px 10px;
                    border-radius: 100px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* ── DESKTOP COLLAPSED STATE STYLES ── */
                @media (min-width: 1025px) {
                    .admin-layout.sidebar-collapsed .enhanced-sidebar {
                        width: 78px;
                    }
                    
                    .admin-layout.sidebar-collapsed .admin-content {
                        margin-left: 78px;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-brand-text,
                    .admin-layout.sidebar-collapsed .sidebar-link-text,
                    .admin-layout.sidebar-collapsed .sidebar-link-arrow,
                    .admin-layout.sidebar-collapsed .sidebar-nav-label,
                    .admin-layout.sidebar-collapsed .sidebar-user-info,
                    .admin-layout.sidebar-collapsed .sidebar-logout-btn span,
                    .admin-layout.sidebar-collapsed .sidebar-submenu {
                        display: none !important;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-logo-wrapper {
                        width: 36px;
                        height: 36px;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-brand {
                        justify-content: center;
                        gap: 0;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-header {
                        padding: 16px 8px;
                        justify-content: center;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-link {
                        justify-content: center;
                        padding: 10px;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-link-icon {
                        margin: 0;
                        width: auto;
                    }

                    .admin-layout.sidebar-collapsed .sidebar-badge {
                        position: absolute;
                        top: 4px;
                        right: 8px;
                        font-size: 0.6rem;
                        padding: 1px 4px;
                        min-width: 16px;
                        min-height: 16px;
                        border-radius: 50%;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-user-card {
                        padding: 6px;
                        justify-content: center;
                        background: none;
                        border: none;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-avatar-enhanced {
                        margin: 0;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-logout-btn {
                        padding: 10px;
                        background: none;
                        border: none;
                        color: #dc2626;
                        justify-content: center;
                    }
                    
                    .admin-layout.sidebar-collapsed .sidebar-logout-btn:hover {
                        background: rgba(220, 38, 38, 0.08);
                        box-shadow: none;
                    }
                }

                /* ── MOBILE & TABLET RESPONSIVE STYLES ── */
                @media (max-width: 1024px) {
                    .admin-mobile-header {
                        display: flex !important;
                        align-items: center;
                        justify-content: space-between;
                        height: 60px;
                        padding: 0 16px;
                        background: rgba(255, 255, 255, 0.98);
                        backdrop-filter: blur(12px);
                        border-bottom: 1px solid #e2e8f0;
                        position: fixed !important;
                        top: 0;
                        left: 0;
                        right: 0;
                        z-index: 1010;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
                    }

                    .hamburger-btn {
                        background: rgba(139, 26, 43, 0.05);
                        border: 1px solid rgba(139, 26, 43, 0.12);
                        color: #8B1A2B;
                        padding: 8px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }

                    .hamburger-btn:active {
                        transform: scale(0.92);
                    }

                    .admin-sidebar {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        width: 280px !important;
                        max-width: 85vw !important;
                        height: 100vh !important;
                        z-index: 1025 !important;
                        background: #ffffff !important;
                        transform: translateX(-100%) !important;
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        box-shadow: 10px 0 40px rgba(15, 23, 42, 0.15) !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }

                    .admin-sidebar.open {
                        transform: translateX(0) !important;
                    }

                    .sidebar-mobile-close-btn {
                        display: flex !important;
                    }

                    .desktop-toggle-btn {
                        display: none !important;
                    }

                    .sidebar-overlay {
                        position: fixed !important;
                        inset: 0 !important;
                        background: rgba(15, 23, 42, 0.4) !important;
                        backdrop-filter: blur(4px) !important;
                        z-index: 1020 !important;
                        animation: fadeIn 0.22s ease !important;
                    }

                    .admin-content {
                        margin-left: 0 !important;
                        margin-top: 60px !important;
                        padding: 20px 16px !important;
                        min-height: calc(100vh - 60px) !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default AdminLayout;
