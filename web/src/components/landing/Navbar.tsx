import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Navbar() {
	const { user, isStaffOrAdmin } = useAuth();

	return (
		<header className="sticky top-0 left-0 right-0 z-50 flex w-full flex-col shadow-sm">
			<nav className="w-full border-b border-border bg-white/95 backdrop-blur-md">
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
					<Link to="/" className="flex items-center gap-3">
						<span className="font-heading text-xl font-semibold tracking-tight text-foreground">
							Keeper
						</span>
					</Link>

					<div className="hidden items-center gap-8 md:flex">
						<Link
							to="/"
							className="font-body text-sm font-medium text-muted-foreground transition-colors hover:text-yellow-600 [&.active]:font-semibold [&.active]:text-yellow-600"
						>
							Home
						</Link>
						<Link
							to="/work"
							className="font-body text-sm font-medium text-muted-foreground transition-colors hover:text-yellow-600 [&.active]:font-semibold [&.active]:text-yellow-600"
						>
							Our Work
						</Link>
						<Link
							to="/about"
							className="font-body text-sm font-medium text-muted-foreground transition-colors hover:text-yellow-600 [&.active]:font-semibold [&.active]:text-yellow-600"
						>
							About
						</Link>
						{isStaffOrAdmin && (
							<Link
								to="/admin"
								className="font-body text-sm font-medium text-muted-foreground transition-colors hover:text-yellow-600 [&.active]:font-semibold [&.active]:text-yellow-600"
							>
								Admin
							</Link>
						)}
					</div>

					<div className="flex items-center gap-3">
						{user ? (
							<Link to="/dashboard">
								<Button variant="ghost" size="sm" className="font-body text-sm">
									Dashboard
								</Button>
							</Link>
						) : (
							<Link to="/signup">
								<Button variant="ghost" size="sm" className="font-body text-sm">
									Sign Up
								</Button>
							</Link>
						)}
						{isStaffOrAdmin && (
							<Link to="/admin" className="md:hidden">
								<Button variant="ghost" size="sm" className="font-body text-sm">
									Admin
								</Button>
							</Link>
						)}
						<Link to="/" hash="donate">
							<Button
								size="sm"
								className="gap-2 bg-yellow-500 font-body text-sm text-black hover:bg-yellow-600"
							>
								<Heart className="h-4 w-4" />
								Donate
							</Button>
						</Link>
					</div>
				</div>
			</nav>
		</header>
	);
}
