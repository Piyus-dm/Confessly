// loading placeholders, usage: <SkeletonLoader type="feed" count={4} />
// types: feed, post, comment, profile

import '../styles/global.css';

function FeedCardSkeleton({ withImage }) {
    return (
        <div className="sk-card" style={{ marginBottom: 2 }}>
            {/* avatar + name */}
            <div className="sk-row">
                <div className="sk-block" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div className="sk-block" style={{ width: '38%', height: 13 }} />
                    <div className="sk-block" style={{ width: '18%', height: 10 }} />
                </div>
            </div>
            {/* title */}
            <div className="sk-block" style={{ width: '78%', height: 16, marginBottom: 10 }} />
            {/* body */}
            <div className="sk-block" style={{ width: '100%', height: 12, marginBottom: 7 }} />
            <div className="sk-block" style={{ width: withImage ? '55%' : '70%', height: 12 }} />
            {/* image */}
            {withImage && <div className="sk-block" style={{ width: '100%', height: 200, marginTop: 14, borderRadius: 12 }} />}
        </div>
    );
}

function PostSkeleton() {
    return (
        <div className="sk-card" style={{ marginBottom: 2 }}>
            <div className="sk-row">
                <div className="sk-block" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div className="sk-block" style={{ width: '40%', height: 13 }} />
                    <div className="sk-block" style={{ width: '20%', height: 10 }} />
                </div>
            </div>
            <div className="sk-block" style={{ width: '82%', height: 18, marginBottom: 14 }} />
            <div className="sk-block" style={{ width: '100%', height: 12, marginBottom: 7 }} />
            <div className="sk-block" style={{ width: '90%', height: 12, marginBottom: 7 }} />
            <div className="sk-block" style={{ width: '65%', height: 12, marginBottom: 16 }} />
            <div className="sk-block" style={{ width: '100%', height: 300, borderRadius: 12 }} />
        </div>
    );
}

function CommentSkeleton() {
    return (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div className="sk-block" style={{ width: 26, height: 26, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
                <div className="sk-block" style={{ width: '30%', height: 12, marginBottom: 8 }} />
                <div className="sk-block" style={{ width: '85%', height: 10, marginBottom: 6 }} />
                <div className="sk-block" style={{ width: '55%', height: 10 }} />
            </div>
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div style={{ textAlign: 'center', padding: '24px 14px' }}>
            <div className="sk-block" style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px' }} />
            <div className="sk-block" style={{ width: 180, height: 20, margin: '12px auto 8px' }} />
            <div className="sk-block" style={{ width: 140, height: 14, margin: '0 auto 20px' }} />
            <div className="sk-block" style={{ width: 260, height: 14, margin: '0 auto 24px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 18 }}>
                <div className="sk-block" style={{ width: 60, height: 40 }} />
                <div className="sk-block" style={{ width: 60, height: 40 }} />
                <div className="sk-block" style={{ width: 60, height: 40 }} />
            </div>
        </div>
    );
}

export default function SkeletonLoader({ type = 'feed', count = 3 }) {
    const items = Array.from({ length: count });

    if (type === 'post') return <PostSkeleton />;
    if (type === 'profile') return <ProfileSkeleton />;
    if (type === 'comment') return (
        <div>{items.map((_, i) => <CommentSkeleton key={i} />)}</div>
    );

    // default: feed
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((_, i) => (
                <FeedCardSkeleton key={i} withImage={i % 2 === 0} />
            ))}
        </div>
    );
}
