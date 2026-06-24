const AUTH_TOKEN_STORAGE_KEY = "generai.auth.bearer-token";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getAuthToken() {
  return getStorage()?.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "";
}

export function setAuthToken(token: string) {
  if (!token) return;
  getStorage()?.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  getStorage()?.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function persistAuthTokenFromHeaders(headers: Headers) {
  const token = headers.get("set-auth-token");

  if (token) {
    setAuthToken(token);
  }

  return token;
}
