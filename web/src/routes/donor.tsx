import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import DonorNav from "@/components/donor/DonorNav";
import DonorMetrics from "@/components/donor/DonorMetrics";
import AllocationChart from "@/components/donor/AllocationChart";
import OutcomesChart from "@/components/donor/OutcomesChart";
import DonationHistory from "@/components/donor/DonationHistory";
import DonorFooter from "@/components/donor/DonorFooter";
import type { Donation } from "@/components/admin/AdminMetrics";
import type { DonorMetricsData } from "@/components/donor/DonorMetrics";

export const Route = createFileRoute("/donor")({
  component: DonorDashboard,
});

function DonorDashboard() {
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      // TODO: Call your C# auth endpoint
      // const res = await fetch(`${API_BASE}/auth/me`);
      // return res.json();
      return { full_name: "Donor User", email: "donor@example.com" };
    },
  });

  const { data: donations = [], isLoading } = useQuery<Donation[]>({
    queryKey: ["donor", "donations"],
    queryFn: async () => {
      // TODO: Call your C# API endpoint filtered by donor
      // const res = await fetch(`${API_BASE}/donations?donor_email=${user?.email}`);
      // return res.json();
      return [];
    },
  });

  const metrics: DonorMetricsData = {
    totalDonated: donations.reduce((sum, d) => sum + (d.amount || 0), 0),
    girlsSupported: Math.max(1, Math.floor(donations.reduce((sum, d) => sum + (d.amount || 0), 0) / 150)),
    programsFunded: new Set(donations.map((d) => d.allocation).filter(Boolean)).size,
    safehousesReached: Math.min(5, Math.max(1, new Set(donations.map((d) => d.campaign).filter(Boolean)).size)),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <DonorNav user={user ?? null} />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Your Impact</h1>
          <p className="font-body text-base text-muted-foreground mt-1">
            See how your generosity is making a difference in the lives of survivors.
          </p>
        </div>

        <DonorMetrics metrics={metrics} />

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <AllocationChart donations={donations} />
          <OutcomesChart />
        </div>

        <div className="mt-8">
          <DonationHistory donations={donations} />
        </div>
      </main>
      <DonorFooter />
    </div>
  );
}
