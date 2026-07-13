// audit logs tab — recent admin actions
import { useState, useEffect } from 'react';
import { adminFetch } from './adminApi.js';
import { T } from './theme.js';

export default function AuditLogsTab() {
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        adminFetch('/api/admin/logs')
            .then(res => setLogs(res.data))
            .catch(err => setError(err.message));
    }, []);

    if (error) {
        return <div style={{ color: T.danger, fontSize: '0.85rem' }}>Failed to load logs: {error}</div>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', background: 'transparent', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                    <tr style={{ borderBottom: `1px solid ${T.borderMid}`, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Timestamp</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Action</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Target ID</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Details</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, color: T.textSecondary, transition: 'background 0.1s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                            <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: '0.72rem' }}>{log.action}</span>
                            </td>
                            <td style={{ padding: '8px 12px' }}>{log.target_id ?? '-'}</td>
                            <td style={{ padding: '8px 12px', color: T.textMuted }}>{log.details || '-'}</td>
                        </tr>
                    ))}
                    {logs.length === 0 && (
                        <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: T.textMuted }}>No audit log entries yet.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
