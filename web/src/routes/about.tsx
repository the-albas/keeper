import { createFileRoute } from "@tanstack/react-router";
import AboutSection from "@/components/landing/AboutSection";
import LandingFooter from "@/components/landing/LandingFooter";
import Navbar from "@/components/landing/Navbar";

export const Route = createFileRoute("/about")({
	component: AboutPage,
});

function AboutPage() {
	return (
		<div className="min-h-screen bg-background font-body flex flex-col">
			<Navbar />
			<main className="flex-1 flex flex-col justify-center">
				<AboutSection />
			</main>
			<LandingFooter />
		</div>
	);
}
