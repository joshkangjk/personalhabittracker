import { useMemo } from "react";

// --- 1. DATE & NUMBER UTILITIES ---
// These are the basic tools the app uses to handle numbers and dates.

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
// This determines what your targets are.

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

export function goalForPeriod(habit, { mode, year, month }) {
  const goals = normalizeGoals(habit?.goals);
  if (mode === "month" && goals.monthly > 0) return goals.monthly;
  if (mode === "year" && goals.yearly > 0) return goals.yearly;

  const yearly = clampNumber(getYearlyGoal(habit));
  if (yearly > 0) {
    if (mode === "month") return yearly / 12;
    return yearly;
  }

  const bounds = periodBounds({ mode, year, month });
  const totalDays = daysBetweenInclusive(bounds.start, bounds.endFull);
  if (goals.daily > 0) return goals.daily * totalDays;
  if (goals.weekly > 0) return goals.weekly * (totalDays / 7);

  return 0;
}

// --- 3. CALCULATION ENGINE ---
// This is the "brain" that calculates streaks and totals.

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

function entryToNumber(habit, entry, fallback = 0) {
  if (!entry) return fallback;
  return habit.type === "checkbox" ? (entry.value ? 1 : 0) : clampNumber(entry.value);
}

function entryCountsAsDone(habit, entry) {
  if (!entry) return false;
  if (habit?.type === "checkbox") return Boolean(entry.value);
  return clampNumber(entry.value) > 0;
}

export function habitStats(habit, entries, year) {
  const mode = "year";
  const bounds = periodBounds({ mode, year });
  const startISO = isoFromDate(bounds.start);
  const endISO = isoFromDate(bounds.end);

  const dates = Object.keys(entries).filter((d) => d >= startISO && d <= endISO).sort();

  let total = 0;
  let daysLogged = 0;
  let best = null;
  const doneSet = new Set();

  for (const d of dates) {
    const e = entries[d]?.[habit.id];
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
  const expectedToDate = goalTotal > 0 ? goalTotal * (daysElapsed / Math.max(1, daysTotal)) : 0;

  return {
    total,
    daysLogged,
    best,
    avgPerLoggedDay: daysLogged > 0 ? total / daysLogged : 0,
    avgPerDay: daysElapsed > 0 ? total / daysElapsed : 0,
    daysElapsed,
    daysTotal,
    coveragePct: daysElapsed > 0 ? daysLogged / daysElapsed : 0,
    currentStreak,
    bestStreak,
    goalTotal,
    expectedToDate,
    onTrackPct: goalTotal > 0 && expectedToDate > 0 ? total / expectedToDate : null,
    requiredPerDay: goalTotal > 0 ? (Math.max(0, daysTotal - daysElapsed) > 0 ? Math.max(0, goalTotal - total) / Math.max(0, daysTotal - daysElapsed) : Math.max(0, goalTotal - total)) : null,
  };
}

// ... repeat the habitStatsMonth function here using the same logic ...

// --- 4. THE CUSTOM HOOK ---

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
      stats: habitStats(h, entries, selectedYear, dashboardMonth),
    }));
  }, [habits, entries, selectedYear, dashboardMonth]);

  return { yearSummary, monthSummary };
}