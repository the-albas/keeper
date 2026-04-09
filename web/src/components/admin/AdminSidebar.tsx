import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	FileText,
	HandCoins,
	Home as HomeIcon,
	LayoutDashboard,
	LogOut,
	Users,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/lib/api";

interface User {
	username?: string;
	email?: string;
	full_name?: string;
}

interface NavItem {
	icon: LucideIcon;
	label: string;
	path: string;
}

const navItems: NavItem[] = [
	{ icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
	{
		icon: HandCoins,
		label: "Donors & Contributions",
		path: "/donors-contributions",
	},
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

	const displayName = user?.full_name || user?.username || "Admin";
	const initials = displayName[0]?.toUpperCase() ?? "A";

	const { mutate: handleLogout } = useMutation({
		mutationFn: logout,
		onSettled: () => {
			queryClient.setQueryData(["auth", "me"], null);
			queryClient.invalidateQueries({ queryKey: ["auth"] });
			navigate({ to: "/" });
		},
	});

	return (
		<aside className="fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col bg-sidebar">
			<Link
				to="/"
				className="flex items-center gap-3 border-b border-sidebar-border p-5 transition-opacity hover:opacity-80"
			>
				<img src={logoImg} alt="Keeper" className="h-9 w-9 rounded-lg" />
				<span className="font-heading text-lg font-semibold text-sidebar-foreground">
					Keeper
				</span>
			</Link>

			<nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
				{navItems.map((item) => {
					const isActive =
						currentPath === item.path ||
						(item.path === "/admin" &&
							location.pathname === "/admin" &&
							!location.searchStr);
					return (
						<Link
							key={item.label}
							to={item.path}
							className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm transition-all duration-200 ${
								isActive
									? "bg-sidebar-accent font-semibold text-sidebar-primary"
									: "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
							}`}
						>
							<item.icon className="h-5 w-5 flex-shrink-0" />
							{item.label}
						</Link>
					);
				})}
			</nav>

			<div className="border-t border-sidebar-border p-4">
				<div className="flex items-center gap-3">
					<Avatar className="h-9 w-9">
						<AvatarFallback className="bg-sidebar-accent font-body text-sm font-semibold text-sidebar-primary">
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<div className="truncate font-body text-sm font-medium text-sidebar-foreground">
							{displayName}
						</div>
						<div className="truncate font-body text-xs text-sidebar-foreground/50">
							{user?.email}
						</div>
					</div>
					<button
						type="button"
						onClick={() => handleLogout()}
						className="rounded-lg p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
						title="Sign out"
					>
						<LogOut className="h-4 w-4" />
					</button>
				</div>
			</div>
		</aside>
	);
}
