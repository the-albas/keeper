import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Activity,
	Pencil,
	Plus,
	RefreshCw,
	ShieldAlert,
	Users,
	X,
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiDelete, apiGetJson, apiPostJson, apiPutJson, type AuthMeResponse } from "@/lib/api";
import {
	caseloadResidentsQueryOptions,
	type CaseloadResidentApiRow,
} from "@/lib/caseloadResidentsQuery";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/caseload")({
	beforeLoad: async ({ context }) => {
		await requireRole(context.queryClient, "Admin", "Staff");
	},
	component: CaseloadPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type CaseStatus =
	| "Intake"
	| "Assessment"
	| "Active Care"
	| "Reintegration"
	| "Closed"
	| "Graduated"
	| "Transferred";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";

interface ResidentProfile {
	id: string;
	resident_code: string;
	full_name: string;
	case_control_no: string;
	internal_code: string;
	// Demographics
	date_of_birth: string;
	sex: string;
	birth_status: string;
	place_of_birth: string;
	religion: string;
	// Case
	case_status: CaseStatus | string;
	case_category: string;
	// Sub-categories (boolean flags per CSV)
	sub_cat_orphaned: boolean;
	sub_cat_trafficked: boolean;
	sub_cat_child_labor: boolean;
	sub_cat_physical_abuse: boolean;
	sub_cat_sexual_abuse: boolean;
	sub_cat_osaec: boolean;
	sub_cat_cicl: boolean;
	sub_cat_at_risk: boolean;
	sub_cat_street_child: boolean;
	sub_cat_child_with_hiv: boolean;
	// PWD / Special needs
	is_pwd: boolean;
	pwd_type: string;
	has_special_needs: boolean;
	special_needs_diagnosis: string;
	// Family socio-demographic
	family_is_4ps: boolean;
	family_solo_parent: boolean;
	family_indigenous: boolean;
	family_parent_pwd: boolean;
	family_informal_settler: boolean;
	// Admission
	date_of_admission: string;
	safehouse_id: string;
	safehouse_name: string;
	// Referral
	referral_source: string;
	referring_agency_person: string;
	// COLB
	date_colb_registered: string;
	date_colb_obtained: string;
	// Case work
	assigned_social_worker: string;
	initial_case_assessment: string;
	date_case_study_prepared: string;
	// Risk
	initial_risk_level: RiskLevel | string;
	current_risk_level: RiskLevel | string;
	// Reintegration
	reintegration_type: string;
	reintegration_status: string;
	// Timeline
	date_enrolled: string;
	date_closed: string;
	notes_restricted: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CASE_STATUSES: CaseStatus[] = [
	"Intake",
	"Assessment",
	"Active Care",
	"Reintegration",
	"Transferred",
	"Closed",
	"Graduated",
];

const RISK_LEVELS: RiskLevel[] = ["Low", "Medium", "High", "Critical"];

const CASE_CATEGORIES = [
	"Abandoned",
	"Neglected",
	"Surrendered",
	"Foundling",
	"Orphaned",
	"Trafficked",
	"Child Labor",
	"Physically Abused",
	"Sexually Abused",
	"OSAEC",
	"CICL",
	"At Risk",
	"Street Child",
	"Child with HIV",
];

const SUB_CAT_FIELDS: { key: keyof ResidentProfile; label: string }[] = [
	{ key: "sub_cat_orphaned", label: "Orphaned" },
	{ key: "sub_cat_trafficked", label: "Trafficked" },
	{ key: "sub_cat_child_labor", label: "Child Labor" },
	{ key: "sub_cat_physical_abuse", label: "Physical Abuse" },
	{ key: "sub_cat_sexual_abuse", label: "Sexual Abuse" },
	{ key: "sub_cat_osaec", label: "OSAEC" },
	{ key: "sub_cat_cicl", label: "CICL" },
	{ key: "sub_cat_at_risk", label: "At Risk" },
	{ key: "sub_cat_street_child", label: "Street Child" },
	{ key: "sub_cat_child_with_hiv", label: "Child with HIV" },
];

const REFERRAL_SOURCES = [
	"Government Agency (DSWD)",
	"NGO / Civil Society",
	"Hospital / Medical Facility",
	"Police / Law Enforcement",
	"Community / Barangay",
	"Self-Referral",
	"Family or Friend",
	"Other",
];

// ─── Badge color maps ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<CaseStatus, string> = {
	Intake: "bg-blue-50 text-blue-700 border-blue-200",
	Assessment: "bg-yellow-50 text-yellow-700 border-yellow-200",
	"Active Care": "bg-primary/10 text-primary border-primary/20",
	Reintegration: "bg-purple-50 text-purple-700 border-purple-200",
	Transferred: "bg-orange-50 text-orange-800 border-orange-200",
	Closed: "bg-muted text-muted-foreground border-border",
	Graduated: "bg-green-50 text-green-700 border-green-200",
};

const RISK_COLORS: Record<RiskLevel, string> = {
	Low: "bg-chart-5/15 text-chart-5 border-chart-5/20",
	Medium:
		"bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
	High: "bg-chart-4/15 text-chart-4 border-chart-4/20",
	Critical: "bg-destructive/15 text-destructive border-destructive/20",
};

// ─── Mock data ────────────────────────────────────────────────────────────────

type ResidentApi = CaseloadResidentApiRow;

type SafehouseApi = {
  id: string;
  name: string;
};

const EMPTY_FORM: ResidentProfile = {
	id: "",
	resident_code: "",
	full_name: "",
	case_control_no: "",
	internal_code: "",
	date_of_birth: "",
	sex: "",
	birth_status: "",
	place_of_birth: "",
	religion: "",
	case_status: "Intake",
	case_category: "",
	sub_cat_orphaned: false,
	sub_cat_trafficked: false,
	sub_cat_child_labor: false,
	sub_cat_physical_abuse: false,
	sub_cat_sexual_abuse: false,
	sub_cat_osaec: false,
	sub_cat_cicl: false,
	sub_cat_at_risk: false,
	sub_cat_street_child: false,
	sub_cat_child_with_hiv: false,
	is_pwd: false,
	pwd_type: "",
	has_special_needs: false,
	special_needs_diagnosis: "",
	family_is_4ps: false,
	family_solo_parent: false,
	family_indigenous: false,
	family_parent_pwd: false,
	family_informal_settler: false,
	date_of_admission: "",
	safehouse_id: "",
	safehouse_name: "",
	referral_source: "",
	referring_agency_person: "",
	date_colb_registered: "",
	date_colb_obtained: "",
	assigned_social_worker: "",
	initial_case_assessment: "",
	date_case_study_prepared: "",
	initial_risk_level: "Medium",
	current_risk_level: "Medium",
	reintegration_type: "",
	reintegration_status: "",
	date_enrolled: "",
	date_closed: "",
	notes_restricted: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-3 py-2">
			<div className="h-px flex-1 bg-border" />
			<span className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
				{label}
			</span>
			<div className="h-px flex-1 bg-border" />
		</div>
	);
}

function ViewField({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div>
			<dt className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
				{label}
			</dt>
			<dd className="font-body text-sm text-foreground">
				{value || <span className="text-muted-foreground">—</span>}
			</dd>
		</div>
	);
}

function selectClass() {
	return "h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
}

function textareaClass() {
	return "w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none";
}

/** Matches API `CaseloadResidentUpsertRequest` (snake_case JSON). */
function buildCaseloadUpsertBody(data: ResidentProfile) {
	const case_subcategories = SUB_CAT_FIELDS.filter(
		({ key }) => Boolean(data[key]),
	).map(({ label }) => label);

	return {
		full_name: data.full_name,
		resident_code: data.resident_code,
		date_of_birth: data.date_of_birth,
		sex: data.sex,
		civil_status: data.birth_status,
		case_status: data.case_status,
		case_category: data.case_category,
		case_subcategories,
		risk_level: data.current_risk_level,
		has_disability: data.is_pwd,
		disability_type: data.pwd_type,
		is_4ps_beneficiary: data.family_is_4ps,
		is_solo_parent: data.family_solo_parent,
		is_indigenous: data.family_indigenous,
		is_informal_settler: data.family_informal_settler,
		admission_date: data.date_of_admission,
		safehouse_id: data.safehouse_id,
		referred_by: data.referring_agency_person,
		referral_source: data.referral_source,
		assigned_social_worker: data.assigned_social_worker,
		reintegration_plan: data.initial_case_assessment,
		reintegration_target_date: data.date_case_study_prepared,
		reintegration_status: data.reintegration_status,
	};
}

// ─── Main component ───────────────────────────────────────────────────────────

function CaseloadPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
	search: "",
	status: "",
	category: "",
	safehouse: "",
	riskLevel: "",
  });

  // Panel state
  const [panelMode, setPanelMode] = useState<"view" | "edit" | "add" | null>(null);
  const [panelResident, setPanelResident] = useState<ResidentProfile | null>(null);
  const [formData, setFormData] = useState<ResidentProfile>(EMPTY_FORM);

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const me = await apiGetJson<AuthMeResponse>("/api/auth/me");
      return {
        email: me.email,
        full_name: me.email?.split("@")[0] ?? "Admin",
      };
    },
  });

  const {
	data: residentsFromApi = [],
	isLoading: isResidentsLoading,
	error: residentsError,
  } = useQuery<ResidentApi[]>(caseloadResidentsQueryOptions);

  const { data: safehouses = [] } = useQuery<SafehouseApi[]>({
	queryKey: ["admin", "safehouses"],
	staleTime: 60_000,
	queryFn: () => apiGetJson<SafehouseApi[]>("/api/admin/safehouses"),
  });

  const residents = useMemo<ResidentProfile[]>(
	() =>
		residentsFromApi.map((r) => ({
			id: r.id,
			resident_code: r.resident_code || `RES-${r.id}`,
			full_name: r.full_name || `Resident ${r.id}`,
			case_control_no: "",
			internal_code: "",
			date_of_birth: r.date_of_birth || "",
			sex: r.sex || "",
			birth_status: r.civil_status || "",
			place_of_birth: "",
			religion: "",
			case_status: r.case_status || "Active Care",
			case_category: r.case_category || "",
			sub_cat_orphaned: r.case_subcategories?.includes("Orphaned") ?? false,
			sub_cat_trafficked: r.case_subcategories?.includes("Trafficked") ?? false,
			sub_cat_child_labor: r.case_subcategories?.includes("Child Labor") ?? false,
			sub_cat_physical_abuse: r.case_subcategories?.includes("Physical Abuse") ?? false,
			sub_cat_sexual_abuse: r.case_subcategories?.includes("Sexual Abuse") ?? false,
			sub_cat_osaec: r.case_subcategories?.includes("OSAEC") ?? false,
			sub_cat_cicl: r.case_subcategories?.includes("CICL") ?? false,
			sub_cat_at_risk: r.case_subcategories?.includes("At Risk") ?? false,
			sub_cat_street_child: r.case_subcategories?.includes("Street Child") ?? false,
			sub_cat_child_with_hiv: r.case_subcategories?.includes("Child with HIV") ?? false,
			is_pwd: r.has_disability ?? false,
			pwd_type: r.disability_type || "",
			has_special_needs: false,
			special_needs_diagnosis: "",
			family_is_4ps: r.is_4ps_beneficiary ?? false,
			family_solo_parent: r.is_solo_parent ?? false,
			family_indigenous: r.is_indigenous ?? false,
			family_parent_pwd: r.family_parent_pwd ?? false,
			family_informal_settler: r.is_informal_settler ?? false,
			date_of_admission: r.admission_date || "",
			safehouse_id: r.safehouse_id || "",
			safehouse_name: r.safehouse_name || "",
			referral_source: r.referral_source || "",
			referring_agency_person: r.referred_by || "",
			date_colb_registered: "",
			date_colb_obtained: "",
			assigned_social_worker: r.assigned_social_worker || "",
			initial_case_assessment: r.reintegration_plan || "",
			date_case_study_prepared: r.reintegration_target_date || "",
			initial_risk_level: r.risk_level || "Medium",
			current_risk_level: r.risk_level || "Medium",
			reintegration_type: r.reintegration_type || "",
			reintegration_status: r.reintegration_status || "",
			date_enrolled: "",
			date_closed: r.date_closed || "",
			notes_restricted: "",
		})),
	[residentsFromApi]
  );

  const saveMutation = useMutation({
	mutationFn: async (payload: { mode: "add" | "edit"; data: ResidentProfile }) => {
		const body = buildCaseloadUpsertBody(payload.data);

		if (payload.mode === "add") {
			await apiPostJson("/api/admin/caseload/residents", body);
			return;
		}

		const id = String(payload.data.id).trim();
		if (!id) {
			throw new Error("Missing resident id.");
		}
		await apiPutJson(`/api/admin/caseload/residents/${id}`, body);
	},
	onSuccess: async () => {
		await queryClient.invalidateQueries({ queryKey: ["admin", "caseload", "residents"] });
	},
  });

  const deleteMutation = useMutation({
	mutationFn: async (residentId: string) => {
		await apiDelete(`/api/admin/caseload/residents/${residentId}`);
	},
	onSuccess: async () => {
		await queryClient.invalidateQueries({ queryKey: ["admin", "caseload", "residents"] });
	},
  });


  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return residents.filter((r) => {
      const q = filters.search.toLowerCase();
      if (q && !r.full_name.toLowerCase().includes(q) && !r.resident_code.toLowerCase().includes(q))
        return false;
      if (filters.status && r.case_status !== filters.status) return false;
      if (filters.category && r.case_category !== filters.category) return false;
      if (filters.safehouse && r.safehouse_id !== filters.safehouse) return false;
      if (filters.riskLevel && r.current_risk_level !== filters.riskLevel) return false;
      return true;
    });
  }, [residents, filters]);

  const anyFilterActive =
    filters.search || filters.status || filters.category || filters.safehouse || filters.riskLevel;

  const mutationError =
	saveMutation.error instanceof Error
		? saveMutation.error.message
		: deleteMutation.error instanceof Error
			? deleteMutation.error.message
			: "";

  // ── Metrics ────────────────────────────────────────────────────────────────

  const totalCount = residents.length;
  const activeCareCount = residents.filter((r) => r.case_status === "Active Care").length;
  const reintegrationCount = residents.filter((r) => r.case_status === "Reintegration").length;
  const criticalCount = residents.filter((r) => r.current_risk_level === "Critical").length;

  // ── Panel handlers ─────────────────────────────────────────────────────────

  function openView(r: ResidentProfile) {
    setPanelResident(r);
    setPanelMode("view");
  }

  function openAdd() {
    setFormData(EMPTY_FORM);
    setPanelResident(null);
    setPanelMode("add");
  }

  function openEdit(r: ResidentProfile) {
    setFormData({ ...r });
    setPanelResident(r);
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setPanelResident(null);
  }

  function handleField<K extends keyof ResidentProfile>(key: K, value: ResidentProfile[K]) {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      // Sync safehouse name when id changes
      if (key === "safehouse_id") {
        const sh = safehouses.find((s) => s.id === value);
        next.safehouse_name = sh?.name ?? "";
      }
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (panelMode !== "add" && panelMode !== "edit") return;
    await saveMutation.mutateAsync({ mode: panelMode, data: formData });
    closePanel();
  }

  async function handleDelete() {
    if (!panelResident) return;
    const ok = window.confirm(`Delete resident ${panelResident.full_name}? This cannot be undone.`);
    if (!ok) return;
    await deleteMutation.mutateAsync(panelResident.id);
    closePanel();
  }

  // ── Panel: view content ────────────────────────────────────────────────────

  function renderViewContent(r: ResidentProfile) {
    const activeSubs = SUB_CAT_FIELDS.filter((f) => r[f.key] as boolean).map((f) => f.label);
    const socioFlags = [
      r.family_is_4ps && "4Ps Beneficiary",
      r.family_solo_parent && "Solo Parent",
      r.family_indigenous && "Indigenous Group",
      r.family_parent_pwd && "Parent with Disability",
      r.family_informal_settler && "Informal Settler",
    ].filter(Boolean) as string[];

    const fmtDate = (d: string) =>
      d ? new Date(d + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : undefined;

    return (
      <div className="space-y-1 pb-6">
        <SectionDivider label="Identity & Demographics" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Full Name" value={r.full_name} />
          <ViewField label="Date of Birth" value={fmtDate(r.date_of_birth)} />
          <ViewField label="Sex" value={r.sex} />
          <ViewField label="Birth Status" value={r.birth_status} />
          <ViewField label="Place of Birth" value={r.place_of_birth} />
          <ViewField label="Religion" value={r.religion} />
        </div>

        <SectionDivider label="Case Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField
            label="Case Status"
            value={
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${STATUS_COLORS[r.case_status as CaseStatus]}`}>
                {r.case_status}
              </span>
            }
          />
          <ViewField
            label="Current Risk Level"
            value={
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${RISK_COLORS[r.current_risk_level as RiskLevel]}`}>
                {r.current_risk_level}
              </span>
            }
          />
          <ViewField
            label="Initial Risk Level"
            value={
              r.initial_risk_level ? (
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${RISK_COLORS[r.initial_risk_level as RiskLevel]}`}>
                  {r.initial_risk_level}
                </span>
              ) : undefined
            }
          />
          <ViewField label="Case Category" value={r.case_category} />
          <ViewField
            label="Sub-categories"
            value={
              activeSubs.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {activeSubs.map((s) => (
                    <span key={s} className="inline-flex px-2 py-0.5 rounded-full text-xs font-body bg-muted text-muted-foreground border border-border">
                      {s}
                    </span>
                  ))}
                </div>
              ) : undefined
            }
          />
        </div>

        <SectionDivider label="PWD & Special Needs" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Person with Disability (PWD)" value={r.is_pwd ? "Yes" : "No"} />
          {r.is_pwd && <ViewField label="PWD Type" value={r.pwd_type} />}
          <ViewField label="Has Special Needs" value={r.has_special_needs ? "Yes" : "No"} />
          {r.has_special_needs && <ViewField label="Diagnosis" value={r.special_needs_diagnosis} />}
        </div>

        <SectionDivider label="Family Socio-Demographic Profile" />
        <div className="pt-1 pb-3">
          {socioFlags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {socioFlags.map((f) => (
                <span key={f} className="inline-flex px-2.5 py-1 rounded-full text-xs font-body font-medium bg-primary/10 text-primary border border-primary/20">
                  {f}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-muted-foreground">No flags recorded.</p>
          )}
        </div>

        <SectionDivider label="Admission & Safehouse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Date of Admission" value={fmtDate(r.date_of_admission)} />
          <ViewField label="Safehouse" value={r.safehouse_name} />
          <ViewField label="Date Enrolled" value={fmtDate(r.date_enrolled)} />
          <ViewField label="Date Closed" value={fmtDate(r.date_closed)} />
        </div>

        <SectionDivider label="Referral Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Referring Agency / Person" value={r.referring_agency_person} />
          <ViewField label="Referral Source" value={r.referral_source} />
        </div>

        <SectionDivider label="Certificate of Live Birth" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Date COLB Registered" value={fmtDate(r.date_colb_registered)} />
          <ViewField label="Date COLB Obtained" value={fmtDate(r.date_colb_obtained)} />
        </div>

        <SectionDivider label="Case Work" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Assigned Social Worker" value={r.assigned_social_worker} />
          <ViewField label="Date Case Study Prepared" value={fmtDate(r.date_case_study_prepared)} />
          <div className="col-span-2">
            <ViewField label="Initial Case Assessment" value={r.initial_case_assessment} />
          </div>
        </div>

        <SectionDivider label="Reintegration" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Type" value={r.reintegration_type} />
          <ViewField label="Status" value={r.reintegration_status} />
        </div>

        {r.notes_restricted && (
          <>
            <SectionDivider label="Restricted Notes" />
            <div className="pt-1 pb-3">
              <ViewField label="Notes" value={r.notes_restricted} />
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Panel: form content ────────────────────────────────────────────────────

  function renderFormContent() {
    return (
      <form id="resident-form" onSubmit={handleSave} className="space-y-1 pb-6">
        <SectionDivider label="Identity & Demographics" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name <span className="text-red-500">*</span></Label>
            <Input required value={formData.full_name} onChange={(e) => handleField("full_name", e.target.value)} placeholder="Given name and surname" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resident Code</Label>
            <Input value={formData.resident_code} onChange={(e) => handleField("resident_code", e.target.value)} placeholder="Auto-generated if blank" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case Control No.</Label>
            <Input value={formData.case_control_no} onChange={(e) => handleField("case_control_no", e.target.value)} placeholder="e.g. CC-2025-001" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of Birth <span className="text-red-500">*</span></Label>
            <Input required type="date" value={formData.date_of_birth} onChange={(e) => handleField("date_of_birth", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sex</Label>
            <select aria-label="Sex" value={formData.sex} onChange={(e) => handleField("sex", e.target.value)} className={selectClass()}>
              <option value="">Select…</option>
              {["Female", "Male", "Intersex"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Birth Status</Label>
            <select aria-label="Birth status" value={formData.birth_status} onChange={(e) => handleField("birth_status", e.target.value)} className={selectClass()}>
              <option value="">Select…</option>
              {["Legitimate", "Illegitimate", "Legitimated", "Unknown"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Place of Birth</Label>
            <Input value={formData.place_of_birth} onChange={(e) => handleField("place_of_birth", e.target.value)} placeholder="City / Municipality" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Religion</Label>
            <Input value={formData.religion} onChange={(e) => handleField("religion", e.target.value)} placeholder="e.g. Roman Catholic" />
          </div>
        </div>

        <SectionDivider label="Case Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case Status <span className="text-red-500">*</span></Label>
            <select required aria-label="Case status" value={formData.case_status} onChange={(e) => handleField("case_status", e.target.value as CaseStatus)} className={selectClass()}>
              {CASE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case Category <span className="text-red-500">*</span></Label>
            <select required aria-label="Case category" value={formData.case_category} onChange={(e) => handleField("case_category", e.target.value)} className={selectClass()}>
              <option value="">Select category…</option>
              {CASE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Initial Risk Level <span className="text-red-500">*</span></Label>
            <select required aria-label="Initial risk level" value={formData.initial_risk_level} onChange={(e) => handleField("initial_risk_level", e.target.value as RiskLevel)} className={selectClass()}>
              {RISK_LEVELS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Risk Level <span className="text-red-500">*</span></Label>
            <select required aria-label="Current risk level" value={formData.current_risk_level} onChange={(e) => handleField("current_risk_level", e.target.value as RiskLevel)} className={selectClass()}>
              {RISK_LEVELS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-categories</Label>
            <div className="flex flex-wrap gap-2">
              {SUB_CAT_FIELDS.map(({ key, label }) => {
                const checked = formData[key] as boolean;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleField(key, !checked as ResidentProfile[typeof key])}
                    className={`px-3 py-1 rounded-full text-xs font-body border transition-all ${
                      checked
                        ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <SectionDivider label="PWD & Special Needs" />
        <div className="pt-1 pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_pwd"
              checked={formData.is_pwd}
              onChange={(e) => handleField("is_pwd", e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <Label htmlFor="is_pwd" className="font-body text-sm text-foreground cursor-pointer">
              Person with Disability (PWD)
            </Label>
          </div>
          {formData.is_pwd && (
            <div className="space-y-1.5">
              <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">PWD Type</Label>
              <Input value={formData.pwd_type} onChange={(e) => handleField("pwd_type", e.target.value)} placeholder="e.g. Visual, Hearing, Physical" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_special_needs"
              checked={formData.has_special_needs}
              onChange={(e) => handleField("has_special_needs", e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <Label htmlFor="has_special_needs" className="font-body text-sm text-foreground cursor-pointer">
              Has Special Needs
            </Label>
          </div>
          {formData.has_special_needs && (
            <div className="space-y-1.5">
              <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnosis / Description</Label>
              <Input value={formData.special_needs_diagnosis} onChange={(e) => handleField("special_needs_diagnosis", e.target.value)} placeholder="e.g. Autism Spectrum Disorder" />
            </div>
          )}
        </div>

        <SectionDivider label="Family Socio-Demographic Profile" />
        <div className="pt-1 pb-3 space-y-2">
          {(
            [
              ["family_is_4ps", "4Ps Beneficiary (Pantawid Pamilya)"],
              ["family_solo_parent", "Solo Parent"],
              ["family_indigenous", "Member of Indigenous Group"],
              ["family_parent_pwd", "Parent with Disability"],
              ["family_informal_settler", "Informal Settler"],
            ] as [keyof ResidentProfile, string][]
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={key}
                checked={formData[key] as boolean}
                onChange={(e) => handleField(key, e.target.checked as ResidentProfile[typeof key])}
                className="h-4 w-4 rounded accent-primary"
              />
              <Label htmlFor={key} className="font-body text-sm text-foreground cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>

        <SectionDivider label="Admission & Safehouse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of Admission <span className="text-red-500">*</span></Label>
            <Input required type="date" value={formData.date_of_admission} onChange={(e) => handleField("date_of_admission", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Safehouse <span className="text-red-500">*</span></Label>
            <select required aria-label="Safehouse" value={formData.safehouse_id} onChange={(e) => handleField("safehouse_id", e.target.value)} className={selectClass()}>
              <option value="">Select safehouse…</option>
              {safehouses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date Enrolled</Label>
            <Input type="date" value={formData.date_enrolled} onChange={(e) => handleField("date_enrolled", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date Closed</Label>
            <Input type="date" value={formData.date_closed} onChange={(e) => handleField("date_closed", e.target.value)} />
          </div>
        </div>

        <SectionDivider label="Referral Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referring Agency / Person</Label>
            <Input value={formData.referring_agency_person} onChange={(e) => handleField("referring_agency_person", e.target.value)} placeholder="Name or organization" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Source</Label>
            <select aria-label="Referral source" value={formData.referral_source} onChange={(e) => handleField("referral_source", e.target.value)} className={selectClass()}>
              <option value="">Select source…</option>
              {REFERRAL_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <SectionDivider label="Certificate of Live Birth (COLB)" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date COLB Registered</Label>
            <Input type="date" value={formData.date_colb_registered} onChange={(e) => handleField("date_colb_registered", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date COLB Obtained</Label>
            <Input type="date" value={formData.date_colb_obtained} onChange={(e) => handleField("date_colb_obtained", e.target.value)} />
          </div>
        </div>

        <SectionDivider label="Case Work" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned Social Worker <span className="text-red-500">*</span></Label>
            <Input required value={formData.assigned_social_worker} onChange={(e) => handleField("assigned_social_worker", e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date Case Study Prepared</Label>
            <Input type="date" value={formData.date_case_study_prepared} onChange={(e) => handleField("date_case_study_prepared", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Initial Case Assessment</Label>
            <textarea
              rows={3}
              value={formData.initial_case_assessment}
              onChange={(e) => handleField("initial_case_assessment", e.target.value)}
              placeholder="Summary of initial assessment…"
              className={textareaClass()}
            />
          </div>
        </div>

        <SectionDivider label="Reintegration" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reintegration Type</Label>
            <select aria-label="Reintegration type" value={formData.reintegration_type} onChange={(e) => handleField("reintegration_type", e.target.value)} className={selectClass()}>
              <option value="">Select…</option>
              {["Family Reunification", "Adoption", "Foster Care", "Independent Living", "Institutional Care", "Other"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reintegration Status</Label>
            <select aria-label="Reintegration status" value={formData.reintegration_status} onChange={(e) => handleField("reintegration_status", e.target.value)} className={selectClass()}>
              <option value="">Select…</option>
              {["Not Started", "In Progress", "On Track", "Delayed", "Completed"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <SectionDivider label="Restricted Notes" />
        <div className="pt-1 pb-3 space-y-1.5">
          <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (Restricted)</Label>
          <textarea
            rows={3}
            value={formData.notes_restricted}
            onChange={(e) => handleField("notes_restricted", e.target.value)}
            placeholder="Confidential notes visible only to authorized staff…"
            className={textareaClass()}
          />
        </div>
      </form>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background font-body">
      <AdminSidebar user={user ?? null} />

      <main className="md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Caseload Inventory</h1>
            <p className="font-body text-base text-muted-foreground mt-1">
              Resident case management following Philippine social welfare standards.
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="font-body gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl shadow-sm mt-1"
          >
            <Plus className="h-4 w-4" />
            Add Resident
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users, label: "Total Residents", value: totalCount, sub: "All records", color: "bg-primary/10 text-primary" },
            { icon: Activity, label: "Active Care", value: activeCareCount, sub: "Currently in shelter", color: "bg-chart-3/15 text-chart-3" },
            { icon: RefreshCw, label: "Reintegration", value: reintegrationCount, sub: "Transition phase", color: "bg-purple-100 text-purple-700" },
            { icon: ShieldAlert, label: "Critical Risk", value: criticalCount, sub: "Requiring urgent attention", color: "bg-destructive/15 text-destructive" },
          ].map((m) => (
            <div key={m.label} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${m.color} mb-3`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">{m.value}</div>
              <div className="font-body text-sm font-medium text-foreground mt-0.5">{m.label}</div>
              <div className="font-body text-xs text-muted-foreground">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-0">
              <Input
                placeholder="Search name or case code…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            {(
              [
                ["status", "All Statuses", CASE_STATUSES],
                ["category", "All Categories", CASE_CATEGORIES],
                ["riskLevel", "All Risk Levels", RISK_LEVELS],
              ] as [keyof typeof filters, string, readonly string[]][]
            ).map(([key, placeholder, options]) => (
              <select
                key={key}
                aria-label={placeholder}
                value={filters[key]}
                onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 w-full md:w-auto"
              >
                <option value="">{placeholder}</option>
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ))}
            <select
              aria-label="Filter by safehouse"
              value={filters.safehouse}
              onChange={(e) => setFilters((f) => ({ ...f, safehouse: e.target.value }))}
              className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 w-full md:w-auto"
            >
              <option value="">All Safehouses</option>
              {safehouses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {anyFilterActive && (
              <button
                onClick={() => setFilters({ search: "", status: "", category: "", safehouse: "", riskLevel: "" })}
                className="font-body text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Mobile card view */}
          <div className="block md:hidden divide-y divide-border">
            {isResidentsLoading ? (
              <div className="py-16 text-center text-muted-foreground font-body text-sm">Loading residents...</div>
            ) : residentsError ? (
              <div className="py-16 text-center text-destructive font-body text-sm">Failed to load residents. Please refresh.</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground font-body text-sm">No residents match the current filters.</div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="p-4 cursor-pointer" onClick={() => openView(r)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-body text-sm font-medium text-foreground truncate">{r.full_name}</p>
                      <p className="font-body text-xs text-muted-foreground">{r.resident_code}</p>
                    </div>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border flex-shrink-0 ${RISK_COLORS[r.current_risk_level as RiskLevel]}`}>
                      {r.current_risk_level}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${STATUS_COLORS[r.case_status as CaseStatus]}`}>{r.case_status}</span>
                    <span className="font-body text-xs text-muted-foreground">{r.safehouse_name}</span>
                  </div>
                  {r.date_of_admission && (
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      Admitted: {new Date(r.date_of_admission + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); openView(r); }} className="font-body text-xs h-7 px-3 rounded-lg">
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {["Case Code", "Full Name", "Case Category", "Status", "Risk", "Safehouse", "Social Worker", "Admitted", ""].map(
                    (h) => (
                      <TableHead key={h} className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isResidentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground font-body text-sm">
                      Loading residents...
                    </TableCell>
                  </TableRow>
                ) : residentsError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-destructive font-body text-sm">
                      Failed to load residents. Please refresh.
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground font-body text-sm">
                      No residents match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow
                      key={r.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openView(r)}
                    >
                      <TableCell className="font-body text-sm font-medium text-foreground">
                        {r.resident_code}
                      </TableCell>
                      <TableCell className="font-body text-sm text-foreground font-medium">
                        {r.full_name}
                      </TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">
                        {r.case_category}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${STATUS_COLORS[r.case_status as CaseStatus]}`}>
                          {r.case_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${RISK_COLORS[r.current_risk_level as RiskLevel]}`}>
                          {r.current_risk_level}
                        </span>
                      </TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">
                        {r.safehouse_name}
                      </TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">
                        {r.assigned_social_worker}
                      </TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">
                        {r.date_of_admission
                          ? new Date(r.date_of_admission + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                          : "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          onClick={() => openView(r)}
                          className="font-body text-xs h-7 px-3 rounded-lg"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Drawer panel */}
      {panelMode !== null && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[520px] bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 ease-out">
            {/* Panel header */}
            <div className="flex items-start justify-between p-6 border-b border-border flex-shrink-0">
              <div>
                <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                  {panelMode === "add" ? "New Resident" : panelMode === "edit" ? "Edit Record" : "Resident Profile"}
                </p>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {panelMode === "add"
                    ? "Add Resident"
                    : panelMode === "edit"
                    ? formData.full_name || "Edit Resident"
                    : panelResident?.full_name}
                </h2>
                {panelMode !== "add" && (
                  <p className="font-body text-sm text-muted-foreground mt-0.5">
                    {panelMode === "edit" ? formData.resident_code : panelResident?.resident_code}
                  </p>
                )}
              </div>
              <button
                onClick={closePanel}
                aria-label="Close panel"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 pt-4">
              {panelMode === "view" && panelResident
                ? renderViewContent(panelResident)
                : renderFormContent()}
            </div>

            {/* Panel footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-background">
              {mutationError && (
                <p className="mr-auto font-body text-xs text-destructive">{mutationError}</p>
              )}
              {panelMode === "view" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    className="font-body px-5 h-9 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                  <Button variant="outline" onClick={closePanel} className="font-body px-5 h-9 rounded-xl">
                    Close
                  </Button>
                  <Button
                    onClick={() => openEdit(panelResident!)}
                    className="font-body gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-9 rounded-xl"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (panelMode === "edit") {
                        setPanelMode("view");
                      } else {
                        closePanel();
                      }
                    }}
                    className="font-body px-5 h-9 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="resident-form"
                    className="font-body bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-9 rounded-xl"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending
                      ? "Saving..."
                      : panelMode === "edit"
                        ? "Save Changes"
                        : "Add Resident"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
