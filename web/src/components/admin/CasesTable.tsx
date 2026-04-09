import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Resident } from "./AdminMetrics";

const riskColors: Record<string, string> = {
	Low: "bg-chart-5/15 text-chart-5 border-chart-5/20",
	Medium: "bg-accent/15 text-accent border-accent/20",
	High: "bg-chart-4/15 text-chart-4 border-chart-4/20",
	Critical: "bg-destructive/15 text-destructive border-destructive/20",
};

export default function CasesTable({ residents }: { residents: Resident[] }) {
	const needsAttention = residents
		.filter(
			(r) =>
				r.status === "Active" &&
				(r.risk_level === "High" ||
					r.risk_level === "Critical" ||
					r.case_status === "Assessment"),
		)
		.slice(0, 8);

	return (
		<div className="bg-card rounded-2xl border border-border overflow-hidden">
			<div className="p-6 pb-4">
				<h3 className="font-heading text-lg font-semibold text-foreground">
					Cases Needing Attention
				</h3>
			</div>
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/50">
						<TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Resident
						</TableHead>
						<TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Risk Level
						</TableHead>
						<TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Case Status
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{needsAttention.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={3}
								className="text-center py-10 text-muted-foreground font-body text-sm"
							>
								No cases flagged for attention
							</TableCell>
						</TableRow>
					)}
					{needsAttention.map((r) => (
						<TableRow
							key={r.id}
							className="hover:bg-muted/30 transition-colors"
						>
							<TableCell className="font-body text-sm font-medium text-foreground">
								{r.resident_code}
							</TableCell>
							<TableCell>
								<span
									className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${
										riskColors[r.risk_level] ||
										"bg-muted text-muted-foreground border-border"
									}`}
								>
									{r.risk_level}
								</span>
							</TableCell>
							<TableCell className="font-body text-sm text-muted-foreground">
								{r.case_status}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
