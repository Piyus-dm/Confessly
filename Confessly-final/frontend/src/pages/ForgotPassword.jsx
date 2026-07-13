import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import '../styles/global.css';
import '../styles/login.css';

const RESEND_COOLDOWN = 60; // seconds between resends

export default function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const timerRef = useRef(null);

    // tick the resend cooldown down once per second
    useEffect(() => {
        if (cooldown <= 0) return;
        timerRef.current = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timerRef.current);
    }, [cooldown]);

    async function sendOtp() {
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage('If this email exists, an OTP has been sent.');
                setCooldown(RESEND_COOLDOWN);
                return true;
            }
            setError(data.message || 'Failed to send OTP');
            return false;
        } catch {
            setError('Could not connect to the server.');
            return false;
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSendOtp(e) {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        const ok = await sendOtp();
        if (ok) setStep(2);
    }

    async function handleResendOtp() {
        if (cooldown > 0 || submitting) return;
        setError('');
        setMessage('');
        const ok = await sendOtp();
        if (ok) setMessage('A new code has been sent to your email.');
    }

    async function handleResetPassword(e) {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!otpCode.trim() || otpCode.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch('/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    otp_code: otpCode.trim(),
                    new_password: newPassword,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage('Password updated! You can now sign in.');
                setStep(3);
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="auth-view">
            <main className="auth-container">
                <div className="auth-brand">
                    <div className="auth-brand-icon">C</div>
                    <span className="auth-brand-name">Confessly</span>
                </div>

                <header className="auth-header">
                    <h1 className="auth-title">
                        {step === 1 ? 'Forgot password' : step === 2 ? 'Reset code' : 'Done!'}
                    </h1>
                    <p className="auth-subtitle">
                        {step === 1
                            ? 'Enter your email to receive a reset code'
                            : step === 2
                            ? 'Check your inbox for the 6-digit code'
                            : 'Your password has been updated.'}
                    </p>
                </header>

                {error && (
                    <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {message && (
                    <div style={{
                        color: 'var(--text-primary)', fontSize: '0.82rem', marginBottom: 16,
                        background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid var(--border-mid)', textAlign: 'center',
                    }}>
                        {message}
                    </div>
                )}

                {step === 1 && (
                    <form className="auth-form" onSubmit={handleSendOtp} autoComplete="off">
                        <div className="form-group">
                            <label htmlFor="fp-email">Email</label>
                            <input
                                id="fp-email"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="off"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={submitting || !email.trim()}>
                            {submitting ? 'Sending…' : 'Send Reset Code'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form className="auth-form" onSubmit={handleResetPassword} autoComplete="off">
                        <div className="form-group">
                            <label htmlFor="fp-otp">6-Digit OTP Code</label>
                            <input
                                id="fp-otp"
                                type="text"
                                placeholder="000000"
                                maxLength={6}
                                autoComplete="off"
                                value={otpCode}
                                onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="fp-newpw">New Password</label>
                            <input
                                id="fp-newpw"
                                type="password"
                                placeholder="Min. 6 characters"
                                autoComplete="off"
                                value={newPassword}
                                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={submitting || otpCode.length !== 6 || newPassword.length < 6}>
                            {submitting ? 'Resetting…' : 'Reset Password'}
                        </button>

                        {/* resend with 60s cooldown */}
                        <div style={{ textAlign: 'center', marginTop: 14 }}>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={cooldown > 0 || submitting}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: cooldown > 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: cooldown > 0 || submitting ? 'not-allowed' : 'pointer',
                                    textDecoration: cooldown > 0 ? 'none' : 'underline',
                                    fontFamily: 'var(--font)',
                                }}>
                                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get the code? Resend"}
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <Link to="/login" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                        Sign In
                    </Link>
                )}

                {step < 3 && (
                    <p className="switch-auth-text" style={{ marginTop: 20 }}>
                        <Link to="/login" style={{ color: '#888' }}>Back to sign in</Link>
                    </p>
                )}
            </main>
        </div>
    );
}
