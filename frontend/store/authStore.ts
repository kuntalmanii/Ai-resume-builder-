/**
 * Zustand auth store — manages authentication state across the app.
 */
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import {
  authAPI,
  clearTokens,
  setAccessToken,
  setRefreshToken,
} from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    full_name: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  clearAuth: () => void;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      checkSession: async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("careeros_at") : null;
        const rt = typeof window !== "undefined" ? localStorage.getItem("careeros_rt") : null;

        if (!token && !rt) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authAPI.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          try {
            const freshToken = typeof window !== "undefined" ? localStorage.getItem("careeros_at") : null;
            if (freshToken && freshToken !== token) {
              const user = await authAPI.getMe();
              set({ user, isAuthenticated: true, isLoading: false });
              return;
            }
          } catch {}

          clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const tokens = await authAPI.login({ email, password });
          setAccessToken(tokens.access_token);
          if (tokens.refresh_token) {
            setRefreshToken(tokens.refresh_token);
          }
          const user = await authAPI.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (full_name, email, password) => {
        set({ isLoading: true });
        try {
          await authAPI.register({ full_name, email, password });
          // Auto-login after registration
          await get().login(email, password);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch {
          // Always clear local state even if server logout fails
        }
        clearTokens();
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user, isAuthenticated: true }),

      clearAuth: () => {
        clearTokens();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "careeros-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
