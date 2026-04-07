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

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
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

      await navigate({ to: "/" });
    },
  });
  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyLoginCode(code),
    onSuccess: async () => {
      await navigate({ to: "/" });
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {challenge ? "Check your email" : "Login to your account"}
          </CardTitle>
          <CardDescription>
            {challenge
              ? "Enter the code we emailed you to finish signing in."
              : "Enter your email and password to continue."}
          </CardDescription>
          <CardAction>
            <Link
              to="/signup"
              className={buttonVariants({ variant: "link", className: "px-0" })}
            >
              Sign up
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {loginMutation.error ? (
                <p className="text-sm text-destructive">
                  {loginMutation.error.message}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Checking password..." : "Continue"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="ml-1 text-primary underline">
            Create an account
          </Link>
        </CardFooter>
      </Card>
    </main>
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
