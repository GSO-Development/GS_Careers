import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiLock, FiKey, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle, FiShield } from 'react-icons/fi';
import api from '../../services/api';

function ChangePasswordPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.current_password || !form.new_password || !form.confirm_password) {
            toast.error('All fields are required');
            return;
        }

        if (form.new_password !== form.confirm_password) {
            toast.error('New passwords do not match');
            return;
        }

        if (form.new_password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth.php?action=change-password', {
                current_password: form.current_password,
                new_password: form.new_password
            });

            toast.success('Password updated successfully! Re-authorizing...');

            localStorage.removeItem('gs_admin_token');
            localStorage.removeItem('gs_admin_data');

            setTimeout(() => {
                navigate('/admin/login');
            }, 1500);

        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
            setLoading(false);
        }
    };

    return (
        <div className="minimal-setup-container">
            {/* Top Navigation */}
            <div className="minimal-nav">
                <button className="minimal-back-btn" onClick={() => navigate('/admin/login')}>
                    <FiArrowLeft size={16} /> <span>Return to Login</span>
                </button>
            </div>

            {/* Main Card */}
            <div className="minimal-card-wrapper">
                <div className="minimal-card">
                    {/* Brand Header */}
                    <div className="minimal-brand-header">
                        <div className="minimal-logo-box">
                            <img src="/gs-logo.png" alt="George Steuart Logo" className="minimal-logo-img" />
                        </div>
                        <h1 className="minimal-title">Update Credentials</h1>
                        <p className="minimal-subtitle">
                            You are using a temporary password. Establish a new secure password for your account.
                        </p>
                    </div>

                    {/* Form */}
                    <form className="minimal-form" onSubmit={handleSubmit}>
                        {/* Temporary Password */}
                        <div className="minimal-field-group">
                            <label htmlFor="current_password">TEMPORARY PASSWORD</label>
                            <div className="minimal-input-wrapper">
                                <FiKey className="input-icon" size={16} />
                                <input
                                    id="current_password"
                                    name="current_password"
                                    type={showCurrent ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="Enter current/temp password"
                                    value={form.current_password}
                                    onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="input-eye-btn" 
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    tabIndex={-1}
                                    title={showCurrent ? "Hide password" : "Show password"}
                                >
                                    {showCurrent ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="minimal-divider"></div>

                        {/* New Password */}
                        <div className="minimal-field-group">
                            <label htmlFor="new_password">NEW SECURE PASSWORD</label>
                            <div className="minimal-input-wrapper">
                                <FiLock className="input-icon" size={16} />
                                <input
                                    id="new_password"
                                    name="new_password"
                                    type={showNew ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Min 6 characters"
                                    value={form.new_password}
                                    onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="input-eye-btn" 
                                    onClick={() => setShowNew(!showNew)}
                                    tabIndex={-1}
                                    title={showNew ? "Hide password" : "Show password"}
                                >
                                    {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="minimal-field-group">
                            <label htmlFor="confirm_password">CONFIRM PASSWORD</label>
                            <div className="minimal-input-wrapper">
                                <FiShield className="input-icon" size={16} />
                                <input
                                    id="confirm_password"
                                    name="confirm_password"
                                    type={showConfirm ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Repeat new password"
                                    value={form.confirm_password}
                                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="input-eye-btn" 
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    tabIndex={-1}
                                    title={showConfirm ? "Hide password" : "Show password"}
                                >
                                    {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button type="submit" className="minimal-submit-btn" disabled={loading}>
                            {loading ? (
                                <div className="spinner-small"></div>
                            ) : (
                                <>
                                    <span>ACTIVATE NEW CREDENTIALS</span>
                                    <FiCheckCircle size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer note */}
                <div className="minimal-footer">
                    &copy; {new Date().getFullYear()} George Steuart & Company Limited. Security Governance.
                </div>
            </div>

            <style jsx="true">{`
                .minimal-setup-container {
                    min-height: 100vh;
                    width: 100%;
                    background: #f8fafc;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    padding: 32px 20px;
                    font-family: inherit;
                }

                .minimal-nav {
                    position: absolute;
                    top: 24px;
                    left: 28px;
                    right: 28px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .minimal-back-btn {
                    background: transparent;
                    border: none;
                    color: #64748b;
                    font-size: 0.85rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    padding: 8px 12px;
                    border-radius: 10px;
                    transition: all 0.2s ease;
                }

                .minimal-back-btn:hover {
                    color: #800020;
                    background: rgba(128, 0, 32, 0.06);
                }

                .minimal-card-wrapper {
                    width: 100%;
                    max-width: 430px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    animation: fadeIn 0.4s ease-out;
                    margin-top: 20px;
                }

                .minimal-card {
                    width: 100%;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.04);
                    padding: 40px 36px;
                }

                .minimal-brand-header {
                    text-align: center;
                    margin-bottom: 28px;
                }

                .minimal-logo-box {
                    width: 60px;
                    height: 60px;
                    background: #ffffff;
                    border: 1.5px solid #f1f5f9;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 18px;
                    padding: 10px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }

                .minimal-logo-img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .minimal-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.4px;
                }

                .minimal-subtitle {
                    font-size: 0.85rem;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.5;
                }

                .minimal-form {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .minimal-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }

                .minimal-field-group label {
                    font-size: 0.68rem;
                    font-weight: 800;
                    color: #64748b;
                    letter-spacing: 1.2px;
                }

                .minimal-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    color: #94a3b8;
                    pointer-events: none;
                }

                .minimal-input-wrapper input {
                    width: 100%;
                    height: 46px;
                    padding: 0 42px 0 40px;
                    border: 1.5px solid #e2e8f0;
                    background: #f8fafc;
                    border-radius: 12px;
                    font-size: 0.92rem;
                    color: #0f172a;
                    outline: none;
                    transition: all 0.2s ease;
                }

                .minimal-input-wrapper input:focus {
                    border-color: #800020;
                    background: #ffffff;
                    box-shadow: 0 0 0 4px rgba(128, 0, 32, 0.08);
                }

                .input-eye-btn {
                    position: absolute;
                    right: 12px;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: color 0.2s ease;
                }

                .input-eye-btn:hover {
                    color: #475569;
                }

                .minimal-divider {
                    height: 1px;
                    background: #f1f5f9;
                    margin: 2px 0;
                }

                .minimal-submit-btn {
                    width: 100%;
                    height: 48px;
                    background: #800020;
                    color: #ffffff;
                    border: none;
                    border-radius: 14px;
                    font-size: 0.88rem;
                    font-weight: 800;
                    letter-spacing: 0.8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 6px;
                    transition: all 0.2s ease;
                    box-shadow: 0 10px 25px rgba(128, 0, 32, 0.2);
                }

                .minimal-submit-btn:hover:not(:disabled) {
                    background: #600018;
                    transform: translateY(-2px);
                    box-shadow: 0 14px 30px rgba(128, 0, 32, 0.3);
                }

                .minimal-submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .minimal-footer {
                    margin-top: 24px;
                    font-size: 0.75rem;
                    color: #94a3b8;
                    text-align: center;
                }

                .spinner-small {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: #ffffff;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 480px) {
                    .minimal-card {
                        padding: 28px 20px;
                        border-radius: 20px;
                    }
                    .minimal-nav {
                        top: 16px;
                        left: 16px;
                    }
                }
            `}</style>
        </div>
    );
}

export default ChangePasswordPage;
