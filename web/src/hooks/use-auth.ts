import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "@/lib/auth";

export function useAuth() {
	const { data: user, isLoading } = useQuery({ ...meQueryOptions });

	return {
		user,
		isLoading,
		isAdmin: user?.roles.includes("Admin") ?? false,
		isStaff: user?.roles.includes("Staff") ?? false,
		isDonor: user?.roles.includes("Donor") ?? false,
		isStaffOrAdmin: !!(
			user?.roles.includes("Admin") || user?.roles.includes("Staff")
		),
	};
}
