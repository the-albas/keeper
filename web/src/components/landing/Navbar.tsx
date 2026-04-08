import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

import logoImg from "@/assets/logo.png";
import { getApiBaseUrl } from "../../lib/api";

async function fetchCurrentUser() {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;
  const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ email: string; username: string }>;
}

async function logout() {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return;
  const res = await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
}

export default function Navbar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  });

  const { mutate: signOut } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      navigate({ to: "/" });
    },
  });

  return (
    <header className="sticky top-0 left-0 right-0 z-50 flex flex-col w-full shadow-sm">
      <nav className="bg-white/95 backdrop-blur-md border-b border-border w-full">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Keeper Logo"
              className="h-9 w-9 rounded-lg object-cover"
            />
            <span className="font-heading text-xl font-semibold text-foreground tracking-tight">
              Keeper
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold"
            >
              Home
            </Link>
            <Link
              to="/work"
              className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold"
            >
              Our Work
            </Link>
            <Link
              to="/about"
              className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold"
            >
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className="font-body text-sm"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            ) : (
              <Link to="/signup">
                <Button variant="ghost" size="sm" className="font-body text-sm">
                  Sign Up
                </Button>
              </Link>
            )}
            <Link to="/" hash="donate">
              <Button
                size="sm"
                className="font-body text-sm gap-2 bg-primary hover:bg-primary/90"
              >
                <Heart className="h-4 w-4" />
                Donate
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
