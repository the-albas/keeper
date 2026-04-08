import { motion } from "framer-motion";
import { Home, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  useGirlsServedMetric,
  useReintegrationRateMetric,
  useSafehousesMetric,
} from "@/components/landing/useImpactMetrics";

export type ImpactStatsData = {
  girlsServed: string;
  safehouses: string;
  reintegration: string;
};

const defaultStats: ImpactStatsData = {
  girlsServed: "250+",
  safehouses: "5",
  reintegration: "87%",
};

function ImpactStatCard({
  icon: Icon,
  label,
  description,
  displayValue,
  motionDelay = 0,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  displayValue: string;
  motionDelay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: motionDelay, duration: 0.5 }}
      className="relative bg-card rounded-2xl border border-border p-8 text-center group hover:shadow-lg hover:border-primary/20 transition-all duration-300"
    >
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        <Icon className="h-6 w-6" />
      </div>
      <div className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-2 min-h-[3rem] flex items-center justify-center">
        {displayValue}
      </div>
      <div className="font-body text-base font-semibold text-foreground mb-2">{label}</div>
      <p className="font-body text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function ImpactStats({ stats = defaultStats }: { stats?: ImpactStatsData }) {
  const girlsServedMetric = useGirlsServedMetric();
  const safehousesMetric = useSafehousesMetric();
  const reintegrationMetric = useReintegrationRateMetric();

  const resolvedStats: ImpactStatsData = {
    girlsServed: girlsServedMetric.data?.displayValue ?? stats.girlsServed,
    safehouses: safehousesMetric.data?.displayValue ?? stats.safehouses,
    reintegration: reintegrationMetric.data?.displayValue ?? stats.reintegration,
  };

  return (
    <section id="impact" className="py-24 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-body font-semibold tracking-widest uppercase mb-4">
            Our Impact
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Measurable Change, Real Lives
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <ImpactStatCard
            icon={Users}
            label="Girls Served"
            description="Survivors given safety and support since 2018"
            displayValue={resolvedStats.girlsServed}
            motionDelay={0}
          />
          <ImpactStatCard
            icon={Home}
            label="Safehouses"
            description="Operating across the Philippines with local partners"
            displayValue={resolvedStats.safehouses}
            motionDelay={0.15}
          />
          <ImpactStatCard
            icon={TrendingUp}
            label="Reintegration Rate"
            description="Successfully reintegrated into safe communities"
            displayValue={resolvedStats.reintegration}
            motionDelay={0.3}
          />
        </div>
      </div>
    </section>
  );
}
