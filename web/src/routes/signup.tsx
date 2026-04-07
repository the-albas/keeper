import { type FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CodeChallengeForm } from "@/components/auth/code-challenge-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://localhost:5216";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(
    null,
  );
  const signupMutation = useMutation({
    mutationFn: ({
      username,
      email,
      password,
    }: {
      username: string;
      email: string;
      password: string;
    }) => submitSignup({ username, email, password }),
    onSuccess: async (response) => {
      if (response.requiresCode) {
        setChallenge(response);
        return;
      }

      await navigate({ to: "/" });
    },
  });
  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifySignupCode(code),
    onSuccess: async () => {
      await navigate({ to: "/" });
    },
  });
  const resendMutation = useMutation({
    mutationFn: () => resendSignupCode(),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signupMutation.mutateAsync({ username, email, password });
  }

  function resetChallenge() {
    setChallenge(null);
    verifyMutation.reset();
    resendMutation.reset();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {challenge ? "Verify your email" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {challenge
              ? "Enter the code we emailed you to finish signing up."
              : "Enter your details to get started."}
          </CardDescription>
          <CardAction>
            <Link
              to="/login"
              className={buttonVariants({ variant: "link", className: "px-0" })}
            >
              Login
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {challenge ? (
            <CodeChallengeForm
              verifyLabel="Create account"
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
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="janedoe"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Password</Label>
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
                <p className="text-sm text-destructive">
                  {signupMutation.error.message}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? "Creating account..." : "Continue"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Already have an account?
          <Link to="/login" className="ml-1 text-primary underline">
            Login
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

async function submitSignup(input: {
  username: string;
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

async function verifySignupCode(code: string): Promise<AuthUserResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/signup/verify`, {
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

async function resendSignupCode(): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/auth/signup/resend`, {
    method: "POST",
    credentials: "include",
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
