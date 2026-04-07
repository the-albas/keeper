import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMetrics from "@/components/admin/AdminMetrics";
import DonationTrends from "@/components/admin/DonationTrends";
import OccupancyList from "@/components/admin/OccupancyList";
import CasesTable from "@/components/admin/CasesTable";
import ActivityFeed from "@/components/admin/ActivityFeed";
import QuickActions from "@/components/admin/QuickActions";
import type { Resident, Donation, Safehouse } from "@/components/admin/AdminMetrics";
import type { Activity } from "@/components/admin/ActivityFeed";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      // TODO: Call your C# auth endpoint
      // const res = await fetch(`${API_BASE}/auth/me`);
      // return res.json();
      return { full_name: "Admin User", email: "admin@havenshield.org" };
    },
  });

  const { data: residents = [], isLoading: residentsLoading } = useQuery<Resident[]>({
    queryKey: ["residents"],
    queryFn: async () => {
      // TODO: Call your C# API endpoint
      // const res = await fetch(`${API_BASE}/residents`);
      // return res.json();
      return [];
    },
  });

  const { data: donations = [], isLoading: donationsLoading } = useQuery<Donation[]>({
    queryKey: ["donations"],
    queryFn: async () => {
      // TODO: Call your C# API endpoint
      // const res = await fetch(`${API_BASE}/donations`);
      // return res.json();
      return [];
    },
  });

  const { data: safehouses = [], isLoading: safehousesLoading } = useQuery<Safehouse[]>({
    queryKey: ["safehouses"],
    queryFn: async () => {
      // TODO: Call your C# API endpoint
      // const res = await fetch(`${API_BASE}/safehouses`);
      // return res.json();
      return [];
    },
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["activities"],
    queryFn: async () => {
      // TODO: Call your C# API endpoint
      // const res = await fetch(`${API_BASE}/activities`);
      // return res.json();
      return [];
    },
  });

  const loading = residentsLoading || donationsLoading || safehousesLoading || activitiesLoading;

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
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="font-body text-base text-muted-foreground mt-1">
            Welcome back, {user?.full_name?.split(" ")[0] || "Admin"}. Here&apos;s today&apos;s overview.
          </p>
        </div>

        <AdminMetrics residents={residents} donations={donations} safehouses={safehouses} />

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <DonationTrends donations={donations} />
          </div>
          <OccupancyList safehouses={safehouses} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <CasesTable residents={residents} />
          </div>
          <div className="space-y-6">
            <QuickActions />
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </main>
    </div>
  );
}
