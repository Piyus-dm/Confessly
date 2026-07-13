import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js';

function timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const sec = Math.floor((now - then) / 1000);
    if (sec < 5) return 'now';
    if (sec < 60) return sec + 's ago';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const day = Math.floor(hr / 24);
    return day + 'd ago';
}

function NotificationCard({ n, onNavigate }) {
    let text = '';
    let link = '';

    /* global admin announcements get a premium card */
    if (n.type === 'announcement') {
        return (
            <div className="notif-card notif-announcement">
                <div className="notif-announce-icon" aria-hidden="true">
                    <svg width="15" height="15" fill="none" stroke="currentColor"
                        strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 11l18-5v12L3 14v-3z" />
                        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                    </svg>
                </div>
                <div className="notif-body">
                    <div className="notif-announce-kicker">Announcement</div>
                    <p className="notif-announce-title">{n.title}</p>
                    <p className="notif-announce-message">{n.message}</p>
                    <span className="notif-time">{timeAgo(n.created_at)}</span>
                </div>
            </div>
        );
    }

    switch (n.type) {
        case 'follow':
            text = `@${n.sender_handle} started following you`;
            link = `/user/${n.sender_profile_id}`;
            break;
        case 'new_post':
            text = `@${n.sender_handle} just posted a new confession`;
            link = n.reference_id ? `/post/${n.reference_id}` : '#';
            break;
        case 'like':
            text = `@${n.sender_handle} liked your confession`;
            link = n.reference_id ? `/post/${n.reference_id}` : '#';
            break;
        case 'comment':
            text = `@${n.sender_handle} commented on your confession`;
            link = n.reference_id ? `/post/${n.reference_id}` : '#';
            break;
        case 'reply':
            text = `@${n.sender_handle} replied to your comment`;
            link = n.reference_id ? `/post/${n.reference_id}` : '#';
            break;
        default:
            text = `@${n.sender_handle} did something`;
            link = '#';
    }

    return (
        <div
            className={`notif-card${n.is_read ? '' : ' notif-unread'}`}
            onClick={() => { onNavigate(link); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(link); }}
        >
            <div className="notif-avatar-wrap">
                {n.sender_avatar ? (
                    <img src={n.sender_avatar} alt="" className="notif-avatar-img" />
                ) : (
                    <div className="notif-avatar-placeholder">
                        <svg width="14" height="14" fill="none" stroke="currentColor"
                            strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                )}
            </div>
            <div className="notif-body">
                <p className="notif-text">{text}</p>
                <span className="notif-time">{timeAgo(n.created_at)}</span>
            </div>
        </div>
    );
}

export default function NotificationPanel({ onClose, onMarkRead }) {
    const navigate = useNavigate();
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            const res = await apiFetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifs(data.data || []);
            }
        } catch { /* ignore */ }
        setLoading(false);
    }

    useEffect(() => {
        load();
        // Mark as read immediately
        apiFetch('/api/notifications/mark-read', { method: 'POST' }).catch(() => {});
        if (onMarkRead) setTimeout(onMarkRead, 100);
    }, []);

    function handleNavigate(path) {
        onClose();
        navigate(path);
    }

    return (
        <div className="notif-panel-inner">
            <div className="notif-panel-header">
                <h3>Notifications</h3>
            </div>

            <div className="notif-list">
                {loading && (
                    <div className="notif-loading">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="notif-skeleton">
                                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                                <div className="notif-skel-body">
                                    <div className="skeleton" style={{ width: '70%', height: 12 }} />
                                    <div className="skeleton" style={{ width: '40%', height: 10, marginTop: 6 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && notifs.length === 0 && (
                    <div className="notif-empty">
                        <div className="notif-empty-icon">
                            <svg width="28" height="28" fill="none" stroke="currentColor"
                                strokeWidth="1.5" viewBox="0 0 24 24">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>
                        <p className="notif-empty-title">No notifications yet.</p>
                        <p className="notif-empty-sub">
                            When someone follows you or posts a confession, it will show up here.
                        </p>
                    </div>
                )}

                {!loading && notifs.map(n => (
                    <NotificationCard key={n.id} n={n} onNavigate={handleNavigate} />
                ))}
            </div>
        </div>
    );
}
