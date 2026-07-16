import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import ShareModal from '../components/ShareModal.jsx';
import ReportModal from '../components/ReportModal.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import PostMenu from '../components/PostMenu.jsx';
import RichText from '../components/RichText.jsx';
import { formatMetric } from '../components/FeedCard.jsx';
import { useUser } from '../context/UserContext.jsx';
import { apiUrl, apiFetch } from '../api.js';
import '../styles/global.css';
import '../styles/feed.css';
import '../styles/post-detail-extra.css';

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60)  return 'Just now';
    const m = Math.floor(s / 60);
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function AnonAvatar({ size = 'md', src = null }) {
    if (src) {
        return (
            <div className={`anon-avatar anon-avatar-${size} anon-avatar-img`} aria-hidden="true">
                <img
                    src={src}
                    alt="Profile"
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement.classList.add('anon-avatar-fallback');
                    }}
                />
            </div>
        );
    }
    return (
        <div className={`anon-avatar anon-avatar-${size}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        </div>
    );
}

function CategoryTag({ name }) {
    if (!name) return null;
    return <span className="cat-tag">{name}</span>;
}

function buildCommentTree(comments) {
    const map   = {};
    const roots = [];
    comments.forEach(c => { map[c.id] = { ...c, children: [] }; });
    comments.forEach(c => {
        if (c.parent_id && map[c.parent_id]) {
            map[c.parent_id].children.push(map[c.id]);
        } else {
            roots.push(map[c.id]);
        }
    });
    return roots;
}

function CommentNode({ node, onReply, onReact, onDelete, onProfileClick, viewerProfileId, postOwnerProfileId }) {
    const score     = node.net_score || 0;
    const upStyle   = node.user_reaction === 'like'    ? { color: 'var(--like)' } : {};
    const downStyle = node.user_reaction === 'dislike' ? { color: '#f97316' }     : {};
    const canDelete = node.profile_id === viewerProfileId || postOwnerProfileId === viewerProfileId;

    function goToProfile() {
        if (node.profile_id) onProfileClick(node.profile_id);
    }

    return (
        <div className="comment-node">
            <div
                className="c-avatar-link"
                onClick={goToProfile}
                role="button"
                tabIndex={0}
                aria-label={`View ${node.anonymous_username}'s profile`}
                onKeyDown={(e) => { if (e.key === 'Enter') goToProfile(); }}
            >
                <AnonAvatar size="xs" src={node.avatar_url} />
            </div>
            <div className="c-body">
                <div className="c-bubble">
                    <div className="c-username">
                        <span
                            className="c-username-link"
                            onClick={goToProfile}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') goToProfile(); }}
                        >
                            {node.anonymous_username}
                        </span>
                        {node.is_post_author && (
                            <span className="op-badge">OP</span>
                        )}
                    </div>
                    <div className="c-text">{node.content}</div>
                </div>
                <div className="c-meta">
                    <span className="c-time">{timeAgo(node.created_at)}</span>
                    <button
                        className="c-react-btn c-like"
                        style={upStyle}
                        onClick={() => onReact(node.id, 'like')}
                        aria-label="Helpful"
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        {score > 0 && <span className="c-score">{score}</span>}
                    </button>
                    <button
                        className="c-react-btn c-dislike"
                        style={downStyle}
                        onClick={() => onReact(node.id, 'dislike')}
                        aria-label="Not helpful"
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                            <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                        </svg>
                        {score < 0 && <span className="c-score">{score}</span>}
                    </button>
                    <button
                        className="c-reply-btn"
                        onClick={() => onReply(node.id, node.anonymous_username)}
                    >
                        Reply
                    </button>
                    {canDelete && (
                        <button
                            className="c-reply-btn"
                            onClick={() => onDelete(node.id)}
                        >
                            Delete
                        </button>
                    )}
                </div>
                {node.children?.length > 0 && (
                    <div className="reply-group">
                        {node.children.map(child => (
                            <CommentNode
                                key={child.id}
                                node={child}
                                onReply={onReply}
                                onReact={onReact}
                                onDelete={onDelete}
                                onProfileClick={onProfileClick}
                                viewerProfileId={viewerProfileId}
                                postOwnerProfileId={postOwnerProfileId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PostDetail() {
    const { id: postId } = useParams();
    const navigate       = useNavigate();
    const { user }       = useUser();

    const [status,       setStatus]       = useState('loading');
    const [post,         setPost]         = useState(null);
    const [comments,     setComments]     = useState([]);
    const [commentField, setCommentField] = useState('');
    const [replyingTo,   setReplyingTo]   = useState(null);
    const [shareOpen,    setShareOpen]    = useState(false);
    const [reportMeta,   setReportMeta]   = useState(null);
    const commentInputRef = useRef(null);

    const fetchOpts = { credentials: 'include' };

    async function loadPost() {
        setStatus('loading');
        try {
            const res  = await fetch(apiUrl(`/api/confessions/${postId}`), fetchOpts);
            const data = await res.json();
            if (res.ok) { setPost(data.post); setStatus('ready'); }
            else          setStatus('error');
        } catch { setStatus('error'); }
    }

    async function loadComments() {
        try {
            const res  = await fetch(apiUrl(`/api/confessions/${postId}/comments`), fetchOpts);
            const data = await res.json();
            if (res.ok) setComments(data.data);
        } catch (e) { console.error(e); }
    }

    useEffect(() => {
        if (!postId) { navigate('/feed'); return; }
        loadPost();
        loadComments();
    }, [postId]);

    async function handleLike() {
        if (!post) return;
        const wasLiked = post.liked_by_user > 0;
        setPost(p => ({
            ...p,
            liked_by_user: wasLiked ? 0 : 1,
            likes_count:   wasLiked ? Math.max(0, (p.likes_count ?? 0) - 1) : (p.likes_count ?? 0) + 1,
            engagement_count: wasLiked ? p.engagement_count : (p.engagement_count ?? 0) + 1,
        }));
        try {
            const res  = await fetch(apiUrl(`/api/confessions/${postId}/react`), { method: 'POST', credentials: 'include' });
            const data = await res.json();
            if (res.ok) setPost(p => ({ ...p, likes_count: data.likes_count }));
        } catch { /* revert handled by reload */ }
    }

    async function submitComment() {
        const val = commentField.trim();
        if (!val) return;
        const body = { content: val };
        if (replyingTo) body.parent_id = replyingTo.id;
        try {
            const res = await fetch(apiUrl(`/api/confessions/${postId}/comments`), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body:    JSON.stringify(body),
            });
            if (res.ok) {
                setCommentField('');
                setReplyingTo(null);
                loadComments();
            }
        } catch (e) { console.error(e); }
    }

    async function handleReact(commentId, reactType) {
        try {
            const res  = await fetch(apiUrl(`/api/comments/${commentId}/react`), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body:    JSON.stringify({ reaction_type: reactType }),
            });
            const data = await res.json();
            if (res.ok) {
                setComments(prev => prev.map(c =>
                    c.id === commentId
                        ? { ...c, net_score: data.net_score, user_reaction: data.user_reaction }
                        : c
                ));
            }
        } catch (e) { console.error(e); }
    }

    function handleReply(id, name) {
        setReplyingTo({ id, name });
        commentInputRef.current?.focus();
    }

    async function handleDeleteComment(commentId) {
        if (!window.confirm('Delete this comment? This cannot be undone.')) return;
        try {
            const res = await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) loadComments();
            else alert(data.message || 'Failed to delete comment');
        } catch {
            alert('Could not connect to the server.');
        }
    }

    async function handleDeletePost(id) {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        try {
            const res = await apiFetch(`/api/confessions/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) navigate('/feed');
            else alert(data.message || 'Failed to delete post');
        } catch {
            alert('Could not connect to the server.');
        }
    }

    async function handleBlockUser(userId) {
        if (!window.confirm('Block this user? Their posts will be hidden from your feed.')) return;
        try {
            const res = await apiFetch('/api/users/block', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId }),
            });
            const data = await res.json();
            if (res.ok) navigate('/feed');
            else alert(data.message || 'Failed to block user');
        } catch {
            alert('Could not connect to the server.');
        }
    }

    async function handleDownload(imgUrl) {
        try {
            const response  = await fetch(imgUrl);
            const blob      = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a         = document.createElement('a');
            a.href     = objectUrl;
            a.download = `confessly_${postId}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
        } catch { window.open(imgUrl, '_blank'); }
    }

    const tree    = buildCommentTree(comments);
    const isLiked = post?.liked_by_user > 0;
    const displayName = post?.anonymous_handle || 'Anonymous';

    return (
        <div className="app-body">
            <header className="back-header">
                <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
                    <svg width="16" height="16" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                </button>
                <h3>Confession</h3>
            </header>

            <main className="feed-container" style={{ paddingBottom: 120 }}>
                {status === 'loading' && <SkeletonLoader type="post" />}

                {status === 'error' && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5"
                            viewBox="0 0 24 24"
                            style={{ color: 'var(--text-muted)', margin: '0 auto 14px', display: 'block' }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
                        </svg>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 16 }}>
                            Could not load this confession.
                        </p>
                        <button className="btn-primary" style={{ maxWidth: 160, margin: '0 auto' }} onClick={loadPost}>
                            Try Again
                        </button>
                    </div>
                )}

                {status === 'ready' && post && (
                    <article className="fc-card pd-hero-card">
                        <div className="fc-header">
                            <div className="fc-author">
                                <div
                                    className="fc-avatar-clickable"
                                    onClick={() => post.profile_id && navigate(`/user/${post.profile_id}`)}
                                    role="button"
                                    tabIndex={0}
                                    aria-label="View profile"
                                >
                                    <AnonAvatar size="md" src={post.avatar_url || null} />
                                </div>
                                <div className="fc-author-meta">
                                    <span
                                        className="fc-username fc-username-clickable"
                                        onClick={() => post.profile_id && navigate(`/user/${post.profile_id}`)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        {displayName}
                                    </span>
                                    <span className="fc-time">{timeAgo(post.created_at)}</span>
                                </div>
                            </div>
                            <div className="fc-header-right">
                                <CategoryTag name={post.category_name} />
                                <PostMenu
                                    post={post}
                                    onReportPost={(id, title) => setReportMeta({ id, title })}
                                    onBlockUser={handleBlockUser}
                                    onDeletePost={handleDeletePost}
                                />
                            </div>
                        </div>

                        <h2 className="pd-title">{post.title}</h2>
                        <p className="pd-body"><RichText text={post.content} /></p>

                        {post.image_url && (
                            <div className="pd-image-wrap">
                                <img src={post.image_url} alt="" loading="lazy" />
                            </div>
                        )}

                        <div className="fc-footer">
                            <div className="fc-footer-left">
                                <button
                                    className="fc-btn fc-comment"
                                    onClick={() => {
                                        document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    aria-label={`${comments.length} comments`}
                                >
                                    <svg width="17" height="17" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    <span>{formatMetric(comments.length)}</span>
                                </button>
                                <button
                                    className={`fc-btn fc-like${isLiked ? ' fc-liked' : ''}`}
                                    onClick={handleLike}
                                    aria-label={isLiked ? 'Unlike' : 'Like'}
                                    aria-pressed={isLiked}
                                >
                                    <svg width="17" height="17" viewBox="0 0 24 24"
                                        fill={isLiked ? 'currentColor' : 'none'}
                                        stroke="currentColor" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                    <span>{formatMetric(post.likes_count)}</span>
                                </button>
                            </div>
                            <div className="pd-footer-right">
                                {post.image_url && (
                                    <button
                                        className="fc-btn pd-save-btn"
                                        onClick={() => handleDownload(post.image_url)}
                                        aria-label="Save image"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24"
                                            fill="none" stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    className="fc-btn fc-share"
                                    onClick={() => setShareOpen(true)}
                                    aria-label="Share"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                        <polyline points="16 6 12 2 8 6" />
                                        <line x1="12" y1="2" x2="12" y2="15" />
                                    </svg>
                                </button>
                                <span className="fc-btn fc-views" title="Metrics" aria-label={`${post.view_count ?? 0} views`}>
                                    <BarChart2 size={16} strokeWidth={2} />
                                    <span>{formatMetric(post.view_count)}</span>
                                </span>
                            </div>
                        </div>
                    </article>
                )}

                <div className="comment-section" id="comments">
                    <div className="comments-heading">
                        Comments
                        <span className="count-badge">{comments.length}</span>
                    </div>

                    {replyingTo && (
                        <div className="reply-indicator active">
                            Replying to <span className="reply-to-name">{replyingTo.name}</span>
                            <button className="reply-cancel" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
                                <svg width="10" height="10" fill="none" stroke="currentColor"
                                    strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <div className="comment-input-area">
                        <AnonAvatar size="sm" src={user?.avatar_url} />
                        <input
                            ref={commentInputRef}
                            type="text"
                            className="comment-input"
                            placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : 'Add a comment…'}
                            value={commentField}
                            onChange={(e) => setCommentField(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submitComment();
                                }
                            }}
                        />
                        <button
                            className="comment-submit"
                            onClick={submitComment}
                            disabled={!commentField.trim()}
                            aria-label={replyingTo ? 'Submit reply' : 'Submit comment'}
                        >
                            {replyingTo ? 'Reply' : 'Post'}
                        </button>
                    </div>

                    <div id="commentsWrapper" style={{ paddingBottom: 16 }}>
                        {comments.length === 0 && status === 'ready' && (
                            <p className="no-comments-msg">No comments yet. Start the conversation.</p>
                        )}
                        {tree.map(root => (
                            <CommentNode
                                key={root.id}
                                node={root}
                                onReply={handleReply}
                                onReact={handleReact}
                                onDelete={handleDeleteComment}
                                onProfileClick={(profileId) => navigate(`/user/${profileId}`)}
                                viewerProfileId={user?.profile_id}
                                postOwnerProfileId={post?.profile_id}
                            />
                        ))}
                    </div>
                </div>
            </main>

            <ShareModal
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                title={post?.title || 'Confession'}
                url={window.location.href}
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
