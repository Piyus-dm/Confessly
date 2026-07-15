import { useEffect, useState } from 'react';

const PHRASES = [
    'Uploading…',
    'Crunching pixels…',
    'Summoning data…',
    'Weaving magic…',
    'Almost there…',
    'Talking to the cloud…',
];

export default function UploadOverlay({ visible }) {
    const [phraseIdx, setPhraseIdx] = useState(0);

    useEffect(() => {
        if (!visible) return;
        setPhraseIdx(Math.floor(Math.random() * PHRASES.length));
        const interval = setInterval(() => {
            setPhraseIdx(i => (i + 1) % PHRASES.length);
        }, 1600);
        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    return (
        <div className="upload-overlay" role="status" aria-live="polite">
            <div className="upload-overlay-spinner" aria-hidden="true" />
            <p className="upload-overlay-text">{PHRASES[phraseIdx]}</p>
        </div>
    );
}
