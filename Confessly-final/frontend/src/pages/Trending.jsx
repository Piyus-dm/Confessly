import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import ShareModal from '../components/ShareModal.jsx';
import FeedCard from '../components/FeedCard.jsx';
import { useUser } from '../context/UserContext.jsx';
import { apiUrl, apiFetch } from '../api.js';
import '../styles/global.css';
import '../styles/feed.css';
import '../styles/trending.css';

export default function Trending() {
    const navigate  = useNavigate();
    const { user }  = useUser();
    const [status,    setStatus]    = useState('loading');
    const [items,     setItems]     = useState([]);
    const [search,    setSearch]    = useState('');
    const [sharePost, setSharePost] = useState(null);

    const fetchOpts = { credentials: 'include' };

    async function loadTrending() {
        setStatus('loading');
        try {
            const res    = await fetch(apiUrl('/api/trending'), fetchOpts);
            const result = await res.json();
            if (res.ok) { setItems(result.data); setStatus('ready'); }
            else          setStatus('error');
        } catch { setStatus('error'); }
    }

    useEffect(() => {
        loadTrending();
        const interval = setInterval(loadTrending, 3600000);
        return () => clearInterval(interval);
    }, []);

    const filtered = items.filter(post => {
        const term = search.toLowerCase();
        return (
            (post.title || '').toLowerCase().includes(term) ||
            (post.content || '').toLowerCase().includes(term)
        );
    });

    return (
        <div className="app-body">
            <header className="app-header">
                <h1 className="trending-header-title">Trending</h1>
            </header>

            <main className="feed-container">
                {status === 'loading' && <SkeletonLoader type="feed" count={4} />}

                {status === 'error' && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.88rem' }}>
                            Could not load trending.
                        </p>
                        <button
                            className="btn-primary"
                            style={{ maxWidth: 160, margin: '0 auto' }}
                            onClick={loadTrending}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {status === 'ready' && (
                    <>
                        <div className="tr-search-wrap">
                            <div className="tr-search-box">
                                <svg width="15" height="15" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    viewBox="0 0 24 24" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="M21 21l-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search trending…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Search trending confessions"
                                />
                            </div>
                            <div className="tr-divider" />
                        </div>

                        {filtered.length === 0 && (
                            <div className="empty-state">
                                <svg className="empty-state-icon" fill="none" stroke="currentColor"
                                    strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
                                </svg>
                                Nothing matches that search.
                            </div>
                        )}

                        <div className="tr-list">
                            {filtered.map((post, index) => (
                                <div
                                    key={post.id}
                                    className="tr-row"
                                    style={{ animationDelay: `${Math.min(index * 35, 240)}ms` }}
                                >
                                    <div
                                        className="tr-rank"
                                        aria-label={`Rank ${index + 1}`}
                                        data-rank={index + 1}
                                    >
                                        {index + 1}
                                    </div>
                                    <div className="tr-card-wrap">
                                        <FeedCard
                                            post={post}
                                            avatarUrl={user?.avatar_url ?? null}
                                            onLike={() => {}}
                                            onShare={(p) => setSharePost({ id: p.id, title: p.title })}
                                            onComment={(id) => navigate(`/post/${id}#comments`)}
                                            onCardClick={() => navigate(`/post/${post.id}`)}
                                            onProfileClick={(profileId) => navigate(`/user/${profileId}`)}
                                            onDeletePost={async (postId) => {
                                                if (!window.confirm('Delete this post? This cannot be undone.')) return;
                                                try {
                                                    const res = await apiFetch(`/api/confessions/${postId}`, { method: 'DELETE' });
                                                    if (res.ok) setItems(prev => prev.filter(p => p.id !== postId));
                                                    else alert((await res.json()).message || 'Failed to delete post');
                                                } catch {
                                                    alert('Could not connect to the server.');
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>

            <BottomNav />

            <ShareModal
                isOpen={!!sharePost}
                onClose={() => setSharePost(null)}
                title={sharePost?.title ?? ''}
                url={sharePost ? `${window.location.origin}/post/${sharePost.id}` : ''}
            />
        </div>
    );
}
