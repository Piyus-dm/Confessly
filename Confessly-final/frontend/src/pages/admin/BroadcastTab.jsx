// broadcast tab — send a global announcement
import { useState } from 'react';
import { adminPost } from './adminApi.js';
import { T, sectionLabel, primaryBtn } from './theme.js';

export default function BroadcastTab() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) { setError('Title and message are required'); return; }
        setSending(true);
        setError(null);
        setDone(false);
        try {
            await adminPost('/api/admin/announce', { title: title.trim(), message: message.trim() });
            setDone(true);
            setTitle('');
            setMessage('');
        } catch (e) {
            setError(e.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <div style={{ ...sectionLabel, marginBottom: 20 }}>Send Global Announcement</div>

            <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                    type="text"
                    value={title}
                    onChange={e => { setTitle(e.target.value); setError(null); setDone(false); }}
                    placeholder="Announcement title..."
                    className="premium-input"
                />
                <textarea
                    value={message}
                    onChange={e => { setMessage(e.target.value); setError(null); setDone(false); }}
                    placeholder="Write your broadcast message..."
                    rows={5}
                    className="premium-input"
                    style={{ resize: 'vertical', minHeight: 100 }}
                />
                {error && <div style={{ color: T.danger, fontSize: '0.78rem' }}>{error}</div>}
                {done && (
                    <div style={{ color: T.text, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Announcement sent — it will appear in every user's notifications.
                    </div>
                )}
                <button onClick={handleSend} disabled={sending}
                    style={{ ...primaryBtn(sending), alignSelf: 'flex-start', padding: '10px 24px', fontSize: '0.82rem' }}>
                    {sending ? 'Sending...' : 'Send Announcement'}
                </button>
            </div>
        </div>
    );
}
