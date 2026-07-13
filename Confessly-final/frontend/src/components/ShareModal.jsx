import { useEffect, useState } from 'react';

export default function ShareModal({ isOpen, onClose, title = 'Confession', url }) {
    const [copied, setCopied] = useState(false);
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    // lock scroll while open
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else        document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // close on esc
    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        if (isOpen) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    function copyLink() {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    function openWhatsApp() {
        window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + shareUrl)}`, '_blank');
    }
    function openTwitter() {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, '_blank');
    }
    function openFacebook() {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    }
    async function openNative() {
        if (navigator.share) {
            try { await navigator.share({ title, url: shareUrl }); }
            catch { /* cancelled */ }
        } else { copyLink(); }
    }

    return (
        <div
            className={`sm-overlay${isOpen ? ' sm-open' : ''}`}
            aria-modal="true"
            role="dialog"
            aria-label="Share confession"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={`sm-sheet${isOpen ? ' sm-sheet-open' : ''}`}>
                {/* drag handle */}
                <div className="sm-handle" />

                {/* header */}
                <div className="sm-header">
                    <span className="sm-title">Share</span>
                    <button className="sm-close icon-btn" onClick={onClose} aria-label="Close share modal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* url preview */}
                <div className="sm-url-bar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span className="sm-url-text">{shareUrl}</span>
                </div>

                {/* share targets */}
                <div className="sm-grid">
                    {/* whatsapp */}
                    <button className="sm-item" onClick={openWhatsApp}>
                        <div className="sm-icon-box sm-wa">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.989.518 3.849 1.421 5.453L2 22l4.653-1.395A9.949 9.949 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2z"/>
                            </svg>
                        </div>
                        <span>WhatsApp</span>
                    </button>

                    {/* twitter */}
                    <button className="sm-item" onClick={openTwitter}>
                        <div className="sm-icon-box sm-x">
                            <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </div>
                        <span>X / Twitter</span>
                    </button>

                    {/* facebook */}
                    <button className="sm-item" onClick={openFacebook}>
                        <div className="sm-icon-box sm-fb">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </div>
                        <span>Facebook</span>
                    </button>

                    {/* copy link */}
                    <button className="sm-item" onClick={copyLink}>
                        <div className={`sm-icon-box sm-copy${copied ? ' sm-copied' : ''}`}>
                            {copied ? (
                                <svg width="18" height="18" fill="none" stroke="currentColor"
                                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            )}
                        </div>
                        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                </div>

                {/* native share */}
                <button className="sm-more-btn" onClick={openNative}>
                    <svg width="15" height="15" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    More options
                </button>
            </div>
        </div>
    );
}
