import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../services/api';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiArrowLeft, FiShield, FiEye, FiEyeOff, FiAward, FiArrowRight, FiCheck } from 'react-icons/fi';

function LoginPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username || !form.password) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const res = await login(form);
            localStorage.setItem('gs_admin_token', res.data.data.token);
            localStorage.setItem('gs_admin_data', JSON.stringify(res.data.data.admin));
            toast.success('Access Granted. Orchestrating Console...');
            navigate('/admin');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-bg">
            {/* Outer Page Navigation Pill Button */}
            <button className="page-outer-back-btn" onClick={() => navigate('/')} type="button">
                <FiArrowLeft className="back-arrow-icon" /> <span>Return to Portals</span>
            </button>

            {/* Ambient Background Glows */}
            <div className="bg-decor decor-top-left"></div>
            <div className="bg-decor decor-bottom-right"></div>

            {/* Compact & Fully Responsive Two-Sided Card */}
            <div className="compact-login-card">
                
                {/* LEFT SIDE: Brand & Identity Panel */}
                <div className="card-branding-side">
                    <img src="/admin-branding.png" alt="George Steuart Heritage" className="branding-photo" />
                    <div className="branding-gradient-overlay"></div>
                    
                    <div className="branding-header">
                        <img src="/gs-logo.png" alt="George Steuart & Co." className="brand-logo-img" />
                        <div className="estd-badge-pill">
                            <FiAward className="badge-icon" />
                            <span>ESTD 1835</span>
                        </div>
                    </div>

                    <div className="branding-body">
                        <div className="brand-tagline">CEYLON HERITAGE & INNOVATION</div>
                        <h1 className="brand-main-title">
                            Heritage. <br />
                            Trust. <br />
                            <span className="shimmer-gold-text">Excellence.</span>
                        </h1>

                        <div className="feature-bullets">
                            <div className="bullet-row">
                                <div className="bullet-check"><FiCheck /></div>
                                <span>Enterprise Access Security</span>
                            </div>
                            <div className="bullet-row">
                                <div className="bullet-check"><FiCheck /></div>
                                <span>AI CV Intelligence & Extraction</span>
                            </div>
                            <div className="bullet-row">
                                <div className="bullet-check"><FiCheck /></div>
                                <span>Multi-Company Controls</span>
                            </div>
                        </div>
                    </div>

                    <div className="branding-footer">
                        <div className="secured-pill">
                            <FiShield className="shield-icon" />
                            <span>SECURED END-TO-END</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Compact Authentication Form Interface */}
                <div className="card-form-side">
                    {/* Top Brand Accent Line */}
                    <div className="form-top-accent-line"></div>

                    <div className="form-content-container">
                        {/* Header */}
                        <div className="form-header-block">
                            <div className="lock-avatar-circle">
                                <FiLock className="lock-icon" />
                            </div>
                            <h2 className="access-title">System Access</h2>
                            <p className="access-desc">Please provide your credentials to continue.</p>
                        </div>

                        <form className="attractive-auth-form" onSubmit={handleSubmit}>
                            {/* Username Field */}
                            <div className="input-group-field">
                                <label htmlFor="username">USERNAME / EMAIL</label>
                                <div className="input-box-wrapper">
                                    <FiUser className="input-icon" />
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder="Enter username or email"
                                        autoComplete="username"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="input-group-field">
                                <label htmlFor="password">SECURITY PASSWORD</label>
                                <div className="input-box-wrapper">
                                    <FiLock className="input-icon" />
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="eye-toggle-button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                            </div>

                            {/* Options Row */}
                            <div className="form-options-row">
                                <label className="remember-me-checkbox">
                                    <input type="checkbox" className="stylish-check" />
                                    <span>Keep me signed in</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!form.username) {
                                            toast.warning('Please enter your username or email first');
                                            return;
                                        }
                                        navigate(`/admin/forgot-password?username=${encodeURIComponent(form.username)}`);
                                    }}
                                    className="forgot-pass-link"
                                >
                                    Forgot?
                                </button>
                            </div>

                            {/* Submit Button */}
                            <button type="submit" className="attractive-submit-btn" disabled={loading}>
                                {loading ? (
                                    <div className="btn-loading-spin"></div>
                                ) : (
                                    <>
                                        <span>AUTHORIZE SESSION</span>
                                        <FiArrowRight className="btn-arrow" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="card-copyright-footer">
                        &copy; 2026 George Steuart & Company Limited.
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                /* Full Page Background */
                .login-page-bg {
                    min-height: 100vh;
                    width: 100%;
                    background: #f4f6f9;
                    background-image: 
                        radial-gradient(at 10% 10%, rgba(128, 0, 32, 0.04) 0px, transparent 40%),
                        radial-gradient(at 90% 90%, rgba(200, 169, 81, 0.07) 0px, transparent 40%),
                        radial-gradient(at 50% 50%, #ffffff 0%, #f1f5f9 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px 30px;
                    position: relative;
                    overflow-x: hidden;
                    box-sizing: border-box;
                    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                /* Outer Page Navigation Pill Button (Top-Left of Screen) */
                .page-outer-back-btn {
                    position: absolute;
                    top: 20px;
                    left: 24px;
                    background: #ffffff;
                    border: 1.5px solid #cbd5e1;
                    color: #334155;
                    font-size: 0.82rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    padding: 8px 16px;
                    border-radius: 30px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    z-index: 100;
                }

                .page-outer-back-btn:hover {
                    color: #800020;
                    border-color: #800020;
                    background: #ffffff;
                    transform: translateX(-3px);
                    box-shadow: 0 6px 16px rgba(128, 0, 32, 0.12);
                }

                .back-arrow-icon {
                    font-size: 1rem;
                    transition: transform 0.2s ease;
                }

                .page-outer-back-btn:hover .back-arrow-icon {
                    transform: translateX(-3px);
                }

                .bg-decor {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(90px);
                    pointer-events: none;
                }
                .decor-top-left {
                    width: 380px;
                    height: 380px;
                    background: rgba(128, 0, 32, 0.05);
                    top: -100px;
                    left: -100px;
                }
                .decor-bottom-right {
                    width: 380px;
                    height: 380px;
                    background: rgba(200, 169, 81, 0.08);
                    bottom: -100px;
                    right: -100px;
                }

                /* Compact & Sleek Two-Sided Card */
                .compact-login-card {
                    position: relative;
                    z-index: 2;
                    width: 100%;
                    max-width: 920px;
                    min-height: 540px;
                    display: grid;
                    grid-template-columns: 1.05fr 0.95fr;
                    border-radius: 24px;
                    overflow: hidden;
                    background: #ffffff;
                    border: 1px solid rgba(226, 232, 240, 0.9);
                    box-shadow: 
                        0 20px 50px -12px rgba(42, 5, 11, 0.13),
                        0 8px 20px -4px rgba(0, 0, 0, 0.04);
                    animation: cardSlideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes cardSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.985);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Left Branding Side - Compact */
                .card-branding-side {
                    position: relative;
                    background-color: #1c0308;
                    padding: 38px 36px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    overflow: hidden;
                    color: #ffffff;
                }

                .branding-photo {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0.82;
                    filter: saturate(1.15) contrast(1.1);
                    transition: transform 8s ease-out;
                }

                .compact-login-card:hover .branding-photo {
                    transform: scale(1.04);
                }

                .branding-gradient-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        135deg, 
                        rgba(38, 4, 10, 0.72) 0%, 
                        rgba(18, 2, 5, 0.45) 50%, 
                        rgba(8, 1, 3, 0.78) 100%
                    );
                    z-index: 1;
                }

                .branding-header,
                .branding-body,
                .branding-footer {
                    position: relative;
                    z-index: 2;
                }

                .branding-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .brand-logo-img {
                    height: 40px;
                    width: auto;
                    filter: brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.7));
                }

                .estd-badge-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 5px 12px;
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(229, 193, 88, 0.6);
                    color: #fceabb;
                    font-size: 0.68rem;
                    font-weight: 800;
                    letter-spacing: 1.4px;
                    border-radius: 30px;
                    backdrop-filter: blur(6px);
                }

                .badge-icon {
                    font-size: 0.8rem;
                    color: #e5c158;
                }

                .branding-body {
                    margin: 24px 0;
                }

                .brand-tagline {
                    font-size: 0.65rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    color: #e5c158;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    text-shadow: 0 2px 6px rgba(0,0,0,0.8);
                }

                .brand-main-title {
                    font-family: Georgia, 'Times New Roman', serif;
                    font-size: 2.6rem;
                    line-height: 1.05;
                    font-weight: 700;
                    margin: 0;
                    letter-spacing: -0.8px;
                    color: #ffffff;
                    text-shadow: 0 3px 12px rgba(0, 0, 0, 0.85);
                }

                .shimmer-gold-text {
                    background: linear-gradient(135deg, #ffffff 0%, #ffe599 40%, #e5c158 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .brand-subtitle {
                    margin-top: 12px;
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 0.88rem;
                    font-weight: 600;
                    letter-spacing: 0.2px;
                    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
                }

                .feature-bullets {
                    margin-top: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .bullet-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.82rem;
                    color: #ffffff;
                    font-weight: 600;
                    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
                }

                .bullet-check {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #e5c158 0%, #c8a951 100%);
                    color: #1c0308;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    font-weight: 900;
                }

                .secured-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    background: rgba(0, 0, 0, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 1px;
                }

                .shield-icon {
                    color: #e5c158;
                    font-size: 0.85rem;
                }

                /* Right Form Side - Compact & Clean */
                .card-form-side {
                    background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
                    padding: 38px 36px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                }

                .form-top-accent-line {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3.5px;
                    background: linear-gradient(90deg, #800020 0%, #c8a951 50%, #800020 100%);
                }

                .form-content-container {
                    max-width: 340px;
                    width: 100%;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .form-header-block {
                    text-align: center;
                    margin-bottom: 22px;
                }

                .lock-avatar-circle {
                    width: 52px;
                    height: 52px;
                    border-radius: 16px;
                    background: linear-gradient(135deg, #fff0f3 0%, #ffe4e8 100%);
                    border: 1.5px solid rgba(128, 0, 32, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 12px;
                    box-shadow: 0 8px 18px rgba(128, 0, 32, 0.08);
                }

                .lock-icon {
                    font-size: 1.45rem;
                    color: #800020;
                }

                .access-title {
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.4px;
                }

                .access-desc {
                    font-size: 0.82rem;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.4;
                }

                /* Form Input Styling */
                .attractive-auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .input-group-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .input-group-field label {
                    font-size: 0.66rem;
                    font-weight: 800;
                    color: #334155;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                }

                .input-box-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    font-size: 1.1rem;
                    color: #800020;
                    opacity: 0.65;
                    transition: all 0.2s ease;
                    pointer-events: none;
                }

                .input-box-wrapper input {
                    width: 100%;
                    padding: 13px 16px 13px 44px;
                    background: #ffffff;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    color: #0f172a;
                    font-weight: 500;
                    transition: all 0.25s ease;
                    outline: none;
                    box-sizing: border-box;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
                }

                .input-box-wrapper input:focus {
                    border-color: #800020;
                    box-shadow: 
                        0 0 0 3.5px rgba(128, 0, 32, 0.09),
                        0 4px 12px rgba(128, 0, 32, 0.04);
                }

                .input-box-wrapper input:focus ~ .input-icon {
                    opacity: 1;
                    color: #800020;
                }

                .eye-toggle-button {
                    position: absolute;
                    right: 12px;
                    background: transparent;
                    border: none;
                    color: #64748b;
                    font-size: 1.05rem;
                    cursor: pointer;
                    padding: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: color 0.2s;
                }

                .eye-toggle-button:hover {
                    color: #800020;
                    background: rgba(128, 0, 32, 0.06);
                }

                /* Form Options Row */
                .form-options-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 0.82rem;
                    margin-top: -2px;
                }

                .remember-me-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #475569;
                    cursor: pointer;
                    font-weight: 600;
                    user-select: none;
                }

                .stylish-check {
                    accent-color: #800020;
                    width: 15px;
                    height: 15px;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .forgot-pass-link {
                    background: transparent;
                    border: none;
                    color: #800020;
                    font-weight: 700;
                    font-size: 0.82rem;
                    cursor: pointer;
                    padding: 0;
                }

                .forgot-pass-link:hover {
                    text-decoration: underline;
                }

                /* Primary Submit Button */
                .attractive-submit-btn {
                    margin-top: 6px;
                    width: 100%;
                    padding: 13px 20px;
                    background: linear-gradient(135deg, #8b1a2b 0%, #6b1420 100%);
                    color: #ffffff;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.88rem;
                    letter-spacing: 1px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 6px 18px rgba(139, 26, 43, 0.25);
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .attractive-submit-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #9b1d31 0%, #7d1726 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 22px rgba(139, 26, 43, 0.35);
                }

                .attractive-submit-btn:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 3px 10px rgba(139, 26, 43, 0.2);
                }

                .btn-arrow {
                    font-size: 1.05rem;
                    color: #f3e5ab;
                    transition: transform 0.2s ease;
                }

                .attractive-submit-btn:hover:not(:disabled) .btn-arrow {
                    transform: translateX(3px);
                }

                .btn-loading-spin {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.25);
                    border-top-color: #ffffff;
                    border-radius: 50%;
                    animation: spinLoading 0.75s linear infinite;
                }

                @keyframes spinLoading {
                    to { transform: rotate(360deg); }
                }

                .signup-bottom-text {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-wrap: nowrap;
                    gap: 5px;
                    margin-top: 20px;
                    padding-top: 14px;
                    border-top: 1px dashed #e2e8f0;
                    font-size: 0.81rem;
                    color: #64748b;
                    white-space: nowrap;
                }

                .register-link {
                    color: #800020;
                    font-weight: 700;
                    text-decoration: none;
                    white-space: nowrap;
                }

                .register-link:hover {
                    text-decoration: underline;
                }

                .card-copyright-footer {
                    margin-top: 18px;
                    text-align: center;
                    font-size: 0.7rem;
                    color: #94a3b8;
                }

                /* Thorough Responsive Breakpoints */
                @media (max-width: 900px) {
                    .login-page-bg {
                        padding: 70px 16px 24px;
                    }
                    .page-outer-back-btn {
                        top: 16px;
                        left: 16px;
                        padding: 7px 14px;
                        font-size: 0.78rem;
                    }
                    .compact-login-card {
                        grid-template-columns: 1fr;
                        max-width: 440px;
                        min-height: auto;
                        border-radius: 20px;
                    }
                    .card-branding-side {
                        padding: 28px 24px;
                        min-height: 180px;
                    }
                    .branding-body {
                        margin: 16px 0;
                    }
                    .brand-main-title {
                        font-size: 2.1rem;
                    }
                    .feature-bullets {
                        display: none;
                    }
                    .card-form-side {
                        padding: 30px 24px;
                    }
                }

                @media (max-width: 480px) {
                    .login-page-bg {
                        padding: 64px 12px 20px;
                    }
                    .page-outer-back-btn {
                        top: 12px;
                        left: 12px;
                        padding: 6px 12px;
                        font-size: 0.75rem;
                    }
                    .compact-login-card {
                        border-radius: 16px;
                    }
                    .card-branding-side {
                        padding: 22px 18px;
                    }
                    .brand-main-title {
                        font-size: 1.75rem;
                    }
                    .brand-logo-img {
                        height: 32px;
                    }
                    .card-form-side {
                        padding: 24px 18px;
                    }
                    .access-title {
                        font-size: 1.45rem;
                    }
                    .attractive-submit-btn {
                        padding: 13px;
                    }
                }
            `}</style>
        </div>
    );
}

export default LoginPage;
