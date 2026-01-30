// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { SystemUser } from '@tcrn/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { SubsidiaryInfo, TalentInfo, useTalentStore } from './talent-store';

import { apiClient, authApi, organizationApi } from '@/lib/api/client';

/**
 * Extended user type that includes runtime properties returned from login API
 * These properties are not part of the base SystemUser schema but are included in auth responses
 */
export interface AuthUser extends Partial<SystemUser> {
  roles?: Array<{ code: string; name?: string; is_system?: boolean }>;
  permissions?: string[];
  tenant_code?: string;
  tenant?: { id: string; code?: string; name?: string };
}

/**
 * Login API response data type
 */
interface LoginResponseData {
  accessToken?: string;
  expiresIn?: number;
  sessionToken?: string;
  passwordResetRequired?: boolean;
  totpRequired?: boolean;
  reason?: string;
  tenantId?: string;
  user?: AuthUser;
}

export interface AuthState {
  // Persistent state
  user: AuthUser | null;
  tenantCode: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isAcTenant: boolean;
  
  // Transient state
  isLoading: boolean;
  isRefreshing: boolean;
  refreshPromise: Promise<boolean> | null;
  error: string | null;
  _hasHydrated: boolean;

  // Actions
  login: (login: string, password: string, tenantCode: string) => Promise<{ 
    success: boolean; 
    totpRequired?: boolean; 
    passwordResetRequired?: boolean;
    passwordResetReason?: string;
    sessionToken?: string;
  }>;
  verifyTotp: (sessionToken: string, code: string) => Promise<boolean>;
  resetPassword: (sessionToken: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  setTenantCode: (code: string) => void;
  setHasHydrated: (state: boolean) => void;
  setUser: (user: AuthUser) => void;
  fetchAccessibleTalents: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenantCode: null,
      tenantId: null,
      isAuthenticated: false,
      isAcTenant: false,
      
      isLoading: false,
      isRefreshing: false,
      refreshPromise: null,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      setTenantCode: (code: string) => set({ tenantCode: code, isAcTenant: code.toUpperCase() === 'AC' }),

      setUser: (user: AuthUser) => set({ user }),

      fetchAccessibleTalents: async () => {
        const talentStore = useTalentStore.getState();
        
        // Prevent duplicate concurrent calls
        if (talentStore.isLoading) {
          return;
        }
        
        try {
          talentStore.setIsLoading(true);

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
          }
        } catch {
          // Silently fail - organization tree will remain empty
        } finally {
          const store = useTalentStore.getState();
          store.setIsLoading(false);
          store.setHasFetched(true);
        }
      },

      login: async (login: string, password: string, tenantCode: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(login, password, tenantCode);
          
          if (response.success && response.data) {
            // Cast to LoginResponseData for proper type access
            const data = response.data as LoginResponseData;
            
            // Case 1: Password Reset Required
            if (data.passwordResetRequired) {
              set({ isLoading: false, tenantCode, isAcTenant: tenantCode.toUpperCase() === 'AC' });
              return { 
                success: true, 
                passwordResetRequired: true, 
                passwordResetReason: data.reason,
                sessionToken: data.sessionToken 
              };
            }
            
            // Case 2: TOTP Required
            if (data.totpRequired) {
              set({ isLoading: false, tenantCode, isAcTenant: tenantCode === 'AC' });
              return { 
                success: true, 
                totpRequired: true, 
                sessionToken: data.sessionToken 
              };
            }
            
            // Case 3: Login Success (No TOTP, No Password Reset)
            if (data.accessToken) {
              apiClient.setAccessToken(data.accessToken);
              // Extract tenantId from user.tenant.id or fallback to top-level tenantId
              const tenantId = data.user?.tenant?.id || data.tenantId;
              set({
                user: data.user || null,
                tenantCode,
                tenantId,
                isAuthenticated: true,
                isAcTenant: tenantCode.toUpperCase() === 'AC',
                isLoading: false,
              });
              
              // Fetch accessible talents after successful login
              await get().fetchAccessibleTalents();
              
              return { success: true };
            }
          }
          
          set({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: (response as any).error?.message || 'Login failed',
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
            // Extract tenantId from user.tenant.id or fallback
            const tenantId = user?.tenant?.id || responseTenantId;
            apiClient.setAccessToken(accessToken || null);
            set({
              user,
              tenantId,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Fetch accessible talents after successful TOTP verification
            await get().fetchAccessibleTalents();
            
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
              // Extract tenantId from user.tenant.id or fallback
              const tenantId = user?.tenant?.id || responseTenantId;
              set({
                user,
                tenantId,
                isAuthenticated: true,
                isLoading: false,
              });
              
              // Fetch accessible talents after successful password reset
              await get().fetchAccessibleTalents();
              
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
        
        set({
          user: null,
          tenantId: null,
          isAuthenticated: false,
          isAcTenant: false,
        });
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
          set({ isRefreshing: false, isAuthenticated: false, user: null, refreshPromise: null });
          apiClient.setAccessToken(null);
          return false;
        })();

        set({ refreshPromise: promise });
        return promise;
      },

      checkAuth: async () => {
        // First try to use existing access token in memory
        if (apiClient.getAccessToken()) {
          // Reload accessible talents on session restore
          await get().fetchAccessibleTalents();
          return true;
        }

        // If no token, try to refresh
        // If no token, try to refresh
        const refreshed = await get().refreshSession();
        if (refreshed) {
          // Fetch latest user info
          try {
            const meRes = await authApi.me();
            if (meRes.success && meRes.data) {
              set({ user: meRes.data });
              // Reload accessible talents after successful refresh
              await get().fetchAccessibleTalents();
              return true;
            }
          } catch {
            // Ignore me fetch error
          }
        }
        
        return false;
      },

      clearError: () => set({ error: null }),
    }),
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
