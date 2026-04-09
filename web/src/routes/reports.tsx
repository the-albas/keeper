import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiGetJson, type AuthMeResponse } from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import {
	BookOpen,
	FileText,
	Heart,
	Home,
	TrendingUp,
	Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/reports")({
	beforeLoad: async ({ context }) => {
		await requireRole(context.queryClient, "Admin", "Staff");
	},
	component: ReportsPage,
});

// ─── Chart theme ──────────────────────────────────────────────────────────────

const GRID_COLOR = "hsl(40,15%,88%)";
const TICK_STYLE = {
	fontSize: 11,
	fontFamily: "Inter",
	fill: "hsl(210,10%,45%)",
};
const TOOLTIP_STYLE = {
	borderRadius: "12px",
	border: "1px solid hsl(40,15%,88%)",
	fontFamily: "Inter",
	fontSize: 12,
};

const C_PRIMARY = "hsl(174, 62%, 28%)"; // teal
const C_YELLOW = "hsl(43, 96%, 50%)"; // yellow
const C_PURPLE = "hsl(263, 60%, 55%)"; // purple
const C_GREEN = "hsl(142, 55%, 40%)"; // green
const C_BLUE = "hsl(217, 75%, 55%)"; // blue
const C_PINK = "hsl(330, 65%, 55%)"; // pink

const PIE_COLORS = [C_PRIMARY, C_YELLOW, C_PURPLE, C_GREEN];

type ReportsSummary = {
  donationTrend: { month: string; amount: number }[];
  safehousePerformance: {
    name: string;
    admitted: number;
    active: number;
    graduated: number;
  }[];
  reintegrationOutcomes: { label: string; value: number }[];
  servicesByQuarter: { quarter: string; caring: number; healing: number; teaching: number }[];
  caseCategories: { label: string; value: number }[];
  outcomeIndicators: { label: string; pct: number }[];
};

type DonorMlFeatures = {
  supporter_id: string;
  supporter_name: string;
  frequency: number;
  avg_monetary_value: number | null;
  social_referral_count: number;
  is_recurring_donor: number;
  top_program_interest: string | null;
  recency_days: number | null;
  donor_tenure_days: number;
  supporter_type: string | null;
  relationship_type: string | null;
  region: string | null;
  acquisition_channel: string | null;
  status: string | null;
};

type ResidentMlFeatures = {
  resident_id: string;
  current_progress: number | null;
  days_since_admission: number | null;
  present_age_years: number | null;
  age_upon_admission_years: number | null;
  has_special_needs: number | null;
  hw_mean_general_health_score: number | null;
  hw_mean_nutrition_score: number | null;
  hw_mean_energy_level_score: number | null;
  hw_mean_sleep_quality_score: number | null;
  n_incidents: number | null;
  n_home_visitations: number | null;
  n_intervention_plans: number | null;
  case_status: string | null;
  case_category: string | null;
  initial_risk_level: string | null;
  current_risk_level: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPHP(v: number) {
	if (v >= 1000000) return `₱${(v / 1000000).toFixed(1)}M`;
	if (v >= 1000) return `₱${(v / 1000).toFixed(0)}k`;
	return `₱${v}`;
}

function SectionHeader({
	title,
	subtitle,
}: {
	title: string;
	subtitle?: string;
}) {
	return (
		<div className="mb-5">
			<h2 className="font-heading text-xl font-bold text-foreground">
				{title}
			</h2>
			{subtitle && (
				<p className="font-body text-sm text-muted-foreground mt-0.5">
					{subtitle}
				</p>
			)}
		</div>
	);
}

// ─── Custom Pie label ─────────────────────────────────────────────────────────

function PieLabel({
	cx = 0,
	cy = 0,
	midAngle = 0,
	innerRadius = 0,
	outerRadius = 0,
	percent = 0,
}: PieLabelRenderProps) {
	const RADIAN = Math.PI / 180;
	const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
	const x = cx + radius * Math.cos(-midAngle * RADIAN);
	const y = cy + radius * Math.sin(-midAngle * RADIAN);
	if (percent < 0.07) return null;
	return (
		<text
			x={x}
			y={y}
			fill="white"
			textAnchor="middle"
			dominantBaseline="central"
			style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600 }}
		>
			{`${(percent * 100).toFixed(0)}%`}
		</text>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

function ReportsPage() {
  const [reportYear, setReportYear] = useState(2025);

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiGetJson<AuthMeResponse>("/api/auth/me"),
    retry: false,
    staleTime: 60_000,
  });

  const { data: reportsSummary } = useQuery({
    queryKey: ["reports-summary", reportYear],
    queryFn: () =>
      apiGetJson<ReportsSummary>(`/api/admin-data/reports-summary?year=${reportYear}`),
    staleTime: 60_000,
    retry: false,
  });

  const donationTrend = reportsSummary?.donationTrend ?? [];
  const safehousePerformance = reportsSummary?.safehousePerformance ?? [];
  const reintegrationOutcomes = reportsSummary?.reintegrationOutcomes ?? [];
  const servicesByQuarter = reportsSummary?.servicesByQuarter ?? [];
  const caseCategories = (reportsSummary?.caseCategories ?? []).map((c) => ({
    category: c.label,
    count: c.value,
  }));
  const outcomeIndicators = reportsSummary?.outcomeIndicators ?? [];

  // ── ML Predictions (real donor/resident features; social remains sample) ──────
  const ML_HEADERS = { "Content-Type": "application/json" };

  const { data: donorFeatures = [], isLoading: donorFeaturesLoading } = useQuery({
    queryKey: ["admin", "ml", "donor-features"],
    queryFn: () =>
      apiGetJson<DonorMlFeatures[]>("/api/admin/ml/donor-features?take=1000"),
    staleTime: 60_000,
    retry: false,
  });

  const { data: residentFeatures = [], isLoading: residentFeaturesLoading } = useQuery({
    queryKey: ["admin", "ml", "resident-features"],
    queryFn: () =>
      apiGetJson<ResidentMlFeatures[]>("/api/admin/ml/resident-features?take=1000"),
    staleTime: 60_000,
    retry: false,
  });

  const {
    data: donorMlAggregate,
    isLoading: donorAggregateLoading,
  } = useQuery({
    queryKey: ["ml", "aggregate", "donor", donorFeatures.length],
    enabled: donorFeatures.length > 0,
    queryFn: async () => {
      const predictions = await Promise.all(
        donorFeatures.map(async (features) => {
          const [retention, growth] = await Promise.all([
            apiGetJson<{ predicted_class: number }>(
              "/api/ml/retention/predict",
              {
                method: "POST",
                headers: ML_HEADERS,
                body: JSON.stringify({
                  frequency: features.frequency,
                  avg_monetary_value: features.avg_monetary_value,
                  social_referral_count: features.social_referral_count,
                  is_recurring_donor: features.is_recurring_donor,
                  top_program_interest: features.top_program_interest,
                }),
              }
            ),
            apiGetJson<{ predicted_total_monetary_value: number }>(
              "/api/ml/growth/predict",
              {
                method: "POST",
                headers: ML_HEADERS,
                body: JSON.stringify({
                  recency_days: features.recency_days,
                  frequency: features.frequency,
                  social_referral_count: features.social_referral_count,
                  is_recurring_donor: features.is_recurring_donor,
                  donor_tenure_days: features.donor_tenure_days,
                  top_program_interest: features.top_program_interest,
                  supporter_type: features.supporter_type,
                  relationship_type: features.relationship_type,
                  region: features.region,
                  acquisition_channel: features.acquisition_channel,
                  status: features.status,
                }),
              }
            ),
          ]);

          return {
            isLapsed: retention.predicted_class === 0,
            predictedGiving: growth.predicted_total_monetary_value ?? 0,
          };
        })
      );

      const total = predictions.length;
      const lapseCount = predictions.filter((p) => p.isLapsed).length;
      const avgPredictedGiving =
        total > 0
          ? predictions.reduce((sum, p) => sum + p.predictedGiving, 0) / total
          : 0;

      return {
        total,
        lapsePct: total > 0 ? (lapseCount / total) * 100 : 0,
        avgPredictedGiving,
      };
    },
    staleTime: 60_000,
    retry: false,
  });

  const { data: mlSocialEngagement, isLoading: socialEngagementLoading } = useQuery({
    queryKey: ["ml", "social", "sample"],
    queryFn: () =>
      apiGetJson<{ predicted_engagement_rate: number }>(
        "/api/ml/social/predict",
        {
          method: "POST",
          headers: ML_HEADERS,
          body: JSON.stringify({
            caption_length: 180,
            num_hashtags: 5,
            boost_budget_php: 0,
            follower_count_at_post: 3500,
            post_hour: 10,
            has_call_to_action: 1,
            is_boosted: 0,
            platform: "Facebook",
            post_type: "Photo",
            media_type: "Image",
            content_topic: "Impact Story",
            sentiment_tone: "Inspirational",
            post_dow: "Tuesday",
            call_to_action_type: "Donate",
          }),
        }
      ),
    staleTime: Infinity,
    retry: false,
  });

  const { data: mlSocialCausal, isLoading: socialCausalLoading } = useQuery({
    queryKey: ["ml", "social-causal", "sample"],
    queryFn: () =>
      apiGetJson<{ estimated_ite: number; p_outcome_if_boosted: number; p_outcome_if_not_boosted: number; ate: number }>(
        "/api/ml/social/causal/predict",
        {
          method: "POST",
          headers: ML_HEADERS,
          body: JSON.stringify({
            caption_length: 180,
            num_hashtags: 5,
            follower_count_at_post: 3500,
            post_hour: 10,
            has_call_to_action: 1,
            boost_budget_php: 500,
            platform: "Facebook",
            post_type: "Photo",
            media_type: "Image",
            content_topic: "Impact Story",
            sentiment_tone: "Inspirational",
            post_dow: "Tuesday",
            call_to_action_type: "Donate",
          }),
        }
      ),
    staleTime: Infinity,
    retry: false,
  });

  const {
    data: residentMlAggregate,
    isLoading: residentAggregateLoading,
  } = useQuery({
    queryKey: ["ml", "aggregate", "resident", residentFeatures.length],
    enabled: residentFeatures.length > 0,
    queryFn: async () => {
      const predictions = await Promise.all(
        residentFeatures.map(async (features) => {
          const [progress, trajectory] = await Promise.all([
            apiGetJson<{ predicted_mean_progress: number }>(
              "/api/ml/girls-progress/predict",
              {
                method: "POST",
                headers: ML_HEADERS,
                body: JSON.stringify(features),
              }
            ),
            apiGetJson<{ risk_label: string | null }>(
              "/api/ml/girls-trajectory/predict",
              {
                method: "POST",
                headers: ML_HEADERS,
                body: JSON.stringify({
                  current_progress: features.current_progress,
                  days_since_admission: features.days_since_admission,
                  present_age_years: features.present_age_years,
                  age_upon_admission_years: features.age_upon_admission_years,
                  has_special_needs: features.has_special_needs,
                  hw_mean_general_health_score: features.hw_mean_general_health_score,
                  hw_mean_nutrition_score: features.hw_mean_nutrition_score,
                  hw_mean_energy_level_score: features.hw_mean_energy_level_score,
                  hw_mean_sleep_quality_score: features.hw_mean_sleep_quality_score,
                  n_incidents: features.n_incidents,
                  n_home_visitations: features.n_home_visitations,
                  n_intervention_plans: features.n_intervention_plans,
                  case_status: features.case_status,
                  case_category: features.case_category,
                  initial_risk_level: features.initial_risk_level,
                  current_risk_level: features.current_risk_level,
                }),
              }
            ),
          ]);

          return {
            predictedProgress: progress.predicted_mean_progress ?? 0,
            isAtRisk: trajectory.risk_label === "At Risk",
          };
        })
      );

      const total = predictions.length;
      const avgProgress =
        total > 0
          ? predictions.reduce((sum, p) => sum + p.predictedProgress, 0) / total
          : 0;
      const atRiskCount = predictions.filter((p) => p.isAtRisk).length;

      return {
        total,
        avgProgress,
        atRiskCount,
      };
    },
    staleTime: 60_000,
    retry: false,
  });

  const retentionLoading = donorFeaturesLoading || donorAggregateLoading;
  const growthLoading = donorFeaturesLoading || donorAggregateLoading;
  const progressLoading = residentFeaturesLoading || residentAggregateLoading;
  const trajectoryLoading = residentFeaturesLoading || residentAggregateLoading;

  const totalDonations = donationTrend.reduce((s, d) => s + d.amount, 0);
  const totalResidents = safehousePerformance.reduce(
    (s, sh) => s + sh.admitted,
    0
  );
  const totalReintegrated = reintegrationOutcomes.reduce(
    (s, o) => s + o.value,
    0
  );
  const totalServices = servicesByQuarter.reduce(
    (s, q) => s + q.caring + q.healing + q.teaching,
    0
  );

  const aarCaring = servicesByQuarter.reduce((s, q) => s + q.caring, 0);
  const aarHealing = servicesByQuarter.reduce((s, q) => s + q.healing, 0);
  const aarTeaching = servicesByQuarter.reduce((s, q) => s + q.teaching, 0);

  return (
    <div className="min-h-screen bg-background font-body">
      <AdminSidebar user={user ?? null} />

      <main className="ml-64 p-8">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              Reports & Analytics
            </h1>
            <p className="font-body text-base text-muted-foreground mt-1">
              Aggregated insights aligned with the Annual Accomplishment Report
              format.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <select
              aria-label="Report year"
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className="h-9 rounded-3xl border border-transparent bg-input/50 px-4 text-sm font-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {[2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {/* TODO: Wire to PDF export */}
            <button className="inline-flex items-center gap-2 h-9 px-4 rounded-3xl border border-border bg-card text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* ── Annual Accomplishment Report pillars ─────────────────────────── */}
        <div className="bg-[#FDFBF7] border-t-4 border-t-yellow-500 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">
              Annual Accomplishment Report — {reportYear}
            </h2>
            <span className="font-body text-xs text-muted-foreground ml-1">
              Philippine DSWD reporting format
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Beneficiaries */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-3">
                <Users className="h-5 w-5" />
              </div>
              <div className="font-heading text-3xl font-bold text-foreground">
                {totalResidents}
              </div>
              <div className="font-body text-sm font-semibold text-foreground mt-0.5">
                Total Beneficiaries
              </div>
              <div className="font-body text-xs text-muted-foreground">
                Residents admitted this year
              </div>
            </div>

            {/* Caring */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-100 text-yellow-700 mb-3">
                <Home className="h-5 w-5" />
              </div>
              <div className="font-heading text-3xl font-bold text-foreground">
                {aarCaring}
              </div>
              <div className="font-body text-sm font-semibold text-foreground mt-0.5">
                Caring
              </div>
              <div className="font-body text-xs text-muted-foreground">
                Shelter, food & safety service days
              </div>
            </div>

            {/* Healing */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-700 mb-3">
                <Heart className="h-5 w-5" />
              </div>
              <div className="font-heading text-3xl font-bold text-foreground">
                {aarHealing}
              </div>
              <div className="font-body text-sm font-semibold text-foreground mt-0.5">
                Healing
              </div>
              <div className="font-body text-xs text-muted-foreground">
                Counseling & psychosocial sessions
              </div>
            </div>

            {/* Teaching */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-700 mb-3">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="font-heading text-3xl font-bold text-foreground">
                {aarTeaching}
              </div>
              <div className="font-body text-sm font-semibold text-foreground mt-0.5">
                Teaching
              </div>
              <div className="font-body text-xs text-muted-foreground">
                Livelihood & education trainings
              </div>
            </div>
          </div>

          {/* AAR service totals row */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              {
                label: "Total Services Rendered",
                value: totalServices,
                color: "text-foreground",
              },
              {
                label: "Successfully Reintegrated",
                value: totalReintegrated,
                color: "text-primary",
              },
              {
                label: "Total Contributions Received",
                value: `₱${totalDonations.toLocaleString("en-PH")}`,
                color: "text-yellow-700",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-background rounded-xl border border-border py-3 px-4"
              >
                <div className={`font-heading text-xl font-bold ${s.color}`}>
                  {s.value}
                </div>
                <div className="font-body text-xs text-muted-foreground mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Donation Trends ──────────────────────────────────────────────── */}
        <div className="mb-8">
          <SectionHeader
            title="Donation Trends"
            subtitle="Monthly monetary contributions across all campaigns"
          />
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={donationTrend}>
                <defs>
                  <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={C_PRIMARY}
                      stopOpacity={0.25}
                    />
                    <stop offset="95%" stopColor={C_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  dataKey="month"
                  tick={TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatPHP}
                  width={56}
                />
                <Tooltip
                  formatter={(v) => [
                    `₱${Number(v).toLocaleString("en-PH")}`,
                    "Amount",
                  ]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={C_PRIMARY}
                  strokeWidth={2}
                  fill="url(#donGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Safehouse Performance + Reintegration Outcomes ───────────────── */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Safehouse Performance */}
          <div>
            <SectionHeader
              title="Safehouse Performance"
              subtitle="Residents admitted, active, and graduated per safehouse"
            />
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={safehousePerformance} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis
                    dataKey="name"
                    tick={{ ...TICK_STYLE, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <YAxis
                    tick={TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontFamily: "Inter", fontSize: 12 }}
                  />
                  <Bar
                    dataKey="admitted"
                    name="Admitted"
                    fill={C_BLUE}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="active"
                    name="Active"
                    fill={C_PRIMARY}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="graduated"
                    name="Graduated"
                    fill={C_GREEN}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reintegration Outcomes */}
          <div>
            <SectionHeader
              title="Reintegration Outcomes"
              subtitle={`${totalReintegrated} cases completed the reintegration process`}
            />
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={reintegrationOutcomes}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    labelLine={false}
                    label={PieLabel as any}
                  >
                    {reintegrationOutcomes.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [`${v} residents`, name]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => value}
                    wrapperStyle={{ fontFamily: "Inter", fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Services by Quarter + Case Category Distribution ──────────────── */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Services by Quarter */}
          <div>
            <SectionHeader
              title="Services by Quarter"
              subtitle="Caring, Healing, and Teaching service counts per quarter"
            />
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={servicesByQuarter} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis
                    dataKey="quarter"
                    tick={TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontFamily: "Inter", fontSize: 12 }}
                  />
                  <Bar
                    dataKey="caring"
                    name="Caring"
                    fill={C_YELLOW}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="healing"
                    name="Healing"
                    fill={C_PURPLE}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="teaching"
                    name="Teaching"
                    fill={C_BLUE}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Case Category Distribution */}
          <div>
            <SectionHeader
              title="Beneficiaries by Case Category"
              subtitle="Distribution of admitted residents by case type"
            />
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={caseCategories}
                  layout="vertical"
                  margin={{ left: 8, right: 24 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_COLOR}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ ...TICK_STYLE, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar
                    dataKey="count"
                    name="Residents"
                    fill={C_PINK}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Resident Outcome Indicators ──────────────────────────────────── */}
        <div className="mb-8">
          <SectionHeader
            title="Resident Outcome Indicators"
            subtitle="Average improvement rates across key program outcomes for graduates"
          />
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="space-y-5 max-w-2xl">
              {outcomeIndicators.map((o) => (
                <div key={o.label}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="font-body text-sm font-medium text-foreground">
                      {o.label}
                    </span>
                    <span className="font-heading text-sm font-bold text-foreground">
                      {o.pct}%
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full transition-all"
                      style={{
                        width: `${o.pct}%`,
                        background:
                          o.pct >= 75
                            ? C_PRIMARY
                            : o.pct >= 60
                              ? C_YELLOW
                              : C_PURPLE,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="font-body text-xs text-muted-foreground mt-5">
              Indicators measured at case closure through standardized welfare
              assessment forms. Target threshold: 70%.
            </p>
          </div>
        </div>

        {/* ── ML Predictions ───────────────────────────────────────────────── */}
        <div className="mb-8">
          <SectionHeader
            title="ML Predictions"
            subtitle="Live donor and resident aggregates; social cards remain sample previews"
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Donor Retention Score */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Donor Retention
                </span>
                <span className="font-body text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Live
                </span>
              </div>
              {retentionLoading || donorFeatures.length === 0 ? (
                <div className="h-10 bg-muted animate-pulse rounded-lg" />
              ) : donorMlAggregate ? (
                <>
                  <div
                    className="font-heading text-3xl font-bold"
                    style={{
                      color:
                        donorMlAggregate.lapsePct < 25
                          ? C_GREEN
                          : donorMlAggregate.lapsePct < 40
                          ? C_YELLOW
                          : "hsl(0,72%,51%)",
                    }}
                  >
                    {Math.round(donorMlAggregate.lapsePct)}%
                  </div>
                  <div className="font-body text-xs text-muted-foreground">
                    Donors predicted to lapse
                  </div>
                </>
              ) : (
                <div className="font-body text-xs text-muted-foreground">ML service offline</div>
              )}
            </div>

            {/* Predicted Contribution */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Predicted Giving
                </span>
                <span className="font-body text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Live
                </span>
              </div>
              {growthLoading || donorFeatures.length === 0 ? (
                <div className="h-10 bg-muted animate-pulse rounded-lg" />
              ) : donorMlAggregate ? (
                <>
                  <div className="font-heading text-3xl font-bold text-foreground">
                    {formatPHP(Math.round(donorMlAggregate.avgPredictedGiving))}
                  </div>
                  <div className="font-body text-xs text-muted-foreground">
                    Average predicted lifetime giving
                  </div>
                </>
              ) : (
                <div className="font-body text-xs text-muted-foreground">ML service offline</div>
              )}
            </div>

            {/* Resident Education Progress */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Edu. Progress
                </span>
                <span className="font-body text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Live
                </span>
              </div>
              {progressLoading || residentFeatures.length === 0 ? (
                <div className="h-10 bg-muted animate-pulse rounded-lg" />
              ) : residentMlAggregate ? (
                <>
                  <div className="font-heading text-3xl font-bold text-foreground">
                    {Math.round(residentMlAggregate.avgProgress)}
                    <span className="font-body text-base font-normal text-muted-foreground">/100</span>
                  </div>
                  <div className="font-body text-xs text-muted-foreground">
                    Average predicted resident progress
                  </div>
                </>
              ) : (
                <div className="font-body text-xs text-muted-foreground">ML service offline</div>
              )}
            </div>

            {/* At-Risk Trajectory */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Risk Trajectory
                </span>
                <span className="font-body text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Live
                </span>
              </div>
              {trajectoryLoading || residentFeatures.length === 0 ? (
                <div className="h-10 bg-muted animate-pulse rounded-lg" />
              ) : residentMlAggregate ? (
                <>
                  <div
                    className="font-heading text-2xl font-bold"
                    style={{
                      color:
                        residentMlAggregate.atRiskCount > 0
                          ? "hsl(0,72%,51%)"
                          : C_GREEN,
                    }}
                  >
                    {residentMlAggregate.atRiskCount}
                  </div>
                  <div className="font-body text-xs text-muted-foreground">
                    Residents flagged At Risk
                  </div>
                </>
              ) : (
                <div className="font-body text-xs text-muted-foreground">ML service offline</div>
              )}
            </div>

            {/* Social Engagement Rate */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Social Engagement
                </span>
                <span className="font-body text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Sample
                </span>
              </div>
              {socialEngagementLoading ? (
                <div className="h-10 bg-muted animate-pulse rounded-lg" />
              ) : mlSocialEngagement ? (
                <>
                  <div className="font-heading text-3xl font-bold text-foreground">
                    {(mlSocialEngagement.predicted_engagement_rate * 100).toFixed(1)}
                    <span className="font-body text-base font-normal text-muted-foreground">%</span>
                  </div>
                  <div className="font-body text-xs text-muted-foreground">
                    Predicted post engagement · connect DB to optimize all posts
                  </div>
                </>
              ) : (
                <div className="font-body text-xs text-muted-foreground">ML service offline</div>
              )}
            </div>

            {/* Social Causal Boost */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Boost Impact
                </span>
                <span className="font-body text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Sample
                </span>
              </div>
              {socialCausalLoading ? (
                <div className="h-10 bg-muted animate-pulse rounded-lg" />
              ) : mlSocialCausal ? (
                <>
                  <div
                    className="font-heading text-3xl font-bold"
                    style={{ color: mlSocialCausal.estimated_ite > 0 ? C_GREEN : "hsl(0,72%,51%)" }}
                  >
                    {mlSocialCausal.estimated_ite > 0 ? "+" : ""}
                    {(mlSocialCausal.estimated_ite * 100).toFixed(1)}
                    <span className="font-body text-base font-normal text-muted-foreground">%</span>
                  </div>
                  <div className="font-body text-xs text-muted-foreground">
                    Est. gift-referral lift from boosting · connect DB to rank posts worth boosting
                  </div>
                </>
              ) : (
                <div className="font-body text-xs text-muted-foreground">ML service offline</div>
              )}
            </div>

          </div>
        </div>

        <div className="bg-muted/50 rounded-2xl border border-border p-5 flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm font-medium text-foreground mb-0.5">
              Live Data Source
            </p>
            <p className="font-body text-xs text-muted-foreground leading-relaxed">
              Charts are loaded from
              <code className="font-mono bg-muted px-1 rounded mx-1">
                /api/admin-data/reports-summary?year=
              </code>
              and update when you change the selected year.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
