import { useMemo } from "react";

// --- 1. ID GENERATION & UTILITIES ---

export function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Math.random().toString(16).slice(2)}${Date.now()}`;
}

export function isoFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function todayISO() {
  return isoFromDate(new Date());
}

export function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n;
}

export function countDecimalsFromValue(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v);
  const parts = s.split(".");
  return parts[1] ? parts[1].length : 0;
}

export function habitDecimals(habit) {
  if (habit?.type !== "number") return 0;
  const d = Number(habit?.decimals);
  if (Number.isFinite(d) && d >= 0 && d <= 6) return d;
  return 0;
}

export function formatNumberWithDecimals(n, decimals) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  if (decimals > 0) return v.toFixed(decimals);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

// --- 2. GOAL LOGIC ---

export function normalizeGoals(goals) {
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

export function normalizeYearlyGoalFromGoals(goals) {
  const g = goals && typeof goals === "object" ? goals : {};
  const n = (v) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  const yearly = n(g.yearly);
  if (yearly > 0) return yearly;
  const daily = n(g.daily);
  if (daily > 0) return daily * 365;
  const weekly = n(g.weekly);
  if (weekly > 0) return weekly * 52;
  const monthly = n(g.monthly);
  if (monthly > 0) return monthly * 12;
  return 0;
}

export function getYearlyGoal(habit) {
  return normalizeYearlyGoalFromGoals(habit?.goals);
}

// --- 3. DATE & PERIOD HELPERS ---

export function withinYear(iso, year) {
  return iso >= `${year}-01-01` && iso <= `${year}-12-31`;
}

export function monthFromISO(iso) {
  return iso?.slice(5, 7) || "";
}

export function daysBetweenInclusive(startDate, endDate) {
  return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

export function periodBounds({ mode, year, month }) {
  const y = Number(year);
  const now = new Date();
  if (mode === "month") {
    const mIndex = Math.max(0, Math.min(11, Number(month) - 1));
    const start = new Date(y, mIndex, 1);
    const endFull = new Date(y, mIndex + 1, 0);
    const isCurrent = y === now.getFullYear() && mIndex === now.getMonth();
    const end = isCurrent ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : endFull;
    return { start, end, endFull, isCurrent };
  }
  const start = new Date(y, 0, 1);
  const endFull = new Date(y, 11, 31);
  const isCurrent = y === now.getFullYear();
  const end = isCurrent ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : endFull;
  return { start, end, endFull, isCurrent };
}

export function goalForPeriod(habit, { mode, year, month }) {
  const goals = normalizeGoals(habit?.goals);
  if (mode === "month" && goals.monthly > 0) return goals.monthly;
  if (mode === "year" && goals.yearly > 0) return goals.yearly;
  const yearly = clampNumber(getYearlyGoal(habit));
  if (yearly > 0) return mode === "month" ? yearly / 12 : yearly;
  const bounds = periodBounds({ mode, year, month });
  const totalDays = daysBetweenInclusive(bounds.start, bounds.endFull);
  if (goals.daily > 0) return goals.daily * totalDays;
  if (goals.weekly > 0) return goals.weekly * (totalDays / 7);
  return 0;
}

// --- 4. ENTRY HELPERS ---

export function entryCountsAsDone(habit, entry) {
  if (!entry) return false;
  if (habit?.type === "checkbox") return Boolean(entry.value);
  return clampNumber(entry.value) > 0;
}

export function entryToNumber(habit, entry, fallback = 0) {
  if (!entry) return fallback;
  return habit.type === "checkbox" ? (entry.value ? 1 : 0) : clampNumber(entry.value);
}

export function entryToDisplay(habit, entry) {
  if (habit.type === "checkbox") return entry?.value ? "Done" : "Not done";
  const dec = habitDecimals(habit);
  const unit = habit.unit || "";
  return `${formatNumberWithDecimals(entry?.value ?? 0, dec)} ${unit}`.trim();
}

// --- 5. STATS CALCULATION ENGINE ---

export function habitStats(habit, entries, year) {
  const mode = "year";
  const bounds = periodBounds({ mode, year });
  const startISO = isoFromDate(bounds.start);
  const endISO = isoFromDate(bounds.end);
  const dates = Object.keys(entries).filter((d) => d >= startISO && d <= endISO).sort();

  let total = 0, daysLogged = 0, best = null;
  const doneSet = new Set();

  for (const d of dates) {
    const e = entries?.[d]?.[habit.id];
    if (!e) continue;
    daysLogged += 1;
    const v = entryToNumber(habit, e, 0);
    total += v;
    if (habit.type === "number") best = best === null ? v : Math.max(best, v);
    if (entryCountsAsDone(habit, e)) doneSet.add(d);
  }

  const daysElapsed = daysBetweenInclusive(bounds.start, bounds.end);
  const daysTotal = daysBetweenInclusive(bounds.start, bounds.endFull);

  let currentStreak = 0;
  for (let d = new Date(bounds.end); d >= bounds.start; d.setDate(d.getDate() - 1)) {
    if (doneSet.has(isoFromDate(d))) currentStreak += 1;
    else break;
  }

  let bestStreak = 0, run = 0;
  for (let d = new Date(bounds.start); d <= bounds.end; d.setDate(d.getDate() + 1)) {
    if (doneSet.has(isoFromDate(d))) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  const goalTotal = goalForPeriod(habit, { mode, year });
  const expectedToDate = goalTotal > 0 ? (goalTotal * (daysElapsed / Math.max(1, daysTotal))) : 0;
  return {
    total, daysLogged, best,
    avgPerLoggedDay: daysLogged > 0 ? total / daysLogged : 0,
    avgPerDay: daysElapsed > 0 ? total / daysElapsed : 0,
    daysElapsed, daysTotal,
    coveragePct: daysElapsed > 0 ? daysLogged / daysElapsed : 0,
    currentStreak, bestStreak,
    goalTotal, expectedToDate,
    onTrackPct: goalTotal > 0 && expectedToDate > 0 ? total / expectedToDate : null,
    requiredPerDay: goalTotal > 0 ? (Math.max(0, daysTotal - daysElapsed) > 0 ? Math.max(0, goalTotal - total) / Math.max(0, daysTotal - daysElapsed) : Math.max(0, goalTotal - total)) : null,
  };
}

export function habitStatsMonth(habit, entries, year, month) {
  const mode = "month";
  const bounds = periodBounds({ mode, year, month });
  const startISO = isoFromDate(bounds.start);
  const endISO = isoFromDate(bounds.end);
  const dates = Object.keys(entries).filter((d) => d >= startISO && d <= endISO).sort();

  let total = 0, daysLogged = 0, best = null;
  const doneSet = new Set();

  for (const d of dates) {
    const e = entries?.[d]?.[habit.id];
    if (!e) continue;
    daysLogged += 1;
    const v = entryToNumber(habit, e, 0);
    total += v;
    if (habit.type === "number") best = best === null ? v : Math.max(best, v);
    if (entryCountsAsDone(habit, e)) doneSet.add(d);
  }

  const daysElapsed = daysBetweenInclusive(bounds.start, bounds.end);
  const daysTotal = daysBetweenInclusive(bounds.start, bounds.endFull);

  let currentStreak = 0;
  for (let d = new Date(bounds.end); d >= bounds.start; d.setDate(d.getDate() - 1)) {
    if (doneSet.has(isoFromDate(d))) currentStreak += 1;
    else break;
  }

  let bestStreak = 0, run = 0;
  for (let d = new Date(bounds.start); d <= bounds.end; d.setDate(d.getDate() + 1)) {
    if (doneSet.has(isoFromDate(d))) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  const goalTotal = goalForPeriod(habit, { mode, year, month });
  const expectedToDate = goalTotal > 0 ? (goalTotal * (daysElapsed / Math.max(1, daysTotal))) : 0;
  return {
    total, daysLogged, best,
    avgPerLoggedDay: daysLogged > 0 ? total / daysLogged : 0,
    avgPerDay: daysElapsed > 0 ? total / daysElapsed : 0,
    daysElapsed, daysTotal,
    coveragePct: daysElapsed > 0 ? daysLogged / daysElapsed : 0,
    currentStreak, bestStreak,
    goalTotal, expectedToDate,
    onTrackPct: goalTotal > 0 && expectedToDate > 0 ? total / expectedToDate : null,
    requiredPerDay: goalTotal > 0 ? (Math.max(0, daysTotal - daysElapsed) > 0 ? Math.max(0, goalTotal - total) / Math.max(0, daysTotal - daysElapsed) : Math.max(0, goalTotal - total)) : null,
  };
}

// --- 6. CHART SERIES LOGIC ---

export function buildHabitSeries(habit, entries, year) {
  const start = new Date(year, 0, 1);
  const now = new Date();
  const end = year === now.getFullYear() ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(year, 11, 31);
  const goalYearly = clampNumber(getYearlyGoal(habit));
  const daysInYear = (y) => (new Date(y + 1, 0, 1) - new Date(y, 0, 1)) / (1000 * 60 * 60 * 24);

  let actualCum = 0, goalCum = 0;
  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = isoFromDate(d);
    const daily = entryToNumber(habit, entries?.[iso]?.[habit.id], 0);
    actualCum += daily;
    if (goalYearly > 0) goalCum += goalYearly / daysInYear(d.getFullYear());
    out.push({ date: iso, daily, actualCum, goalCum: goalYearly > 0 ? goalCum : null });
  }
  return out;
}

export function buildHabitSeriesMonth(habit, entries, year, month) {
  const mIndex = Math.max(0, Math.min(11, Number(month) - 1));
  const start = new Date(year, mIndex, 1);
  const now = new Date();
  const isCurrent = year === now.getFullYear() && mIndex === now.getMonth();
  const end = isCurrent ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(year, mIndex + 1, 0);
  const goalYearly = clampNumber(getYearlyGoal(habit));
  const daysInYear = (y) => (new Date(y + 1, 0, 1) - new Date(y, 0, 1)) / (1000 * 60 * 60 * 24);

  let actualCum = 0, goalCum = 0;
  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = isoFromDate(d);
    const daily = entryToNumber(habit, entries?.[iso]?.[habit.id], 0);
    actualCum += daily;
    if (goalYearly > 0) goalCum += goalYearly / daysInYear(d.getFullYear());
    out.push({ date: iso, daily, actualCum, goalCum: goalYearly > 0 ? goalCum : null });
  }
  return out;
}

// --- 7. THE CUSTOM HOOK ---

export function useHabitStats(habits, entries, selectedYear, dashboardMonth) {
  const yearSummary = useMemo(() => {
    return habits.map((h) => ({
      habit: h,
      stats: habitStats(h, entries, selectedYear),
    }));
  }, [habits, entries, selectedYear]);

  const monthSummary = useMemo(() => {
    return habits.map((h) => ({
      habit: h,
      stats: habitStatsMonth(h, entries, selectedYear, dashboardMonth),
    }));
  }, [habits, entries, selectedYear, dashboardMonth]);

  return { yearSummary, monthSummary };
}