import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import UploadOverlay from '../components/UploadOverlay.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { AnonAvatar, timeAgo } from '../components/FeedCard.jsx';
import { LinkIcon, CheckIcon } from '../components/icons.jsx';
import { apiUrl } from '../api.js';
import { useUser } from '../context/UserContext.jsx';
import '../styles/global.css';
import '../styles/feed.css';
import '../styles/profile.css';

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// how long you have to wait before changing your username again
const COOLDOWN_DAYS = 30;

function daysSince(dateStr) {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return Infinity;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Profile() {
    const navigate = useNavigate();
    const { logout, theme, setTheme } = useUser();

    const [status, setStatus] = useState('loading');
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('posts');
    const [items, setItems] = useState([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const offsetRef = useRef(0);
    const hasMoreRef = useRef(true);

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [showStats, setShowStats] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editAvatarPreview, setEditAvatarPreview] = useState(null);
    const editAvatarFileRef = useRef(null);
    const [usernameCooldownMsg, setUsernameCooldownMsg] = useState('');
    // last time the username changed, for the cooldown
    const [lastUsernameChange, setLastUsernameChange] = useState(null);

    const [pwOpen, setPwOpen] = useState(false);
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');

    const [delOpen, setDelOpen] = useState(false);
    const [delStage, setDelStage] = useState('plead');
    const [delPw, setDelPw] = useState('');
    const [delConfirm, setDelConfirm] = useState('');

    const [followersCount, setFollowersCount] = useState(0);
    const [copied, setCopied] = useState(false);

    const creds = { credentials: 'include' };

    // copy a link to this profile; falls back for non-https / old browsers
    async function shareProfile() {
        if (!user?.profile_id) return;
        const url = `${window.location.origin}/user/${user.profile_id}`;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt('Copy your profile link:', url);
        }
    }

    const fetchProfile = useCallback(async () => {
        setStatus('loading');
        try {
            const res = await fetch(apiUrl('/api/user/profile'), creds);
            const data = await res.json();
            if (data.status === 'success') {
                setUser(data.profile);
                setEditUsername(data.profile.anonymous_handle);
                setEditBio(data.profile.bio || '');
                setShowStats(!!data.profile.show_profile_stats);
                setFollowersCount(data.profile.followers_count || 0);
                setLastUsernameChange(data.profile.username_updated_at || null);
                setIsPrivate(!!data.profile.is_private);
                setStatus('ready');
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    }, []);

    const loadPosts = useCallback(async (reset = false) => {
        if (reset) { offsetRef.current = 0; hasMoreRef.current = true; setItems([]); }
        if (loadingMore || !hasMoreRef.current) return;
        setLoadingMore(true);
        try {
            const res = await fetch(apiUrl(`/api/user/posts?limit=10&offset=${offsetRef.current}`), creds);
            const data = await res.json();
            if (data.status === 'success') {
                if (data.data.length < 10) hasMoreRef.current = false;
                offsetRef.current += data.data.length;
                setItems(prev => reset ? data.data : [...prev, ...data.data]);
            }
        } catch { /* ignore */ }
        setLoadingMore(false);
    }, [loadingMore]);

    const loadComments = useCallback(async (reset = false) => {
        if (reset) { offsetRef.current = 0; hasMoreRef.current = true; setItems([]); }
        if (loadingMore || !hasMoreRef.current) return;
        setLoadingMore(true);
        try {
            const res = await fetch(apiUrl(`/api/user/comments?limit=10&offset=${offsetRef.current}`), creds);
            const data = await res.json();
            if (data.status === 'success') {
                if (data.data.length < 10) hasMoreRef.current = false;
                offsetRef.current += data.data.length;
                setItems(prev => reset ? data.data : [...prev, ...data.data]);
            }
        } catch { /* ignore */ }
        setLoadingMore(false);
    }, [loadingMore]);

    useEffect(() => {
        fetchProfile().then(() => loadPosts(true));
    }, []);

    useEffect(() => {
        function handleScroll() {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 200) {
                if (activeTab === 'posts') loadPosts(); else loadComments();
            }
        }
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeTab, loadPosts, loadComments]);

    function switchTab(tab) {
        setActiveTab(tab);
        offsetRef.current = 0;
        hasMoreRef.current = true;
        setItems([]);
        if (tab === 'posts') loadPosts(true); else loadComments(true);
    }

    function handleShowStatsChange(e) {
        const checked = e.target.checked;
        setShowStats(checked);
        fetch(apiUrl('/api/user/settings'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ show_profile_stats: checked }),
        }).catch(() => {});
    }

    function handlePrivateChange(e) {
        const checked = e.target.checked;
        setIsPrivate(checked);
        fetch(apiUrl('/api/user/settings'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_private: checked }),
        }).catch(() => {});
    }

    function handleAvatarFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        editAvatarFileRef.current = file;
        const reader = new FileReader();
        reader.onload = (ev) => setEditAvatarPreview(ev.target.result);
        reader.readAsDataURL(file);
    }

    function handleUsernameChange(e) {
        const val = e.target.value;
        setEditUsername(val);
        setUsernameCooldownMsg('');
    }

    async function handleSaveProfile() {
        // check the cooldown before letting the username change go through
        const originalUsername = user?.anonymous_handle || '';
        const isChangingUsername = editUsername.trim() !== originalUsername;

        if (isChangingUsername && lastUsernameChange) {
            const daysSinceChange = daysSince(lastUsernameChange);
            if (daysSinceChange < COOLDOWN_DAYS) {
                const remaining = COOLDOWN_DAYS - daysSinceChange;
                setUsernameCooldownMsg(`You can change your username again in ${remaining} day${remaining === 1 ? '' : 's'}.`);
                return;
            }
        }

        const formData = new FormData();
        formData.append('username', editUsername.trim());
        formData.append('bio', editBio);
        if (editAvatarFileRef.current) formData.append('avatar', editAvatarFileRef.current);
        setSavingProfile(true);
        try {
            const res = await fetch(apiUrl('/api/user/profile'), { method: 'PUT', credentials: 'include', body: formData });
            const data = await res.json();
            if (data.status === 'success') {
                setEditOpen(false);
                editAvatarFileRef.current = null;
                setEditAvatarPreview(null);
                setUsernameCooldownMsg('');
                // reset the cooldown clock
                if (isChangingUsername) {
                    setLastUsernameChange(new Date().toISOString());
                }
                fetchProfile();
            } else {
                alert('Error: ' + data.message);
            }
        } finally {
            setSavingProfile(false);
        }
    }

    async function handleUpdatePassword() {
        if (user?.has_password && !oldPw) { alert('Current password is required'); return; }
        if (!newPw || !confirmPw) { alert('All fields required'); return; }
        if (newPw !== confirmPw) { alert('Passwords do not match'); return; }
        const res = await fetch(apiUrl('/api/user/password'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert('Password updated');
            setPwOpen(false);
            setOldPw(''); setNewPw(''); setConfirmPw('');
        } else {
            alert('Error: ' + data.message);
        }
    }

    async function handleDeleteAccount() {
        if (delConfirm.trim() !== 'DELETE') { alert('Type DELETE to confirm'); return; }
        const res = await fetch(apiUrl('/api/user/account'), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ password: delPw, confirmation: delConfirm.trim() }),
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert('Account deleted');
            navigate('/login');
        } else {
            alert('Error: ' + data.message);
        }
    }

    async function handleLogout() {
        await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
        logout();
        navigate('/login', { replace: true });
    }

    const displayName = user?.anonymous_handle || 'User';
    const handle = user?.anonymous_handle ? `@${user.anonymous_handle}` : '';
    const remainingCooldown = lastUsernameChange
        ? COOLDOWN_DAYS - daysSince(lastUsernameChange)
        : 0;
    const isCooldownActive = lastUsernameChange && remainingCooldown > 0;

    // whether to show real numbers or hide them
    const showNumbers = showStats;

    return (
        <div className="app-body">
            <UploadOverlay visible={savingProfile} />

            {/* header */}
            <header className="profile-header">
                <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7" /></svg>
                </button>
                <h1 className="profile-title">{displayName}</h1>
                <div className="header-actions">
                    <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(v => !v)}>
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                    </button>
                    <div className={`settings-dropdown${settingsOpen ? ' show' : ''}`}>
                        <div className="setting-item">
                            <span>Show Stats</span>
                            <label className="switch">
                                <input type="checkbox" checked={showStats} onChange={handleShowStatsChange} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span>Private Profile</span>
                            <label className="switch">
                                <input type="checkbox" checked={isPrivate} onChange={handlePrivateChange} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span>Light Mode</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={theme === 'light'}
                                    onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <button className="dropdown-btn" onClick={() => { setPwOpen(true); setSettingsOpen(false); }}>Change Password</button>
                        <button className="dropdown-btn" onClick={() => navigate('/blocked-accounts')}>Blocked Accounts</button>
                        <button className="dropdown-btn danger" onClick={() => { setDelStage('plead'); setDelOpen(true); setSettingsOpen(false); }}>Delete Account</button>
                        <button className="dropdown-btn" onClick={handleLogout}>Logout</button>
                        <div className="divider" style={{ margin: '6px 0' }} />
                        <div style={{ padding: '8px 12px' }}>
                            <div style={{ color: '#666', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Contact Us</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#999', fontSize: '0.78rem' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="M22 4l-10 8L2 4"/>
                                </svg>
                                <span>khatripiyus95@gmail.com</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="profile-main">
                {status === 'loading' && <SkeletonLoader type="profile" />}

                {status === 'error' && (
                    <div className="profile-error">
                        <p>Could not load profile.</p>
                        <button className="btn-primary" style={{ maxWidth: 200, marginTop: 12 }} onClick={fetchProfile}>Retry</button>
                    </div>
                )}

                {status === 'ready' && user && (
                    <>
                        {/* hero */}
                        <section className="pr-hero">
                            <div className="pr-hero-top">
                                <div className="pr-avatar-wrap">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="Avatar" className="pr-avatar" />
                                    ) : (
                                        <div className="pr-avatar pr-avatar-fallback">{displayName.charAt(0).toUpperCase()}</div>
                                    )}
                                </div>
                                <div className="pr-hero-actions">
                                    <button className="pr-edit-btn" onClick={() => setEditOpen(true)}>
                                        Edit profile
                                    </button>
                                    <button
                                        className="pr-share-btn"
                                        onClick={shareProfile}
                                        aria-label="Copy profile link"
                                    >
                                        {copied ? <CheckIcon size={14} /> : <LinkIcon size={14} />}
                                        <span>{copied ? 'Copied' : 'Share'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pr-info">
                                <h2 className="pr-name">{displayName}</h2>
                                <span className="pr-handle">{handle}</span>
                                {user.bio && <p className="pr-bio">{user.bio}</p>}
                                <span className="pr-joined">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    Joined {formatDate(user.created_at)}
                                </span>
                            </div>

                            {/* stats row, tap to open followers/following */}
                            <div className="pr-stats">
                                <button
                                    type="button"
                                    className="pr-stat pr-stat-link"
                                    onClick={() => navigate(`/user/${user.profile_id}/following`)}
                                >
                                    <strong className={showNumbers ? '' : 'pr-stat-hidden'}>
                                        {showNumbers ? (user.following_count ?? '—') : '—'}
                                    </strong>
                                    <span>Following</span>
                                </button>
                                <button
                                    type="button"
                                    className="pr-stat pr-stat-link"
                                    onClick={() => navigate(`/user/${user.profile_id}/followers`)}
                                >
                                    <strong className={showNumbers ? '' : 'pr-stat-hidden'}>
                                        {showNumbers ? followersCount : '—'}
                                    </strong>
                                    <span>Followers</span>
                                </button>
                                <div className="pr-stat">
                                    <strong className={showNumbers ? '' : 'pr-stat-hidden'}>
                                        {showNumbers ? (user.posts_count ?? '—') : '—'}
                                    </strong>
                                    <span>Confessions</span>
                                </div>
                            </div>
                        </section>

                        {/* tabs */}
                        <div className="pr-tabs">
                            <button
                                className={`pr-tab${activeTab === 'posts' ? ' active' : ''}`}
                                onClick={() => switchTab('posts')}
                            >
                                Confessions
                            </button>
                            <button
                                className={`pr-tab${activeTab === 'comments' ? ' active' : ''}`}
                                onClick={() => switchTab('comments')}
                            >
                                Comments
                            </button>
                        </div>

                        {/* tab content */}
                        <div className="pr-content">
                            {items.length === 0 && !loadingMore && (
                                <div className="pr-empty">
                                    {activeTab === 'posts'
                                        ? 'No confessions yet.'
                                        : 'No comments yet.'}
                                </div>
                            )}

                            {activeTab === 'posts' && items.map(post => (
                                <article key={post.id} className="pr-post-card" onClick={() => navigate(`/post/${post.id}`)}>
                                    <div className="pr-post-top">
                                        <span className="pr-post-cat">{post.category_name || 'General'}</span>
                                        <span className="pr-post-time">{timeAgo(post.created_at)}</span>
                                    </div>
                                    <h3 className="pr-post-title">{post.title}</h3>
                                    <p className="pr-post-text">{post.content}</p>
                                    <div className="pr-post-meta">
                                        <span className="pr-post-stat">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                            {post.likes_count ?? 0}
                                        </span>
                                        <span className="pr-post-stat">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                            {post.comments_count ?? 0}
                                        </span>
                                    </div>
                                </article>
                            ))}

                            {activeTab === 'comments' && items.map(comment => (
                                <div key={comment.id} className="pr-comment-card">
                                    <div className="pr-comment-context">
                                        <span className="pr-comment-ctx-label">In reply to</span>
                                        <Link to={`/post/${comment.post_id}`} className="pr-comment-ctx-link">
                                            {comment.post_title || 'a post'}
                                        </Link>
                                    </div>
                                    <p className="pr-comment-text">{comment.content}</p>
                                    <span className="pr-comment-time">{timeAgo(comment.created_at)}</span>
                                </div>
                            ))}
                        </div>

                        {loadingMore && <div className="pr-loading">Showing more...</div>}
                    </>
                )}
            </main>

            <BottomNav />

            {/* edit profile modal */}
            {editOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); setUsernameCooldownMsg(''); }}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Profile</h3>
                            <button className="icon-btn close-modal" onClick={() => { setEditOpen(false); setUsernameCooldownMsg(''); }}>&times;</button>
                        </div>
                        <div className="avatar-upload">
                            {(editAvatarPreview || user?.avatar_url)
                                ? <img src={editAvatarPreview || user.avatar_url} alt="Avatar" />
                                : <div className="avatar-fallback large">{displayName.charAt(0).toUpperCase()}</div>}
                            <label className="upload-btn">
                                <input type="file" ref={editAvatarFileRef} accept="image/*" hidden onChange={handleAvatarFileChange} />
                                Upload New Photo
                            </label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="editUsername">Username</label>
                            <input
                                type="text"
                                id="editUsername"
                                className="premium-input"
                                placeholder="Your display name"
                                value={editUsername}
                                onChange={handleUsernameChange}
                            />
                            {isCooldownActive && (
                                <p className="cooldown-hint">Can change again in {remainingCooldown} day{remainingCooldown === 1 ? '' : 's'}</p>
                            )}
                            {usernameCooldownMsg && (
                                <p className="cooldown-error">{usernameCooldownMsg}</p>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="editBio">Bio</label>
                            <textarea id="editBio" className="premium-input" placeholder="Tell us about yourself..." rows={3}
                                value={editBio} onChange={(e) => setEditBio(e.target.value)} />
                        </div>
                        <button className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                            {savingProfile ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {/* change password modal */}
            {pwOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) setPwOpen(false); }}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{user?.has_password ? 'Change Password' : 'Set a Password'}</h3>
                            <button className="icon-btn close-modal" onClick={() => setPwOpen(false)}>&times;</button>
                        </div>
                        {user?.has_password && (
                            <div className="form-group">
                                <label>Current Password</label>
                                <PasswordInput value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
                            </div>
                        )}
                        <div className="form-group">
                            <label>New Password</label>
                            <PasswordInput value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <PasswordInput value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                        </div>
                        <button className="btn-primary" onClick={handleUpdatePassword}>
                            {user?.has_password ? 'Update Password' : 'Set Password'}
                        </button>
                    </div>
                </div>
            )}

            {/* delete account modal */}
            {delOpen && delStage === 'plead' && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) setDelOpen(false); }}>
                    <div className="modal-content plead-modal">
                        <button className="icon-btn close-modal plead-close" onClick={() => setDelOpen(false)}>&times;</button>
                        <div className="plead-icon">
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2 4.5 5.7 4c2-.3 3.7.7 4.9 2.2C11.8 4.7 13.5 3.7 15.5 4c3.7.5 5.4 4.4 3.7 7.7C16.7 16.4 12 21 12 21Z" />
                                <path d="M9.5 13.5s1 1 2.5 1 2.5-1 2.5-1" />
                            </svg>
                        </div>
                        <h3 className="plead-title">We value you, {displayName}.</h3>
                        <p className="plead-text">
                            Confessly is a community built on shared secrets and human connection.
                            Please don't break that chain. Your confessions are a part of us.
                            Please be with us!
                        </p>
                        <button className="btn-primary plead-stay-btn" onClick={() => setDelOpen(false)}>
                            Stay with Us
                        </button>
                        <button className="plead-delete-link" onClick={() => setDelStage('confirm')}>
                            I still want to delete my account
                        </button>
                    </div>
                </div>
            )}

            {delOpen && delStage === 'confirm' && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) setDelOpen(false); }}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Delete Account</h3>
                            <button className="icon-btn close-modal" onClick={() => setDelOpen(false)}>&times;</button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                            This action is irreversible. Please enter your password and type <strong>DELETE</strong> to confirm.
                        </p>
                        <div className="form-group">
                            <label>Current Password</label>
                            <PasswordInput value={delPw} onChange={(e) => setDelPw(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Type DELETE</label>
                            <input type="text" className="premium-input" placeholder="DELETE" value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} />
                        </div>
                        <button className="btn-primary danger-btn" onClick={handleDeleteAccount}>Delete My Account</button>
                        <button className="plead-delete-link" onClick={() => setDelStage('plead')}>Actually, I'll stay</button>
                    </div>
                </div>
            )}
        </div>
    );
}
