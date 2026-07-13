// instagram-style follow control: Follow / Follow back / Following (-> Unfollow on hover)
import { useState } from 'react';
import { apiFetch } from '../api.js';

export default function FollowButton({
    profileId,
    initialFollowing = false,
    followsYou = false,
    onChange,
    size = 'md',
}) {
    const [following, setFollowing] = useState(initialFollowing);
    const [busy, setBusy] = useState(false);
    const [hovering, setHovering] = useState(false);

    async function toggle(e) {
        e.stopPropagation();
        e.preventDefault();
        if (busy) return;

        const next = !following;
        setBusy(true);
        setFollowing(next); // optimistic

        try {
            const res = await apiFetch(
                `/api/users/${profileId}/${next ? 'follow' : 'unfollow'}`,
                { method: 'POST' },
            );
            const data = await res.json();
            if (!res.ok) {
                setFollowing(!next); // roll back
            } else if (onChange) {
                onChange(next, data.followers_count);
            }
        } catch {
            setFollowing(!next);
        } finally {
            setBusy(false);
        }
    }

    let label;
    if (following) label = hovering ? 'Unfollow' : 'Following';
    else if (followsYou) label = 'Follow back';
    else label = 'Follow';

    const cls = [
        'cf-follow-btn',
        `cf-follow-${size}`,
        following ? 'is-following' : 'is-not-following',
        following && hovering ? 'is-unfollow-hover' : '',
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={cls}
            onClick={toggle}
            disabled={busy}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            aria-pressed={following}
        >
            {label}
        </button>
    );
}
