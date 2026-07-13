// admin panel theme — inherits the main app's design tokens from global.css

export const T = {
    font: 'var(--font)',

    // dark gray surfaces
    bg: '#121212',
    surface: '#1a1a1a',
    surfaceHover: '#222222',
    input: '#161616',

    border: 'var(--border)',
    borderMid: 'var(--border-mid)',

    text: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textMuted: 'var(--text-muted)',

    accent: 'var(--accent)',
    danger: 'var(--like)',
};

// shared style fragments
export const card = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
};

export const sectionLabel = {
    color: T.textSecondary,
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 16,
};

// neutral bordered button
export function ghostBtn(disabled = false) {
    return {
        padding: '6px 14px',
        borderRadius: 6,
        background: 'transparent',
        border: `1px solid ${T.borderMid}`,
        color: T.textSecondary,
        fontSize: '0.72rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.12s, color 0.12s',
    };
}

// white primary button
export function primaryBtn(disabled = false) {
    return {
        padding: '8px 20px',
        borderRadius: 8,
        background: T.accent,
        color: 'var(--text-inverse)',
        border: 'none',
        fontSize: '0.78rem',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
    };
}

// red destructive button
export function dangerBtn(disabled = false) {
    return {
        padding: '6px 14px',
        borderRadius: 6,
        background: 'var(--like-bg)',
        border: '1px solid rgba(255, 71, 87, 0.25)',
        color: T.danger,
        fontSize: '0.72rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.12s',
    };
}
