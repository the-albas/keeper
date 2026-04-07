import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";

const RootLayout = () => (
  <div className="min-h-screen bg-background text-foreground">
    <nav className="mx-auto flex w-full max-w-4xl gap-6 border-b px-6 py-4">
      <div>
        <Link
          to="/"
          className="text-sm font-medium text-muted-foreground [&.active]:text-foreground"
        >
          Home
        </Link>
      </div>
      <Link
        to="/login"
        className="text-sm font-medium text-muted-foreground [&.active]:text-foreground"
      >
        Login
      </Link>
      <Link
        to="/signup"
        className="text-sm font-medium text-muted-foreground [&.active]:text-foreground"
      >
        Sign up
      </Link>
    </nav>
    <Outlet />
  </div>
);

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootLayout,
  },
);
