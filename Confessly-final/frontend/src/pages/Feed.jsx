import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import ShareModal from '../components/ShareModal.jsx';
import FeedCard from '../components/FeedCard.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import ReportModal from '../components/ReportModal.jsx';
import Logo, { LogoMark } from '../components/Logo.jsx';
import { apiFetch, apiUrl } from '../api.js';
import '../styles/global.css';
import '../styles/feed.css';

export default function Feed() {
    const navigate = useNavigate();

    const [loading,    setLoading]   = useState(true);
    const [posts,      setPosts]     = useState([]);
    const [cursor,     setCursor]    = useState(null);
    const [hasMore,    setHasMore]   = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [query,      setQuery]     = useState('');
    const [userResults, setUserResults] = useState([]);
    const [showUserResults, setShowUserResults] = useState(false);
    const [sharePost,  setSharePost] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [reportMeta, setReportMeta] = useState(null);
    const [announcement, setAnnouncement] = useState(null);

    const composeFileRef = useRef(null);
    const debounceRef    = useRef(null);
    const sentinelRef    = useRef(null);
    const searchBoxRef   = useRef(null);

    const viewObserverRef = useRef(null);
    const viewNodesRef     = useRef(new Map());
    const viewTimersRef    = useRef(new Map());
    const viewCountedRef   = useRef(new Set());
    const viewPendingRef   = useRef(new Set());

    function registerPostNode(node, postId) {
        const nodes = viewNodesRef.current;
        const prev = nodes.get(postId);
        const observer = viewObserverRef.current;
        if (prev && prev !== node && observer) observer.unobserve(prev);
        if (node) {
            node.dataset.postId = String(postId);
            nodes.set(postId, node);
            if (observer) observer.observe(node);
        } else {
            nodes.delete(postId);
        }
    }

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const postId = entry.target.dataset.postId;
                if (!postId) return;
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    if (viewCountedRef.current.has(postId) || viewTimersRef.current.has(postId)) return;
                    const timer = setTimeout(() => {
                        viewCountedRef.current.add(postId);
                        viewPendingRef.current.add(postId);
                        viewTimersRef.current.delete(postId);
                        setPosts(prev => prev.map(p =>
                            String(p.id) === postId ? { ...p, view_count: (p.view_count ?? 0) + 1 } : p
                        ));
                    }, 1000);
                    viewTimersRef.current.set(postId, timer);
                } else {
                    const timer = viewTimersRef.current.get(postId);
                    if (timer) {
                        clearTimeout(timer);
                        viewTimersRef.current.delete(postId);
                    }
                }
            });
        }, { threshold: 0.5 });

        viewObserverRef.current = observer;
        viewNodesRef.current.forEach((node) => observer.observe(node));

        const flush = setInterval(() => {
            if (viewPendingRef.current.size === 0) return;
            const ids = Array.from(viewPendingRef.current).map(Number);
            viewPendingRef.current.clear();
            fetch(apiUrl('/api/posts/views'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_ids: ids }),
            }).catch(() => {});
        }, 3500);

        return () => {
            clearInterval(flush);
            observer.disconnect();
            viewObserverRef.current = null;
            viewTimersRef.current.forEach((timer) => clearTimeout(timer));
            viewTimersRef.current.clear();
        };
    }, []);

    // close the user results dropdown on an outside click
    useEffect(() => {
        function handleOutsideClick(e) {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
                setShowUserResults(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // grab latest announcement on mount
    useEffect(() => {
        fetch(apiUrl('/api/announcements'), { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.announcement) {
                    setAnnouncement(data.announcement);
                }
            })
            .catch(() => {});
    }, []);

    // cursor-paginated feed
    async function loadFeed(reset = false) {
        if (reset) {
            setLoading(true);
            setCursor(null);
            setHasMore(true);
        }
        if (!hasMore && !reset) return;
        if (!reset && loadingMore) return;
        if (!reset) setLoadingMore(true);

        try {
            const params = new URLSearchParams();
            params.set('limit', '10');
            if (!reset && cursor) params.set('cursor', cursor);

            const url = apiUrl('/api/feed?' + params.toString());
            const res  = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                setPosts(prev => reset ? data.data : [...prev, ...data.data]);
                if (data.nextCursor) {
                    setCursor(data.nextCursor);
                } else {
                    setHasMore(false);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    useEffect(() => { loadFeed(true); }, []);

    // home nav dispatches this when you click it while already on /feed
    useEffect(() => {
        async function handleHomeRefresh() {
            if (refreshing) return;
            setRefreshing(true);
            try {
                const res  = await fetch(apiUrl('/api/feed?limit=10'), { credentials: 'include' });
                const data = await res.json();
                if (res.ok) {
                    setPosts(data.data);
                    setCursor(data.nextCursor || null);
                    setHasMore(!!data.nextCursor);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setRefreshing(false);
            }
        }
        window.addEventListener('confessly:home-refresh', handleHomeRefresh);
        return () => window.removeEventListener('confessly:home-refresh', handleHomeRefresh);
    }, [refreshing]);

    // clean up the preview blob url
    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    // infinite scroll
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && hasMore && !loadingMore) {
                    loadFeed(false);
                }
            },
            { rootMargin: '400px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loading, hasMore, loadingMore, cursor]);

    // handlers
    function handleSearchChange(e) {
        const val = e.target.value;
        setQuery(val);
        setShowUserResults(val.trim().length > 0);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            async function search() {
                setLoading(true);
                try {
                    const url = apiUrl('/api/confessions') +
                        (val ? '?q=' + encodeURIComponent(val) : '');
                    const res  = await fetch(url, { credentials: 'include' });
                    const data = await res.json();
                    if (res.ok) setPosts(data.data);
                } catch (err) { console.error(err); }
                setLoading(false);
            }
            async function searchUsers() {
                if (!val.trim()) { setUserResults([]); return; }
                try {
                    const res  = await fetch(apiUrl('/api/users/search?q=' + encodeURIComponent(val)), { credentials: 'include' });
                    const data = await res.json();
                    if (res.ok) setUserResults(data.data || []);
                } catch (err) { console.error(err); }
            }
            search();
            searchUsers();
        }, 300);
    }

    function handleComposeFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
        e.target.value = '';
    }

    function clearPreview() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
    }

    async function handleDeletePost(postId) {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        try {
            const res = await apiFetch(`/api/confessions/${postId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== postId));
            } else {
                alert(data.message || 'Failed to delete post');
            }
        } catch {
            alert('Could not connect to the server.');
        }
    }

    async function handleBlockUser(userId) {
        if (!window.confirm('Block this user? Their posts will be hidden from your feed.')) return;
        try {
            const res = await fetch(apiUrl('/api/users/block'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setPosts(prev => prev.filter(p => p.user_id !== userId));
            } else {
                alert(data.message || 'Failed to block user');
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function toggleLike(postId) {
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            const liked = p.liked_by_user > 0;
            return {
                ...p,
                liked_by_user: liked ? 0 : 1,
                likes_count:   liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1,
                engagement_count: liked ? p.engagement_count : (p.engagement_count ?? 0) + 1,
            };
        }));
        try {
            const res  = await fetch(apiUrl(`/api/confessions/${postId}/react`), { method: 'POST', credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                setPosts(prev => prev.map(p =>
                    p.id === postId ? { ...p, likes_count: data.likes_count } : p
                ));
            }
        } catch (err) { console.error(err); }
    }

    return (
        <div className="app-body">
            <header className="app-header">
                {/* logo doubles as scroll-to-top, like a native app */}
                <button
                    type="button"
                    className="header-logo-btn"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    aria-label="Confessly — back to top"
                >
                    <Logo height={26} />
                </button>
                <NotificationBell />
            </header>

            {refreshing && (
                <div className="feed-refresh-bar">
                    <span className="feed-refresh-spinner" />
                </div>
            )}

            <main className="feed-container">
                {/* announcement banner */}
                {announcement && (
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-mid)',
                        borderRadius: 10,
                        padding: '12px 16px',
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        animation: 'fadeUp 0.3s ease',
                    }}>
                        <div style={{ flexShrink: 0, color: '#6366f1', marginTop: 1 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600, marginBottom: 2 }}>{announcement.title}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.45 }}>{announcement.message}</div>
                        </div>
                        <button onClick={() => setAnnouncement(null)}
                            style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                                padding: 4, fontSize: '0.9rem', lineHeight: 1, flexShrink: 0,
                            }}
                            aria-label="Dismiss announcement">
                            ✕
                        </button>
                    </div>
                )}

                <div className="feed-search-box" style={{ position: 'relative' }} ref={searchBoxRef}>
                    <svg width="15" height="15" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search confessions or people…"
                        value={query}
                        onChange={handleSearchChange}
                        onFocus={() => setShowUserResults(query.trim().length > 0)}
                        className="premium-input"
                    />

                    {showUserResults && userResults.length > 0 && (
                        <div className="user-search-dropdown">
                            {userResults.map(u => (
                                <div
                                    key={u.profile_id}
                                    className="user-search-row"
                                    onClick={() => {
                                        setShowUserResults(false);
                                        navigate(`/user/${u.profile_id}`);
                                    }}
                                >
                                    {u.avatar_url ? (
                                        <img src={u.avatar_url} alt="" className="user-search-avatar" />
                                    ) : (
                                        <div className="user-search-avatar user-search-avatar-placeholder">
                                            <svg width="14" height="14" fill="none" stroke="currentColor"
                                                strokeWidth="1.8" viewBox="0 0 24 24">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="user-search-info">
                                        <span className="user-search-handle">@{u.anonymous_handle}</span>
                                        {u.bio && <span className="user-search-bio">{u.bio}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="quick-post-box">
                    <div className="quick-input-row">
                        <div className="c-avatar-logo" aria-hidden="true">
                            <LogoMark size={22} />
                        </div>
                        <input
                            type="text"
                            className="quick-input-fake"
                            placeholder="Share your confession anonymously…"
                            readOnly
                            onClick={() => navigate('/create')}
                        />
                    </div>

                    {previewUrl && (
                        <div className="compose-preview">
                            <img src={previewUrl} alt="Preview" />
                            <button className="compose-preview-close" onClick={clearPreview} aria-label="Remove image">
                                <svg width="11" height="11" fill="none" stroke="currentColor"
                                    strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <div className="quick-actions-row">
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            ref={composeFileRef}
                            onChange={handleComposeFileChange}
                        />
                        <button className="quick-media-btn" onClick={() => composeFileRef.current?.click()}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                            </svg>
                            Media
                        </button>
                        <button className="quick-submit-btn" onClick={() => navigate('/create')}>
                            Post
                        </button>
                    </div>
                </div>

                <div className="feed-section-label">Latest</div>

                <div id="feedContentArea">
                    {loading && <SkeletonLoader type="feed" count={4} />}

                    {!loading && posts.length === 0 && (
                        <div className="empty-state">
                            <svg className="empty-state-icon" fill="none" stroke="currentColor"
                                strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                            </svg>
                            No confessions yet. Be the first.
                        </div>
                    )}

                    {!loading && posts.map((post) => (
                        <div key={post.id} ref={(node) => registerPostNode(node, post.id)}>
                            <FeedCard
                                post={post}
                                onLike={toggleLike}
                                onShare={(p) => setSharePost({ id: p.id, title: p.title })}
                                onComment={(id) => navigate(`/post/${id}#comments`)}
                                onCardClick={() => navigate(`/post/${post.id}`)}
                                onProfileClick={(profileId) => navigate(`/user/${profileId}`)}
                                onReportPost={(id, title) => setReportMeta({ id, title })}
                                onBlockUser={handleBlockUser}
                                onDeletePost={handleDeletePost}
                            />
                        </div>
                    ))}

                    <div ref={sentinelRef} style={{ height: 1 }} />

                    {loadingMore && (
                        <div className="loading-spinner" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                            <div className="skeleton" style={{ width: 200, height: 14, margin: '0 auto' }} />
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />

            <ShareModal
                isOpen={!!sharePost}
                onClose={() => setSharePost(null)}
                title={sharePost?.title ?? ''}
                url={sharePost ? `${window.location.origin}/post/${sharePost.id}` : ''}
            />

            <ReportModal
                isOpen={!!reportMeta}
                onClose={() => setReportMeta(null)}
                postId={reportMeta?.id}
                postTitle={reportMeta?.title}
            />
        </div>
    );
}
