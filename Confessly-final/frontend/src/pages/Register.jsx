import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import Logo from '../components/Logo.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { apiFetch } from '../api.js';
import { useUser } from '../context/UserContext.jsx';
import '../styles/global.css';
import '../styles/login.css';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;

export default function Register() {
    const navigate = useNavigate();
    const { refreshUser } = useUser();

    const [anonymousHandle, setAnonymousHandle] = useState('');
    const [email,           setEmail]           = useState('');
    const [password,        setPassword]        = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error,           setError]           = useState('');
    const [submitting,      setSubmitting]      = useState(false);
    const [captcha,         setCaptcha]         = useState('');
    const turnstileRef = useRef(null);

    // turnstile tokens are single-use — after a failed attempt we need a fresh one
    function resetCaptcha() {
        setCaptcha('');
        turnstileRef.current?.reset();
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (anonymousHandle.trim().length < 3) {
            setError('Handle must be at least 3 characters');
            return;
        }

        if (!captcha) {
            setError('Please complete the bot verification first.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password,
                    username: anonymousHandle.trim(),
                    cf_turnstile_response: captcha,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                await refreshUser();
                navigate('/feed');
            } else {
                setError(data.message || 'Registration failed');
                resetCaptcha();
                setSubmitting(false);
            }
        } catch (err) {
            setError('Could not connect to the server. Is the backend running?');
            resetCaptcha();
            setSubmitting(false);
        }
    }

    return (
        <div className="auth-view">
            <main className="auth-container">

                {/* logo */}
                <div className="auth-brand">
                    <Logo height={30} />
                </div>

                <header className="auth-header">
                    <h1 className="auth-title">Create account</h1>
                    <p className="auth-subtitle">Join anonymously. No real name needed.</p>
                </header>

                <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label htmlFor="reg-handle">Anonymous Handle</label>
                        <input
                            id="reg-handle"
                            type="text"
                            placeholder="Choose a unique handle"
                            autoComplete="off"
                            value={anonymousHandle}
                            onChange={(e) => setAnonymousHandle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-email">Email</label>
                        <input
                            id="reg-email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="off"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-password">Password</label>
                        <PasswordInput
                            id="reg-password"
                            placeholder="Create a password (min. 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-confirm">Confirm Password</label>
                        <PasswordInput
                            id="reg-confirm"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="auth-error" role="alert">
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

                    {TURNSTILE_SITE_KEY ? (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
                            <Turnstile
                                ref={turnstileRef}
                                siteKey={TURNSTILE_SITE_KEY}
                                options={{ theme: 'dark', size: 'flexible' }}
                                onSuccess={setCaptcha}
                                onExpire={() => setCaptcha('')}
                                onError={() => {
                                    setCaptcha('');
                                    setError('Bot verification could not load. Please refresh and try again.');
                                }}
                            />
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#e33', fontSize: '0.78rem' }}>
                            bot check is misconfigured, missing site key
                        </p>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting || !email || !password || !confirmPassword || !anonymousHandle || !captcha}
                    >
                        {submitting ? 'Creating account…' : !captcha ? 'Verifying you’re human…' : 'Create Account'}
                    </button>
                </form>

                {/* divider */}
                <div className="auth-divider">
                    <span>or continue with</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    <a href="/api/auth/login/google"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            padding: '11px 16px', borderRadius: 10, background: '#0a0a0a',
                            border: '1px solid #1a1a1a', color: '#ccc', fontSize: '0.85rem', fontWeight: 600,
                            textDecoration: 'none', transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#111'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0a'; }}>
                        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                        Google
                    </a>
                    <a href="/api/auth/login/facebook"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            padding: '11px 16px', borderRadius: 10, background: '#0a0a0a',
                            border: '1px solid #1a1a1a', color: '#ccc', fontSize: '0.85rem', fontWeight: 600,
                            textDecoration: 'none', transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#111'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0a'; }}>
                        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#1877F2" d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z"/><path fill="#fff" d="M26.707 29.301h4.093l.643-4.517h-4.736V21.78c0-1.302.627-2.571 2.682-2.571h2.075V15.34s-1.883-.322-3.683-.322c-3.757 0-6.21 2.277-6.21 6.398v3.368H17.56v4.517h4.013v10.196a19.82 19.82 0 0 0 5.134 0V29.301z"/></svg>
                        Facebook
                    </a>
                </div>

                <p className="switch-auth-text">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </p>

            </main>
        </div>
    );
}
