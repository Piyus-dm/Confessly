// suspended users tab — list active suspensions, lift them early
import { useState, useEffect, useCallback } from 'react';
import { adminFetch, adminPost } from './adminApi.js';
import { T, card, ghostBtn } from './theme.js';

export default function SuspendedUsersTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState({});

    const load = useCallback(() => {
        adminFetch('/api/admin/suspended_users')
            .then(res => setUsers(Array.isArray(res.data) ? res.data : []))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleUnsuspend = async (userId) => {
        setBusy(prev => ({ ...prev, [userId]: true }));
        try {
            await adminPost('/api/admin/actions/unsuspend_user', { user_id: userId });
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            alert(`Failed: ${e.message}`);
        } finally {
            setBusy(prev => ({ ...prev, [userId]: false }));
        }
    };

    if (error) {
        return <div style={{ color: T.danger, fontSize: '0.85rem' }}>Failed to load suspended users: {error}</div>;
    }

    if (!loading && users.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 16 }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="7" r="4" />
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                </svg>
                <div style={{ color: T.textSecondary, fontSize: '0.95rem', fontWeight: 600 }}>No suspended users.</div>
                <div style={{ color: T.textMuted, fontSize: '0.78rem' }}>Users you suspend from the Reports tab will appear here.</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => (
                <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    ...card,
                    padding: '12px 16px',
                }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: T.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="1.8">
                                <circle cx="12" cy="7" r="4" />
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            </svg>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: T.text, fontSize: '0.85rem', fontWeight: 600 }}>
                            {u.anonymous_handle ? `@${u.anonymous_handle}` : `User #${u.id}`}
                            <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 8, fontSize: '0.72rem' }}>{u.email}</span>
                        </div>
                        <div style={{ color: T.textSecondary, fontSize: '0.7rem', marginTop: 2 }}>
                            {u.banned_until
                                ? `Suspended until ${new Date(u.banned_until).toLocaleString()}`
                                : 'Suspended indefinitely'}
                        </div>
                    </div>
                    <button
                        disabled={busy[u.id]}
                        onClick={() => handleUnsuspend(u.id)}
                        style={{ ...ghostBtn(busy[u.id]), color: T.text, whiteSpace: 'nowrap', padding: '7px 16px', fontWeight: 700 }}
                        onMouseEnter={e => { if (!busy[u.id]) e.currentTarget.style.background = T.surfaceHover; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        {busy[u.id] ? 'Unsuspending...' : 'Unsuspend'}
                    </button>
                </div>
            ))}
        </div>
    );
}
