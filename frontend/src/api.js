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

