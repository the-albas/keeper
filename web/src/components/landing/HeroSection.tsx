import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import heroBg from "@/assets/hero-bg.png";

export default function HeroSection() {
  return (
    <section id="mission" className="relative min-h-[90vh] flex items-center pt-16">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Sunrise over Philippine hills"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent text-xs font-body font-semibold tracking-widest uppercase mb-6">
            501(c)(3) Nonprofit Organization
          </span>

          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            A Safe Place to{" "}
            <span className="text-accent">Heal & Thrive</span>
          </h1>

          <p className="font-body text-lg text-white/80 leading-relaxed mb-10 max-w-xl">
            We operate safehouses in the Philippines for girls who are survivors of
            sexual abuse and sex trafficking. Every child deserves safety, healing,
            and a future full of hope.
          </p>

          <div className="flex flex-wrap gap-4">
            <a href="#donate">
              <Button
                size="lg"
                className="font-body text-base gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-8 h-12 rounded-lg shadow-lg"
              >
                <Heart className="h-5 w-5" />
                Donate Now
              </Button>
            </a>
            <a href="#about">
              <Button
                size="lg"
                variant="outline"
                className="font-body text-base gap-2 border-white/30 text-white hover:bg-white/10 px-8 h-12 rounded-lg"
              >
                Get Involved
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
