// src/hooks/useHabitData.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { todayISO, clampNumber, countDecimalsFromValue, normalizeGoals, uuid } from "../lib/helpers";
import { setEntry, deleteEntry } from "../lib/stats";
import { habitToInsertRow, loadCloudForYear } from "../services/habitService";

const STORAGE_KEY = "pookie_habit_tracker_v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function defaultState() {
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

export function ensureStateShape(s) {
  if (!s || typeof s !== "object") return defaultState();
  if (!Array.isArray(s.habits)) s.habits = [];
  if (!s.entries || typeof s.entries !== "object") s.entries = {};
  if (!s.ui || typeof s.ui !== "object") s.ui = { selectedYear: new Date().getFullYear() };
  if (!s.ui.selectedYear) s.ui.selectedYear = new Date().getFullYear();
  const cy = new Date().getFullYear();
  if (!Number.isFinite(Number(s.ui.selectedYear))) s.ui.selectedYear = cy;
  s.habits = (s.habits || []).map((h) => {
    if (!h || typeof h !== "object") return h;
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

export function useHabitData() {
  const [session, setSession] = useState(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [state, setState] = useState(() => ensureStateShape(loadState()) || defaultState());
  const [activeDate, setActiveDate] = useState(todayISO());

  const selectedYear = state.ui.selectedYear;

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

  const updateHabit = useCallback(async (habitId, patch) => {
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
    const res = await supabase.from("habits").update(row).eq("user_id", userId).eq("id", habitId);
    if (res.error) setCloudError(res.error.message || "Failed to update habit");
    else setCloudError("");
  }, [session?.user?.id]);

  const addHabit = useCallback(async (newHabit) => {
    const userId = session?.user?.id;
    if (!userId) return;
    let sortIndex = 0;
    setState((s) => {
      sortIndex = (s.habits || []).length;
      return { ...s, habits: [...(s.habits || []), newHabit] };
    });
    const row = habitToInsertRow(newHabit, userId, sortIndex);
    const res = await supabase.from("habits").insert(row);
    if (res.error) setCloudError(res.error.message || "Failed to add habit");
    else setCloudError("");
  }, [session?.user?.id]);

  const deleteHabit = useCallback(async (habitId) => {
    const userId = session?.user?.id;
    if (!userId) return;
    setState((s) => {
      const habitsNext = (s.habits || []).filter((h) => h.id !== habitId);
      let entriesNext = s.entries;
      for (const d of Object.keys(entriesNext || {})) {
        if (entriesNext[d]?.[habitId]) entriesNext = deleteEntry(entriesNext, d, habitId);
      }
      return { ...s, habits: habitsNext, entries: entriesNext };
    });
    const res = await supabase.from("habits").delete().eq("user_id", userId).eq("id", habitId);
    if (res.error) setCloudError(res.error.message || "Failed to delete habit");
    else setCloudError("");
  }, [session?.user?.id]);

  const logValue = useCallback(async (dateISO, habit, value) => {
    const userId = session?.user?.id;
    if (!userId) return;
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
    const res = await supabase.from("entries").upsert(entryRow, { onConflict: "user_id,date_iso,habit_id" });
    if (res.error) {
      setCloudError(res.error.message || "Failed to save entry");
      return;
    }
    setCloudError("");
    if (habit?.type === "number") {
      const detected = Math.min(6, Math.max(0, countDecimalsFromValue(value)));
      const current = Number.isFinite(Number(habit.decimals)) ? Number(habit.decimals) : 0;
      const nextDec = Math.max(current, detected);
      if (nextDec !== current) {
        const upd = await supabase.from("habits").update({ decimals: nextDec }).eq("user_id", userId).eq("id", habit.id);
        if (upd.error) setCloudError(upd.error.message || "Failed to update decimals");
        else setCloudError("");
      }
    }
  }, [session?.user?.id]);

  const removeLog = useCallback(async (dateISO, habitId) => {
    const userId = session?.user?.id;
    if (!userId) return;
    setState((s) => ({ ...s, entries: deleteEntry(s.entries, dateISO, habitId) }));
    const res = await supabase.from("entries").delete().eq("user_id", userId).eq("date_iso", dateISO).eq("habit_id", habitId);
    if (res.error) setCloudError(res.error.message || "Failed to remove entry");
    else setCloudError("");
  }, [session?.user?.id]);

  const persistHabitOrder = useCallback(async (list) => {
    const userId = session?.user?.id;
    if (!userId) return;
    const updates = (list || []).map((h, idx) => ({
      id: h.id,
      user_id: userId,
      sort_index: idx,
    }));
    const res = await supabase.from("habits").upsert(updates, { onConflict: "id" });
    if (res.error) setCloudError(res.error.message || "Failed to save order");
    else setCloudError("");
  }, [session?.user?.id]);

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

  const reorderHabits = useCallback(async (fromId, toId) => {
    const nextList = reorderHabitsLocal(fromId, toId);
    if (!nextList) return;
    await persistHabitOrder(nextList);
  }, [persistHabitOrder, reorderHabitsLocal]);

  return {
    session,
    state,
    setState,
    cloudReady,
    cloudError,
    activeDate,
    setActiveDate,
    updateHabit,
    addHabit,
    deleteHabit,
    logValue,
    removeLog,
    persistHabitOrder,
    reorderHabitsLocal,
    reorderHabits
  };
}