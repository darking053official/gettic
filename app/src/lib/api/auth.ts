import { apiClient } from './client';
import { authStore } from '$lib/stores/auth';
import { generateUserIdentity } from '$lib/crypto/identity';

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
  deviceId?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  deviceId: string;
  expiresIn: number;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const deviceId = `device_${Date.now()}`;
    
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      ...data,
      deviceId
    });
    
    if (browser) {
      localStorage.setItem('gettic_refresh_token', response.refreshToken);
    }
    
    await authStore.login(response.userId, response.accessToken, response.deviceId);
    
    // Kullanıcı kimliğini oluştur
    await generateUserIdentity(response.userId);
    
    return response;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    const deviceId = data.deviceId || `device_${Date.now()}`;
    
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      ...data,
      deviceId
    });
    
    if (browser) {
      localStorage.setItem('gettic_refresh_token', response.refreshToken);
    }
    
    await authStore.login(response.userId, response.accessToken, response.deviceId);
    
    // Mevcut kimliği kontrol et
    const { loadIdentity } = await import('$lib/crypto/identity');
    const existingIdentity = await loadIdentity(response.userId, response.deviceId);
    
    if (!existingIdentity) {
      await generateUserIdentity(response.userId);
    }
    
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    if (browser) {
      localStorage.removeItem('gettic_refresh_token');
    }
    await authStore.logout();
  }
}

export async function refreshToken(): Promise<string> {
  const refreshToken = browser ? localStorage.getItem('gettic_refresh_token') : null;
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await apiClient.post<AuthResponse>('/auth/refresh', {
    refreshToken
  });
  
  if (browser) {
    localStorage.setItem('gettic_refresh_token', response.refreshToken);
  }
  
  await authStore.updateToken(response.accessToken);
  
  return response.accessToken;
}

export async function getCurrentUser(): Promise<any> {
  return apiClient.get('/auth/me');
}

export async function updateProfile(data: any): Promise<any> {
  return apiClient.put('/auth/me/profile', data);
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return apiClient.post('/auth/change-password', {
    oldPassword,
    newPassword
  });
}

export async function verifyEmail(token: string): Promise<void> {
  return apiClient.post('/auth/email/verify', { token });
}

export async function sendVerificationEmail(): Promise<void> {
  return apiClient.post('/auth/email/send-verification');
}

export async function forgotPassword(email: string): Promise<void> {
  return apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  return apiClient.post('/auth/reset-password', {
    token,
    newPassword
 });
}
