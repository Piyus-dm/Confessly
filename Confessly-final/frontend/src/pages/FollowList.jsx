// followers / following list — works for your own profile and other people's
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import FollowButton from '../components/FollowButton.jsx';
import { AnonAvatar } from '../components/FeedCard.jsx';
import { LockIcon } from '../components/icons.jsx';
import { apiFetch } from '../api.js';
import '../styles/global.css';
import '../styles/profile.css';

export default function FollowList() {
    const { profileId } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // route ends in /followers or /following
    const initialTab = pathname.endsWith('/following') ? 'following' : 'followers';
    const [tab, setTab] = useState(initialTab);
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('loading');
    const [errorMsg, setErrorMsg] = useState('');

    const load = useCallback(async (which) => {
        setStatus('loading');
        setErrorMsg('');
        try {
            const res = await apiFetch(`/api/users/${profileId}/${which}`);
            const data = await res.json();
            if (res.ok) {
                setItems(Array.isArray(data.data) ? data.data : []);
                setStatus('ready');
            } else if (res.status === 403) {
                setStatus('private');
            } else {
                setErrorMsg(data.message || 'Could not load the list.');
                setStatus('error');
            }
        } catch {
            setErrorMsg('Could not connect to the server.');
            setStatus('error');
        }
    }, [profileId]);

    useEffect(() => { load(tab); }, [load, tab]);

    function switchTab(next) {
        if (next === tab) return;
        setTab(next);
        setItems([]);
        navigate(`/user/${profileId}/${next}`, { replace: true });
    }

    return (
        <div className="app-body">
            <header className="profile-header">
                <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 12H5m7-7l-7 7 7 7" />
                    </svg>
                </button>
                <h1 className="profile-title">Connections</h1>
                <div style={{ width: 36 }} />
            </header>

            <main className="profile-main">
                <div className="pr-tabs">
                    <button className={`pr-tab${tab === 'followers' ? ' active' : ''}`}
                        onClick={() => switchTab('followers')}>
                        Followers
                    </button>
                    <button className={`pr-tab${tab === 'following' ? ' active' : ''}`}
                        onClick={() => switchTab('following')}>
                        Following
                    </button>
                </div>

                {status === 'loading' && (
                    <div className="fl-list">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="fl-row">
                                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton" style={{ width: '45%', height: 12, marginBottom: 7 }} />
                                    <div className="skeleton" style={{ width: '25%', height: 10 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {status === 'private' && (
                    <div className="pr-private-block">
                        <div className="pr-private-icon"><LockIcon size={28} /></div>
                        <h3>This account is private</h3>
                        <p>Follow each other to see who they follow.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="profile-error">
                        <p>{errorMsg}</p>
                        <button className="btn-primary" style={{ maxWidth: 200, marginTop: 12 }}
                            onClick={() => load(tab)}>Retry</button>
                    </div>
                )}

                {status === 'ready' && items.length === 0 && (
                    <div className="fl-empty">
                        <p>{tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
                    </div>
                )}

                {status === 'ready' && items.length > 0 && (
                    <div className="fl-list">
                        {items.map(u => (
                            <div key={u.profile_id} className="fl-row"
                                onClick={() => navigate(`/user/${u.profile_id}`)}
                                role="button" tabIndex={0}>
                                <AnonAvatar size="md" src={u.avatar_url} />
                                <div className="fl-meta">
                                    <span className="fl-handle">@{u.anonymous_handle}</span>
                                    {u.bio && <span className="fl-bio">{u.bio}</span>}
                                    {u.follows_you && !u.is_self && (
                                        <span className="fl-badge">Follows you</span>
                                    )}
                                </div>
                                {!u.is_self && (
                                    <FollowButton
                                        profileId={u.profile_id}
                                        initialFollowing={u.is_following}
                                        followsYou={u.follows_you}
                                        size="sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
