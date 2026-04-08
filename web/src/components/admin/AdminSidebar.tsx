import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  HandCoins,
  Users,
  FileText,
  Home as HomeIcon,
  BarChart3,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logout } from "@/lib/api";

import logoImg from "@/assets/logo.png";

interface User {
  full_name?: string;
  email?: string;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  search?: { tab?: string };
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: HandCoins, label: "Donors & Contributions", path: "/donors-contributions" },
  { icon: Users, label: "Caseload Inventory", path: "/caseload" },
  { icon: FileText, label: "Process Recordings", path: "/process-recordings" },
  { icon: HomeIcon, label: "Home Visitations", path: "/home-visitations" },
  { icon: BarChart3, label: "Reports & Analytics", path: "/reports" },
];

export default function AdminSidebar({ user }: { user: User | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentPath = location.pathname + location.searchStr;

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "A";

  const { mutate: handleLogout } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      navigate({ to: "/" });
    },
  });

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-50">
      <Link to="/" className="p-5 flex items-center gap-3 border-b border-sidebar-border hover:opacity-80 transition-opacity">
        <img src={logoImg} alt="Keeper" className="h-9 w-9 rounded-lg" />
        <span className="font-heading text-lg font-semibold text-sidebar-foreground">
          Keeper
        </span>
      </Link>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const itemFullPath = item.search
            ? `${item.path}?tab=${item.search.tab}`
            : item.path;
          const isActive = currentPath === itemFullPath ||
            (!item.search && item.path === "/admin" && location.pathname === "/admin" && !location.searchStr);
          return (
            <Link
              key={item.label}
              to={item.path}
              search={item.search ? { tab: item.search.tab } as any : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-primary font-body text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-body text-sm font-medium text-sidebar-foreground truncate">
              {user?.full_name || "Admin"}
            </div>
            <div className="font-body text-xs text-sidebar-foreground/50 truncate">
              {user?.email}
            </div>
          </div>
          <button
            onClick={() => handleLogout()}
            className="p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
