// src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getVacancies, getCompanies, API_BASE } from "../services/api";
import { formatDate, daysLeft } from "../utils/constants";

const BACKEND_ROOT = API_BASE.replace('/api', '');
import {
    FiMapPin,
    FiBriefcase,
    FiCalendar,
    FiMenu,
    FiX,
    FiArrowRight,
    FiAward,
    FiUsers,
    FiGlobe,
    FiFacebook,
    FiLinkedin,
    FiUser,
} from "react-icons/fi";

function HomePage() {
    const [vacancies, setVacancies] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [vacRes, compRes] = await Promise.all([
                    getVacancies({ limit: 3 }),
                    getCompanies(),
                ]);
                setVacancies(vacRes?.data?.data || []);
                setCompanies(compRes?.data?.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="public-page home-landing">
            {/* Navbar */}
            <nav className="navbar">
                <Link to="/" className="navbar-brand">
                    <img src="/gs-logo.png" alt="George Steuart & Co" className="navbar-logo" />
                    <div>
                        <div className="navbar-title">George Steuart</div>
                        <div className="navbar-subtitle">Careers</div>
                    </div>
                </Link>

                <div className={`navbar-links ${mobileMenuOpen ? "open" : ""}`}>
                    <Link to="/" className="navbar-link active" onClick={closeMobileMenu}>Home</Link>
                    <Link to="/vacancies" className="navbar-link" onClick={closeMobileMenu}>Vacancies</Link>
                    <Link 
                        to="/admin/login" 
                        className="navbar-link admin-icon-link" 
                        onClick={closeMobileMenu}
                        title="Admin Portal"
                        aria-label="Admin Portal"
                    >
                        <FiUser size={19} />
                        <span className="admin-link-text">Admin Portal</span>
                    </Link>
                </div>

                <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen((s) => !s)}>
                    {mobileMenuOpen ? <FiX /> : <FiMenu />}
                </button>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                {/* Creative Background Accents */}
                <div className="hero-bg-accent pulse"></div>
                <div className="hero-bg-accent-2"></div>

                <div className="hero-inner">
                    <div className="hero-left">
                        <div className="hero-badge animate-fade-in">
                            <FiAward className="badge-icon" />
                            <span>ESTD. 1835 — 190+ Years of Trust</span>
                        </div>
                        <h1 className="hero-title animate-slide-up">
                            Build Your Legacy <br />
                            <span className="title-accent">With George Steuart</span>
                        </h1>
                        <p className="hero-subtitle animate-slide-up">
                            Join Sri Lanka's oldest mercantile firm and be part of a 190+ year heritage of excellence.
                            We don't just offer jobs; we offer the chance to shape history.
                        </p>
                        <div className="hero-actions animate-slide-up">
                            <Link to="/vacancies" className="btn btn-gold btn-lg">
                                View Open Vacancies <FiArrowRight />
                            </Link>
                            <a href="#heritage" className="btn btn-outline btn-lg">Our Story</a>
                        </div>
                    </div>

                    <div className="hero-right">
                        <div className="hero-image-wrapper">
                            <div className="image-frame-decoration"></div>
                            <img
                                src="/hero-bg.jpg"
                                alt="George Steuart Heritage & Team"
                                className="hero-team-image"
                            />
                            {/* Floating Card for extra flair */}
                            <div className="hero-floating-card animate-float">
                                <FiUsers />
                                <div>
                                    <strong>1,500+</strong>
                                    <span>Team</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATS BAR */}
                <div className="hero-stats-bar">
                    <div className="hero-stat">
                        <div className="hero-stat-number">{vacancies.length}+</div>
                        <div className="hero-stat-label">OPEN POSITIONS</div>
                    </div>
                    <div className="hero-stat-divider" />
                    <div className="hero-stat">
                        <div className="hero-stat-number">{companies.length}</div>
                        <div className="hero-stat-label">SUBSIDIARIES</div>
                    </div>
                    <div className="hero-stat-divider" />
                    <div className="hero-stat">
                        <div className="hero-stat-number">190+</div>
                        <div className="hero-stat-label">YEARS OF TRUST</div>
                    </div>
                </div>
            </section>

            {/* Brand Marquee (Subsidiaries) */}
            <section className="brand-marquee-section">
                <div className="marquee-wrapper">
                    <div className="marquee-content">
                        {companies.map((comp, idx) => (
                            <div key={`comp-1-${idx}`} className="brand-item">
                                <img
                                    src={comp.logo ? `${BACKEND_ROOT}/uploads/logos/${comp.logo}` : "/gs-logo.png"}
                                    alt={comp.name}
                                    onError={(e) => e.target.src = "/gs-logo.png"}
                                    style={{ height: '40px', width: 'auto', objectFit: 'contain', filter: 'grayscale(1)', opacity: 0.6, transition: 'all 0.3s' }}
                                />
                                <span>{comp.name}</span>
                            </div>
                        ))}
                        {/* Repeat for seamless scroll */}
                        {companies.map((comp, idx) => (
                            <div key={`comp-2-${idx}`} className="brand-item">
                                <img
                                    src={comp.logo ? `${BACKEND_ROOT}/uploads/logos/${comp.logo}` : "/gs-logo.png"}
                                    alt={comp.name}
                                    onError={(e) => e.target.src = "/gs-logo.png"}
                                    style={{ height: '40px', width: 'auto', objectFit: 'contain', filter: 'grayscale(1)', opacity: 0.6, transition: 'all 0.3s' }}
                                />
                                <span>{comp.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* Heritage Section (formerly below featured) */}
            <section className="heritage-section" id="heritage">
                <div className="container">
                    <div className="heritage-grid">
                        <div className="heritage-content">
                            <span className="section-badge">Our Legacy</span>
                            <h2 className="section-title-creative">Established In 1835</h2>
                            <p className="section-desc">
                                From 1835 to the present day, George Steuart & Company has stood as a beacon of stability and growth in Sri Lanka. Rooted in a rich heritage, we continue to embrace innovation, pursue excellence, and create lasting value for future generations.
                            </p>
                            <div className="heritage-features">
                                <div className="h-feature">
                                    <div className="h-icon"><FiGlobe /></div>
                                    <div>
                                        <h4>Global Presence</h4>
                                        <p>Global Presence

                                            Connecting markets, building partnerships, and extending our legacy of excellence beyond borders.</p>
                                    </div>
                                </div>
                                <div className="h-feature">
                                    <div className="h-icon"><FiUsers /></div>
                                    <div>
                                        <h4>Diverse Team</h4>
                                        <p>Over 1,000 professionals working across multiple sectors.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="heritage-visual">
                            <div className="heritage-card-wrapper">
                                <img
                                    src="/heritage-believe.png"
                                    alt="George Steuart Heritage - Believe"
                                    className="heritage-believe-img"
                                />
                                <div className="heritage-floating-text">
                                    "Believe in Excellence"
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Core Values Section */}
            <section className="values-section">
                <div className="container">
                    <div className="values-grid">
                        <div className="value-item">
                            <div className="value-icon">I</div>
                            <h3>Integrity</h3>
                            <p>We maintain the highest standards of professional ethics and transparent conduct.</p>
                        </div>
                        <div className="value-item">
                            <div className="value-icon">E</div>
                            <h3>Excellence</h3>
                            <p>Delivering world-class quality in every sector we operate in, every single day.</p>
                        </div>
                        <div className="value-item">
                            <div className="value-icon">H</div>
                            <h3>Heritage</h3>
                            <p>Continuing a 190+ year journey of mercantile leadership in Sri Lanka.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card">
                        <div className="cta-content">
                            <h2>Be Part of Sri Lanka's Heritage</h2>
                            <p>We are always looking for talented individuals who believe in excellence and integrity.</p>
                            <Link to="/vacancies" className="btn btn-warm btn-lg">Explore Openings</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer-premium">
                <div className="container">
                    <div className="footer-top-grid">
                        <div className="footer-col brand-col">
                            <img src="/gs-logo.png" alt="George Steuart & Co" className="footer-logo-premium" />
                            <h3 className="footer-brand-name">George Steuart <br /><span>& Company Ltd</span></h3>
                            <p className="footer-about-text">
                                Established in 1835, George Steuart & Company is Sri Lanka's oldest mercantile firm, fostering excellence for nearly two centuries.
                            </p>
                            <div className="footer-socials">
                                <a href="https://www.facebook.com/GeorgeSteuarts" target="_blank" rel="noopener noreferrer" className="social-link" title="Facebook">
                                    <FiFacebook />
                                </a>
                                <a href="https://www.linkedin.com/company/george-steuart-&-company-limited" target="_blank" rel="noopener noreferrer" className="social-link" title="LinkedIn">
                                    <FiLinkedin />
                                </a>
                            </div>
                        </div>

                        <div className="footer-col links-col">
                            <h4 className="footer-col-title">Quick Links</h4>
                            <ul className="footer-links-list">
                                <li><Link to="/">Home</Link></li>
                                <li><Link to="/vacancies">All Vacancies</Link></li>
                                <li><a href="#heritage">Our Heritage</a></li>
                            </ul>
                        </div>

                        <div className="footer-col contact-col">
                            <h4 className="footer-col-title">Get In Touch</h4>
                            <div className="footer-contact-info">
                                <p><FiMapPin className="c-icon" /> No. 439, Galle Road, Colombo 03, Sri Lanka.</p>
                                <p><FiGlobe className="c-icon" /> www.georgesteuart.lk</p>
                                <div className="contact-numbers">
                                    <p><span>T:</span> +94 117 792 400</p>
                                    <p><span>E:</span> info@georgesteuart.lk</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom-bar">
                        <div className="copyright-area">
                            © {new Date().getFullYear()} George Steuart & Company Ltd. All Rights Reserved.
                        </div>
                        <div className="developer-credit">
                            Developed by <span>GS Optimize pvt ltd</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default HomePage;