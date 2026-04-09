import { createFileRoute } from "@tanstack/react-router";
import DonateSection from "@/components/landing/DonateSection";
import HeroSection from "@/components/landing/HeroSection";
import LandingFooter from "@/components/landing/LandingFooter";
import MoneyFlow from "@/components/landing/MoneyFlow";
import Navbar from "@/components/landing/Navbar";

export const Route = createFileRoute("/")({
	component: Landing,
});

function Landing() {
	return (
		<div className="min-h-screen bg-background font-body flex flex-col">
			<Navbar />
			<HeroSection />
			<DonateSection />
			<MoneyFlow />
			<LandingFooter />
		</div>
	);
}
