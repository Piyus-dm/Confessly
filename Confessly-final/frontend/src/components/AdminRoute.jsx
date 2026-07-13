import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';

/**
 * AdminRoute — hides the admin panel from non-admins.
 *
 * - Renders children ONLY if the user is authenticated AND has role === 'admin'.
 * - If not authenticated: redirects to /login.
 * - If authenticated but not admin: renders a pitch-black 404 page to
 *   disguise the route's existence from regular users.
 */
export default function AdminRoute({ children }) {
    const { user, isAuthenticated, isLoading } = useUser();

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#000',
            }}>
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!user || user.role !== 'admin') {
        // Pitch-black 404 — hides the existence of this route from non-admins
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#000',
                color: '#1a1a1a',
                fontFamily: 'monospace',
                userSelect: 'none',
            }}>
                <span style={{ fontSize: '5rem', fontWeight: 800, letterSpacing: '-0.06em' }}>404</span>
                <span style={{ fontSize: '0.85rem', marginTop: 6 }}>page not found</span>
            </div>
        );
    }

    return children;
}
