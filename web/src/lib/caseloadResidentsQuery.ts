import { apiGetJson } from "./api";

/**
 * Row from GET /api/admin/caseload/residents — shared by caseload, process-recordings,
 * and home-visitations so one React Query cache warms all admin pickers.
 */
export type CaseloadResidentApiRow = {
	id: string;
	resident_code?: string;
	full_name?: string;
	date_of_birth?: string;
	sex?: string;
	civil_status?: string;
	case_status?: string;
	case_category?: string;
	case_subcategories?: string[];
	risk_level?: string;
	has_disability?: boolean;
	disability_type?: string;
	is_4ps_beneficiary?: boolean;
	is_solo_parent?: boolean;
	is_indigenous?: boolean;
	is_informal_settler?: boolean;
	family_parent_pwd?: boolean;
	admission_date?: string;
	safehouse_id?: string;
	safehouse_name?: string;
	referred_by?: string;
	referral_source?: string;
	assigned_social_worker?: string;
	reintegration_plan?: string;
	reintegration_target_date?: string;
	reintegration_status?: string;
	reintegration_type?: string;
	date_closed?: string;
};

export const caseloadResidentsQueryOptions = {
	queryKey: ["admin", "caseload", "residents"] as const,
	staleTime: 60_000,
	queryFn: (): Promise<CaseloadResidentApiRow[]> =>
		apiGetJson<CaseloadResidentApiRow[]>("/api/admin/caseload/residents"),
};

/** Slim list item for resident sidebars on process-recordings / home-visitations. */
export type ResidentPickerItem = {
	id: number;
	name: string;
	caseNumber: string;
};

export function mapCaseloadRowToPicker(
	r: CaseloadResidentApiRow
): ResidentPickerItem {
	const id = Number(r.id);
	return {
		id: Number.isFinite(id) ? id : 0,
		name: r.full_name?.trim() || `Resident ${r.id}`,
		caseNumber: r.resident_code?.trim() || `RES-${r.id}`,
	};
}
