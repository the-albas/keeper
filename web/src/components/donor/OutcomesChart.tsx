import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const outcomeData = [
  { name: "Education\nProgress", value: 78 },
  { name: "Health\nImprovement", value: 85 },
  { name: "Reintegration\nRate", value: 87 },
  { name: "Skills\nDevelopment", value: 72 },
];

export default function OutcomesChart() {
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Anonymized Resident Outcomes</h3>
      <p className="font-body text-xs text-muted-foreground mb-6">Aggregated data — no individual information disclosed</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={outcomeData} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(40,15%,88%)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fontFamily: "Inter", fill: "hsl(210,10%,45%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fontFamily: "Inter", fill: "hsl(210,10%,45%)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(val) => [`${val}%`, "Rate"]}
            contentStyle={{ borderRadius: "12px", border: "1px solid hsl(40,15%,88%)", fontFamily: "Inter" }}
          />
          <Bar dataKey="value" fill="hsl(174, 62%, 28%)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
