import { DollarSign, Megaphone, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DonorMetricsData {
  totalDonated: number;
  girlsSupported: number;
  /** Distinct campaign names from the donor's gifts (excludes empty / general-only). */
  campaignNames: string[];
}

interface MetricConfig {
  key: "totalDonated" | "girlsSupported";
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
    <div className="space-y-4">
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

      {metrics.campaignNames.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-shadow">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-chart-4/15 text-chart-4 mb-4">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="font-heading text-lg font-bold text-foreground mb-3">Campaigns you&apos;ve supported</div>
          <ul className="flex flex-wrap gap-2">
            {metrics.campaignNames.map((name) => (
              <li
                key={name}
                className="font-body text-sm font-medium text-foreground bg-muted/60 border border-border rounded-full px-3 py-1"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
