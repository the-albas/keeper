import { createFileRoute } from "@tanstack/react-router";
import ImpactStats from "@/components/landing/ImpactStats";
import LandingFooter from "@/components/landing/LandingFooter";
import Navbar from "@/components/landing/Navbar";

export const Route = createFileRoute("/work")({
	component: WorkPage,
});

function WorkPage() {
	return (
		<div className="min-h-screen bg-background font-body flex flex-col">
			<Navbar />
			<main className="flex-1 flex flex-col pt-12 pb-24">
				<div className="max-w-7xl mx-auto px-6 w-full mb-12 flex flex-col items-center">
					<h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground text-center">
						The Work You Make Possible
					</h1>
					<br />
					<p className="font-body text-base text-muted-foreground text-center mt-4 max-w-2xl text-balance">
						Your generous contributions directly fund life-changing
						interventions, safe shelter, and long-term recovery for survivors
						across the Philippines. Here is a look at what we've accomplished
						together.
					</p>
				</div>
				<ImpactStats useDynamicData />
			</main>
			<LandingFooter />
		</div>
	);
}
