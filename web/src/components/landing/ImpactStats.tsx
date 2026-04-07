import { motion } from "framer-motion";
import { Users, Home, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
  description: string;
}

const stats: Stat[] = [
  {
    icon: Users,
    value: "250+",
    label: "Girls Served",
    description: "Survivors given safety and support since 2018",
  },
  {
    icon: Home,
    value: "5",
    label: "Safehouses",
    description: "Operating across the Philippines with local partners",
  },
  {
    icon: TrendingUp,
    value: "87%",
    label: "Reintegration Rate",
    description: "Successfully reintegrated into safe communities",
  },
];

export default function ImpactStats() {
  return (
    <section id="impact" className="py-24 bg-background">
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
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative bg-card rounded-2xl border border-border p-8 text-center group hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-2">
                {stat.value}
              </div>
              <div className="font-body text-base font-semibold text-foreground mb-2">
                {stat.label}
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
