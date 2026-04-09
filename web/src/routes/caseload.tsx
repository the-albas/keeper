import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Activity, Pencil, Plus, RefreshCw, ShieldAlert, Users, X } from "lucide-react";
import { apiGetJson, type AuthMeResponse } from "@/lib/api";
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
	date_of_birth: string;
	sex: string;
	civil_status: string;
	nationality: string;
	case_status: CaseStatus | string;
	case_category: string;
	case_subcategories: string[];
	risk_level: RiskLevel | string;
	has_disability: boolean;
	disability_type: string;
	is_4ps_beneficiary: boolean;
	is_solo_parent: boolean;
	is_indigenous: boolean;
	is_informal_settler: boolean;
	admission_date: string;
	safehouse_id: string;
	safehouse_name: string;
	referred_by: string;
	referral_source: string;
	assigned_social_worker: string;
	reintegration_plan: string;
	reintegration_target_date: string;
	reintegration_status: string;
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
	"Trafficked",
	"Physical Abuse",
	"Sexual Abuse",
	"Psychological Abuse",
	"Economic Abuse",
	"Neglected",
	"Abandoned",
	"Surrendered",
	"Foundling",
];

const SUBCATEGORIES: Record<string, string[]> = {
	Trafficked: [
		"Labor Trafficking",
		"Sex Trafficking",
		"Domestic Servitude",
		"Debt Bondage",
	],
	"Physical Abuse": [
		"Intimate Partner Violence",
		"Child Physical Abuse",
		"Elder Abuse",
		"Assault by Stranger",
	],
	"Sexual Abuse": [
		"Rape",
		"Sexual Harassment",
		"Child Sexual Abuse (CSAM)",
		"Online Sexual Exploitation",
	],
	"Psychological Abuse": [
		"Emotional Manipulation",
		"Coercion & Control",
		"Isolation",
		"Threats & Intimidation",
	],
	"Economic Abuse": [
		"Financial Control",
		"Destruction of Property",
		"Forced Economic Dependency",
	],
	Neglected: ["Child Neglect", "Elder Neglect", "Medical Neglect"],
	Abandoned: ["Child Abandonment", "Spousal Abandonment"],
};

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

const SAFEHOUSES = [
	{ id: "SH-001", name: "Tahanan ng Pag-asa" },
	{ id: "SH-002", name: "Bagong Simula Center" },
	{ id: "SH-003", name: "Kalayaan Shelter" },
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

type ResidentApi = {
  id: string;
  resident_code: string;
  full_name?: string;
  date_of_birth?: string;
  sex?: string;
  case_status?: string;
  risk_level?: string;
  case_category?: string;
  safehouse_id?: string;
  safehouse_name?: string;
  assigned_social_worker?: string;
  admission_date?: string;
};

const EMPTY_FORM: ResidentProfile = {
	id: "",
	resident_code: "",
	full_name: "",
	date_of_birth: "",
	sex: "",
	civil_status: "",
	nationality: "Filipino",
	case_status: "Intake",
	case_category: "",
	case_subcategories: [],
	risk_level: "Medium",
	has_disability: false,
	disability_type: "",
	is_4ps_beneficiary: false,
	is_solo_parent: false,
	is_indigenous: false,
	is_informal_settler: false,
	admission_date: "",
	safehouse_id: "",
	safehouse_name: "",
	referred_by: "",
	referral_source: "",
	assigned_social_worker: "",
	reintegration_plan: "",
	reintegration_target_date: "",
	reintegration_status: "",
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

// ─── Main component ───────────────────────────────────────────────────────────

function CaseloadPage() {
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
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

  const { data: residentsFromApi = [] } = useQuery<ResidentApi[]>({
    queryKey: ["admin-data", "residents", "caseload"],
    queryFn: () => apiGetJson<ResidentApi[]>("/api/admin-data/residents"),
  });

  const { data: lookupsData } = useQuery<{ safehouses: { id: string; name: string }[] }>({
    queryKey: ["admin", "lookups", "donor-ui"],
    queryFn: () => apiGetJson<{ safehouses: { id: string; name: string }[] }>("/api/admin/lookups/donor-ui"),
    staleTime: 60_000,
  });
  const SAFEHOUSES = lookupsData?.safehouses ?? [];

  useEffect(() => {
    const normalizeCaseStatus = (value?: string): CaseStatus => {
      const v = (value ?? "").toLowerCase();
      if (v === "intake") return "Intake";
      if (v === "assessment") return "Assessment";
      if (v === "reintegration") return "Reintegration";
      if (v === "closed") return "Closed";
      if (v === "graduated") return "Graduated";
      return "Active Care";
    };
    const normalizeRisk = (value?: string): RiskLevel => {
      const v = (value ?? "").toLowerCase();
      if (v === "low") return "Low";
      if (v === "high") return "High";
      if (v === "critical") return "Critical";
      return "Medium";
    };
    setResidents(
      residentsFromApi.map((r) => ({
        id: r.id,
        resident_code: r.resident_code || `RES-${r.id}`,
        full_name: r.full_name || `Resident ${r.id}`,
        date_of_birth: r.date_of_birth || "",
        sex: r.sex || "Female",
        civil_status: "",
        nationality: "Filipino",
        case_status: normalizeCaseStatus(r.case_status),
        case_category: r.case_category || "",
        case_subcategories: [],
        risk_level: normalizeRisk(r.risk_level),
        has_disability: false,
        disability_type: "",
        is_4ps_beneficiary: false,
        is_solo_parent: false,
        is_indigenous: false,
        is_informal_settler: false,
        admission_date: r.admission_date || "",
        safehouse_id: r.safehouse_id || "",
        safehouse_name: r.safehouse_name || "",
        referred_by: "",
        referral_source: "",
        assigned_social_worker: r.assigned_social_worker || "",
        reintegration_plan: "",
        reintegration_target_date: "",
        reintegration_status: "",
      }))
    );
  }, [residentsFromApi]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return residents.filter((r) => {
      const q = filters.search.toLowerCase();
      if (q && !r.full_name.toLowerCase().includes(q) && !r.resident_code.toLowerCase().includes(q))
        return false;
      if (filters.status && r.case_status !== filters.status) return false;
      if (filters.category && r.case_category !== filters.category) return false;
      if (filters.safehouse && r.safehouse_id !== filters.safehouse) return false;
      if (filters.riskLevel && r.risk_level !== filters.riskLevel) return false;
      return true;
    });
  }, [residents, filters]);

  const anyFilterActive =
    filters.search || filters.status || filters.category || filters.safehouse || filters.riskLevel;

  // ── Metrics ────────────────────────────────────────────────────────────────

  const totalCount = residents.length;
  const activeCareCount = residents.filter((r) => r.case_status === "Active Care").length;
  const reintegrationCount = residents.filter((r) => r.case_status === "Reintegration").length;
  const criticalCount = residents.filter((r) => r.risk_level === "Critical").length;

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
      // Clear subcategories when category changes
      if (key === "case_category") next.case_subcategories = [];
      // Sync safehouse name when id changes
      if (key === "safehouse_id") {
        const sh = SAFEHOUSES.find((s) => s.id === value);
        next.safehouse_name = sh?.name ?? "";
      }
      return next;
    });
  }

  function toggleSubcategory(sub: string) {
    setFormData((prev) => ({
      ...prev,
      case_subcategories: prev.case_subcategories.includes(sub)
        ? prev.case_subcategories.filter((s) => s !== sub)
        : [...prev.case_subcategories, sub],
    }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (panelMode === "add") {
      const newResident: ResidentProfile = {
        ...formData,
        id: `r-${Date.now()}`,
        resident_code: formData.resident_code || `KPR-${new Date().getFullYear()}-${String(residents.length + 1).padStart(3, "0")}`,
      };
      // TODO: POST to your C# API endpoint
      setResidents((prev) => [newResident, ...prev]);
    } else if (panelMode === "edit") {
      // TODO: PUT to your C# API endpoint
      setResidents((prev) => prev.map((r) => (r.id === formData.id ? formData : r)));
      setPanelResident(formData);
      setPanelMode("view");
      return;
    }
    closePanel();
  }

  // ── Panel: view content ────────────────────────────────────────────────────

  function renderViewContent(r: ResidentProfile) {
    const socioFlags = [
      r.is_4ps_beneficiary && "4Ps Beneficiary",
      r.is_solo_parent && "Solo Parent",
      r.is_indigenous && "Indigenous Group",
      r.is_informal_settler && "Informal Settler",
    ].filter(Boolean) as string[];

    return (
      <div className="space-y-1 pb-6">
        <SectionDivider label="Identity & Demographics" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Full Name" value={r.full_name} />
          <ViewField label="Date of Birth" value={r.date_of_birth ? new Date(r.date_of_birth + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : undefined} />
          <ViewField label="Sex" value={r.sex} />
          <ViewField label="Civil Status" value={r.civil_status} />
          <ViewField label="Nationality" value={r.nationality} />
        </div>

        <SectionDivider label="Case Information" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField
            label="Case Status"
            value={
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${STATUS_COLORS[r.case_status as CaseStatus]}`}>
                {r.case_status}
              </span>
            }
          />
          <ViewField
            label="Risk Level"
            value={
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${RISK_COLORS[r.risk_level as RiskLevel]}`}>
                {r.risk_level}
              </span>
            }
          />
          <ViewField label="Case Category" value={r.case_category} />
          <ViewField
            label="Sub-categories"
            value={
              r.case_subcategories.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {r.case_subcategories.map((s) => (
                    <span key={s} className="inline-flex px-2 py-0.5 rounded-full text-xs font-body bg-muted text-muted-foreground border border-border">
                      {s}
                    </span>
                  ))}
                </div>
              ) : undefined
            }
          />
        </div>

        <SectionDivider label="Disability Information" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Has Disability" value={r.has_disability ? "Yes" : "No"} />
          {r.has_disability && <ViewField label="Disability Type" value={r.disability_type} />}
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
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Admission Date" value={r.admission_date ? new Date(r.admission_date + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : undefined} />
          <ViewField label="Safehouse" value={r.safehouse_name} />
        </div>

        <SectionDivider label="Referral Information" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Referred By" value={r.referred_by} />
          <ViewField label="Referral Source" value={r.referral_source} />
        </div>

        <SectionDivider label="Assigned Social Worker" />
        <div className="pt-1 pb-3">
          <ViewField label="Social Worker" value={r.assigned_social_worker} />
        </div>

        <SectionDivider label="Reintegration Tracking" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Status" value={r.reintegration_status} />
          <ViewField label="Target Date" value={r.reintegration_target_date ? new Date(r.reintegration_target_date + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : undefined} />
          <div className="col-span-2">
            <ViewField label="Plan" value={r.reintegration_plan} />
          </div>
        </div>
      </div>
    );
  }

  // ── Panel: form content ────────────────────────────────────────────────────

  function renderFormContent() {
    const subcategoryOptions = SUBCATEGORIES[formData.case_category] ?? [];
    return (
      <form id="resident-form" onSubmit={handleSave} className="space-y-1 pb-6">
        <SectionDivider label="Identity & Demographics" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name <span className="text-red-500">*</span></Label>
            <Input required value={formData.full_name} onChange={(e) => handleField("full_name", e.target.value)} placeholder="Given name and surname" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resident Code</Label>
            <Input value={formData.resident_code} onChange={(e) => handleField("resident_code", e.target.value)} placeholder="Auto-generated if blank" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of Birth <span className="text-red-500">*</span></Label>
            <Input required type="date" value={formData.date_of_birth} onChange={(e) => handleField("date_of_birth", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sex</Label>
            <select aria-label="Sex" value={formData.sex} onChange={(e) => handleField("sex", e.target.value)} className={selectClass()}>
              <option value="">Select…</option>
              {["Female", "Male", "Intersex", "Prefer not to say"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Civil Status</Label>
            <select aria-label="Civil status" value={formData.civil_status} onChange={(e) => handleField("civil_status", e.target.value)} className={selectClass()}>
              <option value="">Select…</option>
              {["Single", "Married", "Separated", "Widowed", "Cohabiting"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nationality</Label>
            <Input value={formData.nationality} onChange={(e) => handleField("nationality", e.target.value)} placeholder="e.g. Filipino" />
          </div>
        </div>

        <SectionDivider label="Case Information" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case Status <span className="text-red-500">*</span></Label>
            <select required aria-label="Case status" value={formData.case_status} onChange={(e) => handleField("case_status", e.target.value as CaseStatus)} className={selectClass()}>
              {CASE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Level <span className="text-red-500">*</span></Label>
            <select required aria-label="Risk level" value={formData.risk_level} onChange={(e) => handleField("risk_level", e.target.value as RiskLevel)} className={selectClass()}>
              {RISK_LEVELS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case Category <span className="text-red-500">*</span></Label>
            <select required aria-label="Case category" value={formData.case_category} onChange={(e) => handleField("case_category", e.target.value)} className={selectClass()}>
              <option value="">Select category…</option>
              {CASE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {subcategoryOptions.length > 0 && (
            <div className="col-span-2 space-y-2">
              <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-categories</Label>
              <div className="flex flex-wrap gap-2">
                {subcategoryOptions.map((sub) => {
                  const checked = formData.case_subcategories.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubcategory(sub)}
                      className={`px-3 py-1 rounded-full text-xs font-body border transition-all ${
                        checked
                          ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <SectionDivider label="Disability Information" />
        <div className="pt-1 pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_disability"
              checked={formData.has_disability}
              onChange={(e) => handleField("has_disability", e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <Label htmlFor="has_disability" className="font-body text-sm text-foreground cursor-pointer">
              Resident has a disability
            </Label>
          </div>
          {formData.has_disability && (
            <div className="space-y-1.5">
              <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disability Type</Label>
              <Input value={formData.disability_type} onChange={(e) => handleField("disability_type", e.target.value)} placeholder="Describe the disability" />
            </div>
          )}
        </div>

        <SectionDivider label="Family Socio-Demographic Profile" />
        <div className="pt-1 pb-3 space-y-2">
          {(
            [
              ["is_4ps_beneficiary", "4Ps Beneficiary (Pantawid Pamilya)"],
              ["is_solo_parent", "Solo Parent"],
              ["is_indigenous", "Member of Indigenous Group"],
              ["is_informal_settler", "Informal Settler"],
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
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admission Date <span className="text-red-500">*</span></Label>
            <Input required type="date" value={formData.admission_date} onChange={(e) => handleField("admission_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Safehouse <span className="text-red-500">*</span></Label>
            <select required aria-label="Safehouse" value={formData.safehouse_id} onChange={(e) => handleField("safehouse_id", e.target.value)} className={selectClass()}>
              <option value="">Select safehouse…</option>
              {SAFEHOUSES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <SectionDivider label="Referral Information" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referred By</Label>
            <Input value={formData.referred_by} onChange={(e) => handleField("referred_by", e.target.value)} placeholder="Person or agency name" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Source</Label>
            <select aria-label="Referral source" value={formData.referral_source} onChange={(e) => handleField("referral_source", e.target.value)} className={selectClass()}>
              <option value="">Select source…</option>
              {REFERRAL_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <SectionDivider label="Assigned Social Worker" />
        <div className="pt-1 pb-3 space-y-1.5">
          <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Social Worker <span className="text-red-500">*</span></Label>
          <Input required value={formData.assigned_social_worker} onChange={(e) => handleField("assigned_social_worker", e.target.value)} placeholder="Full name" />
        </div>

        <SectionDivider label="Reintegration Tracking" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reintegration Status</Label>
            <select aria-label="Reintegration status" value={formData.reintegration_status} onChange={(e) => handleField("reintegration_status", e.target.value)} className={selectClass()}>
              <option value="">Select…</option>
              {["Not Started", "In Progress", "On Track", "Delayed", "Completed"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Date</Label>
            <Input type="date" value={formData.reintegration_target_date} onChange={(e) => handleField("reintegration_target_date", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reintegration Plan</Label>
            <textarea
              rows={3}
              value={formData.reintegration_plan}
              onChange={(e) => handleField("reintegration_plan", e.target.value)}
              placeholder="Describe the plan for reintegration…"
              className={textareaClass()}
            />
          </div>
        </div>
      </form>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background font-body">
      <AdminSidebar user={user ?? null} />

      <main className="ml-64 p-8">
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
            <div className="relative flex-1 min-w-[180px]">
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
                className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 min-w-[150px]"
              >
                <option value="">{placeholder}</option>
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ))}
            <select
              aria-label="Filter by safehouse"
              value={filters.safehouse}
              onChange={(e) => setFilters((f) => ({ ...f, safehouse: e.target.value }))}
              className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 min-w-[150px]"
            >
              <option value="">All Safehouses</option>
              {SAFEHOUSES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              {filtered.length === 0 ? (
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
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${RISK_COLORS[r.risk_level as RiskLevel]}`}>
                        {r.risk_level}
                      </span>
                    </TableCell>
                    <TableCell className="font-body text-sm text-muted-foreground">
                      {r.safehouse_name}
                    </TableCell>
                    <TableCell className="font-body text-sm text-muted-foreground">
                      {r.assigned_social_worker}
                    </TableCell>
                    <TableCell className="font-body text-sm text-muted-foreground">
                      {r.admission_date
                        ? new Date(r.admission_date + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
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
          <div className="fixed inset-y-0 right-0 w-[520px] bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 ease-out">
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
              {panelMode === "view" ? (
                <>
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
                  >
                    {panelMode === "edit" ? "Save Changes" : "Add Resident"}
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
