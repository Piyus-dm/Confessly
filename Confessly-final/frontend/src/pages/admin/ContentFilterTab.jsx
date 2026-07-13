// content filter tab — blacklist word management
import { useState, useEffect, useCallback } from 'react';
import { adminFetch, adminPost, adminDelete } from './adminApi.js';
import { T, card, sectionLabel, primaryBtn } from './theme.js';

export default function ContentFilterTab() {
    const [words, setWords] = useState([]);
    const [newWord, setNewWord] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState({});

    const load = useCallback(() => {
        adminFetch('/api/admin/blacklist')
            .then(res => setWords(Array.isArray(res.data) ? res.data : []))
            .catch(err => setError(err.message));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        const word = newWord.trim().toLowerCase();
        if (!word || word.length < 2) { setError('Word must be at least 2 characters'); return; }
        setBusy(prev => ({ ...prev, add: true }));
        try {
            await adminPost('/api/admin/blacklist', { word });
            setNewWord('');
            setError(null);
            load();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(prev => ({ ...prev, add: false }));
        }
    };

    const handleRemove = async (wordId) => {
        setBusy(prev => ({ ...prev, [`rm_${wordId}`]: true }));
        try {
            await adminDelete(`/api/admin/blacklist/${wordId}`);
            load();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(prev => ({ ...prev, [`rm_${wordId}`]: false }));
        }
    };

    if (error && !words.length) {
        return <div style={{ color: T.danger, fontSize: '0.85rem' }}>Failed to load filter: {error}</div>;
    }

    return (
        <div>
            <div style={sectionLabel}>Manage Blacklisted Words</div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <input
                    type="text"
                    value={newWord}
                    onChange={e => { setNewWord(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Enter a word to block..."
                    className="premium-input"
                    style={{ maxWidth: 320 }}
                />
                <button onClick={handleAdd} disabled={busy.add || !newWord.trim()}
                    style={primaryBtn(busy.add || !newWord.trim())}>
                    {busy.add ? 'Adding...' : 'Add Word'}
                </button>
            </div>
            {error && <div style={{ color: T.danger, fontSize: '0.78rem', marginBottom: 12 }}>{error}</div>}

            {words.length === 0 ? (
                <div style={{ color: T.textSecondary, fontSize: '0.82rem', padding: 24, textAlign: 'center' }}>
                    No blacklisted words yet. Add words to filter inappropriate content.
                </div>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {words.map(w => (
                        <div key={w.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            ...card, borderRadius: 8,
                            padding: '6px 12px', fontSize: '0.82rem', color: T.text,
                        }}>
                            <span style={{ color: T.textMuted, fontSize: '0.65rem', fontWeight: 600 }}>#{w.id}</span>
                            <span>{w.word}</span>
                            <button onClick={() => handleRemove(w.id)} disabled={busy[`rm_${w.id}`]}
                                style={{
                                    background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer',
                                    padding: '2px', fontSize: '0.85rem', lineHeight: 1, opacity: busy[`rm_${w.id}`] ? 0.3 : 1,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--like)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                                title="Remove word">
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
