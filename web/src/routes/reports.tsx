import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
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
import {
  Users,
  Heart,
  BookOpen,
  Home,
  TrendingUp,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/reports")({
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

// ─── Mock data ────────────────────────────────────────────────────────────────
// TODO: Replace with C# API calls filtered by reportYear

const DONATION_TREND = [
  { month: "Jan", amount: 175000 },
  { month: "Feb", amount: 82000 },
  { month: "Mar", amount: 95000 },
  { month: "Apr", amount: 220000 },
  { month: "May", amount: 148000 },
  { month: "Jun", amount: 67000 },
  { month: "Jul", amount: 95000 },
  { month: "Aug", amount: 135000 },
  { month: "Sep", amount: 88000 },
  { month: "Oct", amount: 175000 },
  { month: "Nov", amount: 250000 },
  { month: "Dec", amount: 310000 },
];

const SAFEHOUSE_PERFORMANCE = [
  { name: "Tahanan ng Pag-asa", admitted: 12, active: 8, graduated: 4 },
  { name: "Bagong Simula Center", admitted: 7, active: 5, graduated: 2 },
  { name: "Kalayaan Shelter", admitted: 9, active: 6, graduated: 3 },
];

const REINTEGRATION_OUTCOMES = [
  { label: "Family Reunification", value: 6 },
  { label: "Independent Living", value: 3 },
  { label: "Referred Elsewhere", value: 2 },
  { label: "Case Closed", value: 1 },
];

const SERVICES_BY_QUARTER = [
  { quarter: "Q1", caring: 85, healing: 42, teaching: 28 },
  { quarter: "Q2", caring: 92, healing: 51, teaching: 35 },
  { quarter: "Q3", caring: 78, healing: 38, teaching: 31 },
  { quarter: "Q4", caring: 96, healing: 55, teaching: 42 },
];

const CASE_CATEGORIES = [
  { category: "Trafficked", count: 8 },
  { category: "Physical Abuse", count: 6 },
  { category: "Neglected", count: 4 },
  { category: "Sexual Abuse", count: 4 },
  { category: "Psychological Abuse", count: 3 },
  { category: "Economic Abuse", count: 2 },
  { category: "Abandoned", count: 1 },
];

const OUTCOME_INDICATORS = [
  { label: "Psychosocial Wellbeing", pct: 82 },
  { label: "Educational Continuity", pct: 78 },
  { label: "Livelihood Readiness", pct: 71 },
  { label: "Family Reintegration Readiness", pct: 65 },
  { label: "Legal Matters Resolved", pct: 58 },
];

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
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
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
    queryFn: async () => {
      // TODO: Call your C# auth endpoint
      return { full_name: "Admin User", email: "admin@keeper.org" };
    },
  });

  const totalDonations = DONATION_TREND.reduce((s, d) => s + d.amount, 0);
  const totalResidents = SAFEHOUSE_PERFORMANCE.reduce(
    (s, sh) => s + sh.admitted,
    0
  );
  const totalReintegrated = REINTEGRATION_OUTCOMES.reduce(
    (s, o) => s + o.value,
    0
  );
  const totalServices = SERVICES_BY_QUARTER.reduce(
    (s, q) => s + q.caring + q.healing + q.teaching,
    0
  );

  const aarCaring = SERVICES_BY_QUARTER.reduce((s, q) => s + q.caring, 0);
  const aarHealing = SERVICES_BY_QUARTER.reduce((s, q) => s + q.healing, 0);
  const aarTeaching = SERVICES_BY_QUARTER.reduce((s, q) => s + q.teaching, 0);

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
              <AreaChart data={DONATION_TREND}>
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
                <BarChart data={SAFEHOUSE_PERFORMANCE} barCategoryGap="30%">
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
                    data={REINTEGRATION_OUTCOMES}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    labelLine={false}
                    label={PieLabel as any}
                  >
                    {REINTEGRATION_OUTCOMES.map((_, i) => (
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
                <BarChart data={SERVICES_BY_QUARTER} barCategoryGap="28%">
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
                  data={CASE_CATEGORIES}
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
              {OUTCOME_INDICATORS.map((o) => (
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

        {/* ── Data note ────────────────────────────────────────────────────── */}
        <div className="bg-muted/50 rounded-2xl border border-border p-5 flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm font-medium text-foreground mb-0.5">
              Mock Data — Backend Not Yet Connected
            </p>
            <p className="font-body text-xs text-muted-foreground leading-relaxed">
              All figures shown are representative sample data. Wire each
              chart's data source to the corresponding C# API endpoint. The year
              selector state (
              <code className="font-mono bg-muted px-1 rounded">
                reportYear
              </code>
              ) should be passed as a query parameter to filter results by
              reporting period.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
