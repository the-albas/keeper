import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ImpactStats from "@/components/landing/ImpactStats";
import type { ImpactStatsData } from "@/components/landing/ImpactStats";
import AboutSection from "@/components/landing/AboutSection";
import DonateSection from "@/components/landing/DonateSection";
import MoneyFlow from "@/components/landing/MoneyFlow";
import LandingFooter from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/")({
  component: Landing,
});

const landingImpactStats: ImpactStatsData = {
  girlsServed: "250+",
  safehouses: "5",
  reintegration: "87%",
};

function Landing() {
  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      <Navbar />
      <HeroSection />
      <ImpactStats stats={landingImpactStats} />
      <AboutSection />
      <MoneyFlow />
      <DonateSection />
      <LandingFooter />
    </div>
  );
}
