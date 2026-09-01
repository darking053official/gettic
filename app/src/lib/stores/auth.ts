import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  accessToken: string | null;
  deviceId: string | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  userId: null,
  accessToken: null,
  deviceId: null,
  isLoading: true
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    checkSession: async () => {
      if (!browser) return;
      
      try {
        const storedToken = localStorage.getItem('gettic_access_token');
        const storedUserId = localStorage.getItem('gettic_user_id');
        const storedDeviceId = localStorage.getItem('gettic_device_id');
        
        if (storedToken && storedUserId) {
          set({
            isAuthenticated: true,
            userId: storedUserId,
            accessToken: storedToken,
            deviceId: storedDeviceId,
            isLoading: false
          });
        } else {
          set({
            ...initialState,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Session check failed:', error);
        set({
          ...initialState,
          isLoading: false
        });
      }
    },
    
    login: async (userId: string, accessToken: string, deviceId: string) => {
      if (!browser) return;
      
      localStorage.setItem('gettic_access_token', accessToken);
      localStorage.setItem('gettic_user_id', userId);
      localStorage.setItem('gettic_device_id', deviceId);
      
      set({
        isAuthenticated: true,
        userId,
        accessToken,
        deviceId,
        isLoading: false
      });
    },
    
    logout: async () => {
      if (!browser) return;
      
      localStorage.removeItem('gettic_access_token');
      localStorage.removeItem('gettic_user_id');
      localStorage.removeItem('gettic_device_id');
      
      set(initialState);
    },
    
    updateToken: (newToken: string) => {
      if (!browser) return;
      
      localStorage.setItem('gettic_access_token', newToken);
      
      update(state => ({
        ...state,
        accessToken: newToken
      }));
    }
  };
}

export const authStore = createAuthStore();
export const isAuthenticated = derived(authStore, $auth => $auth.isAuthenticated);
