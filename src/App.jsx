import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ReferenceLine } from "recharts";
import { Download, MoreVertical, Link as LinkIcon, CheckCircle2, Loader2 } from "lucide-react";

import LoginScreen from "./components/LoginScreen";
import AddHabitDialog from "./components/AddHabitDialog";
import HabitLogRow from "./components/HabitLogRow";
import HistoryDay from "./components/HistoryDay";

// =====================
// Constants
// =====================
const STORAGE_KEY = "pookie_habit_tracker_v1";

// =====================
// Date + number utils
// =====================

function isoFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayISO() {
  return isoFromDate(new Date());
}

function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n;
}

function countDecimalsFromValue(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v);
  const parts = s.split(".");
  return parts[1] ? parts[1].length : 0;
}

function habitDecimals(habit) {
  if (habit?.type !== "number") return 0;
  const d = Number(habit?.decimals);
  if (Number.isFinite(d) && d >= 0 && d <= 6) return d;
  return 0;
}

function formatNumberWithDecimals(n, decimals) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";

  if (decimals > 0) {
    return v.toFixed(decimals);
  }

  if (Number.isInteger(v)) {
    return String(v);
  }

  return v
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function normalizeGoals(goals) {
  const g = goals && typeof goals === "object" ? goals : {};
  const n = (v) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };

  return {
    daily: n(g.daily),
    weekly: n(g.weekly),
    monthly: n(g.monthly),
    yearly: n(g.yearly),
  };
}

function normalizeYearlyGoalFromGoals(goals) {
  const g = goals && typeof goals === "object" ? goals : {};
  const n = (v) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };

  // Prefer explicitly set yearly goal
  const yearly = n(g.yearly);
  if (yearly > 0) return yearly;

  // Back-compat: derive a yearly goal if only other periods exist
  const daily = n(g.daily);
  if (daily > 0) return daily * 365;

  const weekly = n(g.weekly);
  if (weekly > 0) return weekly * 52;

  const monthly = n(g.monthly);
  if (monthly > 0) return monthly * 12;

  return 0;
}

function getYearlyGoal(habit) {
  return normalizeYearlyGoalFromGoals(habit?.goals);
}

// =====================
// Local storage state
// =====================
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// =====================
// Generic helpers
// =====================
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Math.random().toString(16).slice(2)}${Date.now()}`;
}

function makeShareToken() {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // ignore
  }
  return `${Math.random().toString(16).slice(2)}${Date.now()}`;
}

function formatPrettyDate(iso) {
  try {
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
  } catch {
    return iso;
  }
}

function formatAxisDate(iso) {
  try {
    const [y, m, d] = String(iso || "").split("-");
    if (!y || !m || !d) return String(iso || "");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  } catch {
    return String(iso || "");
  }
}

function withinYear(iso, year) {
  return iso >= `${year}-01-01` && iso <= `${year}-12-31`;
}

function monthFromISO(iso) {
  return iso?.slice(5, 7) || "";
}

function isoRangeForYear(year) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

function buildYearOptions() {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1];
}

function getPublicTokenFromPath() {
  try {
    const p = window.location.pathname || "";
    const m = p.match(/^\/view\/([^/]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

// =====================
// Chart helpers
// =====================
function chartGradientId(prefix, habitId) {
  return `${prefix}_actual_${String(habitId || "none")}`;
}

function isCurrentYear(year) {
  return Number(year) === new Date().getFullYear();
}

// =====================
// State shape + defaults
// =====================
function defaultState() {
  const year = new Date().getFullYear();
  return {
    habits: [
      {
        id: uuid(),
        name: "Pushups",
        unit: "reps",
        decimals: 0,
        type: "number",
        goals: { daily: 50 },
      },
      {
        id: uuid(),
        name: "Read",
        type: "checkbox",
        goals: { daily: 1 },
      },
    ],
    entries: {},
    ui: {
      selectedYear: year,
    },
  };
}

function ensureStateShape(s) {
  if (!s || typeof s !== "object") return defaultState();
  if (!Array.isArray(s.habits)) s.habits = [];
  if (!s.entries || typeof s.entries !== "object") s.entries = {};
  if (!s.ui || typeof s.ui !== "object") s.ui = { selectedYear: new Date().getFullYear() };
  if (!s.ui.selectedYear) s.ui.selectedYear = new Date().getFullYear();
  const cy = new Date().getFullYear();
  // Allow browsing past years; only guard against obviously invalid values.
  if (!Number.isFinite(Number(s.ui.selectedYear))) s.ui.selectedYear = cy;
  s.habits = (s.habits || []).map((h) => {
    if (!h || typeof h !== "object") return h;

    // migrate legacy fields -> goals
    const legacyGoal = Number(h.goalDaily ?? 0);
    const legacyPeriod = ["daily", "weekly", "monthly", "yearly"].includes(h.goalPeriod) ? h.goalPeriod : "daily";

    let goals = normalizeGoals(h.goals);
    const hasAny = goals.daily || goals.weekly || goals.monthly || goals.yearly;

    if (!hasAny && legacyGoal > 0) {
      goals = { ...goals, [legacyPeriod]: legacyGoal };
    }

    if (h.type !== "number") return { ...h, goals };

    if (h.decimals === undefined) return { ...h, decimals: 0, goals };

    return { ...h, goals };
  });
  return s;
}

// =====================
// Entries helpers
// =====================
function getEntry(entries, dateISO, habitId) {
  return entries?.[dateISO]?.[habitId] ?? null;
}

function entryToNumber(habit, entry, fallback = 0) {
  if (!entry) return fallback;
  return habit.type === "checkbox" ? (entry.value ? 1 : 0) : clampNumber(entry.value);
}

function entryToDisplay(habit, entry) {
  if (habit.type === "checkbox") return entry?.value ? "Done" : "Not done";
  const dec = habitDecimals(habit);
  const unit = habit.unit || "";
  return `${formatNumberWithDecimals(entry?.value ?? 0, dec)} ${unit}`.trim();
}

function setEntry(entries, dateISO, habitId, payload) {
  const next = { ...entries };
  const day = { ...(next[dateISO] || {}) };
  day[habitId] = payload;
  next[dateISO] = day;
  return next;
}

function deleteEntry(entries, dateISO, habitId) {
  const next = { ...entries };
  if (!next[dateISO]) return next;
  const day = { ...next[dateISO] };
  delete day[habitId];
  if (Object.keys(day).length === 0) {
    delete next[dateISO];
  } else {
    next[dateISO] = day;
  }
  return next;
}

function listDatesInYear(entries, year) {
  return Object.keys(entries)
    .filter((d) => withinYear(d, year))
    .sort((a, b) => (a < b ? 1 : -1));
}

// =====================
// Stats + chart series
// =====================
function habitStats(habit, entries, year) {
  const dates = Object.keys(entries)
    .filter((d) => withinYear(d, year))
    .sort();

  let total = 0;
  let daysLogged = 0;
  let best = null;
  let last7 = [];

  for (const d of dates) {
    const e = getEntry(entries, d, habit.id);
    if (!e) continue;
    daysLogged += 1;
    const v = entryToNumber(habit, e, 0);
    total += v;
    if (habit.type === "number") {
      best = best === null ? v : Math.max(best, v);
    }
  }

  const base = new Date();
  const points = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const iso = isoFromDate(d);
    if (!withinYear(iso, year)) continue;
    const e = getEntry(entries, iso, habit.id);
    const v = entryToNumber(habit, e, 0);
    points.push(v);
  }
  last7 = points;

  const avgPerLoggedDay = daysLogged > 0 ? total / daysLogged : 0;
  const avgLast7 = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;

  return {
    total,
    daysLogged,
    best,
    avgPerLoggedDay,
    avgLast7,
  };
}

function buildHabitSeries(habit, entries, year) {
  // Start at Jan 1 of the selected year (not first log date)
  const start = new Date(year, 0, 1);

  // End at today if it's the current year, otherwise end at Dec 31
  const now = new Date();
  const end =
    year === now.getFullYear()
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(year, 11, 31);

  // Goal setup (single yearly goal)
  const goalYearly = clampNumber(getYearlyGoal(habit));

  const daysInYear = (y) => {
    const s = new Date(y, 0, 1);
    const e = new Date(y + 1, 0, 1);
    return Math.round((e - s) / (1000 * 60 * 60 * 24));
  };

  const goalPerDayForDate = (dateObj) => {
    if (!(goalYearly > 0)) return 0;
    return goalYearly / daysInYear(dateObj.getFullYear());
  };

  let actualCum = 0;
  let goalCum = 0;

  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = isoFromDate(d);

    const e = getEntry(entries, iso, habit.id);

    const daily = entryToNumber(habit, e, 0);

    actualCum += daily;
    if (goalYearly > 0) goalCum += goalPerDayForDate(d);

    out.push({
      date: iso,
      daily,
      actualCum,
      goalCum: goalYearly > 0 ? goalCum : null,
    });
  }

  return out;
}

// =====================
// Supabase mappers + loading
// =====================
function habitFromRow(r) {
  const legacyGoal = Number(r.goal_daily ?? 0);
  const legacyPeriod = ["daily", "weekly", "monthly", "yearly"].includes(r.goal_period) ? r.goal_period : "daily";

  // Prefer `goals` jsonb; fall back to legacy columns if none set.
  let goals = normalizeGoals(r.goals);
  const hasAny = goals.daily || goals.weekly || goals.monthly || goals.yearly;

  if (!hasAny && legacyGoal > 0) {
    goals = { ...goals, [legacyPeriod]: clampNumber(legacyGoal) };
  }

  return {
    id: r.id,
    name: r.name,
    type: r.type,
    unit: r.unit ?? undefined,
    decimals: r.decimals ?? 0,
    goals,
    sortIndex: r.sort_index ?? 0,
  };
}

function habitToInsertRow(h, userId, sortIndex) {
  return {
    id: h.id,
    user_id: userId,
    name: h.name,
    type: h.type,
    unit: h.type === "number" ? (h.unit ?? null) : null,
    decimals: h.type === "number" ? Number(h.decimals ?? 0) : 0,
    goals: normalizeGoals(h.goals),
    goal_daily: 0,
    goal_period: "daily",
    sort_index: Number.isFinite(Number(sortIndex)) ? Number(sortIndex) : 0,
  };
}

function entriesFromRows(rows) {
  const out = {};
  for (const r of rows || []) {
    const d = String(r.date_iso);
    if (!out[d]) out[d] = {};
    // `r.value` is already the stored payload object, like: { value: ... }
    out[d][r.habit_id] = r.value;
  }
  return out;
}

async function loadCloudForYear({ userId, year }) {
  const range = isoRangeForYear(year);

  const habitsRes = await supabase
    .from("habits")
    .select("id,name,type,unit,decimals,goals,sort_index,created_at")
    .eq("user_id", userId)
    .order("sort_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (habitsRes.error) {
    throw new Error(habitsRes.error.message || "Failed to load habits");
  }

  const entriesRes = await supabase
    .from("entries")
    .select("user_id,date_iso,habit_id,value")
    .eq("user_id", userId)
    .gte("date_iso", range.start)
    .lte("date_iso", range.end);

  if (entriesRes.error) {
    throw new Error(entriesRes.error.message || "Failed to load entries");
  }

  return {
    habitsNext: (habitsRes.data || []).map(habitFromRow),
    entriesNext: entriesFromRows(entriesRes.data || []),
  };
}

// =====================
// Hooks
// =====================
// Small hook to detect mobile screens
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(Boolean(mq.matches));
    onChange();

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return isMobile;
}

// =====================
// UI helpers + components
// =====================
function formatStatTotal(habit, total) {
  if (habit.type === "checkbox") return `${Math.round(total)} days`;
  const dec = habitDecimals(habit);
  return `${formatNumberWithDecimals(total, dec)} ${habit.unit || ""}`.trim();
}

function formatStatAvg(habit, avg) {
  if (habit.type === "checkbox") return `${avg.toFixed(2)} / day`;
  const dec = habitDecimals(habit);
  return `${formatNumberWithDecimals(avg, dec)} ${habit.unit || ""}`.trim();
}

function formatStatBest(habit, best) {
  if (habit.type === "checkbox") return "";
  if (best === null || best === undefined) return "";
  const dec = habitDecimals(habit);
  return `${formatNumberWithDecimals(best, dec)} ${habit.unit || ""}`.trim();
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-background/60 shadow-sm p-3">
      <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value || ""}</div>
    </div>
  );
}

function makeTrendTooltipFormatter(habit, habitDecimalsFn, formatNumberFn) {
  return (v, name) => {
    if (v === null || v === undefined) return ["", ""]; // keep tooltip clean

    const labelText = name === "goalCum" ? "Goal" : "Actual";

    if (habit?.type === "checkbox") {
      return [String(Math.round(Number(v))), labelText];
    }

    const dec = habitDecimalsFn(habit);
    return [formatNumberFn(v, dec), labelText];
  };
}

function makeTrendYAxisTickFormatter(habit, habitDecimalsFn, formatNumberFn) {
  return (v) => {
    if (habit?.type === "checkbox") return String(v);
    return formatNumberFn(v, habitDecimalsFn(habit));
  };
}
// Custom glass styled tooltip for Recharts Trend chart
function GlassTooltip({ active, label, payload, formatter, labelFormatter }) {
  if (!active || !payload || payload.length === 0) return null;

  const title = labelFormatter ? labelFormatter(label) : String(label ?? "");

  return (
    <div className="pointer-events-none max-w-[220px] rounded-2xl bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm px-3 py-2">
      <div className="text-xs font-medium text-foreground/90">{title}</div>
      <div className="mt-1 space-y-1">
        {[...payload]
          .filter((p) => p && p.value !== null && p.value !== undefined)
          .reduce((acc, p) => {
            const k = String(p.dataKey || p.name || "");
            if (!k) return acc;
            if (acc.seen.has(k)) return acc;
            acc.seen.add(k);
            acc.items.push(p);
            return acc;
          }, { items: [], seen: new Set() })
          .items
          .sort((a, b) => {
            const order = (k) => (k === "actualCum" ? 0 : k === "goalCum" ? 1 : 2);
            return order(String(a.dataKey)) - order(String(b.dataKey));
          })
          .map((p) => {
            const name = p.dataKey || p.name;
            const res = formatter ? formatter(p.value, name, p, payload) : [String(p.value), String(name)];
            const valueText = Array.isArray(res) ? res[0] : String(res);
            const labelText = Array.isArray(res) ? res[1] : String(name);

            return (
              <div key={String(name)} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color || "currentColor" }} />
                  <span>{labelText}</span>
                </div>
                <span className="tabular-nums text-foreground">{valueText}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function HabitStatsGrid({ habit, stats }) {
  if (!habit) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
      <MiniStat label="Total" value={stats ? formatStatTotal(habit, stats.total) : ""} />
      <MiniStat label="Avg logged" value={stats ? formatStatAvg(habit, stats.avgPerLoggedDay) : ""} />
      <MiniStat label="Avg 7d" value={stats ? formatStatAvg(habit, stats.avgLast7) : ""} />
      <MiniStat label="Best day" value={stats ? formatStatBest(habit, stats.best) : ""} />
    </div>
  );
}

function TrendChart({ series, habit, year, gradientPrefix }) {
  if (!habit) return null;

  return (
    <div className="h-[260px] min-h-[260px] w-full rounded-2xl bg-background/60 p-2 shadow-sm">
      {!(series || []).length ? (
        <div className="h-full rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
          No data yet for this habit in {year}.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={chartGradientId(gradientPrefix, habit?.id)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fontFamily: "inherit" }}
              tickFormatter={formatAxisDate}
              interval="preserveStartEnd"
              minTickGap={60}
              tickMargin={8}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fontFamily: "inherit" }}
              axisLine={false}
              tickLine={false}
              padding={{ top: 12, bottom: 12 }}
              tickFormatter={makeTrendYAxisTickFormatter(habit, habitDecimals, formatNumberWithDecimals)}
            />
            <Tooltip
              content={<GlassTooltip />}
              labelFormatter={(l) => formatPrettyDate(l)}
              formatter={makeTrendTooltipFormatter(habit, habitDecimals, formatNumberWithDecimals)}
            />
            {isCurrentYear(year) ? (
              <ReferenceLine x={todayISO()} stroke="currentColor" strokeOpacity={0.18} strokeDasharray="2 6" />
            ) : null}
            <Area
              type="monotone"
              dataKey="actualCum"
              stroke="none"
              fill={`url(#${chartGradientId(gradientPrefix, habit?.id)})`}
              isAnimationActive
            />
            <Line type="monotone" dataKey="actualCum" dot={false} activeDot={{ r: 4 }} strokeWidth={2} isAnimationActive />
            {getYearlyGoal(habit) > 0 ? (
              <Line
                type="monotone"
                dataKey="goalCum"
                dot={false}
                strokeWidth={1.75}
                strokeDasharray="6 6"
                stroke="#ef4444"
                strokeOpacity={0.65}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function YearSummaryList({ items, selectedHabitId, onSelectHabit }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No habits yet.</div>;
  }

  return (
    <div className="space-y-2">
      {items.map(({ habit, stats }) => (
        <button
          key={habit.id}
          onClick={() => onSelectHabit?.(habit.id)}
          className={`w-full text-left rounded-2xl bg-background/60 shadow-sm p-3 hover:bg-accent/20 transition-colors active:scale-[0.99] transition-transform focus:outline-none focus:ring-2 focus:ring-muted/30 ${
            selectedHabitId === habit.id ? "ring-2 ring-muted/30 bg-accent/15" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{habit.name}</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">{formatStatTotal(habit, stats.total)}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{stats.daysLogged}</span> days logged
          </div>
        </button>
      ))}
    </div>
  );
}

function YearPicker({ value, onChange, options, triggerClassName, labelClassName }) {
  return (
    <div className="flex items-center gap-2">
      <Label className={labelClassName || "text-xs text-muted-foreground"}>Year</Label>
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger
          className={
            triggerClassName ||
            "w-[120px] rounded-2xl bg-background/60 shadow-sm border-0 focus:ring-2 focus:ring-muted/30"
          }
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(options || []).map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ShareStatus({ shareError, shareOk }) {
  return (
    <>
      {shareError ? <div className="text-xs text-destructive">{shareError}</div> : null}
      {shareOk ? (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Copied
        </div>
      ) : null}
    </>
  );
}

function PublicView({ token }) {
  const [year] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publicState, setPublicState] = useState({ habits: [], entries: {} });
  const [focusedHabitId, setFocusedHabitId] = useState("");

  const habits = useMemo(() => publicState.habits || [], [publicState.habits]);
  const entries = useMemo(() => publicState.entries || {}, [publicState.entries]);

  const yearSummary = useMemo(() => {
    const out = (habits || []).map((h) => ({ habit: h, stats: habitStats(h, entries, year) }));
    out.sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0));
    return out;
  }, [habits, entries, year]);

  const effectiveFocusedHabitId = focusedHabitId || habits[0]?.id || "";

  const focusedHabit = useMemo(
    () => (habits || []).find((h) => h.id === effectiveFocusedHabitId) || habits[0],
    [habits, effectiveFocusedHabitId]
  );

  const focusedSeries = useMemo(() => {
    if (!focusedHabit) return [];
    return buildHabitSeries(focusedHabit, entries, year);
  }, [focusedHabit, entries, year]);

  const focusedStats = useMemo(() => {
    if (!focusedHabit) return null;
    return habitStats(focusedHabit, entries, year);
  }, [focusedHabit, entries, year]);

  const recentDates = useMemo(() => {
    const all = listDatesInYear(entries, year);
    return all.slice(0, 30);
  }, [entries, year]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const res = await supabase.rpc("get_public_year_data", {
        share_token: token,
        year,
      });

      if (cancelled) return;

      if (res.error) {
        setError(res.error.message);
        setLoading(false);
        return;
      }

      const nextHabits = res.data?.habits ?? [];
      const nextEntries = res.data?.entries ?? {};

      setPublicState({ habits: nextHabits, entries: nextEntries });

      // only set a default focus if none exists yet
      setFocusedHabitId((prev) => prev || nextHabits[0]?.id || "");

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, year]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-muted/15 text-foreground text-[15px] font-sans antialiased">
      <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-4">
        <header className="rounded-2xl bg-background/60 backdrop-blur shadow-sm px-4 py-3">
          <h1 className="text-xl font-semibold tracking-tight">Habit Tracker</h1>
          <p className="text-sm text-muted-foreground">View only</p>
        </header>

        <div className="grid gap-4 lg:gap-6">
          <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
            <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold tracking-tight">Year Summary</CardTitle>
                <p className="text-sm text-muted-foreground">Totals for {year}.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <YearSummaryList
                  items={yearSummary}
                  selectedHabitId={effectiveFocusedHabitId}
                  onSelectHabit={(id) => setFocusedHabitId(id)}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold tracking-tight">Trend</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {focusedHabit ? `Showing: ${focusedHabit.name}` : "Pick a habit"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {focusedHabit ? (
                  <>
                    <HabitStatsGrid habit={focusedHabit} stats={focusedStats} />

                    <TrendChart
                      series={focusedSeries}
                      habit={focusedHabit}
                      year={year}
                      gradientPrefix="public"
                    />
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No habits found.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight">History</CardTitle>
              <p className="text-sm text-muted-foreground">Last 30 days logged.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDates.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent logs.</div>
              ) : (
                recentDates.map((d) => {
                  const day = entries[d] || {};
                  const items = (habits || [])
                    .map((h) => {
                      const e = day[h.id];
                      if (!e) return null;
                      return { id: h.id, label: h.name, value: entryToDisplay(h, e) };
                    })
                    .filter(Boolean);

                  return (
                    <div key={d} className="rounded-2xl bg-background/60 shadow-sm p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold tracking-tight">{formatPrettyDate(d)}</div>
                        <div className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</div>
                      </div>
                      {items.length ? (
                        <div className="mt-2 grid gap-1">
                          {items.map((it) => (
                            <div key={it.id} className="flex items-center justify-between gap-3 text-sm">
                              <div className="text-muted-foreground">{it.label}</div>
                              <div className="tabular-nums">{it.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-muted-foreground">No entries</div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =====================
// Main component
// =====================
export default function HabitTrackerMVP() {
  const [session, setSession] = useState(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState("");

  const [state, setState] = useState(() => ensureStateShape(loadState()) || defaultState());
  const [activeDate, setActiveDate] = useState(todayISO());
  const [historyMonth, setHistoryMonth] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const [focusedHabitId, setFocusedHabitId] = useState(() => state.habits[0]?.id || "");
  const [draggingHabitId, setDraggingHabitId] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareOk, setShareOk] = useState(false);
  const [shareError, setShareError] = useState("");

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const handleCreateShareLink = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || shareBusy) return;

    setShareBusy(true);
    setShareOk(false);
    setShareError("");

    try {
      const token = makeShareToken();

      const up = await supabase
        .from("public_profiles")
        .upsert(
          { user_id: userId, share_token: token, is_enabled: true, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        )
        .select("share_token")
        .single();

      if (up.error) throw new Error(up.error.message);

      const t = up.data?.share_token || token;
      const url = `${window.location.origin}/view/${encodeURIComponent(t)}`;

      const ok = await copyToClipboard(url);

      if (!ok) {
        setShareError("Could not copy the link. Please copy manually: " + url);
      } else {
        setShareOk(true);
        setTimeout(() => setShareOk(false), 2000);
      }
    } catch (e) {
      setShareError(e?.message || "Failed to create share link");
    } finally {
      setShareBusy(false);
    }
  }, [copyToClipboard, session?.user?.id, shareBusy]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null));

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, nextSession) => {
      setSession(nextSession || null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const yearOptions = useMemo(() => buildYearOptions(), []);

  const handleYearChange = useCallback((v) => {
    setState((s) => ({ ...s, ui: { ...s.ui, selectedYear: Number(v) } }));
  }, []);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habit_tracker_${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [state]);

  const handleSignOut = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  const handleMobileExport = useCallback(() => {
    exportJSON();
    setMobileMenuOpen(false);
  }, [exportJSON]);

  const handleMobileSignOut = useCallback(() => {
    setMobileMenuOpen(false);
    supabase.auth.signOut();
  }, []);

  const handleActiveDateChange = useCallback((e) => {
    setActiveDate(e.target.value);
  }, []);

  const selectedYear = state.ui.selectedYear;

  const updateHabit = useCallback(
    async (habitId, patch) => {
      const userId = session?.user?.id;
      if (!userId) return;

      let merged = null;

      setState((s) => {
        const current = (s.habits || []).find((h) => h.id === habitId);
        merged = { ...(current || {}), ...(patch || {}), id: habitId };
        const nextHabits = (s.habits || []).map((h) => (h.id === habitId ? { ...h, ...patch } : h));
        return { ...s, habits: nextHabits };
      });

      if (!merged) return;

      const row = {
        name: merged.name,
        unit: merged.type === "number" ? (merged.unit ?? null) : null,
        decimals: merged.type === "number" ? Number(merged.decimals ?? 0) : 0,
        goals: normalizeGoals(merged.goals),
        goal_daily: 0,
        goal_period: "daily",
      };

      const res = await supabase
        .from("habits")
        .update(row)
        .eq("user_id", userId)
        .eq("id", habitId);

      if (res.error) {
        setCloudError(res.error.message || "Failed to update habit");
      } else {
        setCloudError("");
      }
    },
    [session?.user?.id]
  );

  const addHabit = useCallback(
    async (newHabit) => {
      const userId = session?.user?.id;
      if (!userId) return;

      let sortIndex = 0;

      setState((s) => {
        sortIndex = (s.habits || []).length;
        return { ...s, habits: [...(s.habits || []), newHabit] };
      });

      const row = habitToInsertRow(newHabit, userId, sortIndex);

      const res = await supabase.from("habits").insert(row);

      if (res.error) {
        setCloudError(res.error.message || "Failed to add habit");
      } else {
        setCloudError("");
      }
    },
    [session?.user?.id]
  );

  const deleteHabit = useCallback(
    async (habitId) => {
      const userId = session?.user?.id;
      if (!userId) return;

      setState((s) => {
        const habitsNext = (s.habits || []).filter((h) => h.id !== habitId);
        let entriesNext = s.entries;
        for (const d of Object.keys(entriesNext || {})) {
          if (entriesNext[d]?.[habitId]) {
            entriesNext = deleteEntry(entriesNext, d, habitId);
          }
        }
        return { ...s, habits: habitsNext, entries: entriesNext };
      });

      const res = await supabase
        .from("habits")
        .delete()
        .eq("user_id", userId)
        .eq("id", habitId);

      if (res.error) {
        setCloudError(res.error.message || "Failed to delete habit");
      } else {
        setCloudError("");
      }
    },
    [session?.user?.id]
  );

  const logValue = useCallback(
    async (dateISO, habit, value) => {
      const userId = session?.user?.id;
      if (!userId) return;

      // optimistic local
      setState((s) => {
        const payload = { value };
        const entriesNext = setEntry(s.entries, dateISO, habit.id, payload);

        if (habit?.type === "number") {
          const detected = Math.min(6, Math.max(0, countDecimalsFromValue(value)));
          const nextHabits = (s.habits || []).map((h) => {
            if (h.id !== habit.id) return h;
            const current = Number.isFinite(Number(h.decimals)) ? Number(h.decimals) : 0;
            const nextDec = Math.max(current, detected);
            return nextDec === current ? h : { ...h, decimals: nextDec };
          });
          return { ...s, entries: entriesNext, habits: nextHabits };
        }

        return { ...s, entries: entriesNext };
      });

      const entryRow = {
        user_id: userId,
        date_iso: dateISO,
        habit_id: habit.id,
        value: { value },
        updated_at: new Date().toISOString(),
      };

      const res = await supabase
        .from("entries")
        .upsert(entryRow, { onConflict: "user_id,date_iso,habit_id" });

      if (res.error) {
        setCloudError(res.error.message || "Failed to save entry");
        return;
      }

      setCloudError("");

      // persist decimals upgrade if needed
      if (habit?.type === "number") {
        const detected = Math.min(6, Math.max(0, countDecimalsFromValue(value)));
        const current = Number.isFinite(Number(habit.decimals)) ? Number(habit.decimals) : 0;
        const nextDec = Math.max(current, detected);
        if (nextDec !== current) {
          const upd = await supabase
            .from("habits")
            .update({ decimals: nextDec })
            .eq("user_id", userId)
            .eq("id", habit.id);
          if (upd.error) {
            setCloudError(upd.error.message || "Failed to update decimals");
          } else {
            setCloudError("");
          }
        }
      }
    },
    [session?.user?.id]
  );

  const removeLog = useCallback(
    async (dateISO, habitId) => {
      const userId = session?.user?.id;
      if (!userId) return;

      setState((s) => ({ ...s, entries: deleteEntry(s.entries, dateISO, habitId) }));

      const res = await supabase
        .from("entries")
        .delete()
        .eq("user_id", userId)
        .eq("date_iso", dateISO)
        .eq("habit_id", habitId);

      if (res.error) {
        setCloudError(res.error.message || "Failed to remove entry");
      } else {
        setCloudError("");
      }
    },
    [session?.user?.id]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCloud() {
      if (!session?.user?.id) return;
      setCloudError("");
      setCloudReady(false);

      const userId = session.user.id;

      try {
        const { habitsNext, entriesNext } = await loadCloudForYear({ userId, year: selectedYear });

        if (!cancelled) {
          setState((s) => ensureStateShape({ ...s, habits: habitsNext, entries: entriesNext }));
          setCloudReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setCloudError(err?.message || "Failed to load cloud data");
          setCloudReady(true);
        }
      }
    }

    loadCloud();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, selectedYear]);

  const habits = useMemo(() => {
    return state.habits || [];
  }, [state.habits]);

  const persistHabitOrder = useCallback(
    async (list) => {
      const userId = session?.user?.id;
      if (!userId) return;

      const updates = (list || []).map((h, idx) => ({
        id: h.id,
        user_id: userId,
        sort_index: idx,
      }));

      const res = await supabase.from("habits").upsert(updates, { onConflict: "id" });
      if (res.error) {
        setCloudError(res.error.message || "Failed to save order");
      } else {
        setCloudError("");
      }
    },
    [session?.user?.id]
  );
  // Touch drag reorder handlers for mobile
  const [touchDragging, setTouchDragging] = useState(false);
  const pendingOrderRef = useRef(null);

  const getHabitIdFromEventTarget = useCallback((el) => {
    const node = el?.closest?.("[data-habit-id]");
    return node?.getAttribute?.("data-habit-id") || "";
  }, []);

  const onTouchDragStart = useCallback((habitId) => {
    setDraggingHabitId(habitId);
    setTouchDragging(true);
  }, []);

  const reorderHabitsLocal = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return null;

    let nextList = null;
    setState((s) => {
      const list = [...(s.habits || [])];
      const fromIndex = list.findIndex((h) => h.id === fromId);
      const toIndex = list.findIndex((h) => h.id === toId);
      if (fromIndex < 0 || toIndex < 0) return s;
      if (fromIndex === toIndex) return s;

      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      nextList = list;
      return { ...s, habits: list };
    });

    return nextList;
  }, []);

  const reorderHabits = useCallback(
    async (fromId, toId) => {
      const userId = session?.user?.id;
      if (!userId) return;

      const nextList = reorderHabitsLocal(fromId, toId);
      if (!nextList) return;

      await persistHabitOrder(nextList);
    },
    [persistHabitOrder, reorderHabitsLocal, session?.user?.id]
  );

  const onTouchDragMove = useCallback(
    async (clientX, clientY) => {
      if (!draggingHabitId) return;
      const el = document.elementFromPoint(clientX, clientY);
      const overId = getHabitIdFromEventTarget(el);
      if (!overId || overId === draggingHabitId) return;

      const nextList = reorderHabitsLocal(draggingHabitId, overId);
      if (nextList) pendingOrderRef.current = nextList;
    },
    [draggingHabitId, getHabitIdFromEventTarget, reorderHabitsLocal]
  );

  const onTouchDragEnd = useCallback(async () => {
    const nextList = pendingOrderRef.current;
    pendingOrderRef.current = null;

    setTouchDragging(false);
    setDraggingHabitId("");

    if (nextList) {
      await persistHabitOrder(nextList);
    }
  }, [persistHabitOrder]);
  // Desktop drag reorder
  const handleDragStart = useCallback((habitId, e) => {
    e.dataTransfer.setData("text/plain", habitId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingHabitId(habitId);
  }, []);

  const handleDragOver = useCallback((_habitId, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (toHabitId, e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain");
      reorderHabits(fromId, toHabitId);
      setDraggingHabitId("");
    },
    [reorderHabits]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingHabitId("");
  }, []);

  const handleTouchStart = useCallback(
    (habitId) => {
      onTouchDragStart(habitId);
    },
    [onTouchDragStart]
  );

  const handleTouchMove = useCallback((x, y) => {
    onTouchDragMove(x, y);
  }, [onTouchDragMove]);

  const handleTouchEnd = useCallback(() => {
    onTouchDragEnd();
  }, [onTouchDragEnd]);

  const handleLogForHabit = useCallback(
    (habit, value) => {
      logValue(activeDate, habit, value);
    },
    [activeDate, logValue]
  );

  const handleDeleteHabitById = useCallback(
    (habitId) => {
      deleteHabit(habitId);
    },
    [deleteHabit]
  );

  const handleEditHabitById = useCallback(
    (habitId, patch) => {
      updateHabit(habitId, patch);
    },
    [updateHabit]
  );

  const handleTouchStartForId = useCallback(
    (habitId) => {
      handleTouchStart(habitId);
    },
    [handleTouchStart]
  );

  const getHabitDnDProps = useCallback(
    (habitId) => {
      if (isMobile) {
        return {
          dragging: draggingHabitId === habitId,
          onDragStart: undefined,
          onDragOver: undefined,
          onDrop: undefined,
          onDragEnd: undefined,
          onTouchStartDrag: () => handleTouchStartForId(habitId),
          onTouchMoveDrag: handleTouchMove,
          onTouchEndDrag: handleTouchEnd,
          touchDragging,
        };
      }

      return {
        dragging: draggingHabitId === habitId,
        onDragStart: (e) => handleDragStart(habitId, e),
        onDragOver: (e) => handleDragOver(habitId, e),
        onDrop: (e) => handleDrop(habitId, e),
        onDragEnd: handleDragEnd,
        onTouchStartDrag: undefined,
        onTouchMoveDrag: undefined,
        onTouchEndDrag: undefined,
        touchDragging,
      };
    },
    [
      draggingHabitId,
      handleDragEnd,
      handleDragOver,
      handleDragStart,
      handleDrop,
      handleTouchEnd,
      handleTouchMove,
      handleTouchStartForId,
      isMobile,
      touchDragging,
    ]
  );

  const getHabitRowHandlers = useCallback(
    (habit) => {
      return {
        onLog: (value) => handleLogForHabit(habit, value),
        onDelete: () => handleDeleteHabitById(habit.id),
        onEditHabit: (patch) => handleEditHabitById(habit.id, patch),
      };
    },
    [handleDeleteHabitById, handleEditHabitById, handleLogForHabit]
  );

  const datesInYear = useMemo(() => listDatesInYear(state.entries, selectedYear), [state.entries, selectedYear]);

  const filteredHistory = useMemo(() => {
    return historyMonth === "all"
      ? datesInYear
      : datesInYear.filter((d) => monthFromISO(d) === historyMonth);
  }, [datesInYear, historyMonth]);

  const yearSummary = useMemo(() => {
    const activeHabits = state.habits;
    const out = activeHabits.map((h) => {
      const st = habitStats(h, state.entries, selectedYear);
      return { habit: h, stats: st };
    });
    out.sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0));
    return out;
  }, [state.habits, state.entries, selectedYear]);

  // Removed effect to set focusedHabitId to avoid setState in effect.

  const effectiveFocusedHabitId = focusedHabitId || state.habits[0]?.id || "";

  const focusedHabit = useMemo(
    () => state.habits.find((h) => h.id === effectiveFocusedHabitId) || state.habits[0],
    [state.habits, effectiveFocusedHabitId]
  );

  const focusedSeries = useMemo(() => {
    if (!focusedHabit) return [];
    return buildHabitSeries(focusedHabit, state.entries, selectedYear);
  }, [focusedHabit, state.entries, selectedYear]);

  const focusedStats = useMemo(() => {
    if (!focusedHabit) return null;
    return habitStats(focusedHabit, state.entries, selectedYear);
  }, [focusedHabit, state.entries, selectedYear]);

  const publicToken = getPublicTokenFromPath();
  if (publicToken) return <PublicView token={publicToken} />;

  if (!session) return <LoginScreen />;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-muted/15 text-foreground text-[15px] font-sans antialiased">
      <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-4">
        <header className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50 rounded-2xl px-3 py-3 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Habit Tracker</h1>
            <div
              className={
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs shadow-sm bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50 " +
                (cloudError
                  ? "bg-destructive/10 text-destructive"
                  : cloudReady
                    ? "bg-muted/30 text-foreground"
                    : "bg-muted/30 text-muted-foreground")
              }
            >
              {cloudError ? `Cloud error: ${cloudError}` : cloudReady ? "Synced" : "Loading cloud..."}
            </div>
          </div>

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-3">
            <YearPicker value={selectedYear} onChange={handleYearChange} options={yearOptions} />

            <div className="flex items-center gap-2">
              <Button onClick={handleCreateShareLink} variant="secondary" className="gap-2" disabled={shareBusy}>
                {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />} Share
              </Button>
              <Button onClick={exportJSON} variant="secondary" className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>

            <ShareStatus shareError={shareError} shareOk={shareOk} />
          </div>

          {/* Mobile controls */}
          <div className="md:hidden absolute top-0 right-0">
            <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 px-0" aria-label="More">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Menu</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <YearPicker
                    value={selectedYear}
                    onChange={handleYearChange}
                    options={yearOptions}
                    triggerClassName="rounded-2xl bg-background/60 shadow-sm border-0 focus:ring-2 focus:ring-muted/30"
                    labelClassName="text-sm text-muted-foreground"
                  />

                  <div className="grid gap-2">
                    <Button onClick={handleCreateShareLink} variant="secondary" className="gap-2" disabled={shareBusy}>
                      {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />} Share link
                    </Button>

                    <ShareStatus shareError={shareError} shareOk={shareOk} />

                    <Button onClick={handleMobileExport} variant="secondary" className="gap-2">
                      <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button variant="ghost" onClick={handleMobileSignOut}>
                      Sign out
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Tabs defaultValue="log" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted/40 p-1.5 shadow-sm">
            <TabsTrigger
              value="log"
              className="rounded-xl text-sm transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-muted/40"
            >
              Daily Log
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="rounded-xl text-sm transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-muted/40"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl text-sm transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-muted/40"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-4">
            <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="whitespace-nowrap text-base font-semibold tracking-tight">Daily Log</CardTitle>
                </div>
                <div className="flex items-center justify-between gap-3 w-full md:flex-row md:items-center md:justify-end md:gap-6">
                  <div className="flex items-center gap-2 flex-1 md:order-2 md:flex-none">
                    <Label className="hidden md:block text-xs text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={activeDate}
                      onChange={handleActiveDateChange}
                      className="w-full md:w-[160px] rounded-2xl bg-background/60 shadow-sm border-0 text-left focus-visible:ring-2 focus-visible:ring-muted/30"
                    />
                  </div>
                  <div className="shrink-0 md:order-1 md:w-auto">
                    <AddHabitDialog onAdd={addHabit} uuid={uuid} clampNumber={clampNumber} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  {habits.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No habits yet. Add one.</div>
                  ) : (
                    habits.map((h) => (
                      <HabitLogRow
                        key={`${h.id}-${activeDate}`}
                        habit={h}
                        entry={getEntry(state.entries, activeDate, h.id)}
                        isMobile={isMobile}
                        {...getHabitRowHandlers(h)}
                        {...getHabitDnDProps(h.id)}
                        clampNumber={clampNumber}
                        habitDecimals={habitDecimals}
                        formatNumberWithDecimals={formatNumberWithDecimals}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
              <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold tracking-tight">Year Summary</CardTitle>
                  <p className="text-sm text-muted-foreground">Totals for {selectedYear}.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {yearSummary.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Add habits to see stats.</div>
                  ) : (
                    <YearSummaryList
                      items={yearSummary}
                      selectedHabitId={effectiveFocusedHabitId}
                      onSelectHabit={(id) => setFocusedHabitId(id)}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold tracking-tight">Trend</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {focusedHabit ? `Showing: ${focusedHabit.name}` : "Pick a habit"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {focusedHabit ? (
                    <>
                      <HabitStatsGrid habit={focusedHabit} stats={focusedStats} />

                      <TrendChart
                        series={focusedSeries}
                        habit={focusedHabit}
                        year={selectedYear}
                        gradientPrefix="private"
                      />
                      <div className="h-2" />
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Add a habit first.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">History</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={historyMonth} onValueChange={setHistoryMonth}>
                    <SelectTrigger className="w-[140px] rounded-2xl bg-background/60 shadow-sm border-0 focus:ring-2 focus:ring-muted/30">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="01">Jan</SelectItem>
                      <SelectItem value="02">Feb</SelectItem>
                      <SelectItem value="03">Mar</SelectItem>
                      <SelectItem value="04">Apr</SelectItem>
                      <SelectItem value="05">May</SelectItem>
                      <SelectItem value="06">Jun</SelectItem>
                      <SelectItem value="07">Jul</SelectItem>
                      <SelectItem value="08">Aug</SelectItem>
                      <SelectItem value="09">Sep</SelectItem>
                      <SelectItem value="10">Oct</SelectItem>
                      <SelectItem value="11">Nov</SelectItem>
                      <SelectItem value="12">Dec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {filteredHistory.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No matching days found.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredHistory.map((d) => (
                      <HistoryDay
                        key={d}
                        dateISO={d}
                        dayEntries={state.entries[d]}
                        habits={state.habits}
                        onDeleteOne={(habitId) => removeLog(d, habitId)}
                        formatPrettyDate={formatPrettyDate}
                        entryToDisplay={entryToDisplay}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

