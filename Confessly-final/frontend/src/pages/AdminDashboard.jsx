// admin dashboard — layout shell, each tab lives in pages/admin/
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from './admin/theme.js';
import OverviewTab from './admin/OverviewTab.jsx';
import ReportsTab from './admin/ReportsTab.jsx';
import ContentFilterTab from './admin/ContentFilterTab.jsx';
import SuspendedUsersTab from './admin/SuspendedUsersTab.jsx';
import BroadcastTab from './admin/BroadcastTab.jsx';
import AuditLogsTab from './admin/AuditLogsTab.jsx';

const SIDEBAR_ITEMS = [
    { key: 'overview',       label: 'Dashboard',       Component: OverviewTab },
    { key: 'reports',        label: 'User Reports',    Component: ReportsTab },
    { key: 'content-filter', label: 'Content Filter',  Component: ContentFilterTab },
    { key: 'suspended',      label: 'Suspended Users', Component: SuspendedUsersTab },
    { key: 'broadcast',      label: 'Broadcast',       Component: BroadcastTab },
    { key: 'audit-logs',     label: 'Audit Logs',      Component: AuditLogsTab },
];

export default function AdminDashboard() {
    const [activeSection, setActiveSection] = useState('overview');
    const navigate = useNavigate();
    const active = SIDEBAR_ITEMS.find(i => i.key === activeSection) || SIDEBAR_ITEMS[0];
    const ActiveComponent = active.Component;

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: T.bg,
            color: T.text,
            fontFamily: T.font,
        }}>
            {/* sidebar */}
            <aside style={{
                width: 220,
                flexShrink: 0,
                borderRight: `1px solid ${T.border}`,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 12px',
                gap: 2,
            }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px 20px' }}>
                    Confessly /HQ
                </div>
                {SIDEBAR_ITEMS.map(item => (
                    <button key={item.key}
                        onClick={() => setActiveSection(item.key)}
                        style={{
                            display: 'block', width: '100%', padding: '9px 14px', borderRadius: 8,
                            background: activeSection === item.key ? T.surface : 'transparent',
                            border: '1px solid', borderColor: activeSection === item.key ? T.borderMid : 'transparent',
                            color: activeSection === item.key ? T.text : T.textSecondary,
                            fontSize: '0.8rem', fontWeight: 500, textAlign: 'left', cursor: 'pointer',
                            outline: 'none', transition: 'background 0.12s, color 0.12s',
                            fontFamily: T.font,
                        }}
                        onMouseEnter={e => { if (activeSection !== item.key) { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.text; } }}
                        onMouseLeave={e => { if (activeSection !== item.key) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; } }}>
                        {item.label}
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                <button onClick={() => navigate('/feed')}
                    style={{
                        width: '100%', padding: '9px 14px', borderRadius: 8, background: 'transparent',
                        border: `1px solid ${T.border}`, color: T.textMuted, fontSize: '0.76rem', fontWeight: 500,
                        textAlign: 'center', cursor: 'pointer', transition: 'background 0.12s',
                        fontFamily: T.font,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.textSecondary; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; }}>
                    ← Back to app
                </button>
            </aside>

            {/* content */}
            <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
                <div style={{ marginBottom: 28, borderBottom: `1px solid ${T.border}`, paddingBottom: 14 }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: T.text, letterSpacing: '-0.02em', margin: 0 }}>
                        {active.label}
                    </h1>
                </div>
                <ActiveComponent />
            </main>
        </div>
    );
}
