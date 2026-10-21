import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
    FiMail, 
    FiArrowLeft, 
    FiArrowRight, 
    FiShield, 
    FiSend, 
    FiCheckCircle, 
    FiLock, 
    FiEye, 
    FiEyeOff 
} from 'react-icons/fi';
import { identifyAdmin, sendRecoveryInfo, verifyResetToken, resetPasswordWithToken } from '../../services/api';

function ForgotPasswordPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [recoveryStep, setRecoveryStep] = useState(1); // 1: Email, 2: Method, 3: Success Link, 4: Code, 5: New Pass, 6: Success
    const [loading, setLoading] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [isAutoIdentifying, setIsAutoIdentifying] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [newPasswords, setNewPasswords] = useState({ password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const username = params.get('username') || params.get('email');
        if (username && recoveryStep === 1) {
            handleAutoIdentify(username);
        }
    }, [location]);

    const handleAutoIdentify = async (identifier) => {
        setIsAutoIdentifying(true);
        setLoading(true);
        try {
            const res = await identifyAdmin({ username: identifier, email: identifier });
            setEmail(res.data.data.email);
            setRecoveryStep(2);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Identity verification failed');
        } finally {
            setLoading(false);
            setIsAutoIdentifying(false);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error('Please enter your administrative email or username');
            return;
        }
        setLoading(true);
        try {
            const res = await identifyAdmin({ username: email, email: email });
            setEmail(res.data.data.email);
            setRecoveryStep(2);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Identity verification failed. Please check the email.');
        } finally {
            setLoading(false);
        }
    };

    const handleMethodSelect = async (method) => {
        setSelectedMethod(method);
        setLoading(true);
        try {
            await sendRecoveryInfo({ email, type: method });
            if (method === 'code') {
                setRecoveryStep(4);
            } else {
                setRecoveryStep(3);
            }
            toast.success(`Recovery ${method === 'link' ? 'link' : 'code'} dispatched.`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to dispatch recovery info');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        if (recoveryCode.length !== 6) {
            toast.error('Please enter the 6-digit code');
            return;
        }
        setLoading(true);
        try {
            await verifyResetToken(recoveryCode);
            setRecoveryStep(5);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid or expired code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetWithCode = async (e) => {
        e.preventDefault();
        if (newPasswords.password !== newPasswords.confirm) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPasswords.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await resetPasswordWithToken({ code: recoveryCode, password: newPasswords.password });
            setRecoveryStep(6);
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

                    {/* Step Pill */}
                    <div className="step-pill">
                        <span className="step-pill-indicator">
                            STEP {recoveryStep === 1 ? '1 OF 3' : recoveryStep === 2 ? '2 OF 3' : recoveryStep <= 5 ? '2 OF 3' : '3 OF 3'}
                        </span>
                        <span className="step-pill-sep">•</span>
                        <span className="step-pill-text">
                            {recoveryStep === 1 ? 'Identify Account' : 
                             recoveryStep === 2 ? 'Choose Method' : 
                             recoveryStep === 3 ? 'Check Email' : 
                             recoveryStep === 4 ? 'Verify Code' : 
                             recoveryStep === 5 ? 'Set Password' : 'Complete'}
                        </span>
                    </div>

                    {/* STEP 1: Enter Email */}
                    {recoveryStep === 1 && (
                        <>
                            <div className="card-heading-block">
                                <div className="clean-icon-badge">
                                    {isAutoIdentifying ? (
                                        <div className="spinner-small" style={{ borderTopColor: '#7A1228' }}></div>
                                    ) : (
                                        <FiMail />
                                    )}
                                </div>
                                <h2 className="clean-title">
                                    {isAutoIdentifying ? 'Identifying Account' : 'Reset Password'}
                                </h2>
                                <p className="clean-subtitle">
                                    {isAutoIdentifying 
                                        ? 'Verifying administrative identity...' 
                                        : 'Enter your administrative email to locate your recovery channels.'}
                                </p>
                            </div>

                            {!isAutoIdentifying && (
                                <form className="clean-auth-form" onSubmit={handleEmailSubmit}>
                                    <div className="form-field-group">
                                        <label htmlFor="recovery_email">ADMINISTRATIVE EMAIL OR USERNAME</label>
                                        <div className="input-with-icon">
                                            <FiMail className="field-icon" />
                                            <input
                                                id="recovery_email"
                                                name="recovery_email"
                                                type="text"
                                                placeholder="name@georgesteuart.com or username"
                                                autoComplete="username email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="security-notice-box">
                                        <FiShield size={14} className="notice-icon" />
                                        <span>All password reset requests are monitored and recorded for security compliance.</span>
                                    </div>

                                    <button type="submit" className="clean-submit-btn" disabled={loading}>
                                        {loading ? (
                                            <div className="spinner-small"></div>
                                        ) : (
                                            <>
                                                <span>CONTINUE TO OPTIONS</span>
                                                <FiArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </>
                    )}

                    {/* STEP 2: Choose Method (The exact view in user's screenshot) */}
                    {recoveryStep === 2 && (
                        <>
                            <div className="card-heading-block">
                                <div className="clean-icon-badge">
                                    <FiShield />
                                </div>
                                <h2 className="clean-title">Choose a Method</h2>
                                <p className="clean-subtitle">
                                    How would you like to receive your password reset information?
                                </p>
                                {email && (
                                    <div className="account-tag-pill">
                                        <FiMail size={12} />
                                        <span>Account: <strong>{email}</strong></span>
                                    </div>
                                )}
                            </div>

                            <div className="method-selection-list">
                                {/* Option 1: Email Link */}
                                <div className="method-option-card" onClick={() => !loading && handleMethodSelect('link')}>
                                    <div className="option-icon-box mail-box">
                                        <FiSend />
                                    </div>
                                    <div className="option-text-group">
                                        <div className="option-title-row">
                                            <h4>Send Email Link</h4>
                                            <span className="recommended-tag">Fastest</span>
                                        </div>
                                        <p>We'll send a secure one-click link to your inbox that you can click to reset instantly.</p>
                                    </div>
                                    <div className="option-arrow-box">
                                        <FiArrowRight />
                                    </div>
                                </div>

                                {/* Option 2: Security Code */}
                                <div className="method-option-card" onClick={() => !loading && handleMethodSelect('code')}>
                                    <div className="option-icon-box shield-box">
                                        <FiShield />
                                    </div>
                                    <div className="option-text-group">
                                        <div className="option-title-row">
                                            <h4>Get Reset Code</h4>
                                        </div>
                                        <p>We'll send a 6-digit security code that you can enter manually to verify on this screen.</p>
                                    </div>
                                    <div className="option-arrow-box">
                                        <FiArrowRight />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* STEP 3: Link Sent Confirmation */}
                    {recoveryStep === 3 && (
                        <div className="clean-status-view">
                            <div className="status-icon-circle success">
                                <FiSend />
                            </div>
                            <h2 className="clean-title">Check Your Email</h2>
                            <p className="clean-subtitle">
                                We've dispatched a secure password reset link to <strong>{email}</strong>. 
                                Please check your inbox (and spam folder) to reset your password.
                            </p>
                            <button className="clean-submit-btn" onClick={() => navigate('/admin/login')}>
                                RETURN TO LOGIN
                            </button>
                        </div>
                    )}

                    {/* STEP 4: Enter 6-digit Code */}
                    {recoveryStep === 4 && (
                        <>
                            <div className="card-heading-block">
                                <div className="clean-icon-badge">
                                    <FiShield />
                                </div>
                                <h2 className="clean-title">Verify Code</h2>
                                <p className="clean-subtitle">
                                    Enter the 6-digit security code sent to <strong>{email}</strong>
                                </p>
                            </div>

                            <form className="clean-auth-form" onSubmit={handleVerifyCode}>
                                <div className="form-field-group">
                                    <label htmlFor="recovery_code">SECURITY CODE</label>
                                    <input
                                        id="recovery_code"
                                        name="recovery_code"
                                        type="text"
                                        placeholder="0 0 0 0 0 0"
                                        maxLength="6"
                                        className="clean-code-input"
                                        autoComplete="one-time-code"
                                        value={recoveryCode}
                                        onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button type="submit" className="clean-submit-btn" disabled={loading}>
                                    {loading ? <div className="spinner-small"></div> : 'VERIFY CODE'}
                                </button>

                                <div className="resend-block">
                                    <span>Didn't receive the code?</span>{' '}
                                    <button type="button" className="text-link-btn" onClick={() => handleMethodSelect('code')} disabled={loading}>
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* STEP 5: Set New Password */}
                    {recoveryStep === 5 && (
                        <>
                            <div className="card-heading-block">
                                <div className="clean-icon-badge">
                                    <FiLock />
                                </div>
                                <h2 className="clean-title">New Password</h2>
                                <p className="clean-subtitle">
                                    Create a strong password for your administrative access.
                                </p>
                            </div>

                            <form className="clean-auth-form" onSubmit={handleResetWithCode}>
                                <div className="form-field-group">
                                    <label htmlFor="new_password">NEW PASSWORD</label>
                                    <div className="input-with-icon">
                                        <FiLock className="field-icon" />
                                        <input
                                            id="new_password"
                                            name="new_password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="Min. 6 characters"
                                            value={newPasswords.password}
                                            onChange={(e) => setNewPasswords({ ...newPasswords, password: e.target.value })}
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
                                    <label htmlFor="confirm_password">CONFIRM PASSWORD</label>
                                    <div className="input-with-icon">
                                        <FiLock className="field-icon" />
                                        <input
                                            id="confirm_password"
                                            name="confirm_password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="Repeat password"
                                            value={newPasswords.confirm}
                                            onChange={(e) => setNewPasswords({ ...newPasswords, confirm: e.target.value })}
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

                    {/* STEP 6: Success */}
                    {recoveryStep === 6 && (
                        <div className="clean-status-view">
                            <div className="status-icon-circle success">
                                <FiCheckCircle />
                            </div>
                            <h2 className="clean-title">Access Restored</h2>
                            <p className="clean-subtitle">
                                Your password has been successfully updated. You can now use your new credentials to sign in.
                            </p>
                            <button className="clean-submit-btn" onClick={() => navigate('/admin/login')}>
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
                /* Full Page Centered Form Container (No Split Screen / No Image) */
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

                /* Top Navigation */
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
                    background: #ffffff;
                    transform: translateX(-3px);
                    box-shadow: 0 4px 10px rgba(122, 18, 40, 0.08);
                }

                /* Center Card Wrapper */
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

                /* Brand Header */
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

                /* Step Pill */
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

                /* Heading Block */
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

                .account-tag-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #f1f5f9;
                    color: #475569;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    margin-top: 10px;
                }

                .account-tag-pill strong {
                    color: #0f172a;
                }

                /* Method Selection Cards */
                .method-selection-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 18px;
                }

                .method-option-card {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 16px 18px;
                    background: #ffffff;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 14px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    text-align: left;
                }

                .method-option-card:hover {
                    border-color: #7A1228;
                    background: #fffdfd;
                    box-shadow: 0 6px 18px -4px rgba(122, 18, 40, 0.08);
                    transform: translateY(-2px);
                }

                .option-icon-box {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }

                .option-icon-box.mail-box {
                    background: #fdf2f4;
                    color: #7A1228;
                }

                .option-icon-box.shield-box {
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .method-option-card:hover .option-icon-box.mail-box {
                    background: #7A1228;
                    color: #ffffff;
                }

                .method-option-card:hover .option-icon-box.shield-box {
                    background: #1d4ed8;
                    color: #ffffff;
                }

                .option-text-group {
                    flex: 1;
                    min-width: 0;
                }

                .option-title-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 3px;
                }

                .option-title-row h4 {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                }

                .recommended-tag {
                    font-size: 0.62rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    background: #ecfdf5;
                    color: #047857;
                    border: 1px solid #a7f3d0;
                    padding: 1px 6px;
                    border-radius: 4px;
                    letter-spacing: 0.4px;
                }

                .option-text-group p {
                    font-size: 0.8rem;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.4;
                }

                .option-arrow-box {
                    color: #94a3b8;
                    font-size: 1.1rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                }

                .method-option-card:hover .option-arrow-box {
                    color: #7A1228;
                    transform: translateX(4px);
                }

                /* Clean Auth Form */
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
                    transition: color 0.15s;
                }

                .password-eye-btn:hover {
                    color: #0f172a;
                }

                .clean-code-input {
                    text-align: center;
                    font-size: 1.9rem !important;
                    font-weight: 800;
                    letter-spacing: 10px !important;
                    font-family: monospace;
                    padding: 14px !important;
                    background: #f8fafc !important;
                    border: 1.5px solid #e2e8f0 !important;
                    border-radius: 12px;
                    width: 100%;
                    box-sizing: border-box;
                    color: #0f172a;
                    outline: none;
                }

                .clean-code-input:focus {
                    border-color: #7A1228 !important;
                    background: #ffffff !important;
                    box-shadow: 0 0 0 3.5px rgba(122, 18, 40, 0.08) !important;
                }

                .security-notice-box {
                    display: flex;
                    gap: 10px;
                    align-items: flex-start;
                    padding: 12px 14px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    color: #64748b;
                    font-size: 0.78rem;
                    line-height: 1.45;
                }

                .notice-icon {
                    color: #94a3b8;
                    flex-shrink: 0;
                    margin-top: 1px;
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

                /* Resend Block */
                .resend-block {
                    text-align: center;
                    font-size: 0.85rem;
                    color: #64748b;
                }

                .text-link-btn {
                    background: none;
                    border: none;
                    color: #7A1228;
                    font-weight: 700;
                    cursor: pointer;
                    text-decoration: underline;
                    padding: 0;
                }

                /* Status Views (Success / Check Email) */
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

                /* Page Footer */
                .recovery-page-footer {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    text-align: center;
                    padding-top: 20px;
                    width: 100%;
                }

                .copyright-line {
                    font-size: 0.74rem;
                    color: #94a3b8;
                    letter-spacing: 0.2px;
                }

                /* Animations & Spinners */
                .animated-fade-in {
                    animation: fadeIn 0.35s ease-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(6px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
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
                    to {
                        transform: rotate(360deg);
                    }
                }

                /* Responsive */
                @media (max-width: 520px) {
                    .recovery-page-container {
                        padding: 20px 14px 18px;
                    }
                    .recovery-card-box {
                        padding: 28px 20px 24px;
                        border-radius: 16px;
                    }
                    .clean-title {
                        font-size: 1.35rem;
                    }
                    .method-option-card {
                        padding: 14px 14px;
                        gap: 12px;
                    }
                }
            `}</style>
        </div>
    );
}

export default ForgotPasswordPage;
