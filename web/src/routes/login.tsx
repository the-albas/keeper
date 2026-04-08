import { type FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CodeChallengeForm } from "@/components/auth/code-challenge-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import girlsBg from "@/assets/girls_login_page.png";
import logoImg from "@/assets/logo.png";
import Navbar from "@/components/landing/Navbar";

type AuthChallengeResponse = {
  requiresCode: boolean;
  flow: "login" | "signup";
  email: string;
};

type AuthUserResponse = {
  email: string;
  username: string;
  roles: string[];
};

const apiBaseUrl = (() => {
  const url = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!url) throw new Error("VITE_API_BASE_URL is not set.");
  return url;
})();

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(
    null
  );
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      submitLogin({ email, password }),
    onSuccess: async (response) => {
      if (response.requiresCode) {
        setChallenge(response);
        return;
      }

      await navigate({ to: "/dashboard" });
    },
  });
  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyLoginCode(code),
    onSuccess: async (user) => {
      queryClient.setQueryData(["auth", "me"], {
        email: user.email,
        username: user.username,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await navigate({ to: "/dashboard" });
    },
  });
  const resendMutation = useMutation({
    mutationFn: () => resendLoginCode(),
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
            <p className="font-body mt-2.5 text-sm text-white/75 leading-relaxed">
              Every donation provides safety, healing, and hope for girls who
              are survivors of abuse and trafficking in the Philippines.
            </p>
            <Link
              to="/work"
              className="mt-4 inline-block rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2 font-body text-sm font-medium text-white hover:bg-white/25 transition-colors"
            >
              See how we help people →
            </Link>
          </div>
        </div>

        {/* Right — form panel */}
        <div className="flex w-full flex-col items-center justify-center bg-slate-100 px-8 lg:w-[55%]">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm">
            {/* Logo */}
            <Link to="/" className="mb-6 flex items-center gap-2.5">
              <img
                src={logoImg}
                alt="Haven Shield"
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="font-heading text-lg font-semibold text-foreground">
                Haven Shield
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                {loginMutation.error ? (
                  <p className="font-body text-sm text-destructive">
                    {loginMutation.error.message}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="w-full font-body bg-primary hover:bg-primary/90"
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

async function submitLogin(input: {
  email: string;
  password: string;
}): Promise<AuthChallengeResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
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

async function verifyLoginCode(code: string): Promise<AuthUserResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login/verify`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Unable to verify your code."));
  }

  return response.json() as Promise<AuthUserResponse>;
}

async function resendLoginCode(): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login/resend`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Unable to resend your code."));
  }
}

async function readError(
  response: Response,
  fallbackMessage: string
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
