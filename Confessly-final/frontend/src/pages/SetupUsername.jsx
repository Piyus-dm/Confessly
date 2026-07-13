import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { useUser } from '../context/UserContext.jsx';
import '../styles/global.css';
import '../styles/login.css';

export default function SetupUsername() {
    const navigate = useNavigate();
    const { refreshUser } = useUser();
    const [searchParams] = useSearchParams();

    // the signed token carries the verified identity; email/provider are display-only
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';
    const provider = searchParams.get('provider') || '';
    const avatarUrl = searchParams.get('avatar_url') || '';

    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate('/login');
        }
    }, [token, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (username.trim().length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch('/api/auth/finalize-social', {
                method: 'POST',
                body: JSON.stringify({
                    username: username.trim(),
                    token,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                await refreshUser();
                navigate('/feed');
            } else {
                setError(data.message || 'Failed to create account');
                setSubmitting(false);
            }
        } catch (err) {
            setError('Could not connect to the server.');
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
                    <h1 className="auth-title">Almost there!</h1>
                    <p className="auth-subtitle">Choose a username to complete your account</p>
                </header>

                {avatarUrl && (
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <img src={avatarUrl} alt="Profile"
                            style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #1a1a1a', objectFit: 'cover' }}
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                )}

                <div style={{
                    textAlign: 'center', marginBottom: 20, color: '#666', fontSize: '0.82rem',
                    background: '#080808', padding: '8px 14px', borderRadius: 8, border: '1px solid #1a1a1a',
                }}>
                    Signed in with <strong style={{ color: '#aaa', textTransform: 'capitalize' }}>{provider}</strong> &mdash; {email}
                </div>

                <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label htmlFor="su-username">Username</label>
                        <input
                            id="su-username"
                            type="text"
                            placeholder="Choose a unique username"
                            autoComplete="off"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
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

                    <button type="submit" className="btn-primary" disabled={submitting || !username.trim()}>
                        {submitting ? 'Creating account…' : 'Complete Setup'}
                    </button>
                </form>
            </main>
        </div>
    );
}
