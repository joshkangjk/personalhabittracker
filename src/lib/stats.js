// src/lib/stats.js
import {
  isoFromDate,
  clampNumber,
  habitDecimals,
  formatNumberWithDecimals,
  normalizeGoals,
  getYearlyGoal,
  withinYear,
  daysBetweenInclusive
} from "./helpers";

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
  if (yearly > 0) {
    if (mode === "month") return yearly / 12;
    return yearly;
  }

  if (goals.daily > 0) {
    const bounds = periodBounds({ mode, year, month });
    const totalDays = daysBetweenInclusive(bounds.start, bounds.endFull);
    return goals.daily * totalDays;
  }

  if (goals.weekly > 0) {
    const bounds = periodBounds({ mode, year, month });
    const totalDays = daysBetweenInclusive(bounds.start, bounds.endFull);
    const weeks = totalDays / 7;
    return goals.weekly * weeks;
  }

  return 0;
}

export function entryCountsAsDone(habit, entry) {
  if (!entry) return false;
  if (habit?.type === "checkbox") return Boolean(entry.value);
  const v = clampNumber(entry.value);
  return v > 0;
}

export function getEntry(entries, dateISO, habitId) {
  return entries?.[dateISO]?.[habitId] ?? null;
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

export function setEntry(entries, dateISO, habitId, payload) {
  const next = { ...entries };
  const day = { ...(next[dateISO] || {}) };
  day[habitId] = payload;
  next[dateISO] = day;
  return next;
}

export function deleteEntry(entries, dateISO, habitId) {
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

export function listDatesInYear(entries, year) {
  return Object.keys(entries)
    .filter((d) => withinYear(d, year))
    .sort((a, b) => (a < b ? 1 : -1));
}

export function habitStats(habit, entries, year) {
  const mode = "year";
  const bounds = periodBounds({ mode, year });
  const startISO = isoFromDate(bounds.start);
  const endISO = isoFromDate(bounds.end);

  const dates = Object.keys(entries)
    .filter((d) => d >= startISO && d <= endISO)
    .sort();

  let total = 0;
  let daysLogged = 0;
  let best = null;

  const doneSet = new Set();

  for (const d of dates) {
    const e = getEntry(entries, d, habit.id);
    if (!e) continue;

    daysLogged += 1;

    const v = entryToNumber(habit, e, 0);
    total += v;

    if (habit.type === "number") {
      best = best === null ? v : Math.max(best, v);
    }

    if (entryCountsAsDone(habit, e)) {
      doneSet.add(d);
    }
  }

  const daysElapsed = daysBetweenInclusive(bounds.start, bounds.end);
  const daysTotal = daysBetweenInclusive(bounds.start, bounds.endFull);

  const avgPerLoggedDay = daysLogged > 0 ? total / daysLogged : 0;
  const avgPerDay = daysElapsed > 0 ? total / daysElapsed : 0;

  const coveragePct = daysElapsed > 0 ? daysLogged / daysElapsed : 0;

  let currentStreak = 0;
  for (let d = new Date(bounds.end); d >= bounds.start; d.setDate(d.getDate() - 1)) {
    const iso = isoFromDate(d);
    if (doneSet.has(iso)) currentStreak += 1;
    else break;
  }

  let bestStreak = 0;
  let run = 0;
  for (let d = new Date(bounds.start); d <= bounds.end; d.setDate(d.getDate() + 1)) {
    const iso = isoFromDate(d);
    if (doneSet.has(iso)) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  const goalTotal = goalForPeriod(habit, { mode, year });
  const expectedToDate = goalTotal > 0 ? (goalTotal * (daysElapsed / Math.max(1, daysTotal))) : 0;
  const onTrackPct = goalTotal > 0 && expectedToDate > 0 ? total / expectedToDate : null;

  const remainingDays = Math.max(0, daysTotal - daysElapsed);
  const remaining = Math.max(0, goalTotal - total);
  const requiredPerDay = goalTotal > 0 ? (remainingDays > 0 ? remaining / remainingDays : remaining) : null;

  return {
    total,
    daysLogged,
    best,
    avgPerLoggedDay,
    avgPerDay,
    daysElapsed,
    daysTotal,
    coveragePct,
    currentStreak,
    bestStreak,
    goalTotal,
    expectedToDate,
    onTrackPct,
    requiredPerDay,
  };
}

export function habitStatsMonth(habit, entries, year, month) {
  const mode = "month";
  const bounds = periodBounds({ mode, year, month });
  const startISO = isoFromDate(bounds.start);
  const endISO = isoFromDate(bounds.end);

  const dates = Object.keys(entries)
    .filter((d) => d >= startISO && d <= endISO)
    .sort();

  let total = 0;
  let daysLogged = 0;
  let best = null;

  const doneSet = new Set();

  for (const d of dates) {
    const e = getEntry(entries, d, habit.id);
    if (!e) continue;

    daysLogged += 1;

    const v = entryToNumber(habit, e, 0);
    total += v;

    if (habit.type === "number") {
      best = best === null ? v : Math.max(best, v);
    }

    if (entryCountsAsDone(habit, e)) {
      doneSet.add(d);
    }
  }

  const daysElapsed = daysBetweenInclusive(bounds.start, bounds.end);
  const daysTotal = daysBetweenInclusive(bounds.start, bounds.endFull);

  const avgPerLoggedDay = daysLogged > 0 ? total / daysLogged : 0;
  const avgPerDay = daysElapsed > 0 ? total / daysElapsed : 0;

  const coveragePct = daysElapsed > 0 ? daysLogged / daysElapsed : 0;

  let currentStreak = 0;
  for (let d = new Date(bounds.end); d >= bounds.start; d.setDate(d.getDate() - 1)) {
    const iso = isoFromDate(d);
    if (doneSet.has(iso)) currentStreak += 1;
    else break;
  }

  let bestStreak = 0;
  let run = 0;
  for (let d = new Date(bounds.start); d <= bounds.end; d.setDate(d.getDate() + 1)) {
    const iso = isoFromDate(d);
    if (doneSet.has(iso)) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  const goalTotal = goalForPeriod(habit, { mode, year, month });
  const expectedToDate = goalTotal > 0 ? (goalTotal * (daysElapsed / Math.max(1, daysTotal))) : 0;
  const onTrackPct = goalTotal > 0 && expectedToDate > 0 ? total / expectedToDate : null;

  const remainingDays = Math.max(0, daysTotal - daysElapsed);
  const remaining = Math.max(0, goalTotal - total);
  const requiredPerDay = goalTotal > 0 ? (remainingDays > 0 ? remaining / remainingDays : remaining) : null;

  return {
    total,
    daysLogged,
    best,
    avgPerLoggedDay,
    avgPerDay,
    daysElapsed,
    daysTotal,
    coveragePct,
    currentStreak,
    bestStreak,
    goalTotal,
    expectedToDate,
    onTrackPct,
    requiredPerDay,
  };
}

export function buildHabitSeries(habit, entries, year) {
  const start = new Date(year, 0, 1);
  const now = new Date();
  const end =
    year === now.getFullYear()
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(year, 11, 31);

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

export function buildHabitSeriesMonth(habit, entries, year, month) {
  const mIndex = Math.max(0, Math.min(11, Number(month) - 1));
  const start = new Date(year, mIndex, 1);

  const now = new Date();
  const isCurrent = year === now.getFullYear() && mIndex === now.getMonth();
  const end = isCurrent ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(year, mIndex + 1, 0);

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