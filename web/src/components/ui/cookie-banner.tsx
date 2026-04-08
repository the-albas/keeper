import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "keeper_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

function getCookie(name: string): string | null {
	const match = document.cookie
		.split("; ")
		.find((row) => row.startsWith(name + "="));
	return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number) {
	document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

export default function CookieBanner() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!getCookie(COOKIE_KEY)) {
			setVisible(true);
		}
	}, []);

	function accept() {
		setCookie(COOKIE_KEY, "accepted", COOKIE_MAX_AGE);
		setVisible(false);
	}

	function reject() {
		setCookie(COOKIE_KEY, "rejected", COOKIE_MAX_AGE);
		setVisible(false);
	}

	if (!visible) return null;

	return (
		<div
			role="dialog"
			aria-label="Cookie consent"
			aria-live="polite"
			className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm shadow-lg"
		>
			<div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
				<p className="font-body text-sm text-muted-foreground">
					We use cookies to keep our site working and to understand how it's
					used. By clicking{" "}
					<strong className="text-foreground">Accept All</strong>, you consent
					to our use of cookies as described in our{" "}
					<Link
						to="/privacy-policy"
						className="underline underline-offset-4 text-foreground hover:text-primary transition-colors"
					>
						Privacy Policy & Cookie Notice
					</Link>
					.
				</p>
				<div className="flex shrink-0 gap-2">
					<Button variant="outline" size="sm" onClick={reject}>
						Reject Non-Essential
					</Button>
					<Button size="sm" onClick={accept}>
						Accept All
					</Button>
				</div>
			</div>
		</div>
	);
}
