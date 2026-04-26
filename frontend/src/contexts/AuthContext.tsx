'use client';

import React, { createContext, useContext, useSyncExternalStore, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/services/api';

interface User {
    id: string;
    username: string;
    displayName: string;
    avatarSeed: string;
    avatarImage?: string | null;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (userData: User) => void;
    updateUser: (userData: User) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    updateUser: () => { },
    logout: async () => { },
});

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedUserStorageValue: string | null = null;
let cachedUserSnapshot: User | null = null;

function emitAuthChange() {
    listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
    listeners.add(listener);

    if (typeof window !== 'undefined') {
        const handleStorage = () => listener();
        window.addEventListener('storage', handleStorage);

        return () => {
            listeners.delete(listener);
            window.removeEventListener('storage', handleStorage);
        };
    }

    return () => {
        listeners.delete(listener);
    };
}

function getClientUserSnapshot(): User | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const storedUser = window.localStorage.getItem('user');

    if (!storedUser) {
        cachedUserStorageValue = null;
        cachedUserSnapshot = null;
        return null;
    }

    if (cachedUserStorageValue === storedUser) {
        return cachedUserSnapshot;
    }

    try {
        cachedUserStorageValue = storedUser;
        cachedUserSnapshot = JSON.parse(storedUser) as User;
        return cachedUserSnapshot;
    } catch (e) {
        console.error("Failed to parse stored user", e);
        window.localStorage.removeItem('user');
        cachedUserStorageValue = null;
        cachedUserSnapshot = null;
        return null;
    }
}

function getServerUserSnapshot(): User | null {
    return null;
}

function getClientHydratedSnapshot() {
    return true;
}

function getServerHydratedSnapshot() {
    return false;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const user = useSyncExternalStore(subscribe, getClientUserSnapshot, getServerUserSnapshot);
    const hydrated = useSyncExternalStore(subscribe, getClientHydratedSnapshot, getServerHydratedSnapshot);
    const loading = !hydrated;
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const verifyAuth = async () => {
            // Skip verification if on login page and no user is stored locally
            // This prevents noisy 401 errors in the console on initial load
            if (pathname === '/login' && !localStorage.getItem('user')) {
                return;
            }

            try {
                const response = await api.get('/auth/me');
                if (response.data.user) {
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    emitAuthChange();
                }
            } catch {
                // If verification fails, clear local state
                if (localStorage.getItem('user')) {
                    localStorage.removeItem('user');
                    emitAuthChange();
                }
            }
        };

        if (hydrated) {
            verifyAuth();
        }
    }, [pathname, hydrated]);

    const login = (userData: User) => {
        // Token is stored in HttpOnly cookie on backend
        // Only store user data in localStorage for display purposes
        localStorage.setItem('user', JSON.stringify(userData));
        emitAuthChange();
        router.push('/dashboard');
    };

    const updateUser = (userData: User) => {
        localStorage.setItem('user', JSON.stringify(userData));
        emitAuthChange();
    };

    const logout = async () => {
        try {
            // Call backend to clear HttpOnly cookie
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('user');
            emitAuthChange();
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, updateUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
