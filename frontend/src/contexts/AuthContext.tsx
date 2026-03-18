'use client';

import React, { createContext, useContext, useSyncExternalStore } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

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
    login: (token: string, userData: User) => void;
    updateUser: (userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    updateUser: () => { },
    logout: () => { },
});

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedUserStorageValue: string | null = null;
let cachedTokenValue: string | undefined;
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

    const token = Cookies.get('token');
    const storedUser = window.localStorage.getItem('user');

    if (!token || !storedUser) {
        cachedTokenValue = token;
        cachedUserStorageValue = storedUser;
        cachedUserSnapshot = null;
        return null;
    }

    if (cachedTokenValue === token && cachedUserStorageValue === storedUser) {
        return cachedUserSnapshot;
    }

    try {
        cachedTokenValue = token;
        cachedUserStorageValue = storedUser;
        cachedUserSnapshot = JSON.parse(storedUser) as User;
        return cachedUserSnapshot;
    } catch (e) {
        console.error("Failed to parse stored user", e);
        Cookies.remove('token');
        window.localStorage.removeItem('user');
        cachedTokenValue = undefined;
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

    const login = (token: string, userData: User) => {
        Cookies.set('token', token, { expires: 1 }); // 1 day
        localStorage.setItem('user', JSON.stringify(userData));
        emitAuthChange();
        router.push('/dashboard');
    };

    const updateUser = (userData: User) => {
        localStorage.setItem('user', JSON.stringify(userData));
        emitAuthChange();
    };

    const logout = () => {
        Cookies.remove('token');
        localStorage.removeItem('user');
        emitAuthChange();
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, updateUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
