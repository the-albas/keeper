import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { apiGetJson } from "./api";

export type AuthUser = {
	email: string;
	roles: string[];
	supporterId?: number | null;
};

export const meQueryOptions = {
	queryKey: ["auth", "me"] as const,
	queryFn: (): Promise<AuthUser> => apiGetJson<AuthUser>("/api/auth/me"),
	retry: false,
	staleTime: 30_000,
};

export async function requireAuth(queryClient: QueryClient): Promise<AuthUser> {
	try {
		return await queryClient.fetchQuery(meQueryOptions);
	} catch {
		throw redirect({ to: "/login" });
	}
}

export async function requireRole(
	queryClient: QueryClient,
	...roles: string[]
): Promise<AuthUser> {
	const user = await requireAuth(queryClient);
	if (!roles.some((r) => user.roles.includes(r))) {
		const to =
			user.roles.includes("Admin") || user.roles.includes("Staff")
				? "/admin"
				: "/dashboard";
		throw redirect({ to });
	}
	return user;
}
