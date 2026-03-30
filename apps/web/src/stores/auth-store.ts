// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiClient, registerAuthClientHooks } from '@/lib/api/core';
import { authApi } from '@/lib/api/modules/auth';
import { organizationApi } from '@/lib/api/modules/organization';
import { permissionApi } from '@/lib/api/modules/permission';
import { userApi } from '@/lib/api/modules/user';

import { runSessionBootstrap } from './auth-session-bootstrap';
import {
  createAuthenticatedSessionState,
  createClearedSessionState,
  mergeCurrentUserProfile as mergeStoredUserProfile,
  mergeVerifiedAuthUser,
  updateCurrentUserAvatar,
} from './auth-session-state';
import type { AuthState, AuthUser, PermissionScope } from './auth-store.types';
import { SubsidiaryInfo, TalentInfo, useTalentStore } from './talent-store';

const getApiErrorStatusCode = (error: unknown): number | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
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

        fetchAccessibleTalents: async () => {
          const talentStore = useTalentStore.getState();

          // Prevent duplicate concurrent calls
          if (talentStore.isLoading) {
            return { success: true };
          }

          try {
            talentStore.setIsLoading(true);
            talentStore.setFetchError(null);

            // Fetch organization structure
            const orgResponse = await organizationApi.getTree();

            if (orgResponse.success && orgResponse.data) {
              const { subsidiaries = [], directTalents = [], tenantId } = orgResponse.data;

              // Extract all talents from the tree
              const allTalents: TalentInfo[] = [];

              const extractTalents = (subs: SubsidiaryInfo[]) => {
                for (const sub of subs) {
                  if (sub.talents) {
                    allTalents.push(...sub.talents);
                  }
                  if (sub.children) {
                    extractTalents(sub.children);
                  }
                }
              };

              extractTalents(subsidiaries);
              allTalents.push(...directTalents);

              // Update talent store
              talentStore.setOrganizationTree(subsidiaries);
              talentStore.setDirectTalents(directTalents);
              talentStore.setAccessibleTalents(allTalents);

              if (tenantId) {
                const { tenantCode } = get();
                talentStore.setCurrentTenant(tenantId, tenantCode || '');
              }

              // Auto-select if only one talent
              if (allTalents.length === 1 && !talentStore.currentTalent) {
                talentStore.setCurrentTalent(allTalents[0]);
              }

              return { success: true };
            }

            const error = orgResponse.error?.message || 'Failed to load organization';
            talentStore.setFetchError(error);
            return { success: false, error };
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load organization';
            talentStore.setFetchError(message);
            return { success: false, error: message };
          } finally {
            const store = useTalentStore.getState();
            store.setIsLoading(false);
            store.setHasFetched(true);
          }
        },

        fetchMyPermissions: async (scope?: PermissionScope) => {
          try {
            const response = await permissionApi.getMyPermissions({
              scopeType: scope?.scopeType,
              scopeId: scope?.scopeId,
            });

            if (response.success && response.data) {
              set({
                effectivePermissions: response.data.permissions,
                currentScope: scope || { scopeType: 'GLOBAL' },
              });
              return { success: true };
            }

            set({ effectivePermissions: null, currentScope: null });
            return {
              success: false,
              error: response.error?.message || 'Failed to fetch permission snapshot',
            };
          } catch {
            set({ effectivePermissions: null, currentScope: null });
            console.warn(
              'Failed to fetch permissions from backend; permission checks will fail closed'
            );
            return {
              success: false,
              error: 'Failed to fetch permission snapshot',
            };
          }
        },

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
            try {
              const response = await authApi.refresh(tenantCode || undefined);

              if (response.success && response.data?.accessToken) {
                apiClient.setAccessToken(response.data.accessToken);
                set({ isRefreshing: false, isAuthenticated: true, refreshPromise: null });
                return true;
              }
            } catch {
              // Refresh failed silently
            }
            set({
              isRefreshing: false,
              refreshPromise: null,
              ...createClearedSessionState(),
            });
            apiClient.setAccessToken(null);
            return false;
          })();

          set({ refreshPromise: promise });
          return promise;
        },

        checkAuth: async () => {
          if (apiClient.getAccessToken()) {
            try {
              const meRes = await userApi.me();

              if (meRes.success && meRes.data) {
                const { tenantCode, tenantId: currentTenantId, user: currentUser } = get();
                const tenantId = meRes.data.tenant?.id || currentTenantId;
                set({
                  user: mergeVerifiedAuthUser({
                    user: meRes.data,
                    tenantCode,
                    tenantId,
                    currentUser,
                  }),
                  tenantId,
                  isAuthenticated: true,
                });
                void get().bootstrapAuthenticatedSession();
                return true;
              }
            } catch (error) {
              if (getApiErrorStatusCode(error) === 0 && get().user) {
                set({ isAuthenticated: true });
                console.warn(
                  'Session verification hit a network error; preserving current in-memory session'
                );
                void get().bootstrapAuthenticatedSession();
                return true;
              }
            }
          }

          const refreshed = await get().refreshSession();
          if (refreshed) {
            try {
              const meRes = await userApi.me();
              if (meRes.success && meRes.data) {
                const { tenantCode, tenantId: currentTenantId, user: currentUser } = get();
                const tenantId = meRes.data.tenant?.id || currentTenantId;
                set({
                  user: mergeVerifiedAuthUser({
                    user: meRes.data,
                    tenantCode,
                    tenantId,
                    currentUser,
                  }),
                  tenantId,
                  isAuthenticated: true,
                });
                void get().bootstrapAuthenticatedSession();
                return true;
              }
            } catch {
              // Ignore me fetch error
            }
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
