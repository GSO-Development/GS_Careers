import { useLocation, Link } from 'react-router-dom';
import { FiCheck, FiArrowLeft, FiMail, FiMapPin, FiCalendar } from 'react-icons/fi';
import { API_BASE } from '../services/api';

const BACKEND_ROOT = API_BASE.replace('/api', '');

function SuccessPage() {
    const location = useLocation();
    const vacancy = location.state?.vacancy;

    return (
        <div className="success-page-v2">
            <div className="success-v2-bg"></div>

            <nav className="navbar" style={{ background: 'transparent', border: 'none', position: 'absolute', top: 0, width: '100%', zIndex: 20, padding: '16px 28px' }}>
                <Link to="/" className="navbar-brand">
                    <img src="/gs-logo.png" alt="George Steuart & Co" className="navbar-logo" style={{ filter: 'brightness(0) invert(1)' }} />
                    <div>
                        <div className="navbar-title" style={{ color: '#fff' }}>George Steuart</div>
                        <div className="navbar-subtitle" style={{ color: 'rgba(255,255,255,0.7)' }}>Careers</div>
                    </div>
                </Link>
            </nav>

            <div className="success-v2-container">
                <div className="success-v2-card">
                    {/* Dynamic Company Logo */}
                    <div className="success-v2-company-logo animate-fade-in" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '64px', height: '64px', background: '#fff', borderRadius: '14px', padding: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                                src={vacancy?.company_logo ? `${BACKEND_ROOT}/uploads/logos/${vacancy.company_logo}` : "/gs-logo.png"} 
                                alt={vacancy?.company_name || "George Steuart"}
                                onError={(e) => e.target.src = "/gs-logo.png"}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                        </div>
                    </div>

                    <div className="success-v2-stamp">
                        <FiCheck strokeWidth={3} />
                    </div>

                    <div className="success-v2-badge">Application Successful</div>
                    <h1 className="success-v2-title">Legacy Awaits</h1>

                    <div className="success-v2-message">
                        {vacancy ? (
                            <p>Thank you for your interest in joining <strong>{vacancy.company_name}</strong>. Your application for <strong>{vacancy.title}</strong> has been safely received.</p>
                        ) : (
                            <p>Thank you for your interest in joining George Steuart & Company. Your application has been successfully submitted.</p>
                        )}
                    </div>

                    <div className="v2-next-steps">
                        <div className="next-step-item">
                            <div className="next-step-icon">
                                <FiMail />
                            </div>
                            <div className="next-step-content">
                                <h5>Review Process</h5>
                                <p>Our team will carefully review your credentials against our heritage of excellence.</p>
                            </div>
                        </div>
                        <div className="next-step-item">
                            <div className="next-step-icon">
                                <FiCalendar />
                            </div>
                            <div className="next-step-content">
                                <h5>Timeline</h5>
                                <p>Expect to hear back from us within the coming weeks for potential interviews.</p>
                            </div>
                        </div>
                        <div className="next-step-item">
                            <div className="next-step-icon">
                                <FiMapPin />
                            </div>
                            <div className="next-step-content">
                                <h5>Stay Connected</h5>
                                <p>Follow our LinkedIn for more updates on career opportunities and firm news.</p>
                            </div>
                        </div>
                    </div>

                    <div className="success-v2-actions">
                        <Link to="/vacancies" className="btn-v2-outline">
                            <FiArrowLeft /> Return to Vacancies
                        </Link>
                    </div>
                </div>
            </div>

            {/* Simple Footer */}
            <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(0,0,0,0.4)', fontSize: '0.85rem', position: 'relative', zIndex: 10 }}>
                © {new Date().getFullYear()} George Steuart & Company Ltd. All rights reserved.
            </div>
        </div >
    );
}

export default SuccessPage;
