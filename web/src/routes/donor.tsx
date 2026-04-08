import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getApiBaseUrl } from "@/lib/api";
import DonorNav from "@/components/donor/DonorNav";
import DonorMetrics from "@/components/donor/DonorMetrics";
import AllocationChart from "@/components/donor/AllocationChart";
// import OutcomesChart from "@/components/donor/OutcomesChart";
import DonationHistory from "@/components/donor/DonationHistory";
import DonorFooter from "@/components/donor/DonorFooter";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { Donation } from "@/components/admin/AdminMetrics";
import type { DonorMetricsData } from "@/components/donor/DonorMetrics";

export const Route = createFileRoute("/donor")({
  component: DonorDashboard,
});

async function fetchCurrentUser() {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;
  const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email: string };
  return { email: data.email, full_name: data.email.split("@")[0] };
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
      const body = (await res.json()) as { title?: string; errors?: Record<string, string[]> };
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

  const { data: user } = useQuery({
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
    girlsSupported: Math.floor(
      donations.reduce((sum, d) => sum + (d.amount || 0), 0) / 150
    ),
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
        <div className="bg-[#FDFBF7] border-t-4 border-t-yellow-500 rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              {metrics.girlsSupported > 0
                ? `You Changed ${metrics.girlsSupported} Girls' Lives`
                : "You're Changing Girls' Lives"}
            </h1>
            <p className="font-body text-base text-muted-foreground mt-2">
              See how your generosity is making a difference in the lives of
              survivors.
            </p>
          </div>
          <Link to="/" hash="donate">
            <Button className="font-body gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-6 h-11 rounded-xl shadow-md transition-all">
              <Heart className="h-4 w-4" />
              Donate Again
            </Button>
          </Link>
        </div>

        <DonorMetrics metrics={metrics} />

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col justify-center shadow-sm">
            <h3 className="font-heading text-xl font-bold text-foreground mb-6 text-center">
              Where Your Money Goes
            </h3>
            <div className="h-6 w-full rounded-full overflow-hidden flex mb-8 shadow-inner max-w-lg mx-auto">
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
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-body text-sm font-medium text-foreground">
                  85% Programs & Services
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="font-body text-sm font-medium text-foreground">
                  10% Operations
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
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
            className="font-body border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-600 px-6 h-11 rounded-xl transition-all disabled:opacity-50"
          >
            Delete Account
          </Button>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#FDFBF7] rounded-2xl border border-border shadow-lg p-8 max-w-md w-full mx-4">
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">
              Delete Account
            </h2>
            <p className="font-body text-base text-muted-foreground mb-6">
              Are you sure you want to delete your account? This action cannot
              be undone.
            </p>
            {deleteMutation.isError && (
              <p className="font-body text-sm text-red-600 mb-4">
                {(deleteMutation.error as Error).message}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  deleteMutation.reset();
                  setShowDeleteModal(false);
                }}
                disabled={deleteMutation.isPending}
                className="font-body border-border text-foreground hover:bg-muted px-5 h-10 rounded-xl transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="font-body bg-red-500 hover:bg-red-600 text-white px-5 h-10 rounded-xl transition-all"
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
