import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronUp, Clock, Home, Pencil, Plus, Trash2, Users } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiGetJson, getApiBaseUrl, type AuthMeResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/home-visitations")({
	beforeLoad: async ({ context }) => {
		await requireRole(context.queryClient, "Admin", "Staff");
	},
	component: HomeVisitationsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type VisitType =
	| "Initial Assessment"
	| "Routine Follow-up"
	| "Reintegration Assessment"
	| "Post-Placement Monitoring"
	| "Emergency";

type FamilyCooperation =
	| "Cooperative"
	| "Partially Cooperative"
	| "Uncooperative"
	| "Not Available";

type ConferenceType =
	| "Initial Case Conference"
	| "Progress Review"
	| "Reintegration Planning"
	| "Crisis Conference"
	| "Discharge Planning";

interface Resident {
	id: number;
	name: string;
	caseNumber: string;
}

interface HomeVisit {
	id: number;
	residentId: number;
	visitDate: string;
	socialWorker: string;
	visitType: VisitType;
	locationVisited: string;
	familyMembersPresent: string;
	purpose: string;
	observations: string;
	familyCooperationLevel: FamilyCooperation;
	safetyConcernsNoted: boolean;
	followUpNeeded: boolean;
	followUpNotes: string;
	visitOutcome: string;
}

interface CaseConference {
	id: number;
	residentId: number;
	conferenceDate: string;
	conferenceType: ConferenceType;
	attendees: string;
	discussionSummary: string;
	decisionsMade: string;
	nextConferenceDate: string;
}

type ResidentApi = {
  id: string;
  full_name?: string;
  resident_code?: string;
};

type HomeVisitApi = {
  id: number;
  resident_id: number;
  visit_date: string;
  social_worker: string;
  visit_type: string;
  observations: string;
  family_cooperation_level: string;
  safety_concerns_noted: boolean;
  follow_up_needed: boolean;
  follow_up_notes: string;
  visit_outcome: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIT_TYPES: VisitType[] = [
	"Initial Assessment",
	"Routine Follow-up",
	"Reintegration Assessment",
	"Post-Placement Monitoring",
	"Emergency",
];

const COOPERATION_LEVELS: FamilyCooperation[] = [
	"Cooperative",
	"Partially Cooperative",
	"Uncooperative",
	"Not Available",
];

const CONFERENCE_TYPES: ConferenceType[] = [
	"Initial Case Conference",
	"Progress Review",
	"Reintegration Planning",
	"Crisis Conference",
	"Discharge Planning",
];

// ─── Badge colors ─────────────────────────────────────────────────────────────

const VISIT_TYPE_COLORS: Record<VisitType, string> = {
	"Initial Assessment": "bg-blue-50 text-blue-700 border-blue-200",
	"Routine Follow-up": "bg-primary/10 text-primary border-primary/20",
	"Reintegration Assessment": "bg-purple-50 text-purple-700 border-purple-200",
	"Post-Placement Monitoring": "bg-green-50 text-green-700 border-green-200",
	Emergency: "bg-destructive/15 text-destructive border-destructive/20",
};

const COOPERATION_COLORS: Record<FamilyCooperation, string> = {
	Cooperative: "bg-green-50 text-green-700 border-green-200",
	"Partially Cooperative": "bg-yellow-50 text-yellow-700 border-yellow-200",
	Uncooperative: "bg-red-50 text-red-700 border-red-200",
	"Not Available": "bg-muted text-muted-foreground border-border",
};

const CONFERENCE_TYPE_COLORS: Record<ConferenceType, string> = {
	"Initial Case Conference": "bg-blue-50 text-blue-700 border-blue-200",
	"Progress Review": "bg-primary/10 text-primary border-primary/20",
	"Reintegration Planning": "bg-purple-50 text-purple-700 border-purple-200",
	"Crisis Conference":
		"bg-destructive/15 text-destructive border-destructive/20",
	"Discharge Planning": "bg-green-50 text-green-700 border-green-200",
};

// ─── Empty forms ──────────────────────────────────────────────────────────────

const EMPTY_VISIT = {
	visitDate: "",
	socialWorker: "",
	visitType: "Routine Follow-up" as VisitType,
	locationVisited: "",
	familyMembersPresent: "",
	purpose: "",
	observations: "",
	familyCooperationLevel: "Cooperative" as FamilyCooperation,
	safetyConcernsNoted: false,
	followUpNeeded: false,
	followUpNotes: "",
	visitOutcome: "",
};

const EMPTY_CONFERENCE = {
	conferenceDate: "",
	conferenceType: "Progress Review" as ConferenceType,
	attendees: "",
	discussionSummary: "",
	decisionsMade: "",
	nextConferenceDate: "",
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CONFERENCES: CaseConference[] = [
	{
		id: 1,
		residentId: 1,
		conferenceDate: "2025-01-25",
		conferenceType: "Initial Case Conference",
		attendees:
			"Maria Santos (SW), Dr. Elena Cruz (Psychologist), Shelter Director, Resident",
		discussionSummary:
			"Initial conference to establish care plan. Discussed trauma history, immediate safety needs, and short-term goals. Resident expressed desire to return to school and reconnect with maternal aunt.",
		decisionsMade:
			"Enroll in psychosocial support sessions (twice weekly). Begin vocational assessment. Coordinate with DepEd for educational continuity.",
		nextConferenceDate: "2025-04-25",
	},
	{
		id: 2,
		residentId: 1,
		conferenceDate: "2025-04-25",
		conferenceType: "Progress Review",
		attendees: "Maria Santos (SW), Shelter Director, Resident, Maternal Aunt",
		discussionSummary:
			"Reviewed progress over the past three months. Resident has completed 10 psychosocial sessions and scored well on vocational aptitude tests. Family visit with maternal aunt was positive.",
		decisionsMade:
			"Transition to reintegration phase. Begin formal family reunification process with maternal aunt. Schedule home visit to aunt's residence.",
		nextConferenceDate: "2025-07-25",
	},
	{
		id: 3,
		residentId: 1,
		conferenceDate: "2025-07-25",
		conferenceType: "Reintegration Planning",
		attendees:
			"Maria Santos (SW), Shelter Director, Resident, Maternal Aunt, DSWD Liaison",
		discussionSummary:
			"Planned reintegration timeline with all stakeholders. Maternal aunt confirmed readiness to receive resident. Housing conditions verified as suitable.",
		decisionsMade:
			"Target reintegration date: September 15, 2025. Monthly post-placement monitoring for 6 months. Livelihood grant application to be filed.",
		nextConferenceDate: "",
	},
	{
		id: 4,
		residentId: 2,
		conferenceDate: "2025-04-10",
		conferenceType: "Crisis Conference",
		attendees:
			"Jose Reyes (SW), Shelter Director, PNP WCPD Officer, Psychologist",
		discussionSummary:
			"Emergency conference triggered by safety concerns identified during home visit. Perpetrator's proximity and family contact poses ongoing risk. Discussed escalation options.",
		decisionsMade:
			"Extend shelter stay. Petition for Barangay Protection Order. Psychologist to conduct trauma-focused assessment this week.",
		nextConferenceDate: "2025-05-10",
	},
	{
		id: 5,
		residentId: 2,
		conferenceDate: "2025-05-10",
		conferenceType: "Progress Review",
		attendees:
			"Jose Reyes (SW), Shelter Director, Psychologist, Legal Aid Officer",
		discussionSummary:
			"Protection order has been granted. Resident's trauma assessment complete — PTSD indicators present. Legal proceedings underway.",
		decisionsMade:
			"Begin trauma-focused cognitive behavioral therapy (TF-CBT). Continue legal support. Home visit deferred until area safety is confirmed.",
		nextConferenceDate: "2025-08-10",
	},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
	if (!dateStr) return "—";
	return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-PH", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function isUpcoming(dateStr: string) {
	if (!dateStr) return false;
	return new Date(`${dateStr}T00:00:00`) > new Date();
}

function textareaClass() {
	return "w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none";
}

function selectClass() {
	return "h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
}

// ─── Main component ───────────────────────────────────────────────────────────

function HomeVisitationsPage() {
  const queryClient = useQueryClient();
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null
  );
  const [residentSearch, setResidentSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"visits" | "conferences">(
    "visits"
  );

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitForm, setVisitForm] = useState(EMPTY_VISIT);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [editVisitForm, setEditVisitForm] = useState(EMPTY_VISIT);

  const [showConferenceForm, setShowConferenceForm] = useState(false);
  const [conferenceForm, setConferenceForm] = useState(EMPTY_CONFERENCE);

  const [conferences, setConferences] =
    useState<CaseConference[]>(MOCK_CONFERENCES);

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

  const { data: residents = [] } = useQuery<Resident[]>({
    queryKey: ["residents"],
    staleTime: 60_000,
    queryFn: async () => {
      const rows = await apiGetJson<ResidentApi[]>("/api/admin-data/residents");
      return rows.map((r) => ({
        id: Number(r.id),
        name: r.full_name || `Resident ${r.id}`,
        caseNumber: r.resident_code || `RES-${r.id}`,
      }));
    },
  });

  const { data: visits = [] } = useQuery<HomeVisit[]>({
    queryKey: ["home-visitations"],
    staleTime: 60_000,
    queryFn: async () => {
      const rows = await apiGetJson<HomeVisitApi[]>("/api/admin-data/home-visitations");
      const normalizeVisitType = (value: string): VisitType => {
        if (VISIT_TYPES.includes(value as VisitType)) return value as VisitType;
        return "Routine Follow-up";
      };
      const normalizeCooperation = (value: string): FamilyCooperation => {
        if (COOPERATION_LEVELS.includes(value as FamilyCooperation)) return value as FamilyCooperation;
        return "Cooperative";
      };
      return rows.map((v) => ({
        id: v.id,
        residentId: v.resident_id,
        visitDate: v.visit_date,
        socialWorker: v.social_worker,
        visitType: normalizeVisitType(v.visit_type),
        locationVisited: "",
        familyMembersPresent: "",
        purpose: "",
        observations: v.observations,
        familyCooperationLevel: normalizeCooperation(v.family_cooperation_level),
        safetyConcernsNoted: v.safety_concerns_noted,
        followUpNeeded: v.follow_up_needed,
        followUpNotes: v.follow_up_notes,
        visitOutcome: v.visit_outcome,
      }));
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: async (payload: {
      resident_id: number;
      visit_date: string;
      social_worker: string;
      visit_type: VisitType;
      location_visited: string;
      family_members_present: string;
      purpose: string;
      observations: string;
      family_cooperation_level: FamilyCooperation;
      safety_concerns_noted: boolean;
      follow_up_needed: boolean;
      follow_up_notes: string;
      visit_outcome: string;
    }) => {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("API base URL not configured");
      const response = await fetch(`${apiBaseUrl}/api/admin-data/home-visitations`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save visit");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["home-visitations"] });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: typeof EMPTY_VISIT }) => {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("API base URL not configured");
      const response = await fetch(`${apiBaseUrl}/api/admin-data/home-visitations/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visit_date: payload.visitDate,
          social_worker: payload.socialWorker,
          visit_type: payload.visitType,
          observations: payload.observations,
          family_cooperation_level: payload.familyCooperationLevel,
          safety_concerns_noted: payload.safetyConcernsNoted,
          follow_up_needed: payload.followUpNeeded,
          follow_up_notes: payload.followUpNotes,
          visit_outcome: payload.visitOutcome,
        }),
      });
      if (!response.ok) throw new Error("Failed to update visit");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["home-visitations"] });
      setEditingVisitId(null);
      setEditVisitForm(EMPTY_VISIT);
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: async (id: number) => {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("API base URL not configured");
      const response = await fetch(`${apiBaseUrl}/api/admin-data/home-visitations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete visit");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["home-visitations"] });
    },
  });

  const searchQuery = residentSearch.toLowerCase();
  const filteredResidents = residents.filter((r) => {
    const residentName = (r.name ?? "").toLowerCase();
    const residentCaseNumber = (r.caseNumber ?? "").toLowerCase();
    return (
      residentName.includes(searchQuery) || residentCaseNumber.includes(searchQuery)
    );
  });

  const residentVisits = visits
    .filter((v) => v.residentId === selectedResident?.id)
    .sort(
      (a, b) =>
        new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    );

  const residentConferences = conferences
    .filter((c) => c.residentId === selectedResident?.id)
    .sort(
      (a, b) =>
        new Date(b.conferenceDate).getTime() -
        new Date(a.conferenceDate).getTime()
    );

  const upcomingConferences = residentConferences.filter((c) =>
    isUpcoming(c.conferenceDate)
  );
  const pastConferences = residentConferences.filter(
    (c) => !isUpcoming(c.conferenceDate)
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSelectResident(r: Resident) {
    setSelectedResident(r);
    setShowVisitForm(false);
    setShowConferenceForm(false);
    setVisitForm(EMPTY_VISIT);
    setConferenceForm(EMPTY_CONFERENCE);
    setEditingVisitId(null);
    setEditVisitForm(EMPTY_VISIT);
  }

  function handleEditVisit(v: HomeVisit) {
    setEditingVisitId(v.id);
    setEditVisitForm({
      visitDate: v.visitDate,
      socialWorker: v.socialWorker,
      visitType: v.visitType,
      locationVisited: v.locationVisited,
      familyMembersPresent: v.familyMembersPresent,
      purpose: v.purpose,
      observations: v.observations,
      familyCooperationLevel: v.familyCooperationLevel,
      safetyConcernsNoted: v.safetyConcernsNoted,
      followUpNeeded: v.followUpNeeded,
      followUpNotes: v.followUpNotes,
      visitOutcome: v.visitOutcome,
    });
    setShowVisitForm(false);
  }

  async function handleEditVisitSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingVisitId === null) return;
    await updateVisitMutation.mutateAsync({ id: editingVisitId, payload: editVisitForm });
  }

  async function handleDeleteVisit(id: number) {
    if (!window.confirm("Delete this home visit record? This cannot be undone.")) return;
    await deleteVisitMutation.mutateAsync(id);
  }

  async function handleVisitSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResident) return;
    await createVisitMutation.mutateAsync({
      resident_id: selectedResident.id,
      visit_date: visitForm.visitDate,
      social_worker: visitForm.socialWorker,
      visit_type: visitForm.visitType,
      location_visited: visitForm.locationVisited,
      family_members_present: visitForm.familyMembersPresent,
      purpose: visitForm.purpose,
      observations: visitForm.observations,
      family_cooperation_level: visitForm.familyCooperationLevel,
      safety_concerns_noted: visitForm.safetyConcernsNoted,
      follow_up_needed: visitForm.followUpNeeded,
      follow_up_notes: visitForm.followUpNotes,
      visit_outcome: visitForm.visitOutcome,
    });
    setVisitForm(EMPTY_VISIT);
    setShowVisitForm(false);
  }

  function handleConferenceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResident) return;
    const newConference: CaseConference = {
      id: Date.now(),
      residentId: selectedResident.id,
      ...conferenceForm,
    };
    // TODO: POST to your C# API endpoint
    setConferences((prev) => [newConference, ...prev]);
    setConferenceForm(EMPTY_CONFERENCE);
    setShowConferenceForm(false);
  }

  // ── Shared sub-renders ───────────────────────────────────────────────────────

  function TimelineDot() {
    return (
      <div className="absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full bg-card border-2 border-primary flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-primary" />
      </div>
    );
  }

  // ── Visit form ──────────────────────────────────────────────────────────────

  function renderVisitForm() {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="font-heading text-lg font-bold text-foreground mb-5">
          Log Home / Field Visit
        </h3>
        <form onSubmit={handleVisitSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Visit Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                required
                value={visitForm.visitDate}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, visitDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Social Worker <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="Full name"
                value={visitForm.socialWorker}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, socialWorker: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Visit Type <span className="text-red-500">*</span>
              </Label>
              <select
                required
                aria-label="Visit type"
                value={visitForm.visitType}
                onChange={(e) =>
                  setVisitForm((f) => ({
                    ...f,
                    visitType: e.target.value as VisitType,
                  }))
                }
                className={selectClass()}
              >
                {VISIT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Location Visited <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="e.g. Family home, Foster home, Barangay hall"
                value={visitForm.locationVisited}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, locationVisited: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Family Members Present
              </Label>
              <Input
                placeholder="e.g. Mother, Father, Sibling"
                value={visitForm.familyMembersPresent}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, familyMembersPresent: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Family Cooperation Level <span className="text-red-500">*</span>
              </Label>
              <select
                required
                aria-label="Family cooperation level"
                value={visitForm.familyCooperationLevel}
                onChange={(e) =>
                  setVisitForm((f) => ({
                    ...f,
                    familyCooperationLevel: e.target.value as FamilyCooperation,
                  }))
                }
                className={selectClass()}
              >
                {COOPERATION_LEVELS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Purpose <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              placeholder="e.g. Assess reintegration readiness, Monitor post-placement"
              value={visitForm.purpose}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, purpose: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Observations <span className="text-red-500">*</span>
            </Label>
            <textarea
              required
              rows={3}
              placeholder="Describe the home environment, living conditions, and any notable observations…"
              value={visitForm.observations}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, observations: e.target.value }))
              }
              className={textareaClass()}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Visit Outcome
              </Label>
              <select
                aria-label="Visit outcome"
                value={visitForm.visitOutcome}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, visitOutcome: e.target.value }))
                }
                className={selectClass()}
              >
                <option value="">Select…</option>
                {["Favorable", "Partially Favorable", "Unfavorable", "Inconclusive", "Pending Follow-up"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 flex flex-col justify-end pb-0.5">
              <Label className="font-body text-sm font-medium text-foreground mb-1">
                Flags
              </Label>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visitForm.safetyConcernsNoted}
                    onChange={(e) => setVisitForm((f) => ({ ...f, safetyConcernsNoted: e.target.checked }))}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="font-body text-sm text-foreground">Safety Concerns Noted</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visitForm.followUpNeeded}
                    onChange={(e) => setVisitForm((f) => ({ ...f, followUpNeeded: e.target.checked }))}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="font-body text-sm text-foreground">Follow-up Needed</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Follow-up Notes
            </Label>
            <textarea
              rows={2}
              placeholder="Next steps, referrals, or tasks arising from this visit…"
              value={visitForm.followUpNotes}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, followUpNotes: e.target.value }))
              }
              className={textareaClass()}
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowVisitForm(false);
                setVisitForm(EMPTY_VISIT);
              }}
              className="font-body px-5 h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="font-body bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl"
            >
              Save Visit
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Edit visit form ──────────────────────────────────────────────────────────

  function renderEditVisitForm() {
    return (
      <div className="mt-3 bg-muted/30 rounded-xl border border-border p-4">
        <h4 className="font-heading text-sm font-bold text-foreground mb-3">Edit Visit</h4>
        <form onSubmit={handleEditVisitSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-body text-xs font-medium text-foreground">Visit Date</Label>
              <Input type="date" required value={editVisitForm.visitDate} onChange={(e) => setEditVisitForm((f) => ({ ...f, visitDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="font-body text-xs font-medium text-foreground">Social Worker</Label>
              <Input required value={editVisitForm.socialWorker} onChange={(e) => setEditVisitForm((f) => ({ ...f, socialWorker: e.target.value }))} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-body text-xs font-medium text-foreground">Visit Type</Label>
              <select aria-label="Visit type" value={editVisitForm.visitType} onChange={(e) => setEditVisitForm((f) => ({ ...f, visitType: e.target.value as VisitType }))} className={selectClass()}>
                {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="font-body text-xs font-medium text-foreground">Family Cooperation</Label>
              <select aria-label="Family cooperation level" value={editVisitForm.familyCooperationLevel} onChange={(e) => setEditVisitForm((f) => ({ ...f, familyCooperationLevel: e.target.value as FamilyCooperation }))} className={selectClass()}>
                {COOPERATION_LEVELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="font-body text-xs font-medium text-foreground">Observations</Label>
            <textarea required rows={3} value={editVisitForm.observations} onChange={(e) => setEditVisitForm((f) => ({ ...f, observations: e.target.value }))} className={textareaClass()} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-body text-xs font-medium text-foreground">Visit Outcome</Label>
              <select aria-label="Visit outcome" value={editVisitForm.visitOutcome} onChange={(e) => setEditVisitForm((f) => ({ ...f, visitOutcome: e.target.value }))} className={selectClass()}>
                <option value="">Select…</option>
                {["Favorable", "Partially Favorable", "Unfavorable", "Inconclusive", "Pending Follow-up"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-1 flex flex-col justify-end">
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editVisitForm.safetyConcernsNoted} onChange={(e) => setEditVisitForm((f) => ({ ...f, safetyConcernsNoted: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
                  <span className="font-body text-xs text-foreground">Safety Concerns Noted</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editVisitForm.followUpNeeded} onChange={(e) => setEditVisitForm((f) => ({ ...f, followUpNeeded: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
                  <span className="font-body text-xs text-foreground">Follow-up Needed</span>
                </label>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="font-body text-xs font-medium text-foreground">Follow-up Notes</Label>
            <textarea rows={2} value={editVisitForm.followUpNotes} onChange={(e) => setEditVisitForm((f) => ({ ...f, followUpNotes: e.target.value }))} className={textareaClass()} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => { setEditingVisitId(null); setEditVisitForm(EMPTY_VISIT); }} className="font-body px-4 h-8 rounded-xl text-sm">Cancel</Button>
            <Button type="submit" disabled={updateVisitMutation.isPending} className="font-body bg-primary hover:bg-primary/90 text-primary-foreground px-4 h-8 rounded-xl text-sm">
              {updateVisitMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Visit history ────────────────────────────────────────────────────────────

  function renderVisitHistory() {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="font-heading text-lg font-bold text-foreground mb-5">
          Visit History
        </h3>
        {residentVisits.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground text-center py-10">
            No visits recorded yet. Log the first visit above.
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-6">
              {residentVisits.map((v) => (
                <div key={v.id} className="relative pl-8">
                  <TimelineDot />
                  <div className="bg-background rounded-xl border border-border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="font-heading text-base font-bold text-foreground">
                          {formatDate(v.visitDate)}
                        </p>
                        <p className="font-body text-sm text-muted-foreground mt-0.5">
                          Conducted by {v.socialWorker}
                          {v.locationVisited && <> &mdash; {v.locationVisited}</>}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium border ${VISIT_TYPE_COLORS[v.visitType]}`}>
                          {v.visitType}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium border ${COOPERATION_COLORS[v.familyCooperationLevel]}`}>
                          {v.familyCooperationLevel}
                        </span>
                        {v.visitOutcome && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium bg-muted text-muted-foreground border border-border">
                            {v.visitOutcome}
                          </span>
                        )}
                        {v.safetyConcernsNoted && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium bg-red-50 text-red-700 border border-red-200">
                            Safety Concerns
                          </span>
                        )}
                        <button
                          onClick={() => handleEditVisit(v)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="Edit visit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVisit(v.id)}
                          disabled={deleteVisitMutation.isPending}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Delete visit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Observations
                        </p>
                        <p className="font-body text-sm text-foreground leading-relaxed">
                          {v.observations}
                        </p>
                      </div>
                      {(v.followUpNotes || v.followUpNeeded) && (
                        <div>
                          <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Follow-up Notes
                          </p>
                          <p className="font-body text-sm text-foreground leading-relaxed">
                            {v.followUpNotes || <span className="text-muted-foreground">Follow-up required.</span>}
                          </p>
                        </div>
                      )}
                    </div>
                    {editingVisitId === v.id && renderEditVisitForm()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Conference form ──────────────────────────────────────────────────────────

  function renderConferenceForm() {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="font-heading text-lg font-bold text-foreground mb-5">
          Log Case Conference
        </h3>
        <form onSubmit={handleConferenceSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Conference Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                required
                value={conferenceForm.conferenceDate}
                onChange={(e) =>
                  setConferenceForm((f) => ({
                    ...f,
                    conferenceDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium text-foreground">
                Conference Type <span className="text-red-500">*</span>
              </Label>
              <select
                required
                aria-label="Conference type"
                value={conferenceForm.conferenceType}
                onChange={(e) =>
                  setConferenceForm((f) => ({
                    ...f,
                    conferenceType: e.target.value as ConferenceType,
                  }))
                }
                className={selectClass()}
              >
                {CONFERENCE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Attendees <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              placeholder="e.g. Social Worker, Psychologist, Shelter Director, Resident…"
              value={conferenceForm.attendees}
              onChange={(e) =>
                setConferenceForm((f) => ({ ...f, attendees: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Discussion Summary <span className="text-red-500">*</span>
            </Label>
            <textarea
              required
              rows={3}
              placeholder="Summarize the key topics discussed during the conference…"
              value={conferenceForm.discussionSummary}
              onChange={(e) =>
                setConferenceForm((f) => ({
                  ...f,
                  discussionSummary: e.target.value,
                }))
              }
              className={textareaClass()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Decisions Made <span className="text-red-500">*</span>
            </Label>
            <textarea
              required
              rows={3}
              placeholder="List the decisions, action items, or resolutions agreed upon…"
              value={conferenceForm.decisionsMade}
              onChange={(e) =>
                setConferenceForm((f) => ({
                  ...f,
                  decisionsMade: e.target.value,
                }))
              }
              className={textareaClass()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Next Conference Date
            </Label>
            <Input
              type="date"
              value={conferenceForm.nextConferenceDate}
              onChange={(e) =>
                setConferenceForm((f) => ({
                  ...f,
                  nextConferenceDate: e.target.value,
                }))
              }
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConferenceForm(false);
                setConferenceForm(EMPTY_CONFERENCE);
              }}
              className="font-body px-5 h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="font-body bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl"
            >
              Save Conference
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Conference history ───────────────────────────────────────────────────────

  function renderConferenceHistory() {
    return (
      <div className="space-y-6">
        {/* Upcoming conferences */}
        {upcomingConferences.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="h-5 w-5 text-yellow-600" />
              <h3 className="font-heading text-lg font-bold text-foreground">
                Upcoming Conferences
              </h3>
            </div>
            <div className="space-y-4">
              {upcomingConferences.map((c) => (
                <div
                  key={c.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-xl p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-heading text-base font-bold text-foreground">
                        {formatDate(c.conferenceDate)}
                      </p>
                      <p className="font-body text-sm text-muted-foreground mt-0.5">
                        {c.attendees}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-body font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                        Upcoming
                      </span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium border ${CONFERENCE_TYPE_COLORS[c.conferenceType]}`}
                      >
                        {c.conferenceType}
                      </span>
                    </div>
                  </div>
                  {c.decisionsMade && (
                    <div>
                      <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Planned Agenda / Decisions to Review
                      </p>
                      <p className="font-body text-sm text-foreground leading-relaxed">
                        {c.decisionsMade}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conference history */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h3 className="font-heading text-lg font-bold text-foreground mb-5">
            Conference History
          </h3>
          {pastConferences.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-10">
              No past conferences recorded yet. Log the first conference above.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-6">
                {pastConferences.map((c) => (
                  <div key={c.id} className="relative pl-8">
                    <TimelineDot />
                    <div className="bg-background rounded-xl border border-border p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="font-heading text-base font-bold text-foreground">
                            {formatDate(c.conferenceDate)}
                          </p>
                          <p className="font-body text-sm text-muted-foreground mt-0.5">
                            {c.attendees}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium border ${CONFERENCE_TYPE_COLORS[c.conferenceType]}`}
                        >
                          {c.conferenceType}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Discussion Summary
                          </p>
                          <p className="font-body text-sm text-foreground leading-relaxed">
                            {c.discussionSummary}
                          </p>
                        </div>
                        <div>
                          <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Decisions Made
                          </p>
                          <p className="font-body text-sm text-foreground leading-relaxed">
                            {c.decisionsMade}
                          </p>
                        </div>
                        {c.nextConferenceDate && (
                          <div className="pt-1">
                            <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Next Conference Scheduled
                            </p>
                            <p className="font-body text-sm text-foreground">
                              {formatDate(c.nextConferenceDate)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background font-body">
      <AdminSidebar user={user ?? null} />

      <main className="ml-64 p-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Home Visitations & Case Conferences
          </h1>
          <p className="font-body text-base text-muted-foreground mt-1">
            Log field visits and track case conference history for each
            resident.
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Resident selector */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sticky top-8">
            <h2 className="font-heading text-base font-bold text-foreground mb-3">
              Residents
            </h2>
            <Input
              type="text"
              placeholder="Search by name or case #"
              value={residentSearch}
              onChange={(e) => setResidentSearch(e.target.value)}
              className="mb-3"
            />
            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
              {filteredResidents.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground text-center py-6">
                  No residents found.
                </p>
              ) : (
                filteredResidents.map((r) => {
                  const vCount = visits.filter(
                    (v) => v.residentId === r.id
                  ).length;
                  const cCount = conferences.filter(
                    (c) => c.residentId === r.id
                  ).length;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelectResident(r)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all font-body text-sm ${
                        selectedResident?.id === r.id
                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.caseNumber} &middot; {vCount}v {cCount}c
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Main content */}
          {selectedResident === null ? (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Home className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                Select a Resident
              </h3>
              <p className="font-body text-sm text-muted-foreground max-w-xs">
                Choose a resident from the list to view their visit and
                conference history or add a new entry.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Context bar */}
              <div className="bg-[#FDFBF7] border-t-4 border-t-yellow-500 rounded-2xl px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-xl font-bold text-foreground">
                      {selectedResident.name}
                    </h2>
                    <p className="font-body text-sm text-muted-foreground">
                      Case #{selectedResident.caseNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-body text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Home className="h-4 w-4" />
                      {residentVisits.length} visit
                      {residentVisits.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {residentConferences.length} conference
                      {residentConferences.length !== 1 ? "s" : ""}
                    </span>
                    {upcomingConferences.length > 0 && (
                      <span className="flex items-center gap-1.5 text-yellow-700 font-semibold">
                        <Clock className="h-4 w-4" />
                        {upcomingConferences.length} upcoming
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4 bg-muted/50 rounded-xl p-1 w-fit">
                  {(["visits", "conferences"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`font-body text-sm px-4 py-1.5 rounded-lg transition-all font-medium ${
                        activeTab === tab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "visits" ? "Home Visits" : "Case Conferences"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visits tab */}
              {activeTab === "visits" && (
                <>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setShowVisitForm((v) => !v)}
                      className="font-body gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl shadow-sm"
                    >
                      {showVisitForm ? (
                        <>
                          <ChevronUp className="h-4 w-4" /> Hide Form
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" /> Log Visit
                        </>
                      )}
                    </Button>
                  </div>
                  {showVisitForm && renderVisitForm()}
                  {renderVisitHistory()}
                </>
              )}

              {/* Conferences tab */}
              {activeTab === "conferences" && (
                <>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setShowConferenceForm((v) => !v)}
                      className="font-body gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl shadow-sm"
                    >
                      {showConferenceForm ? (
                        <>
                          <ChevronUp className="h-4 w-4" /> Hide Form
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" /> Log Conference
                        </>
                      )}
                    </Button>
                  </div>
                  {showConferenceForm && renderConferenceForm()}
                  {renderConferenceHistory()}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
