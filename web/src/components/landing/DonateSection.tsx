import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const amounts = [25, 50, 100, 250, 500];

export default function DonateSection() {
  const [selectedAmount, setSelectedAmount] = useState<
    number | "custom" | null
  >(50);

  return (
    <section id="donate" className="py-24 bg-background">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-body font-semibold tracking-widest uppercase mb-4">
            Make a Difference
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance mx-auto">
            Your Generous Donations Create Safe Destinations.
          </h2>
          <p className="font-body text-base text-muted-foreground leading-relaxed mb-10 px-4 text-balance">
            We depend entirely on donations to operate. Every contribution
            directly funds shelter, food, counseling, education, and a new
            beginning for a survivor.
          </p>
          <br />

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {amounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedAmount(amt)}
                className={`font-body font-semibold px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedAmount === amt
                    ? "border-yellow-500 bg-yellow-500 text-black shadow-sm"
                    : "border-border hover:border-yellow-500/50 hover:bg-yellow-500/5 text-primary"
                }`}
              >
                ${amt}
              </button>
            ))}
            <button
              onClick={() => setSelectedAmount("custom")}
              className={`font-body text-base font-semibold px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
                selectedAmount === "custom"
                  ? "border-yellow-500 bg-yellow-500/10 text-yellow-600 shadow-sm"
                  : "border-border hover:border-yellow-500/50 hover:bg-yellow-500/5 text-primary"
              }`}
            >
              Custom
            </button>
          </div>

          <Button
            size="lg"
            className="font-body text-base gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-12 h-14 rounded-xl shadow-lg text-lg"
          >
            <Heart className="h-5 w-5" />
            Donate Now
          </Button>
          <br />
          <br />
          <p className="font-body text-xs text-primary mt-6">
            Keeper is a registered 501(c)(3) nonprofit. All donations are
            tax-deductible. EIN: 12-3456789
          </p>
        </motion.div>
      </div>
    </section>
  );
}
