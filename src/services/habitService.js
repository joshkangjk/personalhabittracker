// src/services/habitService.js
import { supabase } from "../supabaseClient";
import { clampNumber, normalizeGoals, isoRangeForYear } from "../lib/helpers";

export function habitFromRow(r) {
  const legacyGoal = Number(r.goal_daily ?? 0);
  const legacyPeriod = ["daily", "weekly", "monthly", "yearly"].includes(r.goal_period) ? r.goal_period : "daily";

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

export function normalizePublicHabit(h) {
  if (!h || typeof h !== "object") return h;

  const legacyGoal = Number(h.goal_daily ?? h.goalDaily ?? 0);
  const legacyPeriodRaw = h.goal_period ?? h.goalPeriod;
  const legacyPeriod = ["daily", "weekly", "monthly", "yearly"].includes(legacyPeriodRaw) ? legacyPeriodRaw : "daily";

  let goals = normalizeGoals(h.goals);
  const hasAny = goals.daily || goals.weekly || goals.monthly || goals.yearly;

  if (!hasAny && legacyGoal > 0) {
    goals = { ...goals, [legacyPeriod]: clampNumber(legacyGoal) };
  }

  return {
    ...h,
    goals,
    decimals: h.type === "number" ? Number(h.decimals ?? 0) : 0,
    unit: h.type === "number" ? (h.unit ?? undefined) : undefined,
  };
}

export function habitToInsertRow(h, userId, sortIndex) {
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

export function entriesFromRows(rows) {
  const out = {};
  for (const r of rows || []) {
    const d = String(r.date_iso);
    if (!out[d]) out[d] = {};
    out[d][r.habit_id] = r.value;
  }
  return out;
}

export async function loadCloudForYear({ userId, year }) {
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