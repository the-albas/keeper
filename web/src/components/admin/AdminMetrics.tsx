import type { LucideIcon } from "lucide-react";
import { Calendar, DollarSign, Home, Users } from "lucide-react";

export interface Resident {
	id: string;
	status: string;
	case_status: string;
	resident_code: string;
	risk_level: string;
}

export interface Donation {
	id: string;
	amount: number;
	created_date: string;
	type?: string;
	campaign?: string;
	allocation?: string;
	donor_email?: string;
}

export interface Safehouse {
	id: string;
	name: string;
	location: string;
	status: string;
	capacity: number;
	current_occupancy: number;
}

interface MetricItem {
	icon: LucideIcon;
	value: string | number;
	label: string;
	sub: string;
	color: string;
}

export default function AdminMetrics({
	residents,
	donations,
	safehouses,
}: {
	residents: Resident[];
	donations: Donation[];
	safehouses: Safehouse[];
}) {
	const activeResidents = residents.filter((r) => r.status === "Active").length;
	const recentDonations = donations
		.slice(0, 30)
		.reduce((s, d) => s + (d.amount || 0), 0);
	const upcomingConferences = residents.filter(
		(r) => r.case_status === "Assessment" || r.case_status === "Active Care",
	).length;

	const metrics: MetricItem[] = [
		{
			icon: Users,
			value: activeResidents,
			label: "Active Residents",
			sub: "Across all safehouses",
			color: "bg-primary/10 text-primary",
		},
		{
			icon: DollarSign,
			value: `₱${recentDonations.toLocaleString("en-PH")}`,
			label: "Recent Donations",
			sub: "Last 30 entries",
			color: "bg-emerald-100 text-emerald-600",
		},
		{
			icon: Calendar,
			value: upcomingConferences,
			label: "Pending Reviews",
			sub: "Cases needing conferences",
			color: "bg-chart-3/15 text-chart-3",
		},
		{
			icon: Home,
			value: safehouses.filter((s) => s.status === "Active").length,
			label: "Active Safehouses",
			sub: `${safehouses.length} total`,
			color: "bg-chart-5/15 text-chart-5",
		},
	];

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
			{metrics.map((m) => (
				<div
					key={m.label}
					className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow"
				>
					<div
						className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${m.color} mb-3`}
					>
						<m.icon className="h-5 w-5" />
					</div>
					<div className="font-heading text-2xl font-bold text-foreground">
						{m.value}
					</div>
					<div className="font-body text-sm font-medium text-foreground mt-0.5">
						{m.label}
					</div>
					<div className="font-body text-xs text-muted-foreground">{m.sub}</div>
				</div>
			))}
		</div>
	);
}
