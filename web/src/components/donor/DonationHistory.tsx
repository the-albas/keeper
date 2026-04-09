import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Donation } from "../admin/AdminMetrics";

const typeColors: Record<string, string> = {
	Monetary: "bg-primary/10 text-primary border-primary/20",
	InKind: "bg-accent/15 text-accent border-accent/20",
	Time: "bg-chart-3/15 text-chart-3 border-chart-3/20",
	Skills: "bg-chart-5/15 text-chart-5 border-chart-5/20",
	SocialMedia: "bg-chart-4/15 text-chart-4 border-chart-4/20",
};

export default function DonationHistory({
	donations,
}: {
	donations: Donation[];
}) {
	return (
		<div className="overflow-hidden rounded-2xl border border-border bg-card">
			<div className="p-6 pb-4">
				<h3 className="font-heading text-lg font-semibold text-foreground">
					Donation History
				</h3>
			</div>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-yellow-600">
								Date
							</TableHead>
							<TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-yellow-600">
								Type
							</TableHead>
							<TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-yellow-600">
								Campaign
							</TableHead>
							<TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-yellow-600">
								Amount
							</TableHead>
							<TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-yellow-600">
								Allocation
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{donations.length === 0 && (
							<TableRow>
								<TableCell colSpan={5} className="py-16 text-center">
									<div className="flex flex-col items-center justify-center space-y-4">
										<p className="font-body text-base font-medium text-muted-foreground">
											Your donation history will appear here once you
											contribute.
										</p>
										<Link to="/" hash="donate">
											<Button className="h-10 gap-2 rounded-lg bg-yellow-500 px-6 font-body text-black shadow-sm hover:bg-yellow-600">
												<Heart className="h-4 w-4" />
												Donate Now
											</Button>
										</Link>
									</div>
								</TableCell>
							</TableRow>
						)}
						{donations.map((d) => (
							<TableRow
								key={d.id}
								className="transition-colors even:bg-muted/20 hover:bg-muted/30"
							>
								<TableCell className="font-body text-sm text-foreground">
									{format(new Date(d.created_date), "MMM d, yyyy")}
								</TableCell>
								<TableCell>
									<span
										className={`inline-flex rounded-full border px-2.5 py-0.5 font-body text-xs font-medium ${
											typeColors[d.type ?? ""] ||
											"border-border bg-muted text-muted-foreground"
										}`}
									>
										{d.type ?? "—"}
									</span>
								</TableCell>
								<TableCell className="font-body text-sm text-foreground">
									{d.campaign || "—"}
								</TableCell>
								<TableCell className="font-body text-sm font-semibold text-foreground">
									${(d.amount || 0).toLocaleString()}
								</TableCell>
								<TableCell className="font-body text-sm text-muted-foreground">
									{d.allocation || "—"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
