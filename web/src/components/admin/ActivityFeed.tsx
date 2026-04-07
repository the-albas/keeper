import { formatDistanceToNow } from "date-fns";
import { HandCoins, Heart, Home, AlertTriangle, GraduationCap, Users, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Activity {
  id: string;
  type: string;
  description: string;
  created_date: string;
  performed_by?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Donation: HandCoins,
  Counseling: Heart,
  HomeVisit: Home,
  Incident: AlertTriangle,
  CaseConference: Calendar,
  Admission: Users,
  Graduation: GraduationCap,
};

const colorMap: Record<string, string> = {
  Donation: "bg-primary/10 text-primary",
  Counseling: "bg-chart-4/15 text-chart-4",
  HomeVisit: "bg-chart-3/15 text-chart-3",
  Incident: "bg-destructive/15 text-destructive",
  CaseConference: "bg-accent/15 text-accent",
  Admission: "bg-chart-5/15 text-chart-5",
  Graduation: "bg-chart-6/15 text-chart-6",
};

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  const recent = activities.slice(0, 8);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {recent.length === 0 && (
          <p className="font-body text-sm text-muted-foreground py-8 text-center">No recent activity</p>
        )}
        {recent.map((a) => {
          const Icon = iconMap[a.type] || Calendar;
          const color = colorMap[a.type] || "bg-muted text-muted-foreground";
          return (
            <div key={a.id} className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${color} flex items-center justify-center mt-0.5`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-foreground leading-snug">{a.description}</p>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}
                  {a.performed_by && ` · ${a.performed_by}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
