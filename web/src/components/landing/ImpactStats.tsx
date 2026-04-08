import { motion, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  description: string;
}

const stats: Stat[] = [
  {
    value: 250,
    suffix: "+",
    label: "Survivors Empowered",
    description: "Survivors given safety and support since 2018",
  },
  {
    value: 5,
    suffix: "",
    label: "Safehouses",
    description: "Operating across the Philippines with local partners",
  },
  {
    value: 87,
    suffix: "%",
    label: "Reintegration Rate",
    description: "Successfully reintegrated into safe communities",
  },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: 2.5,
        ease: "easeOut",
        onUpdate(v) {
          setCount(Math.floor(v));
        },
      });
      return () => controls.stop();
    }
  }, [value, isInView]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export default function ImpactStats() {
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
        <div className="grid md:grid-cols-3 gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }}
              className="relative p-6 text-center"
            >
              <div className="font-heading text-6xl md:text-7xl font-bold text-primary mb-4 drop-shadow-sm">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="font-body text-lg font-semibold text-foreground mb-2">
                {stat.label}
              </div>
              <p className="font-body text-base text-muted-foreground leading-relaxed">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
