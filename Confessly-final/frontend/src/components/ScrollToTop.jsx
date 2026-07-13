// jump to the top on every SPA route change so pages don't open mid-scroll.
// instant (not smooth) here — a smooth animation on navigation feels laggy.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        // let in-page anchors (e.g. /post/1#comments) do their own thing
        if (hash) return;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname, hash]);

    return null;
}
