import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { Donation, Resident, Safehouse } from "@/components/admin/AdminMetrics";
import AdminMetrics from "@/components/admin/AdminMetrics";
import AdminSidebar from "@/components/admin/AdminSidebar";
import CasesTable from "@/components/admin/CasesTable";
import DonationTrends from "@/components/admin/DonationTrends";
import OccupancyList from "@/components/admin/OccupancyList";
import { apiGetJson, type AuthMeResponse } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
	beforeLoad: async ({ context }) => {
		await requireRole(context.queryClient, "Admin", "Staff");
	},
	component: AdminDashboard,
});

function AdminDashboard() {
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const me = await apiGetJson<AuthMeResponse>("/api/auth/me");
      return {
        email: me.email,
        full_name: me.email?.split("@")[0] ?? "Admin",
      };
    }
  });

  const { data: residents = [], isLoading: residentsLoading } = useQuery<Resident[]>({
    queryKey: ["residents"],
    queryFn: () => apiGetJson<Resident[]>("/api/admin-data/residents"),
  });

  const { data: donations = [], isLoading: donationsLoading } = useQuery<Donation[]>({
    queryKey: ["donations"],
    queryFn: () => apiGetJson<Donation[]>("/api/admin-data/donations"),
  });

  const { data: donationsForTrend = [], isLoading: donationsTrendLoading } = useQuery<
    Donation[]
  >({
    queryKey: ["donations", "dashboard", "last-25"],
    staleTime: 60_000,
    queryFn: () => apiGetJson<Donation[]>("/api/admin-data/donations?take=25"),
  });

  const { data: safehouses = [], isLoading: safehousesLoading } = useQuery<Safehouse[]>({
    queryKey: ["safehouses"],
    queryFn: () => apiGetJson<Safehouse[]>("/api/admin-data/safehouses"),
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["activities"],
    queryFn: () => apiGetJson<Activity[]>("/api/admin-data/activities"),
  });

	const loading =
		residentsLoading ||
		donationsLoading ||
		donationsTrendLoading ||
		safehousesLoading ||
		activitiesLoading;

	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background font-body">
			<AdminSidebar user={user ?? null} />
			<main className="md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
				<div className="mb-8">
					<h1 className="font-heading text-3xl font-bold text-foreground">
						Dashboard
					</h1>
					<p className="font-body text-base text-muted-foreground mt-1">
						Welcome back,{" "}
						{user?.email?.split("@")[0] || "Admin"}. Here&apos;s today&apos;s
						overview.
					</p>
				</div>

				<AdminMetrics
					residents={residents}
					donations={donations}
					safehouses={safehouses}
				/>

				<div className="grid lg:grid-cols-3 gap-6 mt-8">
					<div className="lg:col-span-2">
						<DonationTrends donations={donationsForTrend} />
					</div>
					<OccupancyList safehouses={safehouses} />
				</div>

				<div className="grid lg:grid-cols-3 gap-6 mt-6">
					<div className="lg:col-span-2">
						<CasesTable residents={residents} />
						<DonationTrends donations={donations} />
					</div>
					<div className="flex flex-col h-full">
						<OccupancyList safehouses={safehouses} />
					</div>
				</div>
			</main>
		</div>
	);
}
