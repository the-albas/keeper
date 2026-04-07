import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { Donation } from "../admin/AdminMetrics";

const typeColors: Record<string, string> = {
  Monetary: "bg-primary/10 text-primary border-primary/20",
  InKind: "bg-accent/15 text-accent border-accent/20",
  Time: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  Skills: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  SocialMedia: "bg-chart-4/15 text-chart-4 border-chart-4/20",
};

export default function DonationHistory({ donations }: { donations: Donation[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-6 pb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">Donation History</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
              <TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
              <TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign</TableHead>
              <TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
              <TableHead className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allocation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-body text-sm">
                  No donations recorded yet
                </TableCell>
              </TableRow>
            )}
            {donations.map((d) => (
              <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-body text-sm text-foreground">
                  {format(new Date(d.created_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${
                      typeColors[d.type ?? ""] || "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {d.type}
                  </span>
                </TableCell>
                <TableCell className="font-body text-sm text-foreground">{d.campaign || "—"}</TableCell>
                <TableCell className="font-body text-sm font-semibold text-foreground">
                  ${(d.amount || 0).toLocaleString()}
                </TableCell>
                <TableCell className="font-body text-sm text-muted-foreground">{d.allocation || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
