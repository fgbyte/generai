import { getAuthToken } from "@/lib/auth-token";

function withAuthHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const token = getAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...init,
    credentials: "include",
    headers,
  };
}

export function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, withAuthHeaders(init));
}
