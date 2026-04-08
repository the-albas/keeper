import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Heart, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import heroBg from "@/assets/hero-bg.png";

export default function HeroSection() {
  return (
    <section id="mission" className="relative min-h-screen flex items-center pt-16">
      <div className="absolute inset-0">
        <div
          className="w-full h-full bg-cover bg-center bg-fixed"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >


          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            A Safe Place to{" "}
            <span className="text-yellow-500 text-glow">Heal & Thrive</span>
          </h1>

          <p className="font-body text-lg text-white/80 leading-relaxed max-w-xl text-balance mb-32">
            We operate safehouses in the Philippines for girls who are survivors of
            sexual abuse and sex trafficking. Every child deserves safety, healing,
            and a future full of hope. With your contribution, we can turn that hope into reality.
          </p>

          <div className="flex flex-wrap gap-4 mt-12">
            <Link to="/" hash="donate">
              <Button
                size="lg"
                className="font-body text-base gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-8 h-12 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-105 transition-all duration-300"
              >
                <Heart className="h-5 w-5" />
                Donate Now
              </Button>
            </Link>
            <Link to="/about">
              <Button
                size="lg"
                variant="ghost"
                className="font-body text-base gap-2 border-2 border-white/50 text-white hover:bg-white/10 hover:text-white px-8 h-12 rounded-lg hover:scale-105 transition-all duration-300"
              >
                Get Involved
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
