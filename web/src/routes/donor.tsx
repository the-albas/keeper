import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
    girlsSupported: Math.floor(donations.reduce((sum, d) => sum + (d.amount || 0), 0) / 150),
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
              See how your generosity is making a difference in the lives of survivors.
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
            <h3 className="font-heading text-xl font-bold text-foreground mb-6 text-center">Where Your Money Goes</h3>
            <div className="h-6 w-full rounded-full overflow-hidden flex mb-8 shadow-inner max-w-lg mx-auto">
              <motion.div 
                initial={{ width: 0 }} whileInView={{ width: "85%" }} transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="h-full bg-primary" title="85% Programs & Services" 
              />
              <motion.div 
                initial={{ width: 0 }} whileInView={{ width: "10%" }} transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                className="h-full bg-yellow-500" title="10% Operations" 
              />
              <motion.div 
                initial={{ width: 0 }} whileInView={{ width: "5%" }} transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                className="h-full bg-muted-foreground/30" title="5% Administration" 
              />
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-body text-sm font-medium text-foreground">85% Programs & Services</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="font-body text-sm font-medium text-foreground">10% Operations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                <span className="font-body text-sm font-medium text-foreground">5% Admin</span>
              </div>
            </div>
          </div>

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
