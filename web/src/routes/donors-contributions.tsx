import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DollarSign, Gift, Heart, Pencil, Plus, TrendingUp, Users, X } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiDelete, apiGetJson, apiPostJson, apiPutJson, type AuthMeResponse } from "@/lib/api";
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

export const Route = createFileRoute("/donors-contributions")({
	beforeLoad: async ({ context }) => {
		await requireRole(context.queryClient, "Admin", "Staff");
	},
	component: DonorsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type SupporterType =
	| "Monetary Donor"
	| "Volunteer"
	| "Skills Contributor"
	| "In-Kind Donor"
	| "Corporate Partner"
	| "Social Media Advocate";

type SupporterStatus = "Active" | "Inactive" | "Prospect";

type ContributionType =
	| "Monetary"
	| "In-Kind"
	| "Time / Volunteer"
	| "Skills"
	| "Social Media";

interface Supporter {
	id: string;
	name: string;
	email: string;
	phone: string;
	supporter_type: SupporterType | string;
	status: SupporterStatus | string;
	organization: string;
	is_anonymous: boolean;
	joined_date: string;
	notes: string;
}

interface Contribution {
	id: string;
	supporter_id: string;
	supporter_name: string;
	contribution_type: ContributionType | string;
	date: string;
	// Monetary
	amount: number;
	currency: string;
	payment_method: string;
	campaign: string;
	// In-Kind
	item_description: string;
	estimated_value: number;
	// Time / Skills
	hours: number;
	skill_description: string;
	// Social Media
	platform: string;
	reach: string;
	// Allocation
	allocation_safehouse: string;
	allocation_program: string;
	receipt_number: string;
	notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTER_TYPES: SupporterType[] = [
	"Monetary Donor",
	"Volunteer",
	"Skills Contributor",
	"In-Kind Donor",
	"Corporate Partner",
	"Social Media Advocate",
];

const SUPPORTER_STATUSES: SupporterStatus[] = [
	"Active",
	"Inactive",
	"Prospect",
];

const CONTRIBUTION_TYPES: ContributionType[] = [
	"Monetary",
	"In-Kind",
	"Time / Volunteer",
	"Skills",
	"Social Media",
];

const PAYMENT_METHODS = [
	"Bank Transfer",
	"Credit / Debit Card",
	"Cash",
	"Check",
	"GCash",
	"PayMaya",
	"Other",
];

const SOCIAL_PLATFORMS = [
	"Facebook",
	"Instagram",
	"Twitter / X",
	"TikTok",
	"LinkedIn",
	"YouTube",
];

/** API: GET /api/admin/lookups/donor-ui */
interface DonorUiLookups {
	safehouses: { id: string; name: string }[];
	programs: string[];
	campaigns: string[];
}

// ─── Badge colors ─────────────────────────────────────────────────────────────

const SUPPORTER_TYPE_COLORS: Record<SupporterType, string> = {
	"Monetary Donor": "bg-yellow-50 text-yellow-700 border-yellow-200",
	Volunteer: "bg-green-50 text-green-700 border-green-200",
	"Skills Contributor": "bg-blue-50 text-blue-700 border-blue-200",
	"In-Kind Donor": "bg-purple-50 text-purple-700 border-purple-200",
	"Corporate Partner": "bg-primary/10 text-primary border-primary/20",
	"Social Media Advocate": "bg-pink-50 text-pink-700 border-pink-200",
};

const STATUS_COLORS: Record<SupporterStatus, string> = {
	Active: "bg-green-50 text-green-700 border-green-200",
	Inactive: "bg-muted text-muted-foreground border-border",
	Prospect: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const CONTRIBUTION_TYPE_COLORS: Record<ContributionType, string> = {
	Monetary: "bg-yellow-50 text-yellow-700 border-yellow-200",
	"In-Kind": "bg-purple-50 text-purple-700 border-purple-200",
	"Time / Volunteer": "bg-green-50 text-green-700 border-green-200",
	Skills: "bg-blue-50 text-blue-700 border-blue-200",
	"Social Media": "bg-pink-50 text-pink-700 border-pink-200",
};

// ─── Mock data ────────────────────────────────────────────────────────────────

type SupporterApi = Supporter;
type DonationApi = {
  id: string;
  supporter_id: string;
  supporter_name: string;
  amount: number;
  created_date: string;
  type?: string | null;
  campaign?: string | null;
  allocation?: string | null;
};

// ─── Empty forms ──────────────────────────────────────────────────────────────

const EMPTY_SUPPORTER: Supporter = {
	id: "",
	name: "",
	email: "",
	phone: "",
	supporter_type: "Monetary Donor",
	status: "Active",
	organization: "",
	is_anonymous: false,
	joined_date: "",
	notes: "",
};

const EMPTY_CONTRIBUTION: Contribution = {
	id: "",
	supporter_id: "",
	supporter_name: "",
	contribution_type: "Monetary",
	date: "",
	amount: 0,
	currency: "PHP",
	payment_method: "",
	campaign: "",
	item_description: "",
	estimated_value: 0,
	hours: 0,
	skill_description: "",
	platform: "",
	reach: "",
	allocation_safehouse: "",
	allocation_program: "",
	receipt_number: "",
	notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
	if (!d) return "—";
	return new Date(`${d}T00:00:00`).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatPHP(n: number) {
	return `₱${n.toLocaleString("en-PH")}`;
}

function selectClass() {
	return "h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
}

function textareaClass() {
	return "w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none";
}

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
	value?: React.ReactNode;
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

// ─── Main component ───────────────────────────────────────────────────────────

function DonorsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"supporters" | "contributions">("supporters");

  // Supporter state
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [supporterFilters, setSupporterFilters] = useState({ search: "", type: "", status: "" });
  const [panelMode, setPanelMode] = useState<"view" | "edit" | "add" | null>(null);
  const [panelSupporter, setPanelSupporter] = useState<Supporter | null>(null);
  const [supporterForm, setSupporterForm] = useState<Supporter>(EMPTY_SUPPORTER);

  // Contribution state
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contribFilters, setContribFilters] = useState({ search: "", type: "", safehouse: "", program: "" });
  const [showContribForm, setShowContribForm] = useState(false);
  const [contribForm, setContribForm] = useState<Contribution>(EMPTY_CONTRIBUTION);

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

  const { data: supportersFromApi = [] } = useQuery<SupporterApi[]>({
    queryKey: ["admin-data", "supporters"],
    queryFn: () => apiGetJson<SupporterApi[]>("/api/admin-data/supporters"),
  });

  const { data: donationsFromApi = [] } = useQuery<DonationApi[]>({
    queryKey: ["admin-data", "donations"],
    queryFn: () => apiGetJson<DonationApi[]>("/api/admin-data/donations"),
  });
  const { data: donorUiLookups } = useQuery<DonorUiLookups>({
    queryKey: ["admin", "lookups", "donor-ui"],
    queryFn: () => apiGetJson<DonorUiLookups>("/api/admin/lookups/donor-ui"),
  });

  const SAFEHOUSES = useMemo(
    () => donorUiLookups?.safehouses.map((safehouse) => safehouse.name) ?? [],
    [donorUiLookups]
  );
  const PROGRAMS = donorUiLookups?.programs ?? [];
  const CAMPAIGNS = donorUiLookups?.campaigns ?? [];

  const saveSupporterMutation = useMutation({
    mutationFn: async (payload: { mode: "add" | "edit"; supporter: Supporter }) => {
      const body = {
        name: payload.supporter.name,
        email: payload.supporter.email,
        phone: payload.supporter.phone,
        supporter_type: payload.supporter.supporter_type,
        status: payload.supporter.status,
        organization: payload.supporter.organization,
        is_anonymous: payload.supporter.is_anonymous,
        joined_date: payload.supporter.joined_date,
        notes: payload.supporter.notes,
      };
      if (payload.mode === "add") {
        await apiPostJson("/api/admin/supporters", body);
        return;
      }
      await apiPutJson(`/api/admin/supporters/${payload.supporter.id}`, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-data", "supporters"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "supporters"] });
    },
  });

  const deleteSupporterMutation = useMutation({
    mutationFn: async (supporterId: string) => {
      await apiDelete(`/api/admin/supporters/${supporterId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-data", "supporters"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "supporters"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-data", "donations"] });
    },
  });

  const mutationError =
    saveSupporterMutation.error instanceof Error
      ? saveSupporterMutation.error.message
      : deleteSupporterMutation.error instanceof Error
        ? deleteSupporterMutation.error.message
        : "";

  useEffect(() => {
    if (!panelMode || panelMode === "add") return;
    if (!panelSupporter) return;
    const latest = supporters.find((s) => s.id === panelSupporter.id);
    if (!latest) {
      closePanel();
      return;
    }
    setPanelSupporter(latest);
    if (panelMode === "edit") {
      setSupporterForm({ ...latest });
    }
  }, [supporters, panelMode, panelSupporter]);

  useEffect(() => {
    setSupporters(supportersFromApi);
  }, [supportersFromApi]);

  useEffect(() => {
    const mapped = donationsFromApi.map((d): Contribution => ({
      id: d.id,
      supporter_id: d.supporter_id,
      supporter_name: d.supporter_name || "Unknown supporter",
      contribution_type: "Monetary",
      date: d.created_date,
      amount: Number(d.amount ?? 0),
      currency: "PHP",
      payment_method: "",
      campaign: d.campaign ?? "",
      item_description: "",
      estimated_value: 0,
      hours: 0,
      skill_description: "",
      platform: "",
      reach: "",
      allocation_safehouse: "",
      allocation_program: d.allocation ?? "",
      receipt_number: "",
      notes: "",
    }));
    setContributions(mapped);
  }, [donationsFromApi]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const filteredSupporters = useMemo(() => {
    return supporters.filter((s) => {
      const q = supporterFilters.search.toLowerCase();
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !s.organization.toLowerCase().includes(q)) return false;
      if (supporterFilters.type && s.supporter_type !== supporterFilters.type) return false;
      if (supporterFilters.status && s.status !== supporterFilters.status) return false;
      return true;
    });
  }, [supporters, supporterFilters]);

  const filteredContributions = useMemo(() => {
    return contributions
      .filter((c) => {
        const q = contribFilters.search.toLowerCase();
        if (q && !c.supporter_name.toLowerCase().includes(q)) return false;
        if (contribFilters.type && c.contribution_type !== contribFilters.type) return false;
        if (contribFilters.safehouse && c.allocation_safehouse !== contribFilters.safehouse) return false;
        if (contribFilters.program && c.allocation_program !== contribFilters.program) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contributions, contribFilters]);

  const totalMonetary = contributions
    .filter((c) => c.contribution_type === "Monetary")
    .reduce((sum, c) => sum + c.amount, 0);
  const otherCount = contributions.filter((c) => c.contribution_type !== "Monetary").length;
  const activeCount = supporters.filter((s) => s.status === "Active").length;

  // Allocation breakdown (monetary only, by safehouse + program)
  const allocationByProgram = useMemo(() => {
    const map: Record<string, number> = {};
    contributions
      .filter((c) => c.contribution_type === "Monetary")
      .forEach((c) => {
        const key = c.allocation_program || c.allocation_safehouse || "Unallocated";
        map[key] = (map[key] || 0) + c.amount;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, amount]) => ({ label, amount, pct: Math.round((amount / totalMonetary) * 100) }));
  }, [contributions, totalMonetary]);

  // Supporter contribution totals
  function supporterTotalMonetary(id: string) {
    return contributions
      .filter((c) => c.supporter_id === id && c.contribution_type === "Monetary")
      .reduce((s, c) => s + c.amount, 0);
  }

  function supporterContribCount(id: string) {
    return contributions.filter((c) => c.supporter_id === id).length;
  }

  // ── Supporter panel handlers ───────────────────────────────────────────────

  function openView(s: Supporter) { setPanelSupporter(s); setPanelMode("view"); }
  function openAdd() { setSupporterForm(EMPTY_SUPPORTER); setPanelSupporter(null); setPanelMode("add"); }
  function openEdit(s: Supporter) { setSupporterForm({ ...s }); setPanelSupporter(s); setPanelMode("edit"); }
  function closePanel() { setPanelMode(null); setPanelSupporter(null); }

  function handleSupporterField<K extends keyof Supporter>(key: K, val: Supporter[K]) {
    setSupporterForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSupporterSave(e: React.FormEvent) {
    e.preventDefault();
    if (panelMode === "add") {
      await saveSupporterMutation.mutateAsync({ mode: "add", supporter: supporterForm });
      closePanel();
    } else {
      await saveSupporterMutation.mutateAsync({ mode: "edit", supporter: supporterForm });
      setPanelMode("view");
    }
  }

  async function handleSupporterDelete() {
    if (!panelSupporter) return;
    const ok = window.confirm(`Delete supporter ${panelSupporter.is_anonymous ? "Anonymous Donor" : panelSupporter.name}?`);
    if (!ok) return;
    await deleteSupporterMutation.mutateAsync(panelSupporter.id);
    closePanel();
  }

  // ── Contribution handlers ──────────────────────────────────────────────────

  function handleContribField<K extends keyof Contribution>(key: K, val: Contribution[K]) {
    setContribForm((f) => ({ ...f, [key]: val }));
  }

  function handleContribSave(e: React.FormEvent) {
    e.preventDefault();
    const c: Contribution = { ...contribForm, id: `c-${Date.now()}` };
    // TODO: POST to your C# API endpoint
    setContributions((prev) => [c, ...prev]);
    setContribForm(EMPTY_CONTRIBUTION);
    setShowContribForm(false);
  }

  // ── Supporter view content ─────────────────────────────────────────────────

  function renderSupporterView(s: Supporter) {
    const monetary = supporterTotalMonetary(s.id);
    const contribs = contributions.filter((c) => c.supporter_id === s.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return (
      <div className="space-y-1 pb-6">
        <SectionDivider label="Profile" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 pb-3">
          <ViewField label="Full Name / Org" value={s.is_anonymous ? "Anonymous" : s.name} />
          <ViewField label="Organization" value={s.organization} />
          <ViewField label="Email" value={s.email} />
          <ViewField label="Phone" value={s.phone} />
          <ViewField label="Type" value={
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${SUPPORTER_TYPE_COLORS[s.supporter_type as SupporterType]}`}>
              {s.supporter_type}
            </span>
          } />
          <ViewField label="Status" value={
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[s.status as SupporterStatus]}`}>
              {s.status}
            </span>
          } />
          <ViewField label="Joined" value={formatDate(s.joined_date)} />
          <ViewField label="Anonymous" value={s.is_anonymous ? "Yes" : "No"} />
        </div>
        {s.notes && (
          <>
            <SectionDivider label="Notes" />
            <p className="font-body text-sm text-foreground pt-1 pb-3 leading-relaxed">{s.notes}</p>
          </>
        )}
        <SectionDivider label="Contribution Summary" />
        <div className="grid grid-cols-2 gap-4 pt-2 pb-3">
          <div className="bg-background rounded-xl border border-border p-4 text-center">
            <p className="font-heading text-xl font-bold text-foreground">{contribs.length}</p>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Total Contributions</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-4 text-center">
            <p className="font-heading text-xl font-bold text-foreground">{formatPHP(monetary)}</p>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Monetary Total</p>
          </div>
        </div>
        {contribs.length > 0 && (
          <div className="space-y-2 pt-1">
            {contribs.map((c) => (
              <div key={c.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-body text-sm font-medium text-foreground">{formatDate(c.date)}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${CONTRIBUTION_TYPE_COLORS[c.contribution_type as ContributionType]}`}>
                    {c.contribution_type}
                  </span>
                </div>
                <p className="font-body text-sm text-muted-foreground">
                  {c.contribution_type === "Monetary" && formatPHP(c.amount)}
                  {c.contribution_type === "In-Kind" && (c.item_description || `Est. ${formatPHP(c.estimated_value)}`)}
                  {(c.contribution_type === "Time / Volunteer" || c.contribution_type === "Skills") && `${c.hours}h — ${c.skill_description || c.contribution_type}`}
                  {c.contribution_type === "Social Media" && `${c.platform} · ${c.reach}`}
                </p>
                {(c.allocation_program || c.allocation_safehouse) && (
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    → {[c.allocation_safehouse, c.allocation_program].filter(Boolean).join(" / ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Supporter form ─────────────────────────────────────────────────────────

  function renderSupporterForm() {
    return (
      <form id="supporter-form" onSubmit={handleSupporterSave} className="space-y-1 pb-6">
        <SectionDivider label="Identity" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input required value={supporterForm.name} onChange={(e) => handleSupporterField("name", e.target.value)} placeholder="Full name or organization name" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
            <Input type="email" value={supporterForm.email} onChange={(e) => handleSupporterField("email", e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</Label>
            <Input value={supporterForm.phone} onChange={(e) => handleSupporterField("phone", e.target.value)} placeholder="+63 9XX XXX XXXX" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organization</Label>
            <Input value={supporterForm.organization} onChange={(e) => handleSupporterField("organization", e.target.value)} placeholder="Company or group (if applicable)" />
          </div>
          <div className="flex items-center gap-3 col-span-2 pt-1">
            <input
              type="checkbox"
              id="is_anonymous"
              checked={supporterForm.is_anonymous}
              onChange={(e) => handleSupporterField("is_anonymous", e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <Label htmlFor="is_anonymous" className="font-body text-sm text-foreground cursor-pointer">
              This supporter wishes to remain anonymous
            </Label>
          </div>
        </div>

        <SectionDivider label="Classification" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 pb-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Supporter Type <span className="text-red-500">*</span>
            </Label>
            <select required aria-label="Supporter type" value={supporterForm.supporter_type} onChange={(e) => handleSupporterField("supporter_type", e.target.value as SupporterType)} className={selectClass()}>
              {SUPPORTER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status <span className="text-red-500">*</span>
            </Label>
            <select required aria-label="Status" value={supporterForm.status} onChange={(e) => handleSupporterField("status", e.target.value as SupporterStatus)} className={selectClass()}>
              {SUPPORTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date Joined <span className="text-red-500">*</span>
            </Label>
            <Input required type="date" value={supporterForm.joined_date} onChange={(e) => handleSupporterField("joined_date", e.target.value)} />
          </div>
        </div>

        <SectionDivider label="Notes" />
        <div className="pt-1 pb-3 space-y-1.5">
          <Label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal Notes</Label>
          <textarea rows={3} value={supporterForm.notes} onChange={(e) => handleSupporterField("notes", e.target.value)} placeholder="Communication preferences, relationship history, etc." className={textareaClass()} />
        </div>
      </form>
    );
  }

  // ── Contribution form ──────────────────────────────────────────────────────

  function renderContribForm() {
    const type = contribForm.contribution_type;
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="font-heading text-lg font-bold text-foreground mb-5">Log Contribution</h3>
        <form onSubmit={handleContribSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">Date <span className="text-red-500">*</span></Label>
              <Input required type="date" value={contribForm.date} onChange={(e) => handleContribField("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">Contribution Type <span className="text-red-500">*</span></Label>
              <select required aria-label="Contribution type" value={contribForm.contribution_type} onChange={(e) => handleContribField("contribution_type", e.target.value as ContributionType)} className={selectClass()}>
                {CONTRIBUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">Supporter <span className="text-red-500">*</span></Label>
              <select required aria-label="Supporter" value={contribForm.supporter_id} onChange={(e) => {
                const s = supporters.find((x) => x.id === e.target.value);
                setContribForm((f) => ({ ...f, supporter_id: e.target.value, supporter_name: s?.name ?? "" }));
              }} className={selectClass()}>
                <option value="">Select supporter…</option>
                {supporters.map((s) => <option key={s.id} value={s.id}>{s.is_anonymous ? "Anonymous Donor" : s.name}</option>)}
              </select>
            </div>
            {type === "Monetary" && (
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-medium text-foreground">Amount (PHP) <span className="text-red-500">*</span></Label>
                <Input required type="number" min="0" value={contribForm.amount || ""} onChange={(e) => handleContribField("amount", Number(e.target.value))} placeholder="0" />
              </div>
            )}
            {(type === "In-Kind") && (
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-medium text-foreground">Estimated Value (PHP)</Label>
                <Input type="number" min="0" value={contribForm.estimated_value || ""} onChange={(e) => handleContribField("estimated_value", Number(e.target.value))} placeholder="0" />
              </div>
            )}
            {(type === "Time / Volunteer" || type === "Skills") && (
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-medium text-foreground">Hours</Label>
                <Input type="number" min="0" step="0.5" value={contribForm.hours || ""} onChange={(e) => handleContribField("hours", Number(e.target.value))} placeholder="0" />
              </div>
            )}
          </div>

          {type === "Monetary" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-medium text-foreground">Payment Method</Label>
                <select aria-label="Payment method" value={contribForm.payment_method} onChange={(e) => handleContribField("payment_method", e.target.value)} className={selectClass()}>
                  <option value="">Select…</option>
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-medium text-foreground">Campaign</Label>
                <select aria-label="Campaign" value={contribForm.campaign} onChange={(e) => handleContribField("campaign", e.target.value)} className={selectClass()}>
                  <option value="">Select…</option>
                  {CAMPAIGNS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {type === "In-Kind" && (
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">Item Description <span className="text-red-500">*</span></Label>
              <textarea required rows={2} value={contribForm.item_description} onChange={(e) => handleContribField("item_description", e.target.value)} placeholder="Describe the donated items, quantities, and condition…" className={textareaClass()} />
            </div>
          )}

          {(type === "Time / Volunteer" || type === "Skills") && (
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">Description <span className="text-red-500">*</span></Label>
              <textarea required rows={2} value={contribForm.skill_description} onChange={(e) => handleContribField("skill_description", e.target.value)} placeholder={type === "Skills" ? "Describe the skills provided and how they were used…" : "Describe activities and beneficiaries…"} className={textareaClass()} />
            </div>
          )}

          {type === "Social Media" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-medium text-foreground">Platform <span className="text-red-500">*</span></Label>
                <select required aria-label="Social media platform" value={contribForm.platform} onChange={(e) => handleContribField("platform", e.target.value)} className={selectClass()}>
                  <option value="">Select…</option>
                  {SOCIAL_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-medium text-foreground">Estimated Reach</Label>
                <Input value={contribForm.reach} onChange={(e) => handleContribField("reach", e.target.value)} placeholder="e.g. ~50,000 users" />
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">Allocation — Safehouse</Label>
              <select aria-label="Allocation safehouse" value={contribForm.allocation_safehouse} onChange={(e) => handleContribField("allocation_safehouse", e.target.value)} className={selectClass()}>
                <option value="">None / General</option>
                {SAFEHOUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">Allocation — Program</Label>
              <select aria-label="Allocation program" value={contribForm.allocation_program} onChange={(e) => handleContribField("allocation_program", e.target.value)} className={selectClass()}>
                <option value="">None / General</option>
                {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {type === "Monetary" && (
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">Receipt Number</Label>
              <Input value={contribForm.receipt_number} onChange={(e) => handleContribField("receipt_number", e.target.value)} placeholder="REC-YYYY-XXXX" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">Notes</Label>
            <textarea rows={2} value={contribForm.notes} onChange={(e) => handleContribField("notes", e.target.value)} placeholder="Any additional context…" className={textareaClass()} />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => { setShowContribForm(false); setContribForm(EMPTY_CONTRIBUTION); }} className="font-body px-5 h-10 rounded-xl">Cancel</Button>
            <Button type="submit" className="font-body bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl">Save Contribution</Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Contribution description helper ───────────────────────────────────────

  function contribDescription(c: Contribution) {
    if (c.contribution_type === "Monetary") return formatPHP(c.amount);
    if (c.contribution_type === "In-Kind") return c.item_description ? c.item_description.slice(0, 60) + (c.item_description.length > 60 ? "…" : "") : `Est. ${formatPHP(c.estimated_value)}`;
    if (c.contribution_type === "Time / Volunteer" || c.contribution_type === "Skills") return `${c.hours}h — ${(c.skill_description || "").slice(0, 50)}${(c.skill_description || "").length > 50 ? "…" : ""}`;
    if (c.contribution_type === "Social Media") return `${c.platform} · ${c.reach}`;
    return "—";
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background font-body">
      <AdminSidebar user={user ?? null} />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Donors & Contributions</h1>
            <p className="font-body text-base text-muted-foreground mt-1">
              Manage supporter profiles and track all contribution types.
            </p>
          </div>
          <Button
            onClick={activeTab === "supporters" ? openAdd : () => setShowContribForm((v) => !v)}
            className="font-body gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl shadow-sm mt-1"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "supporters" ? "Add Supporter" : "Log Contribution"}
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users,     label: "Total Supporters",      value: supporters.length,       sub: "All records",               color: "bg-primary/10 text-primary" },
            { icon: Heart,     label: "Active Supporters",     value: activeCount,              sub: "Currently engaged",         color: "bg-green-100 text-green-700" },
            { icon: DollarSign,label: "Total Monetary",        value: formatPHP(totalMonetary), sub: "All monetary contributions", color: "bg-yellow-100 text-yellow-700" },
            { icon: Gift,      label: "Other Contributions",   value: otherCount,               sub: "In-kind, time, skills, social", color: "bg-purple-100 text-purple-700" },
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

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit mb-6">
          {(["supporters", "contributions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-body text-sm px-5 py-1.5 rounded-lg transition-all font-medium capitalize ${activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tab === "supporters" ? "Supporters" : "Contributions"}
            </button>
          ))}
        </div>

        {/* ── Supporters tab ──────────────────────────────────────────────── */}
        {activeTab === "supporters" && (
          <>
            {/* Filters */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-5">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[180px]">
                  <Input placeholder="Search name, email, or organization…" value={supporterFilters.search} onChange={(e) => setSupporterFilters((f) => ({ ...f, search: e.target.value }))} />
                </div>
                {([["type", "All Types", SUPPORTER_TYPES], ["status", "All Statuses", SUPPORTER_STATUSES]] as [keyof typeof supporterFilters, string, readonly string[]][]).map(([key, placeholder, opts]) => (
                  <select key={key} aria-label={placeholder} value={supporterFilters[key]} onChange={(e) => setSupporterFilters((f) => ({ ...f, [key]: e.target.value }))} className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring min-w-[150px]">
                    <option value="">{placeholder}</option>
                    {opts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ))}
                {(supporterFilters.search || supporterFilters.type || supporterFilters.status) && (
                  <button onClick={() => setSupporterFilters({ search: "", type: "", status: "" })} className="font-body text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">Clear</button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {["Name", "Type", "Status", "Organization", "Joined", "Contributions", ""].map((h) => (
                      <TableHead key={h} className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupporters.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground font-body text-sm">No supporters match the current filters.</TableCell></TableRow>
                  ) : (
                    filteredSupporters.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openView(s)}>
                        <TableCell className="font-body text-sm font-medium text-foreground">
                          {s.is_anonymous ? <span className="text-muted-foreground italic">Anonymous</span> : s.name}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${SUPPORTER_TYPE_COLORS[s.supporter_type as SupporterType]}`}>{s.supporter_type}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[s.status as SupporterStatus]}`}>{s.status}</span>
                        </TableCell>
                        <TableCell className="font-body text-sm text-muted-foreground">{s.organization || "—"}</TableCell>
                        <TableCell className="font-body text-sm text-muted-foreground">{formatDate(s.joined_date)}</TableCell>
                        <TableCell className="font-body text-sm text-muted-foreground">
                          {supporterContribCount(s.id)} total
                          {supporterTotalMonetary(s.id) > 0 && <span className="ml-1 text-foreground font-medium">· {formatPHP(supporterTotalMonetary(s.id))}</span>}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" onClick={() => openView(s)} className="font-body text-xs h-7 px-3 rounded-lg">View</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* ── Contributions tab ───────────────────────────────────────────── */}
        {activeTab === "contributions" && (
          <>
            {/* Allocation breakdown */}
            {allocationByProgram.length > 0 && (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-heading text-base font-bold text-foreground">Monetary Allocation by Program</h3>
                </div>
                <div className="h-5 w-full rounded-full overflow-hidden flex mb-4 shadow-inner">
                  {allocationByProgram.map((a, i) => {
                    const colors = ["bg-primary", "bg-yellow-500", "bg-purple-500", "bg-green-500", "bg-blue-500", "bg-pink-500", "bg-chart-4"];
                    return (
                      <div
                        key={a.label}
                        style={{ width: `${a.pct}%` }}
                        className={`h-full ${colors[i % colors.length]} transition-all`}
                        title={`${a.label}: ${formatPHP(a.amount)} (${a.pct}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {allocationByProgram.map((a, i) => {
                    const colors = ["bg-primary", "bg-yellow-500", "bg-purple-500", "bg-green-500", "bg-blue-500", "bg-pink-500", "bg-chart-4"];
                    return (
                      <div key={a.label} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                        <span className="font-body text-xs text-foreground">{a.label}</span>
                        <span className="font-body text-xs text-muted-foreground">({a.pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contribution form */}
            {showContribForm && renderContribForm()}

            {/* Filters */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-5">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[180px]">
                  <Input placeholder="Search by supporter name…" value={contribFilters.search} onChange={(e) => setContribFilters((f) => ({ ...f, search: e.target.value }))} />
                </div>
                <select aria-label="Filter by contribution type" value={contribFilters.type} onChange={(e) => setContribFilters((f) => ({ ...f, type: e.target.value }))} className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring min-w-[160px]">
                  <option value="">All Types</option>
                  {CONTRIBUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select aria-label="Filter by safehouse" value={contribFilters.safehouse} onChange={(e) => setContribFilters((f) => ({ ...f, safehouse: e.target.value }))} className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring min-w-[160px]">
                  <option value="">All Safehouses</option>
                  {SAFEHOUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select aria-label="Filter by program" value={contribFilters.program} onChange={(e) => setContribFilters((f) => ({ ...f, program: e.target.value }))} className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground outline-none focus-visible:border-ring min-w-[160px]">
                  <option value="">All Programs</option>
                  {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                </select>
                {(contribFilters.search || contribFilters.type || contribFilters.safehouse || contribFilters.program) && (
                  <button onClick={() => setContribFilters({ search: "", type: "", safehouse: "", program: "" })} className="font-body text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">Clear</button>
                )}
              </div>
            </div>

            {/* Contributions table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {["Date", "Supporter", "Type", "Amount / Description", "Allocation", "Receipt #", ""].map((h) => (
                      <TableHead key={h} className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContributions.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground font-body text-sm">No contributions match the current filters.</TableCell></TableRow>
                  ) : (
                    filteredContributions.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-body text-sm text-muted-foreground whitespace-nowrap">{formatDate(c.date)}</TableCell>
                        <TableCell className="font-body text-sm font-medium text-foreground">{c.supporter_name || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${CONTRIBUTION_TYPE_COLORS[c.contribution_type as ContributionType]}`}>{c.contribution_type}</span>
                        </TableCell>
                        <TableCell className="font-body text-sm text-foreground max-w-[220px]">{contribDescription(c)}</TableCell>
                        <TableCell className="font-body text-xs text-muted-foreground">
                          {[c.allocation_safehouse, c.allocation_program].filter(Boolean).join(" / ") || "—"}
                        </TableCell>
                        <TableCell className="font-body text-xs text-muted-foreground font-mono">{c.receipt_number || "—"}</TableCell>
                        <TableCell />
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>

      {/* Supporter drawer */}
      {panelMode !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 w-[520px] bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 ease-out">
            <div className="flex items-start justify-between p-6 border-b border-border flex-shrink-0">
              <div>
                <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                  {panelMode === "add" ? "New Supporter" : panelMode === "edit" ? "Edit Supporter" : "Supporter Profile"}
                </p>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {panelMode === "add" ? "Add Supporter" : panelMode === "edit" ? (supporterForm.name || "Edit") : (panelSupporter?.is_anonymous ? "Anonymous Donor" : panelSupporter?.name)}
                </h2>
                {panelMode !== "add" && (
                  <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${SUPPORTER_TYPE_COLORS[((panelMode === "edit" ? supporterForm : panelSupporter)?.supporter_type ?? "Monetary Donor") as SupporterType]}`}>
                    {(panelMode === "edit" ? supporterForm : panelSupporter)?.supporter_type}
                  </span>
                )}
              </div>
              <button onClick={closePanel} aria-label="Close panel" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-4">
              {panelMode === "view" && panelSupporter ? renderSupporterView(panelSupporter) : renderSupporterForm()}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-background">
              {mutationError && (
                <p className="mr-auto font-body text-xs text-destructive">
                  {mutationError}
                </p>
              )}
              {panelMode === "view" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSupporterDelete}
                    className="font-body px-5 h-9 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={deleteSupporterMutation.isPending}
                  >
                    {deleteSupporterMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                  <Button variant="outline" onClick={closePanel} className="font-body px-5 h-9 rounded-xl">Close</Button>
                  <Button onClick={() => openEdit(panelSupporter!)} className="font-body gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-9 rounded-xl">
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => panelMode === "edit" ? setPanelMode("view") : closePanel()} className="font-body px-5 h-9 rounded-xl">Cancel</Button>
                  <Button
                    type="submit"
                    form="supporter-form"
                    className="font-body bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-9 rounded-xl"
                    disabled={saveSupporterMutation.isPending}
                  >
                    {saveSupporterMutation.isPending
                      ? "Saving..."
                      : panelMode === "edit"
                        ? "Save Changes"
                        : "Add Supporter"}
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
