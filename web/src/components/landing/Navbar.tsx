import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

import logoImg from "@/assets/logo.png";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImg} alt="Haven Shield Logo" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-heading text-xl font-semibold text-foreground tracking-tight">
            Haven Shield
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold">
            Home
          </Link>
          <Link to="/work" className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold">
            Our Work
          </Link>
          <Link to="/about" className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold">
            About
          </Link>
          <Link to="/contact" className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/donor">
            <Button variant="ghost" size="sm" className="font-body text-sm">
              Log In
            </Button>
          </Link>
          <Link to="/" hash="donate">
            <Button size="sm" className="font-body text-sm gap-2 bg-primary hover:bg-primary/90">
              <Heart className="h-4 w-4" />
              Donate
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
