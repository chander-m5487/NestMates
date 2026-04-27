'use client';

import { create } from 'zustand';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string | null;
  uniqueUserId: string;
  displayName: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  
  checkAuth: async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.user) {
        set({ user: data.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  
  signOut: async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  },
  
  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false });
  },
}));

export function useAuth() {
  const store = useAuthStore();
  
  useEffect(() => {
    store.checkAuth();
  }, []);
  
  return store;
}

export function useRequireAuth(redirectTo = '/') {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);
  
  return { isAuthenticated, isLoading };
}

