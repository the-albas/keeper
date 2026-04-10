/**
 * Base URL for API calls (no trailing slash).
 * - Empty string: same-origin `/api/...` — use with Vercel rewrite or Vite dev proxy so auth
 *   cookies are first-party (fixes Incognito / strict third‑party cookie blocking).
 * - Non-empty: full origin, e.g. `http://localhost:5216` when the web app and API differ.
 */
export function getApiBaseUrl(): string {
	const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
	if (!raw) return "";
	return raw.replace(/\/$/, "");
}

/** Full URL for an API path; `path` must start with `/` (e.g. `/api/auth/me`). */
export function resolveApiUrl(path: string): string {
	const base = getApiBaseUrl();
	const p = path.startsWith("/") ? path : `/${path}`;
	return base === "" ? p : `${base}${p}`;
}

/** Body of GET /api/auth/me (camelCase JSON). */
export type AuthMeResponse = {
	email: string;
	roles: string[];
	supporterId: number | null;
};

export async function logout(): Promise<void> {
	const res = await fetch(resolveApiUrl("/api/auth/logout"), {
		method: "POST",
		credentials: "include",
	});
	if (!res.ok)
		throw new Error(`Logout failed: ${res.status} ${res.statusText}`);
}

export async function apiGetJson<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const url = resolveApiUrl(path);
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
	const url = resolveApiUrl(path);
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

export async function apiPutJson<T = void>(
	path: string,
	body?: unknown,
	init?: RequestInit,
): Promise<T> {
	const url = resolveApiUrl(path);
	const headers = new Headers(init?.headers);
	headers.set("Content-Type", "application/json");
	const res = await fetch(url, {
		...init,
		method: "PUT",
		credentials: "include",
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || `Request failed: ${res.status} ${res.statusText}`);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

export async function apiDelete(path: string, init?: RequestInit): Promise<void> {
	const url = resolveApiUrl(path);
	const res = await fetch(url, {
		...init,
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || `Request failed: ${res.status} ${res.statusText}`);
	}
}
