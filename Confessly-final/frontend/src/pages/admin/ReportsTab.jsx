// user reports tab — review queue with dismiss / suspend / shadowban / delete
import { useState, useEffect, useCallback } from 'react';
import { adminFetch, adminPost, adminDelete } from './adminApi.js';
import { T, card, ghostBtn, dangerBtn, primaryBtn } from './theme.js';

export default function ReportsTab() {
    const [reports, setReports] = useState([]);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState({});
    const [previewImg, setPreviewImg] = useState(null);
    const [suspendTarget, setSuspendTarget] = useState(null); // { userId, reportId }
    const [suspendValue, setSuspendValue] = useState(7);
    const [suspendUnit, setSuspendUnit] = useState('days');

    const load = useCallback(() => {
        adminFetch('/api/admin/reports')
            .then(res => setReports(res.data))
            .catch(err => setError(err.message));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (postId, reportId) => {
        setBusy(prev => ({ ...prev, [`delete_${postId}`]: true }));
        try {
            await adminPost('/api/admin/actions/delete_post', { post_id: postId });
            setReports(prev => prev.filter(r => r.report_id !== reportId));
        } catch (e) {
            alert(`Failed: ${e.message}`);
        } finally {
            setBusy(prev => ({ ...prev, [`delete_${postId}`]: false }));
        }
    };

    const handleShadowban = async (userId, reportId) => {
        setBusy(prev => ({ ...prev, [`sb_${userId}`]: true }));
        try {
            await adminPost('/api/admin/actions/shadowban', { user_id: userId, status: true });
            setReports(prev => prev.filter(r => r.report_id !== reportId));
        } catch (e) {
            alert(`Failed: ${e.message}`);
        } finally {
            setBusy(prev => ({ ...prev, [`sb_${userId}`]: false }));
        }
    };

    const handleDismiss = async (reportId) => {
        setBusy(prev => ({ ...prev, [`dismiss_${reportId}`]: true }));
        try {
            await adminDelete(`/api/admin/reports/${reportId}`);
            setReports(prev => prev.filter(r => r.report_id !== reportId));
        } catch (e) {
            alert(`Failed: ${e.message}`);
        } finally {
            setBusy(prev => ({ ...prev, [`dismiss_${reportId}`]: false }));
        }
    };

    const handleSuspend = async () => {
        if (!suspendTarget) return;
        const { userId, reportId } = suspendTarget;
        const value = parseInt(suspendValue, 10);
        if (!value || value <= 0) { alert('Enter a valid duration'); return; }
        setBusy(prev => ({ ...prev, [`suspend_${userId}`]: true }));
        try {
            await adminPost('/api/admin/actions/suspend_user', {
                user_id: userId,
                duration_value: value,
                duration_unit: suspendUnit,
            });
            setReports(prev => prev.filter(r => r.report_id !== reportId));
            setSuspendTarget(null);
        } catch (e) {
            alert(`Failed: ${e.message}`);
        } finally {
            setBusy(prev => ({ ...prev, [`suspend_${userId}`]: false }));
        }
    };

    if (error) {
        return <div style={{ color: T.danger, fontSize: '0.85rem' }}>Failed to load reports: {error}</div>;
    }

    if (reports.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 16 }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
                <div style={{ color: T.textSecondary, fontSize: '0.95rem', fontWeight: 600 }}>All quiet! No reports pending.</div>
                <div style={{ color: T.textMuted, fontSize: '0.78rem' }}>Reported posts will appear here for moderation.</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
                ...card,
                borderRadius: 10,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.78rem',
                color: T.textSecondary,
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span><strong style={{ color: T.text }}>{reports.length}</strong> pending review</span>
            </div>

            {reports.map(r => (
                <div key={r.report_id} style={{ ...card, overflow: 'hidden', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = ''; }}>
                    {/* badges */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '14px 16px 0' }}>
                        <span style={{ color: T.textSecondary, fontSize: '0.67rem', background: T.bg, padding: '2px 8px', borderRadius: 4, border: `1px solid ${T.border}` }}>
                            Reporter #{r.reporter_user_id}
                        </span>
                        <span style={{ color: T.textSecondary, fontSize: '0.67rem', background: T.bg, padding: '2px 8px', borderRadius: 4, border: `1px solid ${T.border}` }}>
                            Author #{r.post_author_user_id || '?'}
                        </span>
                        <span style={{
                            color: T.text,
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            background: T.bg,
                            padding: '2px 10px',
                            borderRadius: 4,
                            border: `1px solid ${T.borderMid}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                        }}>
                            {r.reason}
                        </span>
                        <div style={{ flex: 1, minWidth: 4 }} />
                        <span style={{ color: T.textMuted, fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                            {r.report_created_at ? new Date(r.report_created_at).toLocaleString() : ''}
                        </span>
                    </div>

                    {/* content + image */}
                    <div style={{ display: 'flex', gap: 14, padding: '12px 16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: T.text, fontSize: '0.85rem', fontWeight: 600, marginBottom: 3, lineHeight: 1.35 }}>
                                {r.post_title || <span style={{ fontStyle: 'italic', color: T.textMuted, fontWeight: 400 }}>(untitled)</span>}
                            </div>
                            {r.post_content && (
                                <div style={{
                                    color: T.textSecondary, fontSize: '0.76rem', lineHeight: 1.5, marginBottom: r.report_description ? 8 : 0,
                                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                    {r.post_content}
                                </div>
                            )}
                            {r.report_description && (
                                <div style={{
                                    marginTop: 8, padding: '8px 12px', background: T.bg,
                                    borderLeft: `2px solid ${T.borderMid}`, borderRadius: '0 6px 6px 0',
                                }}>
                                    <div style={{ color: T.textMuted, fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                                        Reporter's Notes:
                                    </div>
                                    <div style={{ color: T.textSecondary, fontSize: '0.76rem', lineHeight: 1.45, fontStyle: 'italic' }}>
                                        &ldquo;{r.report_description}&rdquo;
                                    </div>
                                </div>
                            )}
                        </div>

                        {r.post_image_url && (
                            <div
                                style={{ flexShrink: 0, width: 160, height: 120, borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', position: 'relative' }}
                                onClick={() => setPreviewImg(r.post_image_url)}
                                title="Click to expand"
                            >
                                <img src={r.post_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={e => { e.currentTarget.outerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555;font-size:0.68rem;padding:6px;text-align:center;">Unavailable</div>`; }} />
                            </div>
                        )}
                    </div>

                    {/* actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 16px', borderTop: `1px solid ${T.border}` }}>
                        <button
                            disabled={busy[`dismiss_${r.report_id}`]}
                            onClick={() => handleDismiss(r.report_id)}
                            style={ghostBtn(busy[`dismiss_${r.report_id}`])}
                            onMouseEnter={e => { if (!busy[`dismiss_${r.report_id}`]) e.currentTarget.style.background = T.surfaceHover; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            Dismiss
                        </button>
                        <button
                            disabled={busy[`suspend_${r.post_author_user_id || r.reporter_user_id}`]}
                            onClick={() => { setSuspendValue(7); setSuspendUnit('days'); setSuspendTarget({ userId: r.post_author_user_id || r.reporter_user_id, reportId: r.report_id }); }}
                            style={ghostBtn(busy[`suspend_${r.post_author_user_id || r.reporter_user_id}`])}
                            onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.text; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; }}>
                            Suspend User
                        </button>
                        <button
                            disabled={busy[`sb_${r.post_author_user_id || r.reporter_user_id}`]}
                            onClick={() => handleShadowban(r.post_author_user_id || r.reporter_user_id, r.report_id)}
                            style={ghostBtn(busy[`sb_${r.post_author_user_id || r.reporter_user_id}`])}
                            onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.text; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; }}>
                            Shadowban
                        </button>
                        <button
                            disabled={busy[`delete_${r.post_id}`]}
                            onClick={() => handleDelete(r.post_id, r.report_id)}
                            style={dangerBtn(busy[`delete_${r.post_id}`])}
                            onMouseEnter={e => { if (!busy[`delete_${r.post_id}`]) e.currentTarget.style.background = 'rgba(255, 71, 87, 0.16)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--like-bg)'; }}>
                            Delete Post
                        </button>
                    </div>
                </div>
            ))}

            {previewImg && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', animation: 'fadeIn 0.15s ease' }}
                    onClick={() => setPreviewImg(null)}>
                    <img src={previewImg} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
                    <div style={{ position: 'absolute', top: 20, right: 28, color: T.textSecondary, cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setPreviewImg(null)}>✕</div>
                </div>
            )}

            {suspendTarget && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.15s ease' }}
                    onClick={() => setSuspendTarget(null)}>
                    <div style={{ ...card, padding: '24px 26px', width: 340, maxWidth: '90vw' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ color: T.text, fontSize: '0.95rem', fontWeight: 700, marginBottom: 6 }}>
                            Suspend User #{suspendTarget.userId}
                        </div>
                        <div style={{ color: T.textSecondary, fontSize: '0.76rem', lineHeight: 1.5, marginBottom: 18 }}>
                            Choose how long this user should be suspended. They will be unable to log in until the suspension expires.
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            <input
                                type="number"
                                min="1"
                                value={suspendValue}
                                onChange={e => setSuspendValue(e.target.value)}
                                style={{
                                    width: 90, padding: '8px 12px', borderRadius: 8, background: T.input,
                                    border: `1px solid ${T.borderMid}`, color: T.text, fontSize: '0.85rem', outline: 'none',
                                    fontFamily: T.font,
                                }}
                            />
                            <select
                                value={suspendUnit}
                                onChange={e => setSuspendUnit(e.target.value)}
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: 8, background: T.input,
                                    border: `1px solid ${T.borderMid}`, color: T.text, fontSize: '0.85rem', outline: 'none', cursor: 'pointer',
                                    fontFamily: T.font,
                                }}>
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setSuspendTarget(null)} style={ghostBtn()}>
                                Cancel
                            </button>
                            <button
                                disabled={busy[`suspend_${suspendTarget.userId}`]}
                                onClick={handleSuspend}
                                style={{ ...primaryBtn(busy[`suspend_${suspendTarget.userId}`]), padding: '7px 16px', fontSize: '0.75rem' }}>
                                {busy[`suspend_${suspendTarget.userId}`] ? 'Suspending...' : 'Confirm Suspension'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
