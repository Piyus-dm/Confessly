import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { useUser } from '../context/UserContext.jsx';
import '../styles/global.css';
import '../styles/login.css';

export default function OAuthComplete() {
    const navigate = useNavigate();
    const { refreshUser } = useUser();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState('');

    useEffect(() => {
        const token = searchParams.get('token') || '';
        if (!token) {
            navigate('/login');
            return;
        }

        async function finish() {
            try {
                const res = await apiFetch('/api/auth/oauth-session', {
                    method: 'POST',
                    body: JSON.stringify({ token }),
                });
                if (res.ok) {
                    await refreshUser();
                    navigate('/feed');
                } else {
                    setError('Login session expired, please try again');
                    setTimeout(() => navigate('/login'), 1500);
                }
            } catch {
                setError('Could not connect to the server');
                setTimeout(() => navigate('/login'), 1500);
            }
        }
        finish();
    }, [searchParams, navigate, refreshUser]);

    return (
        <div className="auth-view">
            <main className="auth-container">
                <div className="auth-brand">
                    <span className="auth-brand-name">Confessly</span>
                </div>
                <p style={{ textAlign: 'center', color: '#888' }}>
                    {error || 'Signing you in…'}
                </p>
            </main>
        </div>
    );
}
