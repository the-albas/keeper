import { DollarSign, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DonorMetricsData {
  totalDonated: number;
  girlsSupported: number;
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
  { key: "girlsSupported", label: "Lives Empowered", icon: Users, format: (v) => v || 0, color: "bg-yellow-500/20 text-yellow-600" },
];

export default function DonorMetrics({ metrics }: { metrics: DonorMetricsData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
