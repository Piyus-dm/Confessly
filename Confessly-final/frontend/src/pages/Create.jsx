import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import UploadOverlay from '../components/UploadOverlay.jsx';
import { apiUrl } from '../api.js';
import '../styles/global.css';
import '../styles/feed.css';
import '../styles/create.css';

// ids match the categories table in the db
const CATEGORIES = [
    { id: 1,  name: 'Rant' },
    { id: 2,  name: 'Confession' },
    { id: 3,  name: 'NSFW' },
    { id: 4,  name: 'Sarcasm' },
    { id: 5,  name: 'Advice' },
    { id: 6,  name: 'Story' },
    { id: 7,  name: 'Question' },
    { id: 8,  name: 'Nostalgia' },
];

export default function Create() {
    const navigate     = useNavigate();
    const fileInputRef = useRef(null);
    const dropdownRef = useRef(null);

    const [title,      setTitle]      = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [content,    setContent]    = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState('');

    const [imageFile,  setImageFile]  = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    useEffect(() => {
        function handleClick(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsCategoryOpen(false);
            }
        }
        if (isCategoryOpen) {
            document.addEventListener('mousedown', handleClick);
        }
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isCategoryOpen]);

    function attachFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }

    function handleFileChange(e) {
        attachFile(e.target.files[0]);
        e.target.value = '';
    }

    function clearImage() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setImageFile(null);
        setPreviewUrl('');
    }

    function handleDragOver(e) {
        e.preventDefault();
        setIsDragging(true);
    }
    function handleDragLeave(e) {
        e.preventDefault();
        setIsDragging(false);
    }
    function handleDrop(e) {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        attachFile(file);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        const formData = new FormData();
        formData.append('title',       title.trim());
        formData.append('content',     content.trim());
        formData.append('category_id', categoryId);
        if (imageFile) formData.append('image', imageFile);

        try {
            const res = await fetch(apiUrl('/api/confessions'), {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const result = await res.json();
            if (res.ok) {
                navigate('/feed');
            } else {
                setError(result.message || 'Something went wrong.');
                setSubmitting(false);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to connect. Is the server running?');
            setSubmitting(false);
        }
    }

    const canSubmit = !submitting && title.trim() && content.trim() && categoryId;

    return (
        <div className="app-body">
            <UploadOverlay visible={submitting} />

            <header className="app-header">
                <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                </button>
                <h1 className="create-header-title">New Confession</h1>
                <div style={{ width: 36 }} aria-hidden="true" />
            </header>

            <main className="create-container">
                <form className="create-form" onSubmit={handleSubmit} noValidate>
                    <div className="cg">
                        <label htmlFor="cf-title" className="cg-label">Title</label>
                        <input
                            id="cf-title"
                            className="cg-input"
                            type="text"
                            placeholder="Give it a title…"
                            autoComplete="off"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="cg">
                        <label className="cg-label">Category</label>
                        <div className="cg-dropdown-wrap" ref={dropdownRef}>
                            <button
                                type="button"
                                className={`cg-dropdown-trigger${!categoryId ? ' cg-dropdown-placeholder' : ''}`}
                                onClick={() => setIsCategoryOpen(o => !o)}
                                aria-haspopup="listbox"
                                aria-expanded={isCategoryOpen}
                            >
                                {categoryId
                                    ? CATEGORIES.find(c => c.id === Number(categoryId))?.name || 'Select a category'
                                    : 'Select a category'
                                }
                                <svg className={`cg-chevron${isCategoryOpen ? ' cg-chevron-open' : ''}`}
                                    width="13" height="13" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                    strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {isCategoryOpen && (
                                <ul className="cg-dropdown-list" role="listbox" aria-label="Select a category">
                                    {CATEGORIES.map(cat => (
                                        <li
                                            key={cat.id}
                                            role="option"
                                            aria-selected={Number(categoryId) === cat.id}
                                            className={`cg-dropdown-item${Number(categoryId) === cat.id ? ' cg-dropdown-item-selected' : ''}`}
                                            onClick={() => {
                                                setCategoryId(String(cat.id));
                                                setIsCategoryOpen(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setCategoryId(String(cat.id));
                                                    setIsCategoryOpen(false);
                                                }
                                            }}
                                            tabIndex={0}
                                        >
                                            {cat.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="cg">
                        <label htmlFor="cf-content" className="cg-label">Confession</label>
                        <textarea
                            id="cf-content"
                            className="cg-input cg-textarea"
                            placeholder="Share your story anonymously…"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>

                    <div className="cg">
                        <label className="cg-label">Attach Image <span className="cg-label-opt">(optional)</span></label>
                        <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleFileChange} />
                        {!previewUrl && (
                            <div
                                className={`cg-dropzone${isDragging ? ' cg-dropzone-active' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                role="button"
                                tabIndex={0}
                                aria-label="Upload image"
                                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                            >
                                <div className="cg-drop-icon">
                                    <svg width="20" height="20" fill="none" stroke="currentColor"
                                        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                                        viewBox="0 0 24 24" aria-hidden="true">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                </div>
                                <p className="cg-drop-primary">Click to upload or drag and drop</p>
                                <p className="cg-drop-secondary">PNG, JPG, GIF up to 5MB</p>
                            </div>
                        )}
                        {previewUrl && (
                            <div className="cg-preview">
                                <img src={previewUrl} alt="Preview" />
                                <button type="button" className="cg-preview-close" onClick={clearImage} aria-label="Remove image">
                                    <svg width="12" height="12" fill="none" stroke="currentColor"
                                        strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                                <button type="button" className="cg-preview-replace" onClick={() => fileInputRef.current?.click()} aria-label="Replace image">
                                    Replace
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="create-error" role="alert">
                            <svg width="14" height="14" fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="create-submit" disabled={!canSubmit} aria-disabled={!canSubmit}>
                        {submitting ? (
                            <span className="create-spinner" aria-hidden="true" />
                        ) : (
                            <>
                                <svg width="16" height="16" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                                    <path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z" />
                                    <path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z" />
                                </svg>
                                Post Confession
                            </>
                        )}
                    </button>
                </form>
            </main>

            <BottomNav />
        </div>
    );
}
