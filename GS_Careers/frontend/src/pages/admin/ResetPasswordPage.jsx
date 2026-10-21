import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiLock, FiShield, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import { verifyResetToken, resetPasswordWithToken } from '../../services/api';

function ResetPasswordPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState('');
    const [email, setEmail] = useState('');
    const [form, setForm] = useState({ password: '', confirmPassword: '' });
    const [status, setStatus] = useState('verifying'); // 'verifying', 'form', 'success', 'error'
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const t = params.get('token');
        if (!t) {
            setStatus('error');
            return;
        }
        setToken(t);
        handleVerify(t);
    }, [location]);

    const handleVerify = async (t) => {
        try {
            const res = await verifyResetToken(t);
            setEmail(res.data.data.email);
            setStatus('form');
        } catch (err) {
            setStatus('error');
            toast.error(err.response?.data?.message || 'Invalid or expired reset link');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await resetPasswordWithToken({ token, password: form.password });
            setStatus('success');
            toast.success('System credentials synchronized. Access restored.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="recovery-page-container">
            {/* Top Navigation */}
            <div className="recovery-top-nav">
                <button className="recovery-back-btn" onClick={() => navigate('/admin/login')} type="button">
                    <FiArrowLeft size={16} /> <span>Back to Login</span>
                </button>
            </div>

            {/* Centered Clean Form Card */}
            <div className="recovery-center-wrapper">
                <div className="recovery-card-box animated-fade-in">
                    
                    {/* Brand Logo & Header */}
                    <div className="card-brand-header">
                        <img src="/gs-logo.png" alt="George Steuart & Co." className="brand-logo-img" />
                    </div>

                    {status === 'verifying' && (
                        <div className="clean-status-view">
                            <div className="spinner-large"></div>
                            <h2 className="clean-title" style={{ marginTop: '20px' }}>Verifying Reset Link</h2>
                            <p className="clean-subtitle">Authenticating secure handshake with security servers...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="clean-status-view">
                            <div className="status-icon-circle error">
                                <FiAlertCircle />
                            </div>
                            <h2 className="clean-title">Link Expired or Invalid</h2>
                            <p className="clean-subtitle">
                                This reset link is no longer valid or has already been used. Please request a new recovery link.
                            </p>
                            <button className="clean-submit-btn" onClick={() => navigate('/admin/forgot-password')} style={{ marginTop: '16px' }}>
                                REQUEST NEW LINK
                            </button>
                        </div>
                    )}

                    {status === 'form' && (
                        <>
                            <div className="step-pill">
                                <span className="step-pill-indicator">STEP 3 OF 3</span>
                                <span className="step-pill-sep">•</span>
                                <span className="step-pill-text">Set New Password</span>
                            </div>

                            <div className="card-heading-block">
                                <div className="clean-icon-badge">
                                    <FiLock />
                                </div>
                                <h2 className="clean-title">New Password</h2>
                                <p className="clean-subtitle">
                                    Creating new administrative credentials for <strong>{email}</strong>
                                </p>
                            </div>

                            <form className="clean-auth-form" onSubmit={handleSubmit}>
                                <div className="form-field-group">
                                    <label htmlFor="password">NEW PASSWORD</label>
                                    <div className="input-with-icon">
                                        <FiLock className="field-icon" />
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="Min. 6 characters"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-eye-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-field-group">
                                    <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
                                    <div className="input-with-icon">
                                        <FiLock className="field-icon" />
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="Repeat your password"
                                            value={form.confirmPassword}
                                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="clean-submit-btn" disabled={loading}>
                                    {loading ? <div className="spinner-small"></div> : 'UPDATE CREDENTIALS'}
                                </button>
                            </form>
                        </>
                    )}

                    {status === 'success' && (
                        <div className="clean-status-view">
                            <div className="status-icon-circle success">
                                <FiCheckCircle />
                            </div>
                            <h2 className="clean-title">Access Restored</h2>
                            <p className="clean-subtitle">
                                Your password has been successfully updated. You can now use your new credentials to sign in.
                            </p>
                            <button className="clean-submit-btn" onClick={() => navigate('/admin/login')} style={{ marginTop: '16px' }}>
                                SIGN IN TO CONSOLE
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Bottom Footer */}
            <div className="recovery-page-footer">
                <div className="copyright-line">
                    &copy; 2026 George Steuart & Company Limited. All Rights Reserved.
                </div>
            </div>

            <style jsx="true">{`
                .recovery-page-container {
                    min-height: 100vh;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                    padding: 32px 20px 24px;
                    background: #f8fafc;
                    background-image: 
                        radial-gradient(at 50% 0%, rgba(122, 18, 40, 0.03) 0%, transparent 50%),
                        radial-gradient(at 50% 100%, rgba(200, 169, 81, 0.04) 0%, transparent 50%);
                    box-sizing: border-box;
                    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .recovery-top-nav {
                    width: 100%;
                    max-width: 480px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    margin-bottom: 12px;
                }

                .recovery-back-btn {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                    font-size: 0.84rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    cursor: pointer;
                    padding: 8px 14px;
                    border-radius: 10px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                    transition: all 0.2s ease;
                }

                .recovery-back-btn:hover {
                    color: #7A1228;
                    border-color: #cbd5e1;
                    transform: translateX(-3px);
                    box-shadow: 0 4px 10px rgba(122, 18, 40, 0.08);
                }

                .recovery-center-wrapper {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    padding: 12px 0 24px;
                }

                .recovery-card-box {
                    width: 100%;
                    max-width: 480px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    box-shadow: 
                        0 12px 30px -8px rgba(15, 23, 42, 0.06),
                        0 4px 12px -2px rgba(15, 23, 42, 0.02);
                    padding: 36px 36px 32px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }

                .card-brand-header {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .brand-logo-img {
                    height: 42px;
                    object-fit: contain;
                }

                .step-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    align-self: center;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 4px 12px;
                    border-radius: 100px;
                    margin-bottom: 20px;
                }

                .step-pill-indicator {
                    font-size: 0.68rem;
                    font-weight: 800;
                    letter-spacing: 0.8px;
                    color: #7A1228;
                }

                .step-pill-sep {
                    color: #cbd5e1;
                    font-size: 0.7rem;
                }

                .step-pill-text {
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #64748b;
                }

                .card-heading-block {
                    text-align: center;
                    margin-bottom: 24px;
                }

                .clean-icon-badge {
                    width: 46px;
                    height: 46px;
                    background: #fdf2f4;
                    border: 1px solid #fecdd3;
                    border-radius: 14px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.3rem;
                    color: #7A1228;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 8px rgba(122, 18, 40, 0.05);
                }

                .clean-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 6px;
                    letter-spacing: -0.02em;
                }

                .clean-subtitle {
                    font-size: 0.88rem;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.5;
                }

                .clean-auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .form-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }

                .form-field-group label {
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: #64748b;
                    letter-spacing: 0.8px;
                }

                .input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .field-icon {
                    position: absolute;
                    left: 14px;
                    color: #94a3b8;
                    font-size: 1.05rem;
                    pointer-events: none;
                }

                .input-with-icon input {
                    width: 100%;
                    padding: 13px 14px 13px 42px;
                    background: #ffffff;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 0.92rem;
                    color: #0f172a;
                    transition: all 0.2s ease;
                    outline: none;
                    box-sizing: border-box;
                }

                .input-with-icon input:focus {
                    border-color: #7A1228;
                    box-shadow: 0 0 0 3.5px rgba(122, 18, 40, 0.08);
                }

                .password-eye-btn {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    font-size: 1.1rem;
                }

                .clean-submit-btn {
                    width: 100%;
                    padding: 14px 20px;
                    background: linear-gradient(135deg, #7A1228 0%, #941733 100%);
                    color: #ffffff;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.92rem;
                    letter-spacing: 0.6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 14px rgba(122, 18, 40, 0.2);
                }

                .clean-submit-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #600d1e 0%, #7A1228 100%);
                    transform: translateY(-1.5px);
                    box-shadow: 0 6px 18px rgba(122, 18, 40, 0.28);
                }

                .clean-submit-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                .clean-status-view {
                    text-align: center;
                    padding: 12px 0;
                }

                .status-icon-circle {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.8rem;
                    margin: 0 auto 18px;
                }

                .status-icon-circle.success {
                    background: #f0fdf4;
                    color: #16a34a;
                    border: 1px solid #bbf7d0;
                }

                .status-icon-circle.error {
                    background: #fef2f2;
                    color: #dc2626;
                    border: 1px solid #fecaca;
                }

                .spinner-large {
                    width: 44px;
                    height: 44px;
                    border: 3px solid #e2e8f0;
                    border-top-color: #7A1228;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }

                .spinner-small {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: #ffffff;
                    border-radius: 50%;
                    animation: spin 0.75s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .animated-fade-in {
                    animation: fadeIn 0.35s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .recovery-page-footer {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding-top: 20px;
                    width: 100%;
                }

                .copyright-line {
                    font-size: 0.74rem;
                    color: #94a3b8;
                    letter-spacing: 0.2px;
                }

                @media (max-width: 520px) {
                    .recovery-page-container { padding: 20px 14px 18px; }
                    .recovery-card-box { padding: 28px 20px 24px; border-radius: 16px; }
                    .clean-title { font-size: 1.35rem; }
                }
            `}</style>
        </div>
    );
}

export default ResetPasswordPage;
