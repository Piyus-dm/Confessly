// overview tab — stat cards + 7-day engagement chart
import { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { adminFetch } from './adminApi.js';
import { T, card, sectionLabel } from './theme.js';

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload) return null;
    return (
        <div style={{ ...card, borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ color: T.textSecondary, fontSize: '0.7rem', marginBottom: 4 }}>{label}</div>
            {payload.map((entry, i) => (
                <div key={i} style={{ color: entry.color, fontSize: '0.82rem' }}>
                    {entry.name}: {entry.value}
                </div>
            ))}
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div style={{ ...card, padding: '20px 18px' }}>
            <div style={{ color: T.textMuted, fontSize: '0.75rem', fontWeight: 500, marginBottom: 6 }}>
                {label}
            </div>
            <div style={{ color: T.text, fontSize: '1.7rem', fontWeight: 700 }}>
                {value ?? <div className="skeleton" style={{ width: '40%', height: 22, borderRadius: 6 }} />}
            </div>
        </div>
    );
}

export default function OverviewTab() {
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [chartLoading, setChartLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        adminFetch('/api/admin/stats')
            .then(res => setStats(res.data))
            .catch(err => setError(err.message));
    }, []);

    useEffect(() => {
        adminFetch('/api/admin/chart_stats')
            .then(res => setChartData(res.data))
            .catch(err => setError(err.message))
            .finally(() => setChartLoading(false));
    }, []);

    if (error) {
        return <div style={{ color: T.danger, fontSize: '0.85rem' }}>Failed to load stats: {error}</div>;
    }

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                marginBottom: 36,
            }}>
                <StatCard label="Total Users"       value={stats?.total_users} />
                <StatCard label="Total Posts"       value={stats?.total_posts} />
                <StatCard label="Pending Reports"   value={stats?.total_pending_reports} />
                <StatCard label="Suspended Users"   value={stats?.banned_users} />
            </div>

            <div style={{ ...card, padding: '24px 20px 12px' }}>
                <div style={sectionLabel}>Engagement (Last 7 Days)</div>
                {chartLoading ? (
                    <div className="skeleton" style={{ width: '60%', height: 200, borderRadius: 8 }} />
                ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData || []} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                        <defs>
                            <linearGradient id="postsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.12} />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.08} />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2a2a2a', strokeWidth: 1 }} />
                        <Area type="monotone" dataKey="posts" stroke="#ffffff" strokeWidth={2} fill="url(#postsGrad)" name="Posts" dot={false} activeDot={{ r: 4, fill: '#fff', stroke: '#121212', strokeWidth: 2 }} />
                        <Area type="monotone" dataKey="users" stroke="#a3a3a3" strokeWidth={1.5} fill="url(#usersGrad)" name="New Users" dot={false} activeDot={{ r: 4, fill: '#a3a3a3', stroke: '#121212', strokeWidth: 2 }} />
                    </AreaChart>
                </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
