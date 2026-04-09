import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AUTH_TOKEN_KEY, loginUser, registerUser } from '../services/api';

const AUTH_USER_KEY = 'post-explorer-auth-user';

const AuthContext = createContext(null);

function deriveRole(user) {
    if (user?.role) {
        return user.role;
    }

    const email = String(user?.email || '').toLowerCase();
    if (email.startsWith('admin') || email.endsWith('@admin.local')) {
        return 'admin';
    }

    return 'user';
}

function parseStoredUser() {
    try {
        const raw = localStorage.getItem(AUTH_USER_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return {
            ...parsed,
            role: deriveRole(parsed)
        };
    } catch (_error) {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
    const [user, setUser] = useState(parseStoredUser);

    const isAuthenticated = Boolean(token);

    const setSession = (nextToken, nextUser) => {
        const normalizedUser = nextUser
            ? {
                  ...nextUser,
                  role: deriveRole(nextUser)
              }
            : null;

        if (nextToken) {
            localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
            setToken(nextToken);
        } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setToken('');
        }

        if (normalizedUser) {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser));
            setUser(normalizedUser);
        } else {
            localStorage.removeItem(AUTH_USER_KEY);
            setUser(null);
        }
    };

    const login = useCallback(async (payload) => {
        const data = await loginUser(payload);
        setSession(data?.token || '', data?.user || null);
        return data;
    }, []);

    const register = useCallback(async (payload) => {
        const data = await registerUser(payload);
        setSession(data?.token || '', data?.user || null);
        return data;
    }, []);

    const logout = useCallback(() => {
        setSession('', null);
    }, []);

    const updateUser = useCallback((partialUser) => {
        if (!partialUser || !user) {
            return;
        }

        const merged = {
            ...user,
            ...partialUser
        };

        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(merged));
        setUser({
            ...merged,
            role: deriveRole(merged)
        });
    }, [user]);

    const value = useMemo(
        () => ({
            token,
            user,
            isAuthenticated,
            isAdmin: user?.role === 'admin',
            login,
            register,
            logout,
            updateUser
        }),
        [token, user, isAuthenticated, login, register, logout, updateUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}
