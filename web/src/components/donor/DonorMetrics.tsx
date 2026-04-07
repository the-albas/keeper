import { DollarSign, Users, BookOpen, Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DonorMetricsData {
  totalDonated: number;
  girlsSupported: number;
  programsFunded: number;
  safehousesReached: number;
}

interface MetricConfig {
  key: keyof DonorMetricsData;
  label: string;
  icon: LucideIcon;
  format: (v: number) => string | number;
  color: string;
}

const metricConfig: MetricConfig[] = [
  { key: "totalDonated", label: "Total Donated", icon: DollarSign, format: (v) => `$${(v || 0).toLocaleString()}`, color: "bg-primary/10 text-primary" },
  { key: "girlsSupported", label: "Girls Supported", icon: Users, format: (v) => v || 0, color: "bg-accent/15 text-accent" },
  { key: "programsFunded", label: "Programs Funded", icon: BookOpen, format: (v) => v || 0, color: "bg-chart-3/15 text-chart-3" },
  { key: "safehousesReached", label: "Safehouses Reached", icon: Home, format: (v) => v || 0, color: "bg-chart-5/15 text-chart-5" },
];

export default function DonorMetrics({ metrics }: { metrics: DonorMetricsData }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metricConfig.map((m) => (
        <div key={m.key} className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-shadow">
          <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${m.color} mb-4`}>
            <m.icon className="h-5 w-5" />
          </div>
          <div className="font-heading text-2xl md:text-3xl font-bold text-foreground">
            {m.format(metrics[m.key])}
          </div>
          <div className="font-body text-sm text-muted-foreground mt-1">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
