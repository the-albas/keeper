import { Link } from "@tanstack/react-router";


export default function LandingFooter() {
	return (
		<footer className="bg-primary text-white/90">
			<div className="max-w-7xl mx-auto px-6 py-16">
				<div className="grid md:grid-cols-3 gap-10">
					<div className="md:col-span-1">
						<div className="flex items-center gap-3 mb-4">
	<span className="font-heading text-lg font-semibold text-white">
								Keeper
							</span>
						</div>
						<p className="font-body text-sm leading-relaxed text-white/60">
							Providing safe shelter and healing for survivors of abuse and
							trafficking in the Philippines.
						</p>
					</div>

					<div>
						<h4 className="font-body text-sm font-semibold text-white mb-4 uppercase tracking-wider">
							Legal
						</h4>
						<div className="space-y-3">
							<Link
								to="/privacy-policy"
								className="block text-sm hover:text-white transition-colors"
							>
								Privacy Policy
							</Link>
							<button
								type="button"
								className="block text-sm hover:text-white transition-colors"
							>
								Cookie Consent
							</button>
						</div>
					</div>
				</div>

				<div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
					<p className="font-body text-xs text-white/40">
						© {new Date().getFullYear()} Keeper. All rights reserved. 501(c)(3)
						Tax-Exempt Organization.
					</p>
					<div className="flex items-center gap-4">
						<button
							type="button"
							className="font-body text-xs text-white/40 hover:text-white/60 transition-colors"
						>
							Cookie Preferences
						</button>
						<span className="text-white/20">|</span>
						<span className="font-body text-xs text-white/40">
							EIN: 12-3456789
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
