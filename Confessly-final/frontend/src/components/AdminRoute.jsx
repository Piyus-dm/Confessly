import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';

// only lets admins through, fakes a 404 for everyone else so the route
// doesn't even look like it exists
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
        // fake 404 so non-admins don't know this route exists
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
