import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ImpactStats from "@/components/landing/ImpactStats";
import AboutSection from "@/components/landing/AboutSection";
import DonateSection from "@/components/landing/DonateSection";
import LandingFooter from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />
      <HeroSection />
      <ImpactStats />
      <AboutSection />
      <DonateSection />
      <LandingFooter />
    </div>
  );
}
