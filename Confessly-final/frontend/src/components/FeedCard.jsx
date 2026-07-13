// shared post card used by feed, trending and other list views
import PostMenu from './PostMenu.jsx';
import '../styles/global.css';
import '../styles/feed.css';

// relative time label, tolerates missing/bad dates
export function timeAgo(dateStr) {
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

export function AnonAvatar({ size = 'md', src = null }) {
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

export function CategoryTag({ name }) {
    if (!name) return null;
    return <span className="cat-tag">{name}</span>;
}

export default function FeedCard({
    post,
    avatarUrl   = null,   // kept for backward compat
    onLike,
    onShare,
    onComment,
    onCardClick,
    onProfileClick,
    onReportPost,
    onBlockUser,
    onDeletePost,
}) {
    const isLiked = post.liked_by_user > 0;
    const displayName = post.anonymous_handle || 'Anonymous';
    const postAuthorAvatar = post.avatar_url || avatarUrl;
    const postProfileId = post.profile_id;

    function handleProfileClick(e) {
        e.stopPropagation();
        if (onProfileClick && postProfileId) {
            onProfileClick(postProfileId);
        }
    }

    return (
        <article className="fc-card" onClick={onCardClick}>
            <div className="fc-header">
                <div className="fc-author">
                    <div className="fc-avatar-clickable" onClick={handleProfileClick} role="button" tabIndex={0} aria-label="View profile">
                        <AnonAvatar size="md" src={postAuthorAvatar} />
                    </div>
                    <div className="fc-author-meta">
                        <span
                            className="fc-username fc-username-clickable"
                            onClick={handleProfileClick}
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
                        onReportPost={onReportPost}
                        onBlockUser={onBlockUser}
                        onDeletePost={onDeletePost}
                    />
                </div>
            </div>

            <h2 className="fc-title">{post.title}</h2>
            <p  className="fc-content">{post.content}</p>

            {post.image_url && (
                <div className="fc-image-wrap">
                    <img src={post.image_url} alt="" loading="lazy" />
                </div>
            )}

            <div className="fc-footer">
                <div className="fc-footer-left">
                    <button
                        className={`fc-btn fc-like${isLiked ? ' fc-liked' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onLike && onLike(post.id); }}
                        aria-label={isLiked ? 'Unlike' : 'Like'}
                        aria-pressed={isLiked}
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24"
                            fill={isLiked ? 'currentColor' : 'none'}
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{post.likes_count ?? 0}</span>
                    </button>
                    <button
                        className="fc-btn"
                        onClick={(e) => { e.stopPropagation(); onComment && onComment(post.id); }}
                        aria-label="Comments"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{post.comments_count ?? 0}</span>
                    </button>
                </div>
                <button
                    className="fc-btn fc-share"
                    onClick={(e) => { e.stopPropagation(); onShare && onShare(post); }}
                    aria-label="Share this confession"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                </button>
            </div>
        </article>
    );
}
