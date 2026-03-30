// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiClient, registerAuthClientHooks } from '@/lib/api/core';
import { authApi } from '@/lib/api/modules/auth';

import { runSessionBootstrap } from './auth-session-bootstrap';
import {
  fetchAccessibleTalentsForSession,
  fetchPermissionSnapshotForSession,
} from './auth-session-bootstrap-tasks';
import {
  createAuthenticatedSessionState,
  createClearedSessionState,
  mergeCurrentUserProfile as mergeStoredUserProfile,
  updateCurrentUserAvatar,
} from './auth-session-state';
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

          try {
            const response = await authApi.login(login, password, tenantCode);

            if (response.success && response.data) {
              const data = response.data;

              // Case 1: Password Reset Required
              if (data.passwordResetRequired) {
                set({
                  isLoading: false,
                  tenantCode,
                  isAcTenant: tenantCode.toUpperCase() === 'AC',
                });
                return {
                  success: true,
                  passwordResetRequired: true,
                  passwordResetReason: data.reason,
                  sessionToken: data.sessionToken,
                };
              }

              // Case 2: TOTP Required
              if (data.totpRequired) {
                set({
                  isLoading: false,
                  tenantCode,
                  isAcTenant: tenantCode.toUpperCase() === 'AC',
                });
                return {
                  success: true,
                  totpRequired: true,
                  sessionToken: data.sessionToken,
                };
              }

              // Case 3: Login Success (No TOTP, No Password Reset)
              if (data.accessToken) {
                apiClient.setAccessToken(data.accessToken);
                set({
                  tenantCode,
                  ...createAuthenticatedSessionState({
                    user: data.user,
                    tenantCode,
                    tenantId: data.tenantId,
                  }),
                  isLoading: false,
                });

                void get().bootstrapAuthenticatedSession();

                return { success: true };
              }
            }

            set({
              error: response.error?.message || 'Login failed',
              isLoading: false,
            });
            return { success: false };
          } catch (error: unknown) {
            set({
              error: (error as Error).message || 'Login failed',
              isLoading: false,
            });
            return { success: false };
          }
        },

        verifyTotp: async (sessionToken: string, code: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.verifyTotp(sessionToken, code);
            if (response.success && response.data) {
              const { accessToken, user, tenantId: responseTenantId } = response.data;
              apiClient.setAccessToken(accessToken || null);
              set({
                ...createAuthenticatedSessionState({
                  user,
                  tenantCode: get().tenantCode,
                  tenantId: responseTenantId,
                }),
                isLoading: false,
              });

              void get().bootstrapAuthenticatedSession();

              return true;
            }
            set({
              error: response.error?.message || 'Verification failed',
              isLoading: false,
            });
            return false;
          } catch (error: unknown) {
            set({
              error: (error as Error).message || 'Verification failed',
              isLoading: false,
            });
            return false;
          }
        },

        resetPassword: async (sessionToken: string, newPassword: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.resetPassword(sessionToken, newPassword, newPassword);
            if (response.success && response.data) {
              const { accessToken, user, tenantId: responseTenantId } = response.data;
              if (accessToken) {
                apiClient.setAccessToken(accessToken);
                set({
                  ...createAuthenticatedSessionState({
                    user,
                    tenantCode: get().tenantCode,
                    tenantId: responseTenantId,
                  }),
                  isLoading: false,
                });

                void get().bootstrapAuthenticatedSession();

                return true;
              }
            }
            set({
              error: response.error?.message || 'Password reset failed',
              isLoading: false,
            });
            return false;
          } catch (error: unknown) {
            set({
              error: (error as Error).message || 'Password reset failed',
              isLoading: false,
            });
            return false;
          }
        },

        logout: async () => {
          try {
            await authApi.logout();
          } catch {
            // Ignore logout errors
          }

          apiClient.setAccessToken(null);

          // Reset talent store
          useTalentStore.getState().reset();

          set(createClearedSessionState());
        },

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
