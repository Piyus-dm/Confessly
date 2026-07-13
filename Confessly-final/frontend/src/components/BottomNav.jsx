import { NavLink, useLocation } from 'react-router-dom';

export default function BottomNav() {
    const { pathname } = useLocation();

    // tapping the tab you're already on scrolls back to the top, like a native app
    function scrollTopIfActive(path) {
        return (e) => {
            if (pathname === path) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
    }

    // clicking home while already on the feed scrolls up and asks the feed to refetch
    function handleHomeClick(e) {
        if (pathname === '/feed') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            window.dispatchEvent(new CustomEvent('confessly:home-refresh'));
        }
    }

    return (
        <nav className="bottom-nav" aria-label="Main navigation">

            <NavLink
                to="/feed"
                onClick={handleHomeClick}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
                <span className="nav-icon-wrap">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                </span>
                <span className="nav-label">Home</span>
            </NavLink>

            <NavLink
                to="/trending"
                onClick={scrollTopIfActive('/trending')}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
                <span className="nav-icon-wrap">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                </span>
                <span className="nav-label">Trending</span>
            </NavLink>

            {/* create button */}
            <NavLink
                to="/create"
                className={({ isActive }) => `nav-item nav-create${isActive ? ' active' : ''}`}
                aria-label="Create confession"
            >
                <span className="nav-fab">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2"
                        strokeLinecap="round" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </span>
            </NavLink>

            <NavLink
                to="/profile"
                onClick={scrollTopIfActive('/profile')}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
                <span className="nav-icon-wrap">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </span>
                <span className="nav-label">Profile</span>
            </NavLink>

        </nav>
    );
}
