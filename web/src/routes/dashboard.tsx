import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";
import type { Donation } from "@/components/admin/AdminMetrics";
import AllocationChart from "@/components/donor/AllocationChart";
import DonationHistory from "@/components/donor/DonationHistory";
import DonorFooter from "@/components/donor/DonorFooter";
import type { DonorMetricsData } from "@/components/donor/DonorMetrics";
import DonorMetrics from "@/components/donor/DonorMetrics";
import DonorNav from "@/components/donor/DonorNav";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl, type AuthMeResponse } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async ({ context }) => {
		await requireRole(context.queryClient, "Donor", "Admin");
	},
	component: DonorDashboard,
});

type DonorDonationApi = {
	id: string;
	amount: number;
	createdDate: string;
	type?: string | null;
	campaign?: string | null;
	allocation?: string | null;
};

function mapDonorDonationApi(row: DonorDonationApi): Donation {
	return {
		id: row.id,
		amount: Number(row.amount),
		created_date: row.createdDate,
		type: row.type ?? undefined,
		campaign: row.campaign ?? undefined,
		allocation: row.allocation ?? undefined,
	};
}

async function fetchMyDonations(): Promise<Donation[]> {
	const apiBaseUrl = getApiBaseUrl();
	if (!apiBaseUrl) return [];
	const res = await fetch(`${apiBaseUrl}/api/donor/donations`, {
		credentials: "include",
	});
	if (res.status === 401) return [];
	if (!res.ok) {
		throw new Error(`Could not load donations (${res.status}).`);
	}
	const data = (await res.json()) as DonorDonationApi[];
	if (!Array.isArray(data)) return [];
	return data.map(mapDonorDonationApi);
}

async function fetchCurrentUser() {
	const apiBaseUrl = getApiBaseUrl();
	if (!apiBaseUrl) return null;
	const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
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
	const apiBaseUrl = getApiBaseUrl();
	if (!apiBaseUrl) throw new Error("API base URL is not configured.");
	const res = await fetch(`${apiBaseUrl}/api/auth/account`, {
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

function DonorDashboard() {
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: user, isLoading: userLoading } = useQuery({
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

	const { data: donations = [], isLoading: donationsLoading } = useQuery<
		Donation[]
	>({
		queryKey: ["donor", "donations", user?.supporterId ?? "none"],
		queryFn: fetchMyDonations,
		enabled: user != null,
		staleTime: 30_000,
	});

	const totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
	const campaignNames = [
		...new Set(
			donations
				.map((d) => d.campaign?.trim())
				.filter((c): c is string => Boolean(c && c.length > 0)),
		),
	].sort((a, b) => a.localeCompare(b));

	const metrics: DonorMetricsData = {
		totalDonated,
		girlsSupported: Math.floor(totalDonated / 150),
		campaignNames,
	};

	const pageLoading = userLoading || (user != null && donationsLoading);

	if (pageLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background font-body">
			<DonorNav user={user ?? null} />
			<main className="mx-auto max-w-7xl px-6 py-10">
				<div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl border-t-4 border-t-yellow-500 bg-[#FDFBF7] p-8 shadow-sm md:flex-row md:items-center">
					<div>
						<h1 className="font-heading text-3xl font-bold text-foreground">
							{metrics.girlsSupported > 0
								? `You Changed ${metrics.girlsSupported} Girls' Lives`
								: "You're Changing Girls' Lives"}
						</h1>
						<p className="font-body mt-2 text-base text-muted-foreground">
							See how your generosity is making a difference in the lives of
							survivors.
						</p>
					</div>
					<Link to="/" hash="donate">
						<Button className="h-11 gap-2 rounded-xl bg-yellow-500 px-6 font-body text-black shadow-md transition-all hover:bg-yellow-600">
							<Heart className="h-4 w-4" />
							Donate Again
						</Button>
					</Link>
				</div>

				<DonorMetrics metrics={metrics} />

				<div className="mt-8 grid gap-6 lg:grid-cols-2">
					<div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-8 shadow-sm">
						<h3 className="mb-6 text-center font-heading text-xl font-bold text-foreground">
							Where Your Money Goes
						</h3>
						<div className="mx-auto mb-8 flex h-6 w-full max-w-lg overflow-hidden rounded-full shadow-inner">
							<motion.div
								initial={{ width: 0 }}
								whileInView={{ width: "85%" }}
								transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
								className="h-full bg-primary"
								title="85% Programs & Services"
							/>
							<motion.div
								initial={{ width: 0 }}
								whileInView={{ width: "10%" }}
								transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
								className="h-full bg-yellow-500"
								title="10% Operations"
							/>
							<motion.div
								initial={{ width: 0 }}
								whileInView={{ width: "5%" }}
								transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
								className="h-full bg-muted-foreground/30"
								title="5% Administration"
							/>
						</div>
						<div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
							<div className="flex items-center gap-2">
								<div className="h-3 w-3 rounded-full bg-primary" />
								<span className="font-body text-sm font-medium text-foreground">
									85% Programs & Services
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-3 w-3 rounded-full bg-yellow-500" />
								<span className="font-body text-sm font-medium text-foreground">
									10% Operations
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
								<span className="font-body text-sm font-medium text-foreground">
									5% Admin
								</span>
							</div>
						</div>
					</div>

					<AllocationChart donations={donations} />
				</div>

				<div className="mt-8">
					<DonationHistory donations={donations} />
				</div>

				<div className="mt-10 flex justify-end">
					<Button
						onClick={() => setShowDeleteModal(true)}
						variant="outline"
						disabled={!user}
						title={!user ? "Sign in to manage your account." : undefined}
						className="h-11 rounded-xl border-red-500 px-6 font-body text-red-500 transition-all hover:border-red-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
					>
						Delete Account
					</Button>
				</div>
			</main>

			{showDeleteModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
					<div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-[#FDFBF7] p-8 shadow-lg">
						<h2 className="font-heading text-xl font-bold text-foreground mb-2">
							Delete Account
						</h2>
						<p className="font-body text-base text-muted-foreground mb-6">
							Are you sure you want to delete your account? This action cannot
							be undone.
						</p>
						{deleteMutation.isError && (
							<p className="font-body mb-4 text-sm text-red-600">
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
								{deleteMutation.isPending ? "Deleting…" : "Confirm"}
							</Button>
						</div>
					</div>
				</div>
			)}

			<DonorFooter />
		</div>
	);
}
