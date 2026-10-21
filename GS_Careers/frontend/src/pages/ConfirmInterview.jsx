import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiCheck, FiX, FiCalendar, FiMapPin, FiMail, FiAlertCircle } from 'react-icons/fi';
import { confirmInterview } from '../services/api';

function ConfirmInterview() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const response = searchParams.get('response');

    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!id || !response || (response !== 'yes' && response !== 'no')) {
            setStatus('error');
            setErrorMessage('Invalid confirmation parameters. Please check the link from your email.');
            return;
        }

        confirmInterview(id, response)
            .then(() => {
                setStatus('success');
            })
            .catch((err) => {
                setStatus('error');
                const msg = err.response?.data?.message || 'Failed to submit confirmation. The link may have expired or is invalid.';
                setErrorMessage(msg);
            });
    }, [id, response]);

    return (
        <div className="success-page-v2">
            <div className="success-v2-bg"></div>

            <div className="success-v2-container">
                <div className="success-v2-card">
                    {/* Brand Logo */}
                    <div className="success-v2-company-logo animate-fade-in" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '80px', height: '80px', background: '#fff', borderRadius: '20px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.04)' }}>
                            <img 
                                src="/gs-logo.png" 
                                alt="George Steuart"
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                        </div>
                    </div>

                    {status === 'loading' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div className="spinner" style={{ margin: '0 auto 24px', width: '50px', height: '50px', border: '4px solid rgba(139, 26, 43, 0.1)', borderTop: '4px solid #8B1A2B', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '8px' }}>Processing RSVP...</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Updating your interview confirmation status.</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="animate-fade-in">
                            <div className="success-v2-stamp" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
                                <FiAlertCircle strokeWidth={2} />
                            </div>
                            <div className="success-v2-badge" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>Submission Failed</div>
                            <h1 className="success-v2-title" style={{ color: 'var(--text-primary)' }}>Unable to RSVP</h1>
                            <div className="success-v2-message" style={{ marginBottom: '30px' }}>
                                <p>{errorMessage}</p>
                            </div>
                            
                            <div className="rsvp-steps-1">
                                <div className="next-step-item">
                                    <div className="next-step-icon" style={{ background: 'rgba(139, 26, 43, 0.05)', color: '#8B1A2B' }}>
                                        <FiMail />
                                    </div>
                                    <div className="next-step-content">
                                        <h5>Contact Support</h5>
                                        <p>If you believe this is an error, please reach out to our recruitment coordinator via the email in your invitation.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="success-v2-actions">
                                <Link to="/" className="btn-v2-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    Go to Homepage
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'success' && response === 'yes' && (
                        <div className="animate-fade-in">
                            <div className="success-v2-stamp" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
                                <FiCheck strokeWidth={3} />
                            </div>
                            <div className="success-v2-badge" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>Attendance Confirmed</div>
                            <h1 className="success-v2-title" style={{ color: 'var(--text-primary)' }}>See You Soon</h1>
                            
                            <div className="rsvp-details-card" style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '24px', textAlign: 'center', display: 'inline-block', minWidth: '220px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.5px' }}>Your Response</div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: '#15803d', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                                    Yes, I am available
                                </div>
                            </div>

                            <div className="success-v2-message" style={{ marginBottom: '30px' }}>
                                <p>Thank you for confirming your availability! Your attendance has been successfully recorded in our system. We look forward to discussing your potential future with us.</p>
                            </div>

                            <div className="rsvp-steps-2">
                                <div className="next-step-item">
                                    <div className="next-step-icon">
                                        <FiCalendar />
                                    </div>
                                    <div className="next-step-content">
                                        <h5>Interview Details</h5>
                                        <p>Please refer to the interview invitation email for details on date, time, and type (Online/In-person).</p>
                                    </div>
                                </div>
                                <div className="next-step-item">
                                    <div className="next-step-icon">
                                        <FiMapPin />
                                    </div>
                                    <div className="next-step-content">
                                        <h5>Location & Link</h5>
                                        <p>Check the location description or online link provided in the original invitation email to join the session.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="success-v2-actions">
                                <Link to="/" className="btn-v2-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    Go to Homepage
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'success' && response === 'no' && (
                        <div className="animate-fade-in">
                            <div className="success-v2-stamp" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
                                <FiX strokeWidth={3} />
                            </div>
                            <div className="success-v2-badge" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>Declined RSVP</div>
                            <h1 className="success-v2-title" style={{ color: 'var(--text-primary)' }}>Declined Invitation</h1>
                            
                            <div className="rsvp-details-card" style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', marginBottom: '24px', textAlign: 'center', display: 'inline-block', minWidth: '220px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#991b1b', letterSpacing: '0.5px' }}>Your Response</div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: '#b91c1c', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                                    No, I cannot attend
                                </div>
                            </div>

                            <div className="success-v2-message" style={{ marginBottom: '30px' }}>
                                <p>We understand that you are unable to attend the scheduled interview at this time. Your response has been logged, and the hiring team has been notified.</p>
                            </div>

                            <div className="rsvp-steps-1">
                                <div className="next-step-item">
                                    <div className="next-step-icon" style={{ background: 'rgba(139, 26, 43, 0.05)', color: '#8B1A2B' }}>
                                        <FiMail />
                                    </div>
                                    <div className="next-step-content">
                                        <h5>Need to Reschedule?</h5>
                                        <p>If you'd like to reschedule for a different time, please reply directly to the invitation email or reach out to our team.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="success-v2-actions">
                                <Link to="/" className="btn-v2-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    Go to Homepage
                                </Link>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Simple Footer */}
            <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(0,0,0,0.4)', fontSize: '0.85rem', position: 'relative', zIndex: 10 }}>
                © {new Date().getFullYear()} George Steuart & Company Ltd. All rights reserved.
            </div>
        </div>
    );
}

export default ConfirmInterview;
