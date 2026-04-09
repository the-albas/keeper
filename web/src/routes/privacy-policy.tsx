import { createFileRoute } from "@tanstack/react-router";
import LandingFooter from "@/components/landing/LandingFooter";
import Navbar from "@/components/landing/Navbar";

export const Route = createFileRoute("/privacy-policy")({
	component: PrivacyPolicy,
});

function PrivacyPolicy() {
	return (
		<div className="min-h-screen bg-background font-body flex flex-col">
			<Navbar />
			<main className="flex-1 flex flex-col py-24">
				<div className="max-w-4xl mx-auto px-6 w-full text-foreground/80 space-y-8">
					<div>
						<h1 className="font-heading text-4xl font-bold text-foreground mb-2">
							Keeper — Privacy Policy & Cookie Notice
						</h1>
						<p className="text-sm text-muted-foreground uppercase tracking-wider">
							Last Updated: April 7, 2026
						</p>
					</div>

					<div className="space-y-6">
						<h2 className="font-heading text-2xl font-semibold text-foreground border-b border-border pb-2">
							Privacy Policy
						</h2>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">1. WHO WE ARE</h3>
							<p>
								Keeper ("we," "us," or "our") is the data controller responsible
								for your personal data. If you have questions about this policy
								or how we handle your data, contact us at:
							</p>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>Email: privacy@keeper.org</li>
								<li>
									Address: 430 W University Pkwy, Provo, UT 84604, United States
								</li>
							</ul>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								2. WHAT DATA WE COLLECT
							</h3>
							<p>We may collect the following categories of personal data:</p>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>Identity data: name, username, or similar identifiers</li>
								<li>
									Contact data: email address, phone number, mailing address
								</li>
								<li>
									Account data: login credentials, preferences, and settings
								</li>
								<li>
									Usage data: pages visited, features used, time spent, and
									clickstream data
								</li>
								<li>Device data: IP address, browser type, operating system</li>
								<li>
									Communications: messages or support requests you send us
								</li>
								<li>
									Cookie data: see the Cookie Notice below for full details
								</li>
							</ul>
							<p className="text-sm">
								We do not intentionally collect sensitive personal data (e.g.,
								health, financial, or biometric data) unless explicitly required
								and consented to.
							</p>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								3. HOW WE COLLECT YOUR DATA
							</h3>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>
									Directly from you when you register, contact us, or use our
									services
								</li>
								<li>Automatically through cookies and tracking technologies</li>
								<li>
									From third-party services you connect to your Keeper account
								</li>
							</ul>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								4. WHY WE PROCESS YOUR DATA (LEGAL BASES)
							</h3>
							<p>
								We only process your data when we have a lawful basis to do so
								under GDPR Article 6:
							</p>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>
									Contract performance — to provide, maintain, and improve our
									services
								</li>
								<li>
									Legal obligation — to comply with applicable laws and
									regulations
								</li>
								<li>
									Legitimate interests — to protect security, prevent fraud, and
									improve our product, where those interests are not overridden
									by your rights
								</li>
								<li>
									Consent — for marketing communications and non-essential
									cookies (you may withdraw consent at any time)
								</li>
							</ul>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								5. HOW LONG WE KEEP YOUR DATA
							</h3>
							<p className="text-sm">
								We retain personal data only as long as necessary for the
								purposes described above or as required by law. Account data is
								retained for the duration of your account and deleted within 90
								days of account closure, unless legal obligations require longer
								retention.
							</p>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								6. WHO WE SHARE YOUR DATA WITH
							</h3>
							<p>We do not sell your personal data. We may share it with:</p>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>
									Service providers acting as data processors (e.g., hosting,
									analytics, email delivery)
								</li>
								<li>
									Legal authorities when required by law or to protect rights
									and safety
								</li>
								<li>
									Successors in the event of a merger, acquisition, or asset
									sale
								</li>
							</ul>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								7. INTERNATIONAL TRANSFERS
							</h3>
							<p className="text-sm">
								Because Keeper operates globally, your data may be processed in
								countries outside your own, including countries that may not
								have equivalent data protection laws. Where this occurs, we rely
								on appropriate safeguards such as Standard Contractual Clauses
								(SCCs) approved by the European Commission to ensure your data
								remains protected.
							</p>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								8. YOUR RIGHTS UNDER GDPR
							</h3>
							<p>You have the following rights regarding your personal data:</p>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>Access: request a copy of the data we hold about you</li>
								<li>
									Rectification: request correction of inaccurate or incomplete
									data
								</li>
								<li>
									Erasure: request deletion of your data ("right to be
									forgotten")
								</li>
								<li>
									Restriction: request that we limit how we process your data
								</li>
								<li>
									Portability: receive your data in a structured,
									machine-readable format
								</li>
								<li>
									Objection: object to processing based on legitimate interests
									or for direct marketing
								</li>
								<li>
									Withdraw consent: at any time, where processing is based on
									consent
								</li>
							</ul>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								9. DATA SECURITY
							</h3>
							<p className="text-sm">
								We implement appropriate technical and organizational measures
								to protect your data against unauthorized access, loss, or
								disclosure. No method of transmission over the internet is 100%
								secure, and we cannot guarantee absolute security.
							</p>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								10. CHANGES TO THIS POLICY
							</h3>
							<p className="text-sm">
								We may update this Privacy Policy from time to time. We will
								notify you of significant changes by email or through a notice
								on our platform. Continued use of our services after changes
								take effect constitutes acceptance of the updated policy.
							</p>
						</div>
					</div>

					<div className="space-y-6 pt-12">
						<h2 className="font-heading text-2xl font-semibold text-foreground border-b border-border pb-2">
							Cookie Notice
						</h2>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								1. WHAT ARE COOKIES?
							</h3>
							<p className="text-sm">
								Cookies are small text files placed on your device when you
								visit a website. They help the site remember information about
								your visit — such as your preferences or login status — and can
								be used to understand how the site is used.
							</p>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								2. COOKIE CONSENT
							</h3>
							<p>
								Under GDPR, we are required to obtain your explicit consent
								before placing any non-essential cookies on your device. When
								you first visit Keeper, a cookie consent banner will appear. You
								may:
							</p>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>Accept all cookies</li>
								<li>Reject non-essential cookies</li>
								<li>Customize your preferences by category</li>
							</ul>
							<p className="text-sm">
								Your choice is saved and applied immediately. You can update
								your preferences at any time via the Cookie Settings link in the
								site footer.
							</p>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								3. WHAT COOKIES WE USE
							</h3>
							<div className="text-sm space-y-3">
								<div>
									<strong>STRICTLY NECESSARY COOKIES</strong>
									<p>
										Required for our services to function. These cannot be
										disabled. (e.g. session tokens)
									</p>
								</div>
								<div>
									<strong>FUNCTIONAL COOKIES</strong>
									<p>
										Remember your preferences and settings to improve your
										experience.
									</p>
								</div>
								<div>
									<strong>ANALYTICS COOKIES</strong>
									<p>
										Help us understand how visitors interact with Keeper so we
										can improve it.
									</p>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								4. HOW TO CONTROL COOKIES IN YOUR BROWSER
							</h3>
							<p className="text-sm">
								You can view, block, or delete cookies through your browser
								settings at any time. Note that disabling certain cookies may
								affect site functionality.
							</p>
						</div>
					</div>
				</div>
			</main>
			<LandingFooter />
		</div>
	);
}
