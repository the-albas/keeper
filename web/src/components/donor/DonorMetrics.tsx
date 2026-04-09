import type { LucideIcon } from "lucide-react";
import { DollarSign, Megaphone, Users } from "lucide-react";

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
	{
		key: "totalDonated",
		label: "Total Donated",
		icon: DollarSign,
		format: (v) => `$${(v || 0).toLocaleString()}`,
		color: "bg-primary/10 text-primary",
	},
	{
		key: "girlsSupported",
		label: "Lives Empowered",
		icon: Users,
		format: (v) => v || 0,
		color: "bg-yellow-500/20 text-yellow-600",
	},
];

export default function DonorMetrics({
	metrics,
}: {
	metrics: DonorMetricsData;
}) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{metricConfig.map((m) => (
					<div
						key={m.key}
						className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
					>
						<div
							className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${m.color}`}
						>
							<m.icon className="h-5 w-5" />
						</div>
						<div className="font-heading text-2xl font-bold text-foreground md:text-3xl">
							{m.format(metrics[m.key])}
						</div>
						<div className="font-body mt-1 text-sm text-muted-foreground">
							{m.label}
						</div>
					</div>
				))}
			</div>

			{metrics.campaignNames.length > 0 && (
				<div className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
					<div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-chart-4/15 text-chart-4">
						<Megaphone className="h-5 w-5" />
					</div>
					<div className="font-heading mb-3 text-lg font-bold text-foreground">
						Campaigns you&apos;ve supported
					</div>
					<ul className="flex flex-wrap gap-2">
						{metrics.campaignNames.map((name) => (
							<li
								key={name}
								className="rounded-full border border-border bg-muted/60 px-3 py-1 font-body text-sm font-medium text-foreground"
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
