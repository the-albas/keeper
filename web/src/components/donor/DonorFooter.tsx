import { Link } from "@tanstack/react-router";

export default function DonorFooter() {
	return (
		<footer className="border-t border-border bg-muted/30 py-6 mt-12">
			<div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
				<p className="font-body text-xs text-muted-foreground">
					© {new Date().getFullYear()} Keeper. All resident data is anonymized
					and aggregated.
				</p>
				<div className="flex items-center gap-4">
					<Link
						to="/privacy-policy"
						className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						Privacy Policy
					</Link>
					<button
						type="button"
						className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						Cookie Settings
					</button>
				</div>
			</div>
		</footer>
	);
}
