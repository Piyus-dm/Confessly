// 3-dot post menu — shared by the feed card and the detail view so it never
// goes missing in one of them. owner sees delete, everyone else report/block.
import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { DotsIcon, TrashIcon, FlagIcon, BlockIcon } from './icons.jsx';

export default function PostMenu({ post, onReportPost, onBlockUser, onDeletePost }) {
    const { user } = useUser();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const isOwnPost = !!user && (
        (post?.user_id != null && user.user_id === post.user_id) ||
        (post?.profile_id != null && user.profile_id === post.profile_id)
    );

    // close on outside click
    useEffect(() => {
        if (!open) return;
        function onDocClick(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        }
        function onEsc(e) { if (e.key === 'Escape') setOpen(false); }
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, [open]);

    // nothing actionable? then don't render a dead button
    const canDelete = isOwnPost && !!onDeletePost;
    const canReport = !isOwnPost && !!onReportPost;
    const canBlock = !isOwnPost && !!onBlockUser;
    if (!canDelete && !canReport && !canBlock) return null;

    function run(fn) {
        return (e) => {
            e.stopPropagation();
            setOpen(false);
            fn();
        };
    }

    return (
        <div className="pm-wrap" ref={wrapRef}>
            <button
                type="button"
                className="pm-trigger"
                onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <DotsIcon />
            </button>

            {open && (
                <div className="pm-menu" role="menu" onClick={e => e.stopPropagation()}>
                    {canDelete && (
                        <button type="button" role="menuitem" className="pm-item pm-danger"
                            onClick={run(() => onDeletePost(post.id))}>
                            <TrashIcon />
                            <span>Delete post</span>
                        </button>
                    )}
                    {canReport && (
                        <button type="button" role="menuitem" className="pm-item"
                            onClick={run(() => onReportPost(post.id, post.title))}>
                            <FlagIcon />
                            <span>Report post</span>
                        </button>
                    )}
                    {canBlock && (
                        <button type="button" role="menuitem" className="pm-item pm-danger"
                            onClick={run(() => onBlockUser(post.user_id))}>
                            <BlockIcon />
                            <span>Block user</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
