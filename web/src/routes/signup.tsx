import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import girlsBg from "@/assets/girls_login_page.png";
import logoImg from "@/assets/logo.png";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meQueryOptions } from "@/lib/auth";

type AuthChallengeResponse = {
	requiresCode: boolean;
	flow: "login" | "signup";
	email: string;
};

const apiBaseUrl = (() => {
	const url = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
	if (!url) throw new Error("VITE_API_BASE_URL is not set.");
	return url;
})();

export const Route = createFileRoute("/signup")({
	beforeLoad: async ({ context }) => {
		const user = await context.queryClient
			.fetchQuery(meQueryOptions)
			.catch(() => null);
		if (user) {
			throw redirect({
				to:
					user.roles.includes("Admin") || user.roles.includes("Staff")
						? "/admin"
						: "/dashboard",
			});
		}
	},
	component: Signup,
});

function Signup() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const signupMutation = useMutation({
		mutationFn: ({
			email,
			password,
		}: {
			email: string;
			password: string;
		}) => submitSignup({ email, password }),
		onSuccess: async (response) => {
			if (response.requiresCode) {
				await navigate({
					to: "/signup/verify",
					search: { email: response.email },
				});
				return;
			}

			await navigate({ to: "/dashboard" });
		},
	});

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await signupMutation.mutateAsync({ email, password });
	}

	if (pathname !== "/signup") {
		return <Outlet />;
	}

	return (
		<div className="fixed inset-0 font-body">
			<Navbar />
			<div className="flex h-[calc(100vh-4rem)]">
				{/* Left — image panel, starts from top and goes behind the navbar */}
				<div className="relative hidden lg:flex lg:w-[45%]">
					<img
						src={girlsBg}
						alt="Two girls smiling"
						className="h-full w-full object-cover object-top"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
					<div className="absolute bottom-20 left-8 right-8 text-white">
						<p className="font-heading text-2xl font-bold leading-snug">
							Your generosity
							<br />
							transforms lives.
						</p>
						<p className="font-body mt-2.5 text-sm leading-relaxed text-white/75">
							Every donation provides safety, healing, and hope for girls who
							are survivors of abuse and trafficking in the Philippines.
						</p>
						<Link
							to="/about"
							className="mt-4 inline-block rounded-lg border border-white/30 bg-white/15 px-4 py-2 font-body text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
						>
							Learn more about us →
						</Link>
					</div>
				</div>

				{/* Right — form panel, padded so content clears the navbar */}
				<div className="flex w-full flex-col items-center justify-center bg-slate-100 px-8 lg:w-[55%]">
					<div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm">
						<Link to="/" className="mb-6 flex items-center gap-2.5">
							<img
								src={logoImg}
								alt="Keeper"
								className="h-8 w-8 rounded-lg object-cover"
							/>
							<span className="font-heading text-lg font-semibold text-foreground">
								Keeper
							</span>
						</Link>

						<h1 className="font-heading text-2xl font-bold text-foreground">
							Create your account
						</h1>
						<p className="font-body mt-1.5 mb-8 text-sm text-muted-foreground">
							Enter your details to get started.
						</p>
						<br />

						<form className="space-y-4" onSubmit={handleSubmit}>
							<div className="grid gap-2">
								<Label htmlFor="email" className="font-body">
									Email
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="password" className="font-body">
									Password
								</Label>
								<Input
									id="password"
									type="password"
									autoComplete="new-password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									required
								/>
							</div>
							{signupMutation.error ? (
								<p className="font-body text-sm text-destructive">
									{signupMutation.error.message}
								</p>
							) : null}
							<Button
								type="submit"
								className="w-full bg-primary font-body hover:bg-primary/90"
								disabled={signupMutation.isPending}
							>
								{signupMutation.isPending ? "Creating account..." : "Continue"}
							</Button>
						</form>
						<br />
						<p className="mt-10 text-center font-body text-sm text-muted-foreground">
							Already have an account?{" "}
							<Link
								to="/login"
								className="text-primary underline underline-offset-4"
							>
								Log in
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

async function submitSignup(input: {
	email: string;
	password: string;
}): Promise<AuthChallengeResponse> {
	const response = await fetch(`${apiBaseUrl}/api/auth/signup`, {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		throw new Error(await readError(response, "Unable to sign up."));
	}

	return response.json() as Promise<AuthChallengeResponse>;
}

async function readError(
	response: Response,
	fallbackMessage: string,
): Promise<string> {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
		title?: string;
		errors?: Record<string, string[]>;
	} | null;

	if (body?.error) {
		return body.error;
	}

	const firstError = body?.errors ? Object.values(body.errors).flat()[0] : null;
	return firstError || body?.title || fallbackMessage;
}
