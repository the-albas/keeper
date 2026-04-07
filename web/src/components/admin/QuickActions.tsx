import { Button } from "@/components/ui/button";
import { UserPlus, DollarSign, FileText, Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  color: string;
}

const actions: QuickAction[] = [
  { icon: UserPlus, label: "Add Resident", color: "bg-primary hover:bg-primary/90 text-primary-foreground" },
  { icon: DollarSign, label: "Log Donation", color: "bg-accent hover:bg-accent/90 text-accent-foreground" },
  { icon: FileText, label: "Record Session", color: "bg-chart-3 hover:bg-chart-3/90 text-white" },
  { icon: Home, label: "Log Visit", color: "bg-chart-5 hover:bg-chart-5/90 text-white" },
];

export default function QuickActions() {
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Button
            key={a.label}
            className={`h-auto py-4 flex-col gap-2 rounded-xl font-body text-sm ${a.color}`}
          >
            <a.icon className="h-5 w-5" />
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
