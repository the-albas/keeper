import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";

interface User {
	username?: string;
	email?: string;
	full_name?: string;
}

export default function DonorNav({ user }: { user: User | null }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const displayName = user?.full_name || user?.username || "Donor";
	const initials = displayName[0]?.toUpperCase() ?? "D";

	const { mutate: signOut } = useMutation({
		mutationFn: logout,
		onSettled: () => {
			queryClient.setQueryData(["auth", "me"], null);
			queryClient.invalidateQueries({ queryKey: ["auth"] });
			navigate({ to: "/login" });
		},
	});

	return (
		<nav className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
				<Link to="/" className="flex items-center gap-3">
					<img
						src={logoImg}
						alt="Keeper"
						className="h-9 w-9 rounded-lg object-cover"
					/>
					<span className="font-heading text-xl font-semibold tracking-tight text-foreground">
						Keeper
					</span>
				</Link>

				<div className="flex items-center gap-3">
					<div className="flex items-center gap-3 border-l border-border pl-4">
						<div className="hidden text-right sm:block">
							<div className="font-body text-sm font-medium text-foreground">
								{displayName}
							</div>
							<div className="font-body text-xs text-muted-foreground">
								{user?.email}
							</div>
						</div>
						<Avatar className="h-9 w-9">
							<AvatarFallback className="bg-primary/10 font-body text-sm font-semibold text-primary">
								{initials}
							</AvatarFallback>
						</Avatar>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => signOut()}
						className="text-muted-foreground hover:text-foreground"
						title="Sign out"
					>
						<LogOut className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</nav>
	);
}
