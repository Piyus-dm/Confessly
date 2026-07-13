import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import NotificationPanel from './NotificationPanel.jsx';
import '../styles/notifications.css';

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const panelRef = useRef(null);
    const btnRef = useRef(null);

    // fetch unread count
    async function fetchUnread() {
        try {
            const res = await apiFetch('/api/notifications/unread-count');
            if (res.ok) {
                const data = await res.json();
                setUnread(data.count);
            }
        } catch { /* ignore */ }
    }

    useEffect(() => {
        fetchUnread();
        const interval = setInterval(fetchUnread, 15000);
        return () => clearInterval(interval);
    }, []);

    // close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClick(e) {
            if (
                panelRef.current && !panelRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div className="notif-bell-wrapper">
            <button
                ref={btnRef}
                className="notif-bell-btn"
                onClick={() => setOpen(o => !o)}
                aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
            >
                <svg width="20" height="20" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    viewBox="0 0 24 24">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && <span className="notif-dot" />}
            </button>

            {open && (
                <div ref={panelRef} className="notif-panel" tabIndex={-1}>
                    <NotificationPanel onClose={() => setOpen(false)} onMarkRead={() => setUnread(0)} />
                </div>
            )}
        </div>
    );
}
