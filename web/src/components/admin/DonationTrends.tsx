import { format } from "date-fns";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { Donation } from "./AdminMetrics";

export default function DonationTrends({
	donations,
}: {
	donations: Donation[];
}) {
	const monthly: Record<string, number> = {};
	donations.forEach((d) => {
		const key = format(new Date(d.created_date), "MMM yy");
		monthly[key] = (monthly[key] || 0) + (d.amount || 0);
	});

	const data = Object.entries(monthly)
		.map(([name, amount]) => ({ name, amount }))
		.slice(-12);

	return (
		<div className="bg-card rounded-2xl border border-border p-6">
			<h3 className="font-heading text-lg font-semibold text-foreground mb-1">
				Donation Trends
			</h3>
			<p className="font-body text-xs text-muted-foreground mb-6">
				Monthly donations over time
			</p>
			<ResponsiveContainer width="100%" height={260}>
				<AreaChart data={data}>
					<defs>
						<linearGradient id="donationGrad" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor="hsl(174, 62%, 28%)"
								stopOpacity={0.3}
							/>
							<stop
								offset="95%"
								stopColor="hsl(174, 62%, 28%)"
								stopOpacity={0}
							/>
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="hsl(40,15%,88%)" />
					<XAxis
						dataKey="name"
						tick={{
							fontSize: 11,
							fontFamily: "Inter",
							fill: "hsl(210,10%,45%)",
						}}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						tick={{
							fontSize: 11,
							fontFamily: "Inter",
							fill: "hsl(210,10%,45%)",
						}}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v) =>
							`$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
						}
					/>
					<Tooltip
						formatter={(val) => [`$${Number(val).toLocaleString()}`, "Amount"]}
						contentStyle={{
							borderRadius: "12px",
							border: "1px solid hsl(40,15%,88%)",
							fontFamily: "Inter",
						}}
					/>
					<Area
						type="monotone"
						dataKey="amount"
						stroke="hsl(174, 62%, 28%)"
						strokeWidth={2}
						fill="url(#donationGrad)"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
