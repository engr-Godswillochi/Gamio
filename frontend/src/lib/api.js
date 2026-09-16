const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

/**
 * Builds an API URL that works through Vite's development proxy and when the
 * client and API are deployed behind the same origin. Set VITE_API_URL only
 * when the API is intentionally hosted on a separate origin.
 */
export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${configuredApiBaseUrl}/api${normalizedPath}`;
}
