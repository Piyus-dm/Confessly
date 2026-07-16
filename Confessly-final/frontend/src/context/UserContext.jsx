// current user context — fetches /api/me on mount, cookie auth
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

const UserContext = createContext({
    user:            null,
    isAuthenticated: false,
    isLoading:       true,
    refreshUser:     () => {},
    logout:          () => {},
    theme:           'dark',
    setTheme:        () => {},
});

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('confessly-theme', theme);
}

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setThemeState] = useState(() => localStorage.getItem('confessly-theme') || 'dark');

    const setTheme = useCallback((next) => {
        setThemeState(next);
        applyTheme(next);
        apiFetch('/api/user/settings', {
            method: 'PUT',
            body: JSON.stringify({ theme_preference: next }),
        }).catch(() => {});
    }, []);

    const refreshUser = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await apiFetch('/api/me');
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setUser(data.profile);
                if (data.profile.theme_preference) {
                    setThemeState(data.profile.theme_preference);
                    applyTheme(data.profile.theme_preference);
                }
                return true;
            } else {
                setUser(null);
                return false;
            }
        } catch (e) {
            setUser(null);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { applyTheme(theme); }, []);

    const logout = useCallback(async () => {
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        } catch {
            // ignore network errors on logout
        }
        setUser(null);
    }, []);

    // fetch once on mount
    useEffect(() => { refreshUser(); }, [refreshUser]);

    return (
        <UserContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading:       loading,
            refreshUser,
            logout,
            theme,
            setTheme,
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
