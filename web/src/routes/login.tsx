import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import girlsBg from "@/assets/girls_login_page.png";
import logoImg from "@/assets/logo.png";
import { CodeChallengeForm } from "@/components/auth/code-challenge-form";
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

type AuthUserResponse = {
	email: string;
	roles: string[];
	supporterId: number | null;
};

const apiBaseUrl = (() => {
	const url = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
	if (!url) throw new Error("VITE_API_BASE_URL is not set.");
	return url;
})();

const unverifiedAccountError = "Please verify your email before signing in.";

/** Surfaces clearer text when the browser raises TypeError: Failed to fetch (CORS, wrong URL, API down). */
async function authFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	try {
		return await fetch(input, init);
	} catch (e) {
		if (e instanceof TypeError) {
			throw new Error(
				"Cannot reach the API. Check VITE_API_BASE_URL, add this site to Cors:AllowedOrigins on the server, and that the API is running.",
			);
		}
		throw e;
	}
}

export const Route = createFileRoute("/login")({
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
	component: Login,
});

function Login() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(
		null,
	);
	const loginMutation = useMutation({
		mutationFn: ({ email, password }: { email: string; password: string }) =>
			submitLogin({ email, password }),
		onSuccess: async (response) => {
			if (response.requiresCode) {
				setChallenge(response);
				return;
			}

      const user = await fetchMe();
      if (user) {
        queryClient.setQueryData(["auth", "me"], user);
      }
      await navigate({ to: resolveRedirectPath(user) });
    },
  });
  const verifyMutation = useMutation({
    mutationFn: (code: string) =>
      verifyLoginCode(code, (challenge?.email ?? email).trim()),
    onSuccess: async (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await navigate({ to: resolveRedirectPath(user) });
    },
  });
  const resendMutation = useMutation({
    mutationFn: () => resendLoginCode((challenge?.email ?? email).trim()),
  });

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await loginMutation.mutateAsync({ email, password });
	}

	function resetChallenge() {
		setChallenge(null);
		verifyMutation.reset();
		resendMutation.reset();
	}

	const showVerifyLink =
		loginMutation.error?.message === unverifiedAccountError;

	return (
		<div className="fixed inset-0 font-body">
			<Navbar />
			<div className="flex h-[calc(100vh-4rem)]">
				{/* Left — image panel */}
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
							to="/work"
							className="mt-4 inline-block rounded-lg border border-white/30 bg-white/15 px-4 py-2 font-body text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
						>
							See how we help people →
						</Link>
					</div>
				</div>

				{/* Right — form panel */}
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
							{challenge ? "Check your email" : "Welcome back"}
						</h1>
						<p className="font-body mt-1.5 mb-8 text-sm text-muted-foreground">
							{challenge
								? "Enter the code we emailed you to finish signing in."
								: "Enter your email and password to continue."}
						</p>
						<br />

						{challenge ? (
							<CodeChallengeForm
								verifyLabel="Finish login"
								isVerifying={verifyMutation.isPending}
								isResending={resendMutation.isPending}
								errorMessage={
									verifyMutation.error?.message ?? resendMutation.error?.message
								}
								onVerify={async (code) => {
									await verifyMutation.mutateAsync(code);
								}}
								onResend={async () => {
									await resendMutation.mutateAsync();
								}}
								onBack={resetChallenge}
							/>
						) : (
							<form className="space-y-4" onSubmit={handleSubmit}>
								<div className="grid gap-2">
									<Label htmlFor="email" className="font-body">
										Email or username
									</Label>
									<Input
										id="email"
										type="text"
										placeholder="you@example.com or admin"
										autoComplete="username"
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
										autoComplete="current-password"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										required
									/>
								</div>
								{loginMutation.error ? (
									<div className="space-y-2">
										<p className="font-body text-sm text-destructive">
											{loginMutation.error.message}
										</p>
										{showVerifyLink ? (
											<p className="font-body text-sm text-muted-foreground">
												<Link
													to="/signup/verify"
													search={{ email: email.trim() }}
													className="text-primary underline underline-offset-4"
												>
													Verify your email
												</Link>
												.
											</p>
										) : null}
									</div>
								) : null}
								<Button
									type="submit"
									className="w-full bg-primary font-body hover:bg-primary/90"
									disabled={loginMutation.isPending}
								>
									{loginMutation.isPending
										? "Checking password..."
										: "Continue"}
								</Button>
							</form>
						)}
						<br />
						<p className="mt-10 text-center font-body text-sm text-muted-foreground">
							New here?{" "}
							<Link
								to="/signup"
								className="text-primary underline underline-offset-4"
							>
								Create an account
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function resolveRedirectPath(
  user: AuthUserResponse | null | undefined,
): "/admin" | "/dashboard" {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.includes("Admin") ? "/admin" : "/dashboard";
}

async function fetchMe(): Promise<AuthUserResponse | null> {
  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Unable to load user info.");
  }
  const data = (await response.json().catch(() => null)) as
    | AuthUserResponse
    | null;
  if (!data || !Array.isArray(data.roles)) {
    return null;
  }
  return data;
}

async function submitLogin(input: {
	email: string;
	password: string;
}): Promise<AuthChallengeResponse> {
	const response = await authFetch(`${apiBaseUrl}/api/auth/login`, {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		throw new Error(await readError(response, "Unable to log in."));
	}

	return response.json() as Promise<AuthChallengeResponse>;
}

async function verifyLoginCode(
	code: string,
	emailForChallenge: string,
): Promise<AuthUserResponse> {
	const response = await authFetch(`${apiBaseUrl}/api/auth/login/verify`, {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ code, email: emailForChallenge }),
	});

	if (!response.ok) {
		throw new Error(await readError(response, "Unable to verify your code."));
	}

	return response.json() as Promise<AuthUserResponse>;
}

async function resendLoginCode(emailForChallenge: string): Promise<void> {
	const response = await authFetch(`${apiBaseUrl}/api/auth/login/resend`, {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ email: emailForChallenge }),
	});

	if (!response.ok) {
		throw new Error(await readError(response, "Unable to resend your code."));
	}
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
