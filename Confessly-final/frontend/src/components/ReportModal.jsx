import { useState } from 'react';
import { apiFetch } from '../api';

const REASONS = [
    'Spam',
    'Harassment',
    'Hate Speech',
    'NSFW / Inappropriate',
    'Misinformation',
    'Other',
];

export default function ReportModal({ isOpen, onClose, postId, postTitle }) {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        if (!reason) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await apiFetch('/api/reports', {
                method: 'POST',
                body: JSON.stringify({ post_id: postId, reason, description }),
            });
            const data = await res.json();
            if (res.ok) {
                setDone(true);
            } else {
                setError(data.message || 'Failed to submit report');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        setReason('');
        setDescription('');
        setDone(false);
        setError(null);
        onClose();
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5000,
                padding: 20,
            }}
            onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div style={{
                background: '#0a0a0a',
                border: '1px solid #191919',
                borderRadius: 16,
                padding: '24px 28px',
                maxWidth: 440,
                width: '100%',
                color: '#ededed',
            }}>
                {done ? (
                    <>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600 }}>
                            Report Submitted
                        </h3>
                        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20 }}>
                            Thank you. Our moderation team will review this post.
                        </p>
                        <button
                            onClick={handleClose}
                            style={{
                                background: '#fff',
                                color: '#000',
                                border: 'none',
                                borderRadius: 8,
                                padding: '10px 24px',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                            }}
                        >
                            Close
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                                Report Post
                            </h3>
                            <button
                                onClick={handleClose}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#666',
                                    fontSize: '1.3rem',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                    padding: '0 4px',
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {postTitle && (
                            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 16, fontStyle: 'italic' }}>
                                "{postTitle.length > 80 ? postTitle.slice(0, 80) + '…' : postTitle}"
                            </p>
                        )}

                        <form onSubmit={handleSubmit}>
                            <label style={{ display: 'block', color: '#888', fontSize: '0.72rem', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Reason
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                                {REASONS.map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setReason(r)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: 20,
                                            background: reason === r ? '#ffffff' : 'transparent',
                                            border: '1px solid',
                                            borderColor: reason === r ? '#ffffff' : '#2a2a2a',
                                            color: reason === r ? '#000' : '#888',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'background 0.1s, color 0.1s',
                                        }}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <label style={{ display: 'block', color: '#888', fontSize: '0.72rem', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Description (optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Tell us more about why this post violates the rules…"
                                rows={3}
                                style={{
                                    width: '100%',
                                    background: '#050505',
                                    border: '1px solid #191919',
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    color: '#ededed',
                                    fontSize: '0.82rem',
                                    resize: 'vertical',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    marginBottom: 18,
                                }}
                            />

                            {error && (
                                <p style={{ color: '#e55', fontSize: '0.78rem', marginBottom: 12 }}>{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={!reason || submitting}
                                style={{
                                    background: !reason ? '#222' : '#fff',
                                    color: !reason ? '#555' : '#000',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '10px 24px',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: !reason || submitting ? 'not-allowed' : 'pointer',
                                    opacity: submitting ? 0.6 : 1,
                                }}
                            >
                                {submitting ? 'Submitting…' : 'Submit Report'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
