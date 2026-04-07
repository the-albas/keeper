import { Progress } from "@/components/ui/progress";
import type { Safehouse } from "./AdminMetrics";

export default function OccupancyList({ safehouses }: { safehouses: Safehouse[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Safehouse Occupancy</h3>
      <div className="space-y-4">
        {safehouses.length === 0 && (
          <p className="font-body text-sm text-muted-foreground py-8 text-center">No safehouses configured</p>
        )}
        {safehouses.map((sh) => {
          const pct = sh.capacity > 0 ? Math.round((sh.current_occupancy / sh.capacity) * 100) : 0;
          return (
            <div key={sh.id} className="space-y-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-body text-sm font-medium text-foreground">{sh.name}</span>
                  <span className="font-body text-xs text-muted-foreground ml-2">{sh.location}</span>
                </div>
                <span className="font-body text-sm font-semibold text-foreground">
                  {sh.current_occupancy || 0}/{sh.capacity}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
