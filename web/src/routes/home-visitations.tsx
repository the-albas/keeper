import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Plus, ChevronUp, Users, Clock } from "lucide-react";

export const Route = createFileRoute("/home-visitations")({
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
  staffName: string;
  visitType: VisitType;
  homeEnvironmentObservations: string;
  familyCooperation: FamilyCooperation;
  safetyConcerns: string;
  followUpActions: string;
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
  staffName: "",
  visitType: "Routine Follow-up" as VisitType,
  homeEnvironmentObservations: "",
  familyCooperation: "Cooperative" as FamilyCooperation,
  safetyConcerns: "",
  followUpActions: "",
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

const MOCK_VISITS: HomeVisit[] = [
  {
    id: 1,
    residentId: 1,
    visitDate: "2025-02-10",
    staffName: "Maria Santos",
    visitType: "Initial Assessment",
    homeEnvironmentObservations:
      "Extended family home in Parañaque. Three-room dwelling shared by 7 family members. Basic utilities present. Moderate cleanliness. No signs of ongoing threat from perpetrator in the area.",
    familyCooperation: "Cooperative",
    safetyConcerns:
      "Perpetrator (ex-partner) reported to live two streets away. Family has been advised on safety protocols.",
    followUpActions:
      "Coordinate with barangay for protection order monitoring. Schedule follow-up in 3 weeks.",
  },
  {
    id: 2,
    residentId: 1,
    visitDate: "2025-03-05",
    staffName: "Maria Santos",
    visitType: "Routine Follow-up",
    homeEnvironmentObservations:
      "Home environment remains stable. Resident's mother is actively participating in support. Livelihood materials visible — resident has started sewing projects.",
    familyCooperation: "Cooperative",
    safetyConcerns: "None identified during this visit.",
    followUpActions:
      "Continue monthly visits. Confirm livelihood program enrollment for next quarter.",
  },
  {
    id: 3,
    residentId: 2,
    visitDate: "2025-03-20",
    staffName: "Jose Reyes",
    visitType: "Initial Assessment",
    homeEnvironmentObservations:
      "Single-room unit in informal settlement. Adequate ventilation but cramped. Child observed present. No functional kitchen — family relies on community shared cooking.",
    familyCooperation: "Partially Cooperative",
    safetyConcerns:
      "Potential perpetrator (uncle) still living nearby and reportedly still in contact with extended family members. Resident expressed fear.",
    followUpActions:
      "Flag for urgent case conference. Refer to legal aid for restraining order. Increase visit frequency to bi-weekly.",
  },
];

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
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isUpcoming(dateStr: string) {
  if (!dateStr) return false;
  return new Date(dateStr + "T00:00:00") > new Date();
}

function textareaClass() {
  return "w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none";
}

function selectClass() {
  return "h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
}

// ─── Main component ───────────────────────────────────────────────────────────

function HomeVisitationsPage() {
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null
  );
  const [residentSearch, setResidentSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"visits" | "conferences">(
    "visits"
  );

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitForm, setVisitForm] = useState(EMPTY_VISIT);

  const [showConferenceForm, setShowConferenceForm] = useState(false);
  const [conferenceForm, setConferenceForm] = useState(EMPTY_CONFERENCE);

  const [visits, setVisits] = useState<HomeVisit[]>(MOCK_VISITS);
  const [conferences, setConferences] =
    useState<CaseConference[]>(MOCK_CONFERENCES);

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      // TODO: Call your C# auth endpoint
      return { full_name: "Admin User", email: "admin@keeper.org" };
    },
  });

  const { data: residents = [] } = useQuery<Resident[]>({
    queryKey: ["residents"],
    queryFn: async () => {
      // TODO: Call your C# API endpoint
      // const res = await fetch(`${API_BASE}/residents`);
      // return res.json();
      return [
        { id: 1, name: "Ana Reyes", caseNumber: "KPR-2025-001" },
        { id: 2, name: "Maria Cruz", caseNumber: "KPR-2025-002" },
        { id: 3, name: "Liza Gomez", caseNumber: "KPR-2025-003" },
        { id: 4, name: "Rosa Dela Cruz", caseNumber: "KPR-2025-004" },
      ];
    },
  });

  const filteredResidents = residents.filter(
    (r) =>
      r.name.toLowerCase().includes(residentSearch.toLowerCase()) ||
      r.caseNumber.toLowerCase().includes(residentSearch.toLowerCase())
  );

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
  }

  function handleVisitSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResident) return;
    const newVisit: HomeVisit = {
      id: Date.now(),
      residentId: selectedResident.id,
      ...visitForm,
    };
    // TODO: POST to your C# API endpoint
    setVisits((prev) => [newVisit, ...prev]);
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
                Staff Conducting Visit <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="Full name"
                value={visitForm.staffName}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, staffName: e.target.value }))
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
                Family Cooperation Level <span className="text-red-500">*</span>
              </Label>
              <select
                required
                value={visitForm.familyCooperation}
                onChange={(e) =>
                  setVisitForm((f) => ({
                    ...f,
                    familyCooperation: e.target.value as FamilyCooperation,
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
              Home Environment Observations{" "}
              <span className="text-red-500">*</span>
            </Label>
            <textarea
              required
              rows={3}
              placeholder="Describe the physical environment, living conditions, and any notable observations…"
              value={visitForm.homeEnvironmentObservations}
              onChange={(e) =>
                setVisitForm((f) => ({
                  ...f,
                  homeEnvironmentObservations: e.target.value,
                }))
              }
              className={textareaClass()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Safety Concerns
            </Label>
            <textarea
              rows={2}
              placeholder="Note any threats, risks, or safety issues observed or reported…"
              value={visitForm.safetyConcerns}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, safetyConcerns: e.target.value }))
              }
              className={textareaClass()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium text-foreground">
              Follow-up Actions <span className="text-red-500">*</span>
            </Label>
            <textarea
              required
              rows={2}
              placeholder="Next steps, referrals, or tasks arising from this visit…"
              value={visitForm.followUpActions}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, followUpActions: e.target.value }))
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
                          Conducted by {v.staffName}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium border ${VISIT_TYPE_COLORS[v.visitType]}`}
                        >
                          {v.visitType}
                        </span>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium border ${COOPERATION_COLORS[v.familyCooperation]}`}
                        >
                          {v.familyCooperation}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Home Environment Observations
                        </p>
                        <p className="font-body text-sm text-foreground leading-relaxed">
                          {v.homeEnvironmentObservations}
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Safety Concerns
                          </p>
                          <p className="font-body text-sm text-foreground leading-relaxed">
                            {v.safetyConcerns || (
                              <span className="text-muted-foreground">
                                None identified.
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Follow-up Actions
                          </p>
                          <p className="font-body text-sm text-foreground leading-relaxed">
                            {v.followUpActions}
                          </p>
                        </div>
                      </div>
                    </div>
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
