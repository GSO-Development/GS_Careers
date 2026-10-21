import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getAllVacancies, API_BASE } from "../../services/api";
const BACKEND_ROOT = API_BASE.replace('/api', '');
import {
    FiBriefcase, FiUsers, FiCheckCircle, FiClock,
    FiPlus, FiArrowRight, FiFileText, FiTrendingUp,
    FiTarget, FiActivity, FiLayers, FiZap, FiCalendar,
    FiBarChart2, FiStar, FiAward, FiUserPlus
} from "react-icons/fi";
import { formatDate, daysLeft } from "../../utils/constants";

// Animated counter hook
function useAnimatedCounter(end, duration = 1200, start = true) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start || !end) { setCount(end || 0); return; }
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [end, start]);
    return count;
}

function Dashboard({ admin }) {
    const [stats, setStats] = useState(null);
    const [recentVacancies, setRecentVacancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [animReady, setAnimReady] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, vacRes] = await Promise.all([getStats(), getAllVacancies()]);
            setStats(statsRes?.data?.data || null);
            setRecentVacancies((vacRes?.data?.data || []).slice(0, 5));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setTimeout(() => setAnimReady(true), 100);
        }
    };

    const totalVac = useAnimatedCounter(stats?.total_vacancies || 0, 1000, animReady);
    const activeVac = useAnimatedCounter(stats?.active_vacancies || 0, 1000, animReady);
    const totalApps = useAnimatedCounter(stats?.total_applications || 0, 1200, animReady);
    const talentPool = useAnimatedCounter(stats?.talent_pool_count || 0, 1000, animReady);

    if (loading) {
        return (
            <div className="dashboard-loading-screen">
                <div className="loading-orb"></div>
            </div>
        );
    }

    const firstName = (admin?.full_name || admin?.username || "Admin").split(" ")[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const conversionRate = stats?.total_vacancies > 0 
        ? Math.round((stats?.active_vacancies / stats?.total_vacancies) * 100) 
        : 0;

    return (
        <div className="premium-dashboard-container">
            {/* ── MINIMALIST EXECUTIVE HERO ── */}
            <div className="dashboard-hero-premium">
                <div className="hero-content-p">
                    <div className="hero-badge-p"><FiActivity /> SYSTEM EXECUTIVE SUITE</div>
                    <h1 className="hero-title-p">{greeting}, {firstName}</h1>
                    <p className="hero-subtitle-p">George Steuart Recruitment Orchestration Console · Established 1835</p>
                </div>
                <div className="hero-actions-p">
                    {admin.role !== 'super_admin' && (
                        <button className="btn-hero-p primary" onClick={() => navigate("/admin/vacancies/create")}>
                            <FiPlus /> New Vacancy
                        </button>
                    )}
                    <button className="btn-hero-p secondary" onClick={() => navigate("/admin/applicants")}>
                        <FiUsers /> Review Pipeline
                    </button>
                </div>
            </div>

            {/* ── MINIMALIST STAT CARDS ── */}
            <div className="stats-mosaic-grid admin-grid-4">
                <div className="db-stat-card" style={{ animationDelay: '0.05s' }}>
                    <div className="db-s-header">
                        <span className="db-s-label">Total Listings</span>
                        <div className="db-s-icon"><FiBriefcase /></div>
                    </div>
                    <span className="db-s-value">{totalVac}</span>
                </div>
                <div className="db-stat-card" style={{ animationDelay: '0.1s' }}>
                    <div className="db-s-header">
                        <span className="db-s-label">Live Channels</span>
                        <div className="db-s-icon green"><FiCheckCircle /></div>
                    </div>
                    <span className="db-s-value">{activeVac}</span>
                </div>
                <div className="db-stat-card" style={{ animationDelay: '0.15s' }}>
                    <div className="db-s-header">
                        <span className="db-s-label">Engagement</span>
                        <div className="db-s-icon blue"><FiUsers /></div>
                    </div>
                    <span className="db-s-value">{totalApps}</span>
                </div>
                <div className="db-stat-card" style={{ animationDelay: '0.2s' }}>
                    <div className="db-s-header">
                        <span className="db-s-label">Talent Reserve</span>
                        <div className="db-s-icon purple"><FiTarget /></div>
                    </div>
                    <span className="db-s-value">{talentPool}</span>
                </div>
            </div>

            <div className="dashboard-main-flow">
                {/* ── LEFT: ACTIVITY FEEDS ── */}
                <div className="main-activity-content">
                    {/* RECENT VACANCIES */}
                    <div className="activity-card-p">
                        <div className="card-header-p">
                            <div className="ch-title">
                                <FiLayers />
                                <h3>Active Recruitment Channels</h3>
                            </div>
                            <button className="ch-link" onClick={() => navigate("/admin/vacancies")}>
                                All Channels <FiArrowRight />
                            </button>
                        </div>
                        <div className="activity-list-p">
                            {recentVacancies.length === 0 ? (
                                <div className="empty-state-p">No active channels found.</div>
                            ) : (
                                recentVacancies.map((v, i) => (
                                    <div className="vacancy-item-mini" key={v.id} 
                                        style={{ animationDelay: `${i * 0.05}s` }}
                                        onClick={() => navigate("/admin/applicants?vacancy_id=" + v.id)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                            <img 
                                                src={v.company_logo ? `${BACKEND_ROOT}/uploads/logos/${v.company_logo}` : '/gs-logo.png'} 
                                                alt={v.company_name}
                                                onError={(e) => e.target.src = '/gs-logo.png'}
                                                style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', padding: '3px' }}
                                            />
                                            <div className="v-info">
                                                <strong>{v.title}</strong>
                                                <span>{v.company_name}</span>
                                            </div>
                                        </div>
                                        <div className="v-metric">
                                            <span className="count">{v.application_count || 0}</span>
                                            <span className="lbl">Applicants</span>
                                        </div>
                                        <div className="v-status">
                                            <span className={`pill ${daysLeft(v.expire_date) > 0 ? 'live' : 'ending'}`}>
                                                {daysLeft(v.expire_date) > 0 ? '● LIVE' : '○ ENDED'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RECENT APPLICANTS FEED */}
                    <div className="activity-card-p">
                        <div className="card-header-p">
                            <div className="ch-title">
                                <FiZap />
                                <h3>Latest Applicant Pulse</h3>
                            </div>
                            <button className="ch-link" onClick={() => navigate("/admin/applicants")}>
                                View Pipeline <FiArrowRight />
                            </button>
                        </div>
                        <div className="applicant-pulse-list">
                            {stats?.recent_applications?.length > 0 ? (
                                stats.recent_applications.map((app, i) => (
                                    <div className="pulse-item" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                                        <div className="p-avatar" style={{ background: '#f1f5f9', color: '#475569' }}>
                                            {app.first_name[0]}{app.last_name[0]}
                                        </div>
                                        <div className="p-text">
                                            <p><strong>{app.first_name} {app.last_name}</strong> applied for <span>{app.vacancy_title}</span></p>
                                            <span className="p-time"><FiClock /> {formatDate(app.applied_at)}</span>
                                        </div>
                                        <div className="pulse-dot"></div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state-p">No recent pulses detected.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: COMMAND SIDEBAR ── */}
                <div className="command-sidebar-p">
                    {/* UPCOMING INTERVIEWS */}
                    <div className="upcoming-interviews-card">
                        <div className="ui-header">
                            <FiCalendar />
                            <h3>Upcoming Interviews</h3>
                            {stats?.upcoming_interviews?.length > 0 && (
                                <span className="ui-count-badge">{stats.upcoming_interviews.length}</span>
                            )}
                        </div>
                        <div className="ui-list">
                            {stats?.upcoming_interviews?.length > 0 ? (
                                stats.upcoming_interviews.map((iv, i) => (
                                    <div className="ui-item" key={iv.id || i} onClick={() => navigate("/admin/applicants?search=" + encodeURIComponent(iv.first_name + " " + iv.last_name))}>
                                        <div className="ui-date-box">
                                            <span className="ui-day">{new Date(iv.interview_date).getDate()}</span>
                                            <span className="ui-month">{new Date(iv.interview_date).toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                        <div className="ui-details">
                                            <strong>{iv.first_name} {iv.last_name}</strong>
                                            <span>{iv.vacancy_title}</span>
                                            <div className="ui-meta">
                                                <FiClock size={11} /> {iv.interview_time} · {iv.interview_type}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state-p" style={{ padding: '12px 0', textAlign: 'left', background: 'transparent', border: 'none' }}>
                                    No upcoming interviews scheduled.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="shortcut-mosaic-card">
                        <label>Command Shortcuts</label>
                        <div className="shortcut-grid-p admin-grid-2">
                            <div className="shortcut-tile" onClick={() => navigate("/admin/applicants")}>
                                <div className="shortcut-icon blue"><FiUsers /></div>
                                <span>Applicants</span>
                            </div>
                            <div className="shortcut-tile" onClick={() => navigate("/admin/talent-pool")}>
                                <div className="shortcut-icon purple"><FiTarget /></div>
                                <span>Pool</span>
                            </div>
                            <div className="shortcut-tile" onClick={() => navigate("/admin/vacancies")}>
                                <div className="shortcut-icon gold"><FiFileText /></div>
                                <span>Posts</span>
                            </div>
                            {admin.role === 'super_admin' ? (
                                <div className="shortcut-tile" onClick={() => navigate("/admin/admins")}>
                                    <div className="shortcut-icon green"><FiUserPlus /></div>
                                    <span>Admins</span>
                                </div>
                            ) : (
                                <div className="shortcut-tile" onClick={() => navigate("/admin/vacancies/create")}>
                                    <div className="shortcut-icon green"><FiPlus /></div>
                                    <span>Post Job</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="heritage-footer-p">
                        <img src="/gs-logo.png" alt="GS" />
                        <p>George Steuart & Company<br/>Trusted since 1835</p>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .premium-dashboard-container {
                    padding: 0;
                    animation: fadeIn 0.4s ease-out;
                }

                /* LOADING */
                .dashboard-loading-screen {
                    min-height: 60vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .loading-orb {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid rgba(139,26,43,0.1);
                    border-top-color: var(--crimson);
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* HERO BANNER - LIGHT MINIMALIST EXECUTIVE (DASHBOARD ONLY) */
                .dashboard-hero-premium {
                    background: #ffffff;
                    border-radius: 14px;
                    padding: 22px 28px;
                    margin-bottom: 20px;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid #e2e8f0;
                    border-left: 4px solid var(--crimson, #8B1A2B);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                }

                .hero-content-p { position: relative; z-index: 2; }

                .hero-badge-p {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #fdf2f4;
                    border: 1px solid #fecdd3;
                    color: var(--crimson, #8B1A2B);
                    padding: 3px 10px;
                    border-radius: 100px;
                    font-size: 0.62rem;
                    font-weight: 700;
                    letter-spacing: 0.8px;
                    margin-bottom: 8px;
                }

                .hero-title-p {
                    font-family: var(--font-heading), 'Playfair Display', serif;
                    font-size: 1.55rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.3px;
                }

                .hero-subtitle-p {
                    color: #64748b;
                    font-size: 0.81rem;
                    margin: 0;
                    font-weight: 400;
                }

                .hero-actions-p {
                    display: flex;
                    gap: 10px;
                    z-index: 2;
                    position: relative;
                }

                .btn-hero-p {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                    font-size: 0.82rem;
                    font-family: var(--font-body);
                }
                .btn-hero-p.primary { 
                    background: var(--crimson, #8B1A2B); 
                    color: #ffffff; 
                    box-shadow: 0 2px 6px rgba(139, 26, 43, 0.2); 
                }
                .btn-hero-p.primary:hover { 
                    background: #a52338;
                    transform: translateY(-1px); 
                    box-shadow: 0 4px 10px rgba(139, 26, 43, 0.3); 
                }
                .btn-hero-p.secondary { 
                    background: #ffffff; 
                    color: #475569; 
                    border: 1px solid #cbd5e1; 
                }
                .btn-hero-p.secondary:hover { 
                    background: #f8fafc; 
                    border-color: #94a3b8;
                    color: #0f172a;
                    transform: translateY(-1px); 
                }

                /* MINIMALIST STAT MOSAIC */
                .stats-mosaic-grid { display: grid; gap: 16px; margin-bottom: 20px; }

                .db-stat-card {
                    background: #ffffff;
                    padding: 18px 20px;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s ease;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                }

                .db-stat-card:hover {
                    transform: translateY(-2px);
                    border-color: #cbd5e1;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                }

                .db-s-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .db-s-label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }

                .db-s-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    background: #f8fafc;
                    border: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    color: #64748b;
                }
                .db-s-icon.green { background: #ecfdf5; border-color: #d1fae5; color: #10b981; }
                .db-s-icon.blue { background: #eff6ff; border-color: #dbeafe; color: #3b82f6; }
                .db-s-icon.purple { background: #f5f3ff; border-color: #ede9fe; color: #8b5cf6; }

                .db-s-value {
                    font-size: 1.85rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.1;
                    font-variant-numeric: tabular-nums;
                }

                .db-s-trend {
                    font-size: 0.74rem;
                    font-weight: 600;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .db-s-trend.positive { color: #10b981; }

                /* MAIN FLOW */
                .dashboard-main-flow {
                    display: grid;
                    grid-template-columns: 1fr 290px;
                    gap: 20px;
                }

                .activity-card-p {
                    background: #ffffff;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                }

                .card-header-p {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #f1f5f9;
                }

                .ch-title { display: flex; align-items: center; gap: 8px; color: var(--crimson, #8B1A2B); }
                .ch-title h3 { font-size: 0.95rem; font-weight: 700; margin: 0; color: #0f172a; }
                .ch-link { 
                    background: none; 
                    border: none; 
                    color: var(--crimson, #8B1A2B); 
                    font-weight: 700; 
                    font-size: 0.78rem; 
                    display: flex; 
                    align-items: center; 
                    gap: 4px; 
                    cursor: pointer; 
                    transition: gap 0.2s; 
                }
                .ch-link:hover { gap: 8px; color: #a52338; }

                /* VACANCY LIST */
                .activity-list-p { display: flex; flex-direction: column; gap: 8px; }
                .vacancy-item-mini {
                    padding: 12px 14px;
                    border-radius: 10px;
                    border: 1px solid #f1f5f9;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .vacancy-item-mini:hover { 
                    border-color: #cbd5e1; 
                    background: #ffffff; 
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); 
                }
                .v-info { display: flex; flex-direction: column; flex: 1; }
                .v-info strong { font-size: 0.86rem; color: #0f172a; font-weight: 700; }
                .v-info span { font-size: 0.76rem; color: #64748b; margin-top: 1px; }
                .v-metric { text-align: center; padding: 0 16px; }
                .v-metric .count { display: block; font-size: 1.05rem; font-weight: 800; color: var(--crimson, #8B1A2B); }
                .v-metric .lbl { font-size: 0.6rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
                
                .pill { 
                    padding: 3px 10px; 
                    border-radius: 100px; 
                    font-size: 0.62rem; 
                    font-weight: 700; 
                    letter-spacing: 0.3px; 
                }
                .pill.live { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
                .pill.ending { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

                /* APPLICANT PULSE */
                .applicant-pulse-list { display: flex; flex-direction: column; gap: 12px; }
                .pulse-item {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    position: relative;
                }
                .p-avatar { 
                    width: 36px; 
                    height: 36px; 
                    border-radius: 10px; 
                    font-weight: 700; 
                    font-size: 0.8rem; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    flex-shrink: 0; 
                }
                .p-text p { margin: 0; font-size: 0.84rem; color: #334155; line-height: 1.35; }
                .p-text p span { color: var(--crimson, #8B1A2B); font-weight: 700; }
                .p-time { font-size: 0.72rem; color: #94a3b8; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
                .pulse-dot { 
                    width: 7px; 
                    height: 7px; 
                    border-radius: 50%; 
                    background: #10b981; 
                    flex-shrink: 0; 
                    margin-left: auto; 
                }

                /* COMMAND SIDEBAR */
                .command-sidebar-p { display: flex; flex-direction: column; gap: 16px; }

                .upcoming-interviews-card {
                    background: #ffffff;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    padding: 18px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                }
                .ui-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
                .ui-header svg { color: var(--crimson, #8B1A2B); font-size: 1rem; }
                .ui-header h3 { font-size: 0.92rem; font-weight: 700; margin: 0; color: #0f172a; flex: 1; }
                .ui-count-badge { background: var(--crimson, #8B1A2B); color: #fff; font-size: 0.62rem; font-weight: 800; padding: 2px 7px; border-radius: 100px; }
                .ui-list { display: flex; flex-direction: column; gap: 8px; }
                .ui-item {
                    display: flex;
                    gap: 12px;
                    padding: 10px;
                    background: #f8fafc;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid #f1f5f9;
                }
                .ui-item:hover { background: #ffffff; border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
                .ui-date-box { 
                    background: #fff1f2;
                    border: 1px solid #ffe4e6; 
                    border-radius: 8px; 
                    min-width: 44px; height: 44px; 
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center; 
                    color: var(--crimson, #8B1A2B); flex-shrink: 0;
                }
                .ui-day { font-size: 1rem; font-weight: 800; line-height: 1; }
                .ui-month { font-size: 0.58rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; }
                .ui-details { display: flex; flex-direction: column; justify-content: center; flex: 1; }
                .ui-details strong { font-size: 0.84rem; color: #0f172a; font-weight: 700; margin-bottom: 1px; }
                .ui-details span { font-size: 0.74rem; color: #64748b; margin-bottom: 2px; }
                .ui-meta { font-size: 0.68rem; color: #8B1A2B; font-weight: 600; display: flex; align-items: center; gap: 3px; }

                /* SHORTCUT */
                .shortcut-mosaic-card { 
                    background: #ffffff; 
                    border-radius: 14px; 
                    border: 1px solid #e2e8f0; 
                    padding: 18px; 
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03); 
                }
                .shortcut-mosaic-card label { 
                    display: block; 
                    font-size: 0.65rem; 
                    font-weight: 700; 
                    color: #94a3b8; 
                    text-transform: uppercase; 
                    letter-spacing: 1px; 
                    margin-bottom: 12px; 
                }
                .shortcut-grid-p { display: grid; gap: 8px; }
                .shortcut-tile {
                    background: #f8fafc;
                    padding: 12px 8px;
                    border-radius: 10px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid #f1f5f9;
                }
                .shortcut-tile:hover { 
                    background: #ffffff; 
                    border-color: #cbd5e1; 
                    transform: translateY(-1px); 
                    box-shadow: 0 4px 10px rgba(0,0,0,0.04); 
                }
                .shortcut-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
                .shortcut-icon.blue { background: #eff6ff; color: #3b82f6; }
                .shortcut-icon.purple { background: #f5f3ff; color: #8b5cf6; }
                .shortcut-icon.gold { background: #fefce8; color: #ca8a04; }
                .shortcut-icon.green { background: #ecfdf5; color: #10b981; }
                .shortcut-tile span { font-size: 0.78rem; font-weight: 600; color: #475569; }

                .heritage-footer-p { text-align: center; padding: 12px 0; }
                .heritage-footer-p img { width: 28px; filter: grayscale(1); opacity: 0.2; margin-bottom: 6px; }
                .heritage-footer-p p { font-size: 0.68rem; color: #94a3b8; font-weight: 500; line-height: 1.5; }

                /* EMPTY */
                .empty-state-p {
                    text-align: center;
                    padding: 24px;
                    color: #94a3b8;
                    font-size: 0.84rem;
                    background: #fafafa;
                    border-radius: 10px;
                    border: 1px dashed #e2e8f0;
                }

                /* RESPONSIVENESS */
                @media (max-width: 1200px) {
                    .dashboard-main-flow { display: flex; flex-direction: column; gap: 20px; }
                    .command-sidebar-p { display: contents; }
                    .upcoming-interviews-card { order: 1; }
                    .main-activity-content { order: 2; }
                    .shortcut-mosaic-card { order: 3; }
                    .heritage-footer-p { order: 4; }
                }

                @media (max-width: 1024px) {
                    .dashboard-hero-premium { flex-direction: column; align-items: flex-start; gap: 20px; padding: 24px; }
                    .hero-title-p { font-size: 1.5rem; }
                }

                @media (max-width: 768px) {
                    .dashboard-hero-premium { padding: 20px; border-radius: 14px; }
                    .hero-actions-p { flex-direction: column; width: 100%; }
                    .btn-hero-p { width: 100%; justify-content: center; }
                }

                @media (max-width: 480px) {
                    .stats-mosaic-grid { grid-template-columns: 1fr; }
                    .shortcut-grid-p { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;