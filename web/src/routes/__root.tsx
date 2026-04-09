import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import LandingFooter from "@/components/landing/LandingFooter";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import CookieBanner from "@/components/ui/cookie-banner";

const RootLayout = () => (
	<div className="min-h-screen bg-background text-foreground">
		<Outlet />
		<CookieBanner />
	</div>
);

function NotFound() {
	return (
		<div className="flex min-h-screen flex-col bg-background font-body">
			<Navbar />
			<main className="flex flex-1 flex-col items-center justify-center px-6 py-32 text-center">
				<p className="select-none font-heading text-8xl font-bold text-muted-foreground/20">
					404
				</p>
				<br />
				<h1 className="mt-4 font-heading text-3xl font-bold text-foreground">
					Page not found
				</h1>
				<br />
				<p className="mt-3 max-w-sm font-body text-sm text-muted-foreground">
					The page you're looking for doesn't exist or has been moved.
				</p>
				<div className="mt-8 flex gap-3">
					<Link to="/">
						<Button className="font-body bg-primary hover:bg-primary/90">
							Go home
						</Button>
					</Link>
					<Button
						variant="outline"
						className="font-body"
						onClick={() => window.history.back()}
					>
						Go back
					</Button>
				</div>
			</main>
			<LandingFooter />
		</div>
	);
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		component: RootLayout,
		notFoundComponent: NotFound,
	},
);
