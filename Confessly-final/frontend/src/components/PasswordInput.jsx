import { useState } from 'react';

export default function PasswordInput({ id, value, onChange, placeholder, autoComplete = 'off', required = false }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="password-input-wrap">
            <input
                id={id}
                type={visible ? 'text' : 'password'}
                placeholder={placeholder}
                autoComplete={autoComplete}
                value={value}
                onChange={onChange}
                required={required}
            />
            <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                tabIndex={-1}
            >
                {visible ? (
                    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                ) : (
                    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                )}
            </button>
        </div>
    );
}
