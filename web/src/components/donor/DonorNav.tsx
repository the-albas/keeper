import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import logoImg from "@/assets/logo.png";

interface User {
  full_name?: string;
  email?: string;
}

export default function DonorNav({ user }: { user: User | null }) {
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "D";

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Keeper"
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="font-heading text-xl font-semibold text-foreground tracking-tight">
            Keeper
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="font-body text-sm text-muted-foreground"
            >
              Admin
            </Button>
          </Link>
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="text-right hidden sm:block">
              <div className="font-body text-sm font-medium text-foreground">
                {user?.full_name || "Donor"}
              </div>
              <div className="font-body text-xs text-muted-foreground">
                {user?.email}
              </div>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary font-body text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </nav>
  );
}
