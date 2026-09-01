export const siteConfig = {
  name: 'Gettic',
  description: 'Ücretsiz ve Güvenli Mesajlaşma',
  frontendUrl: 'https://gettic.js.org',
  backendUrl: '', // Cloudflare Tunnel URL - workflow ile doldurulacak
  apiVersion: 'v1',
  timeApiUrl: 'https://timeapi.io/api/Time/current/zone?timeZone=Europe/Istanbul',
  ipInfoUrl: 'https://ipinfo.io',
  version: '0.1.0',
  environment: 'production'
};

export type SiteConfig = typeof siteConfig;

export function getBackendUrl(): string {
  return siteConfig.backendUrl;
}

export function getApiBaseUrl(): string {
  return `${siteConfig.backendUrl}/api/${siteConfig.apiVersion}`;
}

export function getWsUrl(): string {
  return `${siteConfig.backendUrl.replace('https://', 'wss://')}/ws`;
}

export function getApiUrl(endpoint: string): string {
  return `${getApiBaseUrl()}${endpoint}`;
}

export function setBackendUrl(url: string): void {
  siteConfig.backendUrl = url;
}
