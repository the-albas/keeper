import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Donation } from "../admin/AdminMetrics";

const COLORS = [
  "hsl(174, 62%, 28%)",
  "hsl(36, 90%, 55%)",
  "hsl(210, 60%, 45%)",
  "hsl(340, 65%, 55%)",
  "hsl(145, 55%, 42%)",
  "hsl(270, 50%, 55%)",
];

export default function AllocationChart({ donations }: { donations: Donation[] }) {
  const allocations: Record<string, number> = {};
  donations.forEach((d) => {
    const key = d.allocation || "Unallocated";
    allocations[key] = (allocations[key] || 0) + (d.amount || 0);
  });

  const data = Object.entries(allocations).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Donation Allocation</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground font-body text-sm">
          No allocation data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Where Your Donations Go</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val) => `$${Number(val).toLocaleString()}`}
            contentStyle={{ borderRadius: "12px", border: "1px solid hsl(40,15%,88%)", fontFamily: "Inter" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: "13px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
