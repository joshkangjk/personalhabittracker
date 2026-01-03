import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, GripVertical, MoreVertical, Plus, Trash2 } from "lucide-react";

const STORAGE_KEY = "pookie_habit_tracker_v1";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
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

function withinYear(iso, year) {
  return iso >= `${year}-01-01` && iso <= `${year}-12-31`;
}

function monthFromISO(iso) {
  return iso?.slice(5, 7) || "";
}

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
        goalDaily: 50,
        goalPeriod: "daily",
      },
      {
        id: uuid(),
        name: "Read",
        type: "checkbox",
        goalDaily: 1,
        goalPeriod: "daily",
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
  if (s.ui.selectedYear < cy) s.ui.selectedYear = cy;
  s.habits = (s.habits || []).map((h) => {
    if (h?.type !== "number") return h;
    if (h.decimals === undefined) return { ...h, decimals: 0 };
    return h;
  });
  return s;
}

function buildYearOptions() {
  const y = new Date().getFullYear();
  return [y, y + 1];
}

function getEntry(entries, dateISO, habitId) {
  return entries?.[dateISO]?.[habitId] ?? null;
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
    const v = habit.type === "checkbox" ? (e.value ? 1 : 0) : clampNumber(e.value);
    total += v;
    if (habit.type === "number") {
      best = best === null ? v : Math.max(best, v);
    }
  }

  const base = new Date();
  const points = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    if (!withinYear(iso, year)) continue;
    const e = getEntry(entries, iso, habit.id);
    const v = e ? (habit.type === "checkbox" ? (e.value ? 1 : 0) : clampNumber(e.value)) : 0;
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
  const datesWithLogs = Object.keys(entries)
    .filter((d) => withinYear(d, year))
    .filter((d) => Boolean(getEntry(entries, d, habit.id)))
    .sort();

  if (datesWithLogs.length === 0) return [];

  const minISO = datesWithLogs[0];
  const maxISO = datesWithLogs[datesWithLogs.length - 1];

  const [sy, sm, sd] = minISO.split("-").map(Number);
  const [ey, em, ed] = maxISO.split("-").map(Number);

  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const goal = clampNumber(habit.goalDaily || 0);
  const goalPeriod = habit.goalPeriod || "daily";
  const goalPerDay = goal > 0 ? (goalPeriod === "weekly" ? goal / 7 : goal) : 0;

  let actualCum = 0;
  let goalCum = 0;

  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

    const e = getEntry(entries, iso, habit.id);

    const daily = e
      ? habit.type === "checkbox"
        ? e.value
          ? 1
          : 0
        : clampNumber(e.value)
      : 0;

    actualCum += daily;
    if (goal > 0) goalCum += goalPerDay;

    out.push({
      date: iso,
      daily,
      actualCum,
      goalCum: goal > 0 ? goalCum : null,
    });
  }

  return out;
}

function isoRangeForYear(year) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

function habitFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    unit: r.unit ?? undefined,
    decimals: r.decimals ?? 0,
    goalDaily: Number(r.goal_daily ?? 0),
    goalPeriod: r.goal_period || "daily",
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
    goal_daily: Number(h.goalDaily ?? 0),
    goal_period: h.goalPeriod || "daily",
    sort_index: Number.isFinite(Number(sortIndex)) ? Number(sortIndex) : 0,
  };
}

function entriesFromRows(rows) {
  const out = {};
  for (const r of rows || []) {
    const d = String(r.date_iso);
    if (!out[d]) out[d] = {};
    // store in the same payload shape used elsewhere: { value: ... }
    out[d][r.habit_id] = r.value;
  }
  return out;
}

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

export default function HabitTrackerMVP() {
  const [session, setSession] = useState(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState("");

  const [state, setState] = useState(() => ensureStateShape(loadState()) || defaultState());
  const [activeDate, setActiveDate] = useState(todayISO());
  const [historyMonth, setHistoryMonth] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

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
  const selectedYear = state.ui.selectedYear;

  useEffect(() => {
    let cancelled = false;

    async function loadCloud() {
      if (!session?.user?.id) return;
      setCloudError("");
      setCloudReady(false);

      const userId = session.user.id;
      const { start, end } = isoRangeForYear(selectedYear);

      const habitsRes = await supabase
        .from("habits")
        .select("id,name,type,unit,decimals,goal_daily,goal_period,sort_index,created_at")
        .eq("user_id", userId)
        .order("sort_index", { ascending: true })
        .order("created_at", { ascending: true });

      if (habitsRes.error) {
        if (!cancelled) {
          setCloudError(habitsRes.error.message || "Failed to load habits");
          setCloudReady(true);
        }
        return;
      }

      const entriesRes = await supabase
        .from("entries")
        .select("user_id,date_iso,habit_id,value")
        .eq("user_id", userId)
        .gte("date_iso", start)
        .lte("date_iso", end);

      if (entriesRes.error) {
        if (!cancelled) {
          setCloudError(entriesRes.error.message || "Failed to load entries");
          setCloudReady(true);
        }
        return;
      }

      const habitsNext = (habitsRes.data || []).map(habitFromRow);
      const entriesNext = entriesFromRows(entriesRes.data || []);

      if (!cancelled) {
        setState((s) => ensureStateShape({ ...s, habits: habitsNext, entries: entriesNext }));
        setCloudReady(true);
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

  async function persistHabitOrder(list) {
    const userId = session?.user?.id;
    if (!userId) return;

    const updates = (list || []).map((h, idx) => ({
      id: h.id,
      user_id: userId,
      sort_index: idx,
    }));

    const res = await supabase.from("habits").upsert(updates, { onConflict: "id" });
    if (res.error) setCloudError(res.error.message || "Failed to save order");
  }


  // Touch drag reorder handlers for mobile
  const [touchDragging, setTouchDragging] = useState(false);

  function getHabitIdFromEventTarget(el) {
    const node = el?.closest?.("[data-habit-id]");
    return node?.getAttribute?.("data-habit-id") || "";
  }

  function onTouchDragStart(habitId) {
    setDraggingHabitId(habitId);
    setTouchDragging(true);
  }

  async function onTouchDragMove(clientX, clientY) {
    if (!draggingHabitId) return;
    const el = document.elementFromPoint(clientX, clientY);
    const overId = getHabitIdFromEventTarget(el);
    if (!overId || overId === draggingHabitId) return;
    // reorder immediately for a responsive feel
    await reorderHabits(draggingHabitId, overId);
    // keep dragging the same habit id
    setDraggingHabitId(draggingHabitId);
  }

  function onTouchDragEnd() {
    setTouchDragging(false);
    setDraggingHabitId("");
  }

  async function reorderHabits(fromId, toId) {
    const userId = session?.user?.id;
    if (!userId) return;
    if (!fromId || !toId || fromId === toId) return;

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

    await persistHabitOrder(nextList);
  }

  const datesInYear = useMemo(() => listDatesInYear(state.entries, selectedYear), [state.entries, selectedYear]);

  const filteredHistory = useMemo(() => {
    return historyMonth === "all"
      ? datesInYear
      : datesInYear.filter((d) => monthFromISO(d) === historyMonth);
  }, [datesInYear, historyMonth]);

  async function updateHabit(habitId, patch) {
    const userId = session?.user?.id;
    if (!userId) return;

    setState((s) => {
      const nextHabits = (s.habits || []).map((h) => (h.id === habitId ? { ...h, ...patch } : h));
      return { ...s, habits: nextHabits };
    });

    const current = (state.habits || []).find((h) => h.id === habitId);
    const merged = { ...(current || {}), ...(patch || {}), id: habitId };

    const row = {
      name: merged.name,
      unit: merged.type === "number" ? (merged.unit ?? null) : null,
      decimals: merged.type === "number" ? Number(merged.decimals ?? 0) : 0,
      goal_daily: Number(merged.goalDaily ?? 0),
      goal_period: merged.goalPeriod || "daily",
    };

    const res = await supabase
      .from("habits")
      .update(row)
      .eq("user_id", userId)
      .eq("id", habitId);

    if (res.error) setCloudError(res.error.message || "Failed to update habit");
  }

  async function addHabit(newHabit) {
    const userId = session?.user?.id;
    if (!userId) return;

    setState((s) => ({ ...s, habits: [...(s.habits || []), newHabit] }));

    const sortIndex = (state.habits || []).length;
    const row = habitToInsertRow(newHabit, userId, sortIndex);

    const res = await supabase.from("habits").insert(row);
    if (res.error) setCloudError(res.error.message || "Failed to add habit");
  }

  async function deleteHabit(habitId) {
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

    if (res.error) setCloudError(res.error.message || "Failed to delete habit");
  }

  async function logValue(dateISO, habit, value) {
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
        if (upd.error) setCloudError(upd.error.message || "Failed to update decimals");
      }
    }
  }

  async function removeLog(dateISO, habitId) {
    const userId = session?.user?.id;
    if (!userId) return;

    setState((s) => ({ ...s, entries: deleteEntry(s.entries, dateISO, habitId) }));

    const res = await supabase
      .from("entries")
      .delete()
      .eq("user_id", userId)
      .eq("date_iso", dateISO)
      .eq("habit_id", habitId);

    if (res.error) setCloudError(res.error.message || "Failed to remove entry");
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habit_tracker_${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }


  const yearSummary = useMemo(() => {
    const activeHabits = state.habits;
    const out = activeHabits.map((h) => {
      const st = habitStats(h, state.entries, selectedYear);
      return { habit: h, stats: st };
    });
    out.sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0));
    return out;
  }, [state.habits, state.entries, selectedYear]);

  const [focusedHabitId, setFocusedHabitId] = useState(() => state.habits[0]?.id || "");
  const [draggingHabitId, setDraggingHabitId] = useState("");

  useEffect(() => {
    if (!focusedHabitId && state.habits[0]?.id) setFocusedHabitId(state.habits[0].id);
  }, [focusedHabitId, state.habits]);

  const focusedHabit = useMemo(
    () => state.habits.find((h) => h.id === focusedHabitId) || state.habits[0],
    [state.habits, focusedHabitId]
  );

  const focusedSeries = useMemo(() => {
    if (!focusedHabit) return [];
    return buildHabitSeries(focusedHabit, state.entries, selectedYear);
  }, [focusedHabit, state.entries, selectedYear]);

  if (!session) return <LoginScreen />;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-4">
        <header className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Habit Tracker</h1>
            <div className="text-xs text-muted-foreground">
              {cloudError ? `Cloud error: ${cloudError}` : cloudReady ? "Synced" : "Loading cloud..."}
            </div>
          </div>

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) =>
                  setState((s) => ({ ...s, ui: { ...s.ui, selectedYear: Number(v) } }))
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={exportJSON} className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button variant="outline" onClick={() => supabase.auth.signOut()}>
                Sign out
              </Button>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden absolute top-0 right-0">
            <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-9 w-9 px-0" aria-label="More">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Menu</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="text-sm text-muted-foreground">Year</Label>
                    <Select
                      value={String(selectedYear)}
                      onValueChange={(v) =>
                        setState((s) => ({ ...s, ui: { ...s.ui, selectedYear: Number(v) } }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Button onClick={() => { exportJSON(); setMobileMenuOpen(false); }} className="gap-2">
                      <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        supabase.auth.signOut();
                      }}
                    >
                      Sign out
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Tabs defaultValue="log" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="log">Daily Log</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-4">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Daily Log</CardTitle>
                </div>
                <div className="flex flex-row items-center justify-between gap-3 md:gap-6 w-full md:w-auto">
                  <div className="flex items-center gap-2 md:order-2 flex-1 justify-end">
                    <Label className="hidden md:block text-xs text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={activeDate}
                      onChange={(e) => setActiveDate(e.target.value)}
                      className="w-[160px] md:w-[160px]"
                    />
                  </div>
                  <div className="md:order-1 shrink-0">
                    <AddHabitDialog onAdd={addHabit} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">

                <div className="grid gap-3">
                  {habits.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No habits yet. Add one.</div>
                  ) : (
                    habits.map((h, idx) => (
                      <HabitLogRow
                        key={h.id}
                        habit={h}
                        entry={getEntry(state.entries, activeDate, h.id)}
                        onLog={(value) => logValue(activeDate, h, value)}
                        onDelete={() => deleteHabit(h.id)}
                        onEditHabit={(patch) => updateHabit(h.id, patch)}
                        dragging={draggingHabitId === h.id}
                        onDragStart={
                          isMobile
                            ? undefined
                            : (e) => {
                                e.dataTransfer.setData("text/plain", h.id);
                                e.dataTransfer.effectAllowed = "move";
                                setDraggingHabitId(h.id);
                              }
                        }
                        onDragOver={
                          isMobile
                            ? undefined
                            : (e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                              }
                        }
                        onDrop={
                          isMobile
                            ? undefined
                            : (e) => {
                                e.preventDefault();
                                const fromId = e.dataTransfer.getData("text/plain");
                                reorderHabits(fromId, h.id);
                                setDraggingHabitId("");
                              }
                        }
                        onDragEnd={isMobile ? undefined : () => setDraggingHabitId("")}
                        isMobile={isMobile}
                        onTouchStartDrag={() => onTouchDragStart(h.id)}
                        onTouchMoveDrag={(x, y) => onTouchDragMove(x, y)}
                        onTouchEndDrag={() => onTouchDragEnd()}
                        touchDragging={touchDragging}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Year Summary</CardTitle>
                  <p className="text-sm text-muted-foreground">Totals for {selectedYear}.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {yearSummary.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Add habits to see stats.</div>
                  ) : (
                    <div className="space-y-2">
                      {yearSummary.map(({ habit, stats }) => (
                        <button
                          key={habit.id}
                          onClick={() => setFocusedHabitId(habit.id)}
                          className={`w-full text-left rounded-2xl border p-3 hover:bg-accent/40 transition ${
                            focusedHabitId === habit.id ? "bg-accent/30" : ""
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
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Trend</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {focusedHabit ? `Showing: ${focusedHabit.name}` : "Pick a habit"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {focusedHabit ? (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {(() => {
                          const st = habitStats(focusedHabit, state.entries, selectedYear);
                          return (
                            <>
                              <MiniStat label="Total" value={formatStatTotal(focusedHabit, st.total)} />
                              <MiniStat label="Avg logged" value={formatStatAvg(focusedHabit, st.avgPerLoggedDay)} />
                              <MiniStat label="Avg 7d" value={formatStatAvg(focusedHabit, st.avgLast7)} />
                              <MiniStat label="Best day" value={formatStatBest(focusedHabit, st.best)} />
                            </>
                          );
                        })()}
                      </div>

                      <div className="h-[260px] w-full">
                        {focusedSeries.length === 0 ? (
                          <div className="h-full rounded-2xl border flex items-center justify-center text-sm text-muted-foreground">
                            No data yet for this habit in {selectedYear}.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={focusedSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={18} />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                tickFormatter={(v) =>
                                  focusedHabit.type === "checkbox"
                                    ? String(v)
                                    : formatNumberWithDecimals(v, habitDecimals(focusedHabit))
                                }
                              />
                              <Tooltip
                                labelFormatter={(l) => formatPrettyDate(l)}
                                formatter={(v, name) => {
                                  if (v === null || v === undefined) return ["", ""];

                                  if (focusedHabit.type === "checkbox") {
                                    const label = name === "goalCum" ? "Goal" : "Actual";
                                    return [String(Math.round(Number(v))), label];
                                  }

                                  const dec = habitDecimals(focusedHabit);
                                  const label = name === "goalCum" ? "Goal" : "Actual";
                                  return [formatNumberWithDecimals(v, dec), label];
                                }}
                              />
                              <Line type="monotone" dataKey="actualCum" dot={false} strokeWidth={2} />
                              {focusedHabit.goalDaily ? (
                                <Line type="monotone" dataKey="goalCum" dot={false} strokeWidth={2} strokeDasharray="6 6" />
                              ) : null}
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>

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
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>History</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={historyMonth} onValueChange={setHistoryMonth}>
                    <SelectTrigger className="w-[140px]">
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
              <CardContent className="space-y-4">
                {filteredHistory.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No matching days found.</div>
                ) : (
                  <div className="space-y-3">
                    {filteredHistory.map((d) => (
                      <HistoryDay
                        key={d}
                        dateISO={d}
                        dayEntries={state.entries[d]}
                        habits={state.habits}
                        onDeleteOne={(habitId) => removeLog(d, habitId)}
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
    <div className="rounded-2xl border p-3">
      <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value || ""}</div>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function sendLink() {
    const clean = email.trim();
    if (!clean) return;

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) return alert(error.message);
    setSent(true);
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-4 space-y-3">
        <div className="text-lg font-semibold">Sign in</div>
        <div className="text-sm text-muted-foreground">
          {sent ? "Check your email for the login link." : "Enter your email to get a magic link."}
        </div>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button className="w-full" onClick={sendLink} disabled={!email.trim()}>
          Send link
        </Button>
      </div>
    </div>
  );
}

function AddHabitDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("number");
  const [unit, setUnit] = useState("reps");
  const [goalDaily, setGoalDaily] = useState("");
  const [goalPeriod, setGoalPeriod] = useState("daily");
  const [goalEnabled, setGoalEnabled] = useState(false);

  function reset() {
    setName("");
    setType("number");
    setUnit("reps");
    setGoalDaily("");
    setGoalPeriod("daily");
    setGoalEnabled(false);
  }

  function create() {
    const cleanName = name.trim();
    if (!cleanName) return;
    const h = {
      id: uuid(),
      name: cleanName,
      unit: type === "number" ? unit.trim() || "value" : undefined,
      type,
      goalDaily: goalEnabled && goalDaily !== "" ? clampNumber(goalDaily) : 0,
      goalPeriod,
    };
    onAdd(h);
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Habit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a habit</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "number" ? (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-sm text-muted-foreground">Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm text-muted-foreground">Goal</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Set a goal</span>
                    <Switch
                      checked={goalEnabled}
                      onCheckedChange={(v) => {
                        setGoalEnabled(Boolean(v));
                        if (!v) setGoalDaily("");
                      }}
                    />
                  </div>
                </div>

                {goalEnabled ? (
                  <div className="flex gap-2">
                    <Select value={goalPeriod} onValueChange={(v) => setGoalPeriod(v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-[140px]"
                      type="number"
                      value={goalDaily}
                      onChange={(e) => setGoalDaily(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm text-muted-foreground">Goal</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Set a goal</span>
                  <Switch
                    checked={goalEnabled}
                    onCheckedChange={(v) => {
                      setGoalEnabled(Boolean(v));
                      if (!v) setGoalDaily("");
                    }}
                  />
                </div>
              </div>

              {goalEnabled ? (
                <div className="flex gap-2">
                  <Select value={goalPeriod} onValueChange={(v) => setGoalPeriod(v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-[140px]"
                    type="number"
                    value={goalDaily}
                    onChange={(e) => setGoalDaily(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HabitLogRow({
  habit,
  entry,
  onLog,
  onDelete,
  onEditHabit,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isMobile,
  onTouchStartDrag,
  onTouchMoveDrag,
  onTouchEndDrag,
  touchDragging,
}) {
  const [value, setValue] = useState(() => {
    if (!entry) return habit.type === "checkbox" ? false : "";
    return entry.value;
  });

  useEffect(() => {
    if (!entry) {
      setValue(habit.type === "checkbox" ? false : "");
    } else {
      setValue(entry.value);
    }
  }, [entry, habit.type]);

  function save() {
    if (habit.type === "checkbox") {
      onLog(Boolean(value));
      return;
    }
    if (value === "" || value === null || value === undefined) return;
    const n = clampNumber(value);
    onLog(n);
  }

  // Helper for quick +/− increment for number habits
  function bump(delta) {
    if (habit.type !== "number") return;
    const current = value === "" || value === null || value === undefined ? 0 : clampNumber(value);
    const next = Math.max(0, current + delta);
    setValue(next);
    onLog(next);
  }

  return (
    <div
      data-habit-id={habit.id}
      className={`rounded-2xl border p-2 md:p-3 ${dragging ? "opacity-60" : ""}`}
      draggable={!isMobile}
      onDragStart={isMobile ? undefined : onDragStart}
      onDragOver={isMobile ? undefined : onDragOver}
      onDrop={isMobile ? undefined : onDrop}
      onDragEnd={isMobile ? undefined : onDragEnd}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-medium">{habit.name}</div>
          </div>
        </div>

        <div className="flex flex-row flex-wrap items-center justify-between gap-2 md:flex-nowrap">
          {habit.type === "checkbox" ? (
            <div className="flex items-center gap-2 rounded-2xl border px-3 py-2">
              <Switch
                checked={Boolean(value)}
                onCheckedChange={(v) => {
                  setValue(v);
                  onLog(Boolean(v));
                }}
              />
              <span className="text-sm">Done</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 px-0"
                onClick={() => bump(-1)}
              >
                −
              </Button>

              <Input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                    save();
                  }
                }}
                className="w-[100px] text-center"
              />

              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 px-0"
                onClick={() => bump(1)}
              >
                +
              </Button>
            </div>
          )}

          {/* Reorder handle */}
          <div className="flex items-center">
            <div
              className={`rounded-xl border px-2 py-2 text-muted-foreground ${isMobile ? "" : "cursor-grab active:cursor-grabbing"} ${touchDragging ? "opacity-60" : ""}`}
              title={isMobile ? "Press and drag to reorder" : "Drag to reorder"}
              onTouchStart={
                isMobile
                  ? (e) => {
                      e.preventDefault();
                      onTouchStartDrag?.();
                    }
                  : undefined
              }
              onTouchMove={
                isMobile
                  ? (e) => {
                      const t = e.touches?.[0];
                      if (!t) return;
                      onTouchMoveDrag?.(t.clientX, t.clientY);
                    }
                  : undefined
              }
              onTouchEnd={isMobile ? () => onTouchEndDrag?.() : undefined}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </div>

          <EditHabitDialog habit={habit} onSave={onEditHabit} onDeleteHabit={onDelete} />
        </div>
      </div>
    </div>
  );
}

function EditHabitDialog({ habit, onSave, onDeleteHabit }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(habit.name || "");
  const [unit, setUnit] = useState(habit.unit || "");
  const [goalValue, setGoalValue] = useState(String(habit.goalDaily ?? 0));
  const [goalPeriod, setGoalPeriod] = useState(habit.goalPeriod || "daily");
  const [goalEnabled, setGoalEnabled] = useState(Boolean((habit.goalDaily ?? 0) > 0));

  useEffect(() => {
    setName(habit.name || "");
    setUnit(habit.unit || "");
    setGoalValue(String(habit.goalDaily ?? 0));
    setGoalPeriod(habit.goalPeriod || "daily");
    setGoalEnabled(Boolean((habit.goalDaily ?? 0) > 0));
  }, [habit]);

  function save() {
    const patch = {
      name: name.trim() || habit.name,
      goalDaily: goalEnabled && goalValue !== "" ? clampNumber(goalValue) : 0,
      goalPeriod,
    };
    if (habit.type === "number") {
      patch.unit = unit.trim() || habit.unit || "value";
    }
    onSave(patch);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 px-3">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit habit</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          {habit.type === "number" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-sm text-muted-foreground">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm text-muted-foreground">Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm text-muted-foreground">Goal</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Set a goal</span>
                <Switch
                  checked={goalEnabled}
                  onCheckedChange={(v) => {
                    setGoalEnabled(Boolean(v));
                    if (!v) setGoalValue("");
                  }}
                />
              </div>
            </div>

            {goalEnabled ? (
              <div className="grid grid-cols-2 gap-2">
                <Select value={goalPeriod} onValueChange={(v) => setGoalPeriod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  value={goalValue}
                  onChange={(e) => setGoalValue(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              Delete habit
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </div>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete habit?</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              This will delete <span className="font-medium text-foreground">{habit.name}</span> and all its logs. This cannot be undone.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setConfirmOpen(false);
                  setOpen(false);
                  onDeleteHabit?.();
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDay({ dateISO, dayEntries, habits, onDeleteOne }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const items = Object.keys(dayEntries || {})
    .map((hid) => {
      const habit = habits.find((h) => h.id === hid);
      return { hid, habit, entry: dayEntries[hid] };
    })
    .filter((x) => x.habit)
    .sort((a, b) => habits.findIndex((h) => h.id === a.hid) - habits.findIndex((h) => h.id === b.hid));

  return (
    <div className="rounded-2xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium">{formatPrettyDate(dateISO)}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {items.map(({ hid, habit, entry }) => (
          <div key={hid} className="flex items-start justify-between gap-3 rounded-2xl border px-3 py-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{habit.name}</span>
              </div>
              <div className="text-sm">
                {habit.type === "checkbox"
                  ? (entry.value ? "Done" : "Not done")
                  : `${formatNumberWithDecimals(entry.value, habitDecimals(habit))} ${habit.unit || ""}`}
              </div>
            </div>

            <Button
              variant="outline"
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setPendingDelete({ hid, name: habit.name });
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove entry?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            This will remove the log for <span className="font-medium text-foreground">{pendingDelete?.name || "this habit"}</span> on <span className="font-medium text-foreground">{formatPrettyDate(dateISO)}</span>.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmOpen(false);
                setPendingDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete?.hid) onDeleteOne(pendingDelete.hid);
                setConfirmOpen(false);
                setPendingDelete(null);
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
