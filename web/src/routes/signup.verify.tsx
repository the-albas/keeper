import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import girlsBg from "@/assets/girls_login_page.png";
import logoImg from "@/assets/logo.png";
import { CodeChallengeForm } from "@/components/auth/code-challenge-form";
import Navbar from "@/components/landing/Navbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export const Route = createFileRoute("/signup/verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  component: SignupVerify,
});

function SignupVerify() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { email: emailFromSearch } = Route.useSearch();
  const [email, setEmail] = useState(emailFromSearch);
  const [localError, setLocalError] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: ({ code, email }: { code: string; email: string }) =>
      verifySignupCode(code, email),
    onSuccess: async (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await navigate({ to: "/dashboard" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (targetEmail: string) => resendSignupCode(targetEmail),
  });

  async function handleVerify(code: string) {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError("Enter the email address you used to sign up.");
      return;
    }

    setLocalError(null);
    await verifyMutation.mutateAsync({ code, email: trimmedEmail });
  }

  async function handleResend() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError("Enter the email address you used to sign up.");
      return;
    }

    setLocalError(null);
    await resendMutation.mutateAsync(trimmedEmail);
  }

  const errorMessage =
    localError ?? verifyMutation.error?.message ?? resendMutation.error?.message;

  return (
    <div className="fixed inset-0 font-body">
      <Navbar />
      <div className="flex h-[calc(100vh-4rem)]">
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

        <div className="flex w-full flex-col items-center justify-center bg-slate-100 px-8 lg:w-[55%]">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm">
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
              Verify your email
            </h1>
            <p className="font-body mt-1.5 mb-8 text-sm text-muted-foreground">
              Enter the email address for your pending account, then type the
              6-digit code we emailed you.
            </p>

            <div className="mb-6 grid gap-2">
              <Label htmlFor="verify-email" className="font-body">
                Email
              </Label>
              <Input
                id="verify-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (localError) {
                    setLocalError(null);
                  }
                }}
                required
              />
            </div>

            <CodeChallengeForm
              verifyLabel="Create account"
              isVerifying={verifyMutation.isPending}
              isResending={resendMutation.isPending}
              errorMessage={errorMessage ?? undefined}
              onVerify={handleVerify}
              onResend={handleResend}
              onBack={async () => {
                await navigate({ to: "/signup" });
              }}
            />

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

async function verifySignupCode(
  code: string,
  email: string
): Promise<AuthUserResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/signup/verify`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, email }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Unable to verify your code."));
  }

  return response.json() as Promise<AuthUserResponse>;
}

async function resendSignupCode(email: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/auth/signup/resend`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
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
