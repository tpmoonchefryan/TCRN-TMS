// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiClient, registerAuthClientHooks } from '@/lib/api/core';

import { runSessionBootstrap } from './auth-session-bootstrap';
import {
  fetchAccessibleTalentsForSession,
  fetchPermissionSnapshotForSession,
} from './auth-session-bootstrap-tasks';
import {
  runLoginSessionCommand,
  runLogoutSessionCommand,
  runResetPasswordSessionCommand,
  runVerifyTotpSessionCommand,
} from './auth-session-commands';
import {
  createClearedSessionState,
  mergeCurrentUserProfile as mergeStoredUserProfile,
  updateCurrentUserAvatar,
} from './auth-session-state';
import {
  createAuthenticatedSessionTransition,
  createPendingTenantAuthState,
} from './auth-session-transitions';
import {
  refreshAccessTokenForSession,
  verifyAuthenticatedSessionUser,
} from './auth-session-verification';
import type { AuthState, AuthUser, PermissionScope } from './auth-store.types';
import { useTalentStore } from './talent-store';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const verifyAuthenticatedSession = async () => {
        const verification = await verifyAuthenticatedSessionUser({
          tenantCode: get().tenantCode,
          tenantId: get().tenantId,
          currentUser: get().user,
        });

        if (verification.status === 'verified') {
          set({
            user: verification.user,
            tenantId: verification.tenantId,
            isAuthenticated: true,
          });
          void get().bootstrapAuthenticatedSession();
          return true;
        }

        if (verification.status === 'preserved') {
          set({ isAuthenticated: true });
          console.warn(verification.warning);
          void get().bootstrapAuthenticatedSession();
          return true;
        }

        return false;
      };

      const completeAuthenticatedSession = (params: {
        accessToken: string | null;
        user: AuthUser | null | undefined;
        tenantCode: string | null | undefined;
        tenantId?: string | null;
      }) => {
        set(
          createAuthenticatedSessionTransition({
            ...params,
          })
        );

        void get().bootstrapAuthenticatedSession();
      };

      return {
        user: null,
        tenantCode: null,
        tenantId: null,
        isAuthenticated: false,
        isAcTenant: false,
        sessionBootstrapStatus: 'idle',
        sessionBootstrapErrors: null,

        // Permission state
        effectivePermissions: null,
        currentScope: null,

        isLoading: false,
        isRefreshing: false,
        sessionBootstrapPromise: null,
        refreshPromise: null,
        error: null,
        _hasHydrated: false,

        setHasHydrated: (state: boolean) => {
          set({ _hasHydrated: state });
        },

        setTenantCode: (code: string) =>
          set({ tenantCode: code, isAcTenant: code.toUpperCase() === 'AC' }),

        mergeCurrentUserProfile: (user: AuthUser) =>
          set((state) => ({
            user: mergeStoredUserProfile(state.user, user),
          })),

        setCurrentUserAvatar: (avatarUrl: string | null) =>
          set((state) => ({
            user: updateCurrentUserAvatar(state.user, avatarUrl),
          })),

        fetchAccessibleTalents: async () =>
          fetchAccessibleTalentsForSession({
            talentStore: useTalentStore.getState(),
            getTenantCode: () => get().tenantCode,
          }),

        fetchMyPermissions: async (scope?: PermissionScope) =>
          fetchPermissionSnapshotForSession({
            scope,
            permissionStore: {
              applyPermissionSnapshot: (effectivePermissions, currentScope) =>
                set({
                  effectivePermissions,
                  currentScope,
                }),
              clearPermissionSnapshot: () =>
                set({
                  effectivePermissions: null,
                  currentScope: null,
                }),
            },
          }),

        bootstrapAuthenticatedSession: async () => {
          const { sessionBootstrapPromise } = get();

          if (sessionBootstrapPromise) {
            return sessionBootstrapPromise;
          }

          set({
            sessionBootstrapStatus: 'loading',
            sessionBootstrapErrors: null,
          });

          const promise = (async () => {
            const result = await runSessionBootstrap({
              talents: () => get().fetchAccessibleTalents(),
              permissions: () => get().fetchMyPermissions(),
            });

            set({
              sessionBootstrapStatus: result.status,
              sessionBootstrapErrors: result.errors,
              sessionBootstrapPromise: null,
            });
          })();

          set({ sessionBootstrapPromise: promise });
          return promise;
        },

        clearPermissions: () => {
          set({ effectivePermissions: null, currentScope: null });
        },

        login: async (login: string, password: string, tenantCode: string) => {
          set({ isLoading: true, error: null });

          return runLoginSessionCommand({
            login,
            password,
            tenantCode,
            setPendingTenantAuth: (nextTenantCode) =>
              set(createPendingTenantAuthState(nextTenantCode)),
            completeAuthenticatedSession,
            setFailure: (error) =>
              set({
                error,
                isLoading: false,
              }),
          });
        },

        verifyTotp: async (sessionToken: string, code: string) => {
          set({ isLoading: true, error: null });
          return runVerifyTotpSessionCommand({
            sessionToken,
            code,
            tenantCode: get().tenantCode,
            completeAuthenticatedSession,
            setFailure: (error) =>
              set({
                error,
                isLoading: false,
              }),
          });
        },

        resetPassword: async (sessionToken: string, newPassword: string) => {
          set({ isLoading: true, error: null });
          return runResetPasswordSessionCommand({
            sessionToken,
            newPassword,
            tenantCode: get().tenantCode,
            completeAuthenticatedSession,
            setFailure: (error) =>
              set({
                error,
                isLoading: false,
              }),
          });
        },

        logout: async () =>
          runLogoutSessionCommand({
            clearAuthenticatedState: () => {
              apiClient.setAccessToken(null);
              useTalentStore.getState().reset();
              set(createClearedSessionState());
            },
          }),

        refreshSession: async () => {
          const { refreshPromise, tenantCode } = get();
          if (refreshPromise) {
            return refreshPromise;
          }

          set({ isRefreshing: true });

          const promise = (async () => {
            const refreshed = await refreshAccessTokenForSession({
              tenantCode,
            });

            if (refreshed) {
              set({ isRefreshing: false, isAuthenticated: true, refreshPromise: null });
              return true;
            }

            set({
              isRefreshing: false,
              refreshPromise: null,
              ...createClearedSessionState(),
            });
            return false;
          })();

          set({ refreshPromise: promise });
          return promise;
        },

        checkAuth: async () => {
          if (apiClient.getAccessToken() && (await verifyAuthenticatedSession())) {
            return true;
          }

          const refreshed = await get().refreshSession();
          if (refreshed && (await verifyAuthenticatedSession())) {
            return true;
          }

          return false;
        },

        clearError: () => set({ error: null }),
      };
    },
    {
      name: 'tcrn-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated, // Keep auth status to prevent flicker, validation happens in checkAuth
        tenantCode: state.tenantCode,
        tenantId: state.tenantId,
        isAcTenant: state.isAcTenant,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);

registerAuthClientHooks({
  getTenantCode: () => useAuthStore.getState().tenantCode,
  logout: () => useAuthStore.getState().logout(),
  redirectToLogin: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
});
