import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, ChevronUp, Pencil, Plus, Trash2, User, Users } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiGetJson, getApiBaseUrl, type AuthMeResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/process-recordings")({
	beforeLoad: async ({ context }) => {
		await requireRole(context.queryClient, "Admin", "Staff");
	},
	component: ProcessRecordingsPage,
});

type SessionType = "individual" | "group";

interface Resident {
	id: number;
	name: string;
	caseNumber: string;
}

interface ProcessRecording {
	id: number;
	residentId: number;
	sessionDate: string;
	socialWorker: string;
	sessionType: SessionType;
	sessionDurationMinutes: number;
	emotionalStateObserved: string;
	emotionalStateEnd: string;
	sessionNarrative: string;
	interventionsApplied: string;
	followUpActions: string;
	progressNoted: boolean;
	concernsFlagged: boolean;
	referralMade: boolean;
	notesRestricted: string;
}

type ResidentApi = {
  id: string;
  full_name?: string;
  resident_code?: string;
};

type ProcessRecordingApi = {
  id: number;
  resident_id: number;
  session_date: string;
  social_worker: string;
  session_type: SessionType;
  session_duration_minutes: number;
  emotional_state_observed: string;
  emotional_state_end: string;
  session_narrative: string;
  interventions_applied: string;
  follow_up_actions: string;
  progress_noted: boolean;
  concerns_flagged: boolean;
  referral_made: boolean;
  notes_restricted: string;
};

const EMOTIONAL_STATES = [
	"Calm",
	"Hopeful",
	"Anxious",
	"Distressed",
	"Withdrawn",
	"Angry",
	"Sad",
	"Guarded",
	"Engaged",
	"Overwhelmed",
];

const EMPTY_FORM = {
	sessionDate: "",
	socialWorker: "",
	sessionType: "individual" as SessionType,
	sessionDurationMinutes: "" as string | number,
	emotionalStateObserved: "",
	emotionalStateEnd: "",
	sessionNarrative: "",
	interventionsApplied: "",
	followUpActions: "",
	progressNoted: false,
	concernsFlagged: false,
	referralMade: false,
	notesRestricted: "",
};

function ProcessRecordingsPage() {
  const queryClient = useQueryClient();
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null
  );
  const [residentSearch, setResidentSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRecordingId, setEditingRecordingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

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
    queryFn: async () => {
      const rows = await apiGetJson<ResidentApi[]>("/api/admin-data/residents");
      return rows.map((r) => ({
        id: Number(r.id),
        name: r.full_name || `Resident ${r.id}`,
        caseNumber: r.resident_code || `RES-${r.id}`,
      }));
    },
  });

  const { data: residentRecordings = [] } = useQuery<ProcessRecording[]>({
    queryKey: ["process-recordings", selectedResident?.id ?? null],
    enabled: selectedResident !== null,
    queryFn: async () => {
      if (!selectedResident) return [];
      const rows = await apiGetJson<ProcessRecordingApi[]>(
        `/api/admin-data/process-recordings?residentId=${selectedResident.id}`
      );
      return rows.map((r) => ({
        id: r.id,
        residentId: r.resident_id,
        sessionDate: r.session_date,
        socialWorker: r.social_worker,
        sessionType: r.session_type,
        sessionDurationMinutes: r.session_duration_minutes,
        emotionalStateObserved: r.emotional_state_observed,
        emotionalStateEnd: r.emotional_state_end,
        sessionNarrative: r.session_narrative,
        interventionsApplied: r.interventions_applied,
        followUpActions: r.follow_up_actions,
        progressNoted: r.progress_noted,
        concernsFlagged: r.concerns_flagged,
        referralMade: r.referral_made,
        notesRestricted: r.notes_restricted,
      }));
    },
  });

  const createRecordingMutation = useMutation({
    mutationFn: async (payload: {
      resident_id: number;
      session_date: string;
      social_worker: string;
      session_type: SessionType;
      session_duration_minutes: number;
      emotional_state_observed: string;
      emotional_state_end: string;
      session_narrative: string;
      interventions_applied: string;
      follow_up_actions: string;
      progress_noted: boolean;
      concerns_flagged: boolean;
      referral_made: boolean;
      notes_restricted: string;
    }) => {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("API base URL not configured");
      const response = await fetch(`${apiBaseUrl}/api/admin-data/process-recordings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save recording");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["process-recordings", selectedResident?.id ?? null],
      });
    },
  });

  const updateRecordingMutation = useMutation({
    mutationFn: async (payload: {
      id: number;
      session_date: string;
      social_worker: string;
      session_type: SessionType;
      emotional_state: string;
      narrative_summary: string;
      interventions: string;
      follow_up_actions: string;
    }) => {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("API base URL not configured");
      const response = await fetch(
        `${apiBaseUrl}/api/admin-data/process-recordings/${payload.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_date: payload.session_date,
            social_worker: payload.social_worker,
            session_type: payload.session_type,
            emotional_state: payload.emotional_state,
            narrative_summary: payload.narrative_summary,
            interventions: payload.interventions,
            follow_up_actions: payload.follow_up_actions,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to update recording");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["process-recordings", selectedResident?.id ?? null],
      });
    },
  });

  const deleteRecordingMutation = useMutation({
    mutationFn: async (id: number) => {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("API base URL not configured");
      const response = await fetch(`${apiBaseUrl}/api/admin-data/process-recordings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete recording");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["process-recordings", selectedResident?.id ?? null],
      });
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

	function handleFieldChange(field: keyof typeof EMPTY_FORM, value: string) {
		setFormData((prev) => ({ ...prev, [field]: value }));
	}

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResident) return;
    await createRecordingMutation.mutateAsync({
      resident_id: selectedResident.id,
      session_date: formData.sessionDate,
      social_worker: formData.socialWorker,
      session_type: formData.sessionType,
      session_duration_minutes: Number(formData.sessionDurationMinutes) || 0,
      emotional_state_observed: formData.emotionalStateObserved,
      emotional_state_end: formData.emotionalStateEnd,
      session_narrative: formData.sessionNarrative,
      interventions_applied: formData.interventionsApplied,
      follow_up_actions: formData.followUpActions,
      progress_noted: formData.progressNoted,
      concerns_flagged: formData.concernsFlagged,
      referral_made: formData.referralMade,
      notes_restricted: formData.notesRestricted,
    });
    setFormData(EMPTY_FORM);
    setShowForm(false);
    setEditingRecordingId(null);
  }

	function handleSelectResident(resident: Resident) {
		setSelectedResident(resident);
		setShowForm(false);
		setFormData(EMPTY_FORM);
    setEditingRecordingId(null);
	}

  function handleEditRecording(recording: ProcessRecording) {
    setFormData({
      sessionDate: recording.sessionDate,
      socialWorker: recording.socialWorker,
      sessionType: recording.sessionType,
      emotionalState: recording.emotionalState,
      narrativeSummary: recording.narrativeSummary,
      interventions: recording.interventions,
      followUpActions: recording.followUpActions,
    });
    setEditingRecordingId(recording.id);
    setShowForm(true);
  }

  async function handleDeleteRecording(recordingId: number) {
    const confirmed = window.confirm("Delete this process recording?");
    if (!confirmed) return;
    await deleteRecordingMutation.mutateAsync(recordingId);
    if (editingRecordingId === recordingId) {
      setEditingRecordingId(null);
      setShowForm(false);
      setFormData(EMPTY_FORM);
    }
  }

	return (
		<div className="min-h-screen bg-background font-body">
			<AdminSidebar user={user ?? null} />

			<main className="ml-64 p-8">
				{/* Page header */}
				<div className="mb-8">
					<h1 className="font-heading text-3xl font-bold text-foreground">
						Process Recordings
					</h1>
					<p className="font-body text-base text-muted-foreground mt-1">
						Document and review counseling sessions for each resident's healing
						journey.
					</p>
				</div>

				<div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
					{/* Resident selector panel */}
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
								filteredResidents.map((resident) => (
									<button
										type="button"
										key={resident.id}
										onClick={() => handleSelectResident(resident)}
										className={`w-full text-left px-3 py-2.5 rounded-xl transition-all font-body text-sm ${
											selectedResident?.id === resident.id
												? "bg-primary/10 text-primary font-semibold border border-primary/20"
												: "text-foreground hover:bg-muted"
										}`}
									>
										<div className="font-medium">{resident.name}</div>
										<div className="text-xs text-muted-foreground">
											{resident.caseNumber}
										</div>
									</button>
								))
							)}
						</div>
					</div>

					{/* Main content */}
					{selectedResident === null ? (
						<div className="bg-card rounded-2xl border border-border shadow-sm p-12 flex flex-col items-center justify-center text-center">
							<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
								<CalendarDays className="h-6 w-6 text-muted-foreground" />
							</div>
							<h3 className="font-heading text-lg font-bold text-foreground mb-2">
								Select a Resident
							</h3>
							<p className="font-body text-sm text-muted-foreground max-w-xs">
								Choose a resident from the list to view their session history or
								add a new process recording.
							</p>
						</div>
					) : (
						<div className="space-y-6">
							{/* Resident context bar */}
							<div className="bg-[#FDFBF7] border-t-4 border-t-yellow-500 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm">
								<div>
									<h2 className="font-heading text-xl font-bold text-foreground">
										{selectedResident.name}
									</h2>
									<p className="font-body text-sm text-muted-foreground">
										Case #{selectedResident.caseNumber} &mdash;{" "}
										{residentRecordings.length} session
										{residentRecordings.length !== 1 ? "s" : ""} recorded
									</p>
								</div>
								<Button
									onClick={() => setShowForm((v) => !v)}
									className="font-body gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl shadow-sm transition-all"
								>
									{showForm ? (
										<>
											<ChevronUp className="h-4 w-4" />
											Hide Form
										</>
									) : (
										<>
											<Plus className="h-4 w-4" />
											{editingRecordingId !== null ? "Edit Recording" : "New Recording"}
										</>
									)}
								</Button>
							</div>

							{/* Add new recording form */}
							{showForm && (
								<div className="bg-card rounded-2xl border border-border shadow-sm p-6">
									<h3 className="font-heading text-lg font-bold text-foreground mb-5">
										{editingRecordingId !== null
                      ? "Edit Session Recording"
                      : "New Session Recording"}
									</h3>
									<form onSubmit={handleSubmit} className="space-y-5">
										<div className="grid sm:grid-cols-2 gap-5">
											{/* Session date */}
											<div className="space-y-1.5">
												<Label
													htmlFor="sessionDate"
													className="font-body text-sm font-medium text-foreground"
												>
													Session Date <span className="text-red-500">*</span>
												</Label>
												<Input
													id="sessionDate"
													type="date"
													required
													value={formData.sessionDate}
													onChange={(e) =>
														handleFieldChange("sessionDate", e.target.value)
													}
												/>
											</div>

											{/* Social worker */}
											<div className="space-y-1.5">
												<Label
													htmlFor="socialWorker"
													className="font-body text-sm font-medium text-foreground"
												>
													Social Worker <span className="text-red-500">*</span>
												</Label>
												<Input
													id="socialWorker"
													type="text"
													placeholder="Full name"
													required
													value={formData.socialWorker}
													onChange={(e) =>
														handleFieldChange("socialWorker", e.target.value)
													}
												/>
											</div>
										</div>

										<div className="grid sm:grid-cols-2 gap-5">
											{/* Session type */}
											<div className="space-y-1.5">
												<Label className="font-body text-sm font-medium text-foreground">
													Session Type <span className="text-red-500">*</span>
												</Label>
												<div className="flex gap-3">
													{(["individual", "group"] as SessionType[]).map(
														(type) => (
															<button
																key={type}
																type="button"
																onClick={() =>
																	handleFieldChange("sessionType", type)
																}
																className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-3xl border font-body text-sm transition-all ${
																	formData.sessionType === type
																		? "bg-primary/10 border-primary/40 text-primary font-semibold"
																		: "border-transparent bg-input/50 text-foreground hover:bg-input"
																}`}
															>
																{type === "individual" ? (
																	<User className="h-4 w-4" />
																) : (
																	<Users className="h-4 w-4" />
																)}
																{type.charAt(0).toUpperCase() + type.slice(1)}
															</button>
														),
													)}
												</div>
											</div>

											{/* Duration */}
											<div className="space-y-1.5">
												<Label
													htmlFor="sessionDuration"
													className="font-body text-sm font-medium text-foreground"
												>
													Duration (minutes)
												</Label>
												<input
													id="sessionDuration"
													type="number"
													min="1"
													placeholder="e.g. 60"
													value={formData.sessionDurationMinutes}
													onChange={(e) =>
														handleFieldChange("sessionDurationMinutes", e.target.value)
													}
													className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
												/>
											</div>
										</div>

										<div className="grid sm:grid-cols-2 gap-5">
											{/* Emotional state observed */}
											<div className="space-y-1.5">
												<Label
													htmlFor="emotionalStateObserved"
													className="font-body text-sm font-medium text-foreground"
												>
													Emotional State (Start){" "}
													<span className="text-red-500">*</span>
												</Label>
												<select
													id="emotionalStateObserved"
													required
													value={formData.emotionalStateObserved}
													onChange={(e) =>
														handleFieldChange("emotionalStateObserved", e.target.value)
													}
													className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
												>
													<option value="" disabled>
														Select state…
													</option>
													{EMOTIONAL_STATES.map((s) => (
														<option key={s} value={s}>
															{s}
														</option>
													))}
												</select>
											</div>

											{/* Emotional state end */}
											<div className="space-y-1.5">
												<Label
													htmlFor="emotionalStateEnd"
													className="font-body text-sm font-medium text-foreground"
												>
													Emotional State (End)
												</Label>
												<select
													id="emotionalStateEnd"
													value={formData.emotionalStateEnd}
													onChange={(e) =>
														handleFieldChange("emotionalStateEnd", e.target.value)
													}
													className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm font-body text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
												>
													<option value="">Select state…</option>
													{EMOTIONAL_STATES.map((s) => (
														<option key={s} value={s}>
															{s}
														</option>
													))}
												</select>
											</div>
										</div>

										{/* Session narrative */}
										<div className="space-y-1.5">
											<Label
												htmlFor="sessionNarrative"
												className="font-body text-sm font-medium text-foreground"
											>
												Session Narrative{" "}
												<span className="text-red-500">*</span>
											</Label>
											<textarea
												id="sessionNarrative"
												required
												rows={4}
												placeholder="Describe what occurred during the session…"
												value={formData.sessionNarrative}
												onChange={(e) =>
													handleFieldChange("sessionNarrative", e.target.value)
												}
												className="w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none"
											/>
										</div>

										{/* Interventions applied */}
										<div className="space-y-1.5">
											<Label
												htmlFor="interventionsApplied"
												className="font-body text-sm font-medium text-foreground"
											>
												Interventions Applied{" "}
												<span className="text-red-500">*</span>
											</Label>
											<textarea
												id="interventionsApplied"
												required
												rows={3}
												placeholder="List techniques, approaches, or tools used…"
												value={formData.interventionsApplied}
												onChange={(e) =>
													handleFieldChange("interventionsApplied", e.target.value)
												}
												className="w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none"
											/>
										</div>

										{/* Follow-up actions */}
										<div className="space-y-1.5">
											<Label
												htmlFor="followUpActions"
												className="font-body text-sm font-medium text-foreground"
											>
												Follow-up Actions{" "}
												<span className="text-red-500">*</span>
											</Label>
											<textarea
												id="followUpActions"
												required
												rows={3}
												placeholder="Next steps, referrals, or tasks to complete…"
												value={formData.followUpActions}
												onChange={(e) =>
													handleFieldChange("followUpActions", e.target.value)
												}
												className="w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none"
											/>
										</div>

										{/* Flags */}
										<div className="space-y-2">
											<Label className="font-body text-sm font-medium text-foreground">
												Session Flags
											</Label>
											<div className="flex flex-wrap gap-4">
												{(
													[
														["progressNoted", "Progress Noted"],
														["concernsFlagged", "Concerns Flagged"],
														["referralMade", "Referral Made"],
													] as [keyof typeof formData, string][]
												).map(([key, label]) => (
													<label key={key} className="flex items-center gap-2 cursor-pointer">
														<input
															type="checkbox"
															checked={formData[key] as boolean}
															onChange={(e) => handleFieldChange(key, e.target.checked as never)}
															className="h-4 w-4 rounded accent-primary"
														/>
														<span className="font-body text-sm text-foreground">{label}</span>
													</label>
												))}
											</div>
										</div>

										{/* Restricted notes */}
										<div className="space-y-1.5">
											<Label
												htmlFor="notesRestricted"
												className="font-body text-sm font-medium text-foreground"
											>
												Restricted Notes
											</Label>
											<textarea
												id="notesRestricted"
												rows={2}
												placeholder="Confidential notes visible only to authorized staff…"
												value={formData.notesRestricted}
												onChange={(e) =>
													handleFieldChange("notesRestricted", e.target.value)
												}
												className="w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 resize-none"
											/>
										</div>

										<div className="flex gap-3 justify-end pt-1">
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													setShowForm(false);
													setFormData(EMPTY_FORM);
                          setEditingRecordingId(null);
												}}
												className="font-body px-5 h-10 rounded-xl"
											>
												Cancel
											</Button>
											<Button
												type="submit"
												className="font-body bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl"
											>
												{editingRecordingId !== null ? "Save Changes" : "Save Recording"}
											</Button>
										</div>
									</form>
								</div>
							)}

							{/* Session history */}
							<div className="bg-card rounded-2xl border border-border shadow-sm p-6">
								<h3 className="font-heading text-lg font-bold text-foreground mb-5">
									Session History
								</h3>

								{residentRecordings.length === 0 ? (
									<div className="text-center py-10">
										<p className="font-body text-sm text-muted-foreground">
											No sessions recorded yet. Add the first recording above.
										</p>
									</div>
								) : (
									<div className="relative">
										{/* Timeline line */}
										<div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

										<div className="space-y-6">
											{residentRecordings.map((rec) => (
												<div key={rec.id} className="relative pl-8">
													{/* Timeline dot */}
													<div className="absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full bg-card border-2 border-primary flex items-center justify-center">
														<div className="w-2 h-2 rounded-full bg-primary" />
													</div>

													<div className="bg-background rounded-xl border border-border p-5">
														{/* Header row */}
														<div className="flex flex-wrap items-start justify-between gap-3 mb-4">
															<div>
																<p className="font-heading text-base font-bold text-foreground">
																	{new Date(
																		`${rec.sessionDate}T00:00:00`,
																	).toLocaleDateString("en-US", {
																		weekday: "long",
																		year: "numeric",
																		month: "long",
																		day: "numeric",
																	})}
																</p>
																<p className="font-body text-sm text-muted-foreground mt-0.5">
																	with {rec.socialWorker}
																</p>
															</div>
															<div className="flex gap-2 flex-wrap">
																<span
																	className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-medium border ${
																		rec.sessionType === "individual"
																			? "bg-blue-50 text-blue-700 border-blue-200"
																			: "bg-purple-50 text-purple-700 border-purple-200"
																	}`}
																>
																	{rec.sessionType === "individual" ? (
																		<User className="h-3 w-3" />
																	) : (
																		<Users className="h-3 w-3" />
																	)}
																	{rec.sessionType.charAt(0).toUpperCase() +
																		rec.sessionType.slice(1)}
																</span>
																<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
																	{rec.emotionalStateObserved}
																	{rec.emotionalStateEnd && rec.emotionalStateEnd !== rec.emotionalStateObserved && (
																		<> → {rec.emotionalStateEnd}</>
																	)}
																</span>
																{rec.sessionDurationMinutes > 0 && (
																	<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium bg-muted text-muted-foreground border border-border">
																		{rec.sessionDurationMinutes} min
																	</span>
																)}
																{rec.progressNoted && (
																	<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium bg-green-50 text-green-700 border border-green-200">
																		Progress Noted
																	</span>
																)}
																{rec.concernsFlagged && (
																	<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium bg-red-50 text-red-700 border border-red-200">
																		Concerns Flagged
																	</span>
																)}
																{rec.referralMade && (
																	<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium bg-blue-50 text-blue-700 border border-blue-200">
																		Referral Made
																	</span>
																)}
															</div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleEditRecording(rec)}
                                  className="h-8 px-3 rounded-lg font-body text-xs"
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleDeleteRecording(rec.id)}
                                  className="h-8 px-3 rounded-lg font-body text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Delete
                                </Button>
                              </div>
														</div>

														<div className="space-y-3">
															<div>
																<p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
																	Session Narrative
																</p>
																<p className="font-body text-sm text-foreground leading-relaxed">
																	{rec.sessionNarrative}
																</p>
															</div>
															<div className="grid sm:grid-cols-2 gap-3 pt-1">
																<div>
																	<p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
																		Interventions Applied
																	</p>
																	<p className="font-body text-sm text-foreground leading-relaxed">
																		{rec.interventionsApplied}
																	</p>
																</div>
																<div>
																	<p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
																		Follow-up Actions
																	</p>
																	<p className="font-body text-sm text-foreground leading-relaxed">
																		{rec.followUpActions}
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
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
