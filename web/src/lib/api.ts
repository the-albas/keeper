export function getApiBaseUrl(): string | undefined {
	return (import.meta.env.VITE_API_BASE_URL as string | undefined)
		?.trim()
		.replace(/\/$/, "");
}

/** Body of GET /api/auth/me (camelCase JSON). */
export type AuthMeResponse = {
  email: string;
  roles: string[];
  supporterId: number | null;
};

export async function logout(): Promise<void> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return;
  const res = await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Logout failed: ${res.status} ${res.statusText}`);
}

export async function apiGetJson<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const baseUrl = getApiBaseUrl();
	if (!baseUrl) {
		throw new Error("API base URL not configured");
	}
	const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
	const res = await fetch(url, { ...init, credentials: "include" });
	if (!res.ok) {
		throw new Error(`Request failed: ${res.status} ${res.statusText}`);
	}
	return res.json() as Promise<T>;
}

export async function apiPostJson<T = void>(
	path: string,
	body?: unknown,
	init?: RequestInit,
): Promise<T> {
	const baseUrl = getApiBaseUrl();
	if (!baseUrl) {
		throw new Error("API base URL not configured");
	}
	const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
	const headers = new Headers(init?.headers);
	headers.set("Content-Type", "application/json");
	const res = await fetch(url, {
		...init,
		method: "POST",
		credentials: "include",
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const text = await res.text();
		let detail = res.statusText;
		try {
			const parsed = JSON.parse(text) as {
				error?: string;
				title?: string;
				detail?: string;
			};
			detail = parsed.detail ?? parsed.error ?? parsed.title ?? detail;
		} catch {
			if (text) detail = text;
		}
		throw new Error(detail || `Request failed: ${res.status}`);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}
