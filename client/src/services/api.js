export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL || "").trim() || "http://localhost:5000";

const stripTrailingSlash = (s) => s.replace(/\/+$/, "");

export function api(path = "/") {
  if (!path) return stripTrailingSlash(BACKEND_URL);
  if (/^https?:\/\//i.test(path)) return path;
  const base = stripTrailingSlash(BACKEND_URL);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Enhanced fetch wrapper that automatically includes:
 * 1. Credentials (for HttpOnly cookies)
 * 2. Authorization Header (Bearer token fallback for incognito/cross-domain)
 */
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("chatAppToken");
  
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const enhancedOptions = {
    ...options,
    headers,
    credentials: "include", // Always include cookies
  };

  return fetch(url, enhancedOptions);
}
