import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../api';

export default function BlockedAccounts() {
    const navigate = useNavigate();
    const [blocked, setBlocked] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState({});

    useEffect(() => {
        fetch(apiUrl('/api/users/blocked'), { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') setBlocked(data.data || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    async function handleUnblock(userId) {
        setBusy(prev => ({ ...prev, [userId]: true }));
        try {
            const res = await fetch(apiUrl('/api/users/unblock'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setBlocked(prev => prev.filter(b => b.user_id !== userId));
            } else {
                alert(data.message || 'Failed to unblock');
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy(prev => ({ ...prev, [userId]: false }));
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#000',
            color: '#e5e5e5',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            padding: '60px 20px 20px',
            maxWidth: 600,
            margin: '0 auto',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '4px 8px',
                    }}
                >
                    ←
                </button>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
                    Blocked Accounts
                </h1>
            </div>

            {loading && (
                <div className="skeleton" style={{ width: '80%', height: 40, borderRadius: 8 }} />
            )}

            {!loading && blocked.length === 0 && (
                <p style={{ color: '#555', fontSize: '0.85rem' }}>
                    You haven't blocked anyone yet.
                </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blocked.map(user => (
                    <div
                        key={user.user_id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#0a0a0a',
                            border: '1px solid #191919',
                            borderRadius: 12,
                            padding: '14px 18px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {user.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt=""
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    background: '#111',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#555',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                }}>
                                    {(user.anonymous_handle || '?').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <div style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: 500 }}>
                                    {user.anonymous_handle || 'Unknown'}
                                </div>
                                <div style={{ color: '#555', fontSize: '0.7rem' }}>
                                    Blocked {user.blocked_at ? new Date(user.blocked_at).toLocaleDateString() : ''}
                                </div>
                            </div>
                        </div>
                        <button
                            disabled={busy[user.user_id]}
                            onClick={() => handleUnblock(user.user_id)}
                            style={{
                                padding: '7px 16px',
                                borderRadius: 8,
                                background: '#0a0a1a',
                                border: '1px solid #18182a',
                                color: '#88f',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: busy[user.user_id] ? 'not-allowed' : 'pointer',
                                opacity: busy[user.user_id] ? 0.5 : 1,
                            }}
                            onMouseEnter={e => { if (!busy[user.user_id]) e.currentTarget.style.background = '#12122a'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#0a0a1a'; }}
                        >
                            {busy[user.user_id] ? '...' : 'Unblock'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
