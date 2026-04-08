import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import DonateSection from "@/components/landing/DonateSection";
import LandingFooter from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <DonateSection />
      </main>
      <LandingFooter />
    </div>
  );
}
