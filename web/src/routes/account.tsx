import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import DonorFooter from "@/components/donor/DonorFooter";
import DonorNav from "@/components/donor/DonorNav";
import { Button } from "@/components/ui/button";
import { type AuthMeResponse, resolveApiUrl } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/account")({
	beforeLoad: async ({ context }) => {
		await requireAuth(context.queryClient);
	},
	component: AccountPage,
});

async function fetchCurrentUser() {
	const res = await fetch(resolveApiUrl("/api/auth/me"), {
		credentials: "include",
	});
	if (!res.ok) return null;
	const data = (await res.json()) as AuthMeResponse;
	return {
		email: data.email,
		full_name: data.email.split("@")[0],
		supporterId: data.supporterId,
		roles: data.roles,
	};
}

async function deleteAccount() {
	const res = await fetch(resolveApiUrl("/api/auth/account"), {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) {
		let message = `Could not delete account (${res.status}).`;
		try {
			const body = (await res.json()) as {
				title?: string;
				errors?: Record<string, string[]>;
			};
			if (body.title) message = body.title;
		} catch {
			/* ignore */
		}
		throw new Error(message);
	}
}

function AccountPage() {
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: user, isLoading } = useQuery({
		queryKey: ["auth", "me"],
		queryFn: fetchCurrentUser,
		retry: false,
		staleTime: 60_000,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteAccount,
		onSuccess: () => {
			queryClient.setQueryData(["auth", "me"], null);
			queryClient.invalidateQueries({ queryKey: ["auth"] });
			setShowDeleteModal(false);
			navigate({ to: "/" });
		},
	});

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background font-body">
			<DonorNav user={user ?? null} />

			<main className="mx-auto max-w-2xl px-6 py-10">
				<h1 className="font-heading text-3xl font-bold text-foreground">
					Account
				</h1>
				<p className="mt-2 font-body text-sm text-muted-foreground">
					Manage your account settings.
				</p>

				<div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
					<h2 className="font-heading text-lg font-semibold text-foreground">
						Profile
					</h2>

					<dl className="mt-4 space-y-4">
						<div>
							<dt className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Name
							</dt>
							<dd className="mt-1 font-body text-sm text-foreground">
								{user?.full_name ?? "—"}
							</dd>
						</div>
						<div>
							<dt className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Email
							</dt>
							<dd className="mt-1 font-body text-sm text-foreground">
								{user?.email ?? "—"}
							</dd>
						</div>
						<div>
							<dt className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Roles
							</dt>
							<dd className="mt-1 font-body text-sm text-foreground">
								{user?.roles?.join(", ") || "—"}
							</dd>
						</div>
					</dl>
				</div>

				<div className="mt-8 rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-sm">
					<h2 className="font-heading text-lg font-semibold text-red-600">
						Danger Zone
					</h2>
					<p className="mt-1 font-body text-sm text-muted-foreground">
						Permanently delete your account and all associated data. This action
						cannot be undone.
					</p>
					<Button
						onClick={() => setShowDeleteModal(true)}
						variant="outline"
						className="mt-4 h-10 rounded-xl border-red-500 px-5 font-body text-red-500 transition-all hover:border-red-600 hover:bg-red-50 hover:text-red-600"
					>
						Delete Account
					</Button>
				</div>
			</main>

			{showDeleteModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
					<div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-[#FDFBF7] p-8 shadow-lg">
						<h2 className="mb-2 font-heading text-xl font-bold text-foreground">
							Delete Account
						</h2>
						<p className="mb-6 font-body text-base text-muted-foreground">
							Are you sure you want to delete your account? This action cannot
							be undone.
						</p>
						{deleteMutation.isError && (
							<p className="mb-4 font-body text-sm text-red-600">
								{(deleteMutation.error as Error).message}
							</p>
						)}
						<div className="flex justify-end gap-3">
							<Button
								variant="outline"
								onClick={() => {
									deleteMutation.reset();
									setShowDeleteModal(false);
								}}
								disabled={deleteMutation.isPending}
								className="h-10 rounded-xl border-border px-5 font-body text-foreground transition-all hover:bg-muted"
							>
								Cancel
							</Button>
							<Button
								onClick={() => deleteMutation.mutate()}
								disabled={deleteMutation.isPending}
								className="h-10 rounded-xl bg-red-500 px-5 font-body text-white hover:bg-red-600"
							>
								{deleteMutation.isPending ? "Deleting..." : "Confirm"}
							</Button>
						</div>
					</div>
				</div>
			)}

			<DonorFooter />
		</div>
	);
}
