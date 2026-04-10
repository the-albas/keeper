import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { Donation } from "@/components/admin/AdminMetrics";
import AllocationChart from "@/components/donor/AllocationChart";
import DonationHistory from "@/components/donor/DonationHistory";
import DonorFooter from "@/components/donor/DonorFooter";
import type { DonorMetricsData } from "@/components/donor/DonorMetrics";
import DonorMetrics from "@/components/donor/DonorMetrics";
import DonorNav from "@/components/donor/DonorNav";
import { Button } from "@/components/ui/button";
import { type AuthMeResponse, resolveApiUrl } from "@/lib/api";
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
	const res = await fetch(resolveApiUrl("/api/donor/donations"), {
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

function DonorDashboard() {
	const { data: user, isLoading: userLoading } = useQuery({
		queryKey: ["auth", "me"],
		queryFn: fetchCurrentUser,
		retry: false,
		staleTime: 60_000,
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
							{donations.length === 0
								? "Make a Difference Today"
								: "You're Changing Girls' Lives"}
						</h1>
						<p className="font-body mt-2 text-base text-muted-foreground">
							{donations.length === 0
								? "Your first donation could change a girl's life."
								: "See how your generosity is making a difference in the lives of survivors."}
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

				<div className="mt-8">
					<AllocationChart donations={donations} />
				</div>

				<div className="mt-8">
					<DonationHistory donations={donations} />
				</div>
			</main>

			<DonorFooter />
		</div>
	);
}
