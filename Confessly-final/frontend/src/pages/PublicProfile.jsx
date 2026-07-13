import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import BottomNav from '../components/BottomNav.jsx';
import { timeAgo } from '../components/FeedCard.jsx';
import FollowButton from '../components/FollowButton.jsx';
import { LinkIcon, CheckIcon, LockIcon } from '../components/icons.jsx';
import { apiUrl, apiFetch } from '../api.js';
import '../styles/global.css';
import '../styles/feed.css';
import '../styles/profile.css';

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function PublicProfile() {
    const { profileId } = useParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState('loading');
    const [profile, setProfile] = useState(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [canViewContent, setCanViewContent] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');
    const [items, setItems] = useState([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const offsetRef = { current: 0 };
    const hasMoreRef = { current: true };

    // Follow state
    const [isFollowing, setIsFollowing] = useState(false);
    const [followsYou, setFollowsYou] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [copied, setCopied] = useState(false);

    const creds = { credentials: 'include' };

    async function shareProfile() {
        const url = `${window.location.origin}/user/${profileId}`;
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
            window.prompt('Copy profile link:', url);
        }
    }

    const fetchProfile = useCallback(async () => {
        setStatus('loading');
        try {
            const res = await fetch(apiUrl(`/api/profiles/${profileId}`), creds);
            const data = await res.json();
            if (data.status === 'success') {
                setProfile(data.profile);
                setIsOwnProfile(data.is_own_profile);
                setCanViewContent(data.can_view_content);
                setIsPrivate(data.is_private);
                setFollowersCount(data.profile.followers_count || 0);

                // Check follow status (also tells us if they follow us -> "Follow back")
                const fsRes = await fetch(apiUrl(`/api/users/${profileId}/follow-status`), creds);
                const fsData = await fsRes.json();
                if (fsData.status === 'success') {
                    setIsFollowing(fsData.isFollowing);
                    setFollowsYou(!!fsData.followsYou);
                }

                setStatus('ready');
                if (data.can_view_content) {
                    loadPosts(true);
                }
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    }, [profileId]);

    const loadPosts = useCallback(async (reset = false) => {
        if (reset) { offsetRef.current = 0; hasMoreRef.current = true; setItems([]); }
        if (loadingMore || !hasMoreRef.current) return;
        setLoadingMore(true);
        try {
            const res = await fetch(apiUrl(`/api/profiles/${profileId}/posts?limit=10&offset=${offsetRef.current}`), creds);
            const data = await res.json();
            if (data.status === 'success') {
                if (data.data.length < 10) hasMoreRef.current = false;
                offsetRef.current += data.data.length;
                setItems(prev => reset ? data.data : [...prev, ...data.data]);
            }
        } catch { /* ignore */ }
        setLoadingMore(false);
    }, [loadingMore, profileId]);

    const loadComments = useCallback(async (reset = false) => {
        if (reset) { offsetRef.current = 0; hasMoreRef.current = true; setItems([]); }
        if (loadingMore || !hasMoreRef.current) return;
        setLoadingMore(true);
        try {
            const res = await fetch(apiUrl(`/api/profiles/${profileId}/comments?limit=10&offset=${offsetRef.current}`), creds);
            const data = await res.json();
            if (data.status === 'success') {
                if (data.data.length < 10) hasMoreRef.current = false;
                offsetRef.current += data.data.length;
                setItems(prev => reset ? data.data : [...prev, ...data.data]);
            }
        } catch { /* ignore */ }
        setLoadingMore(false);
    }, [loadingMore, profileId]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    function switchTab(tab) {
        setActiveTab(tab);
        offsetRef.current = 0;
        hasMoreRef.current = true;
        setItems([]);
        if (tab === 'posts') loadPosts(true); else loadComments(true);
    }

    // following a private account unlocks its content — refetch so the page updates
    function handleFollowChange(nowFollowing, newCount) {
        setIsFollowing(nowFollowing);
        if (typeof newCount === 'number') setFollowersCount(newCount);
        if (isPrivate) fetchProfile();
    }

    const displayName = profile?.anonymous_handle || 'User';
    const handle = profile?.anonymous_handle ? `@${profile.anonymous_handle}` : '';

    return (
        <div className="app-body">
            <header className="profile-header">
                <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7" /></svg>
                </button>
                <h1 className="profile-title">{displayName}</h1>
                <div style={{ width: 36 }} />
            </header>

            <main className="profile-main">
                {status === 'loading' && <SkeletonLoader type="profile" />}

                {status === 'error' && (
                    <div className="profile-error">
                        <p>Could not load profile.</p>
                        <button className="btn-primary" style={{ maxWidth: 200, marginTop: 12 }} onClick={fetchProfile}>Retry</button>
                    </div>
                )}

                {status === 'ready' && profile && (
                    <>
                        <section className="pr-hero">
                            <div className="pr-hero-top">
                                <div className="pr-avatar-wrap">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Avatar" className="pr-avatar" />
                                    ) : (
                                        <div className="pr-avatar pr-avatar-fallback">{displayName.charAt(0).toUpperCase()}</div>
                                    )}
                                </div>
                                <div className="pr-hero-actions">
                                    {!isOwnProfile && (
                                        <FollowButton
                                            profileId={Number(profileId)}
                                            initialFollowing={isFollowing}
                                            followsYou={followsYou}
                                            onChange={handleFollowChange}
                                        />
                                    )}
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
                                {profile.bio && <p className="pr-bio">{profile.bio}</p>}
                                <span className="pr-joined">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    Joined {formatDate(profile.created_at)}
                                </span>
                            </div>

                            {/* ── STATS ROW — hidden entirely for locked private accounts ── */}
                            <div className="pr-stats">
                                <button
                                    type="button"
                                    className="pr-stat pr-stat-link"
                                    disabled={!canViewContent}
                                    onClick={() => canViewContent && navigate(`/user/${profileId}/following`)}
                                >
                                    <strong>{canViewContent ? (profile.following_count ?? 0) : '—'}</strong>
                                    <span>Following</span>
                                </button>
                                <button
                                    type="button"
                                    className="pr-stat pr-stat-link"
                                    disabled={!canViewContent}
                                    onClick={() => canViewContent && navigate(`/user/${profileId}/followers`)}
                                >
                                    <strong>{canViewContent ? followersCount : '—'}</strong>
                                    <span>Followers</span>
                                </button>
                                <div className="pr-stat">
                                    <strong>{canViewContent ? (profile.posts_count ?? 0) : '—'}</strong>
                                    <span>Confessions</span>
                                </div>
                            </div>
                        </section>

                        {/* ── PRIVATE ACCOUNT LOCK ── */}
                        {isPrivate && !canViewContent && !isOwnProfile && (
                            <div className="pr-private-block">
                                <div className="pr-private-icon"><LockIcon size={28} /></div>
                                <h3>This account is private</h3>
                                <p>Follow each other to see their confessions, comments and connections.</p>
                            </div>
                        )}

                        {/* ── TABS (only if can view content) ── */}
                        {(canViewContent || isOwnProfile) && (
                            <>
                                {!isPrivate && (
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
                                )}

                                <div className="pr-content">
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
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
