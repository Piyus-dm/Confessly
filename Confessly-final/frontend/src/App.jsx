import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './context/UserContext.jsx';

import AdminRoute from './components/AdminRoute.jsx';
import Welcome from './pages/Welcome.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SetupUsername from './pages/SetupUsername.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Feed from './pages/Feed.jsx';
import Trending from './pages/Trending.jsx';
import Create from './pages/Create.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Profile from './pages/Profile.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import FollowList from './pages/FollowList.jsx';
import BlockedAccounts from './pages/BlockedAccounts.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';

// Lazy-loaded admin panel — split into separate chunk
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

/**
 * ProtectedRoute — shows a centered loading spinner while auth is resolving,
 * redirects to /login if the user is not authenticated.
 */
function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useUser();
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
    return children;
}

/**
 * AppRouter — shows a blank centered loading spinner during initial
 * /api/me fetch, preventing the login-page flash on hard refresh.
 */
function AppRouter() {
    const { isLoading, isAuthenticated } = useUser();

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

    return (
        <Routes>
            {/* Public routes */}
            <Route
                path="/setup-username"
                element={
                    <SetupUsername />
                }
            />
            <Route
                path="/forgot-password"
                element={
                    isAuthenticated ? <Navigate to="/feed" replace /> : <ForgotPassword />
                }
            />
            <Route
                path="/"
                element={
                    isAuthenticated ? <Navigate to="/feed" replace /> : <Welcome />
                }
            />
            <Route
                path="/login"
                element={
                    isAuthenticated ? <Navigate to="/feed" replace /> : <Login />
                }
            />
            <Route
                path="/register"
                element={
                    isAuthenticated ? <Navigate to="/feed" replace /> : <Register />
                }
            />

            {/* Protected routes */}
            <Route
                path="/feed"
                element={
                    <ProtectedRoute><Feed /></ProtectedRoute>
                }
            />
            <Route
                path="/trending"
                element={
                    <ProtectedRoute><Trending /></ProtectedRoute>
                }
            />
            <Route
                path="/create"
                element={
                    <ProtectedRoute><Create /></ProtectedRoute>
                }
            />
            <Route
                path="/post/:id"
                element={
                    <ProtectedRoute><PostDetail /></ProtectedRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute><Profile /></ProtectedRoute>
                }
            />

            {/* Public user profile — viewable by any authenticated user */}
            <Route
                path="/user/:profileId"
                element={
                    <ProtectedRoute><PublicProfile /></ProtectedRoute>
                }
            />

            {/* Followers / following lists (own profile included) */}
            <Route
                path="/user/:profileId/followers"
                element={
                    <ProtectedRoute><FollowList /></ProtectedRoute>
                }
            />
            <Route
                path="/user/:profileId/following"
                element={
                    <ProtectedRoute><FollowList /></ProtectedRoute>
                }
            />

            {/* Blocked Accounts */}
            <Route
                path="/blocked-accounts"
                element={
                    <ProtectedRoute><BlockedAccounts /></ProtectedRoute>
                }
            />

            {/* Admin panel — secret path, lazy loaded, admin-only */}
            <Route
                path="/hq-command-882"
                element={
                    <ProtectedRoute>
                        <AdminRoute>
                            <Suspense fallback={
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '100vh',
                                    background: '#000',
                                }}>
                                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                </div>
                            }>
                                <AdminDashboard />
                            </Suspense>
                        </AdminRoute>
                    </ProtectedRoute>
                }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <>
            <ScrollToTop />
            <AppRouter />
        </>
    );
}
