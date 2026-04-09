// src/components/PublicView.jsx
import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Lock, Sun, Moon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { habitStats,buildHabitSeries } from "../lib/stats";
import { normalizePublicHabit } from "../services/habitService";
import { YearSummaryList, HabitStatsGrid, TrendChart } from "./DashboardWidgets";
import { useTheme } from "../hooks/useTheme";

export default function PublicView({ token }) {
  const { theme, toggleTheme } = useTheme();
  const [year] = useState(new Date().getFullYear());
  const [dashboardSummaryMode, setDashboardSummaryMode] = useState("year");
  const [dashboardMonth, setDashboardMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publicState, setPublicState] = useState({ habits: [], entries: {} });
  const [focusedHabitId, setFocusedHabitId] = useState("");

  useEffect(() => {
    async function fetchPublicData() {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("public_profiles")
          .select("user_id, is_enabled")
          .eq("share_token", token)
          .single();

        if (profileError || !profileData?.is_enabled) {
          throw new Error("This shared link is invalid or has been disabled by the owner.");
        }

        const userId = profileData.user_id;

        const { data: habitsData, error: habitsError } = await supabase
          .from("habits")
          .select("id, name, type, unit, decimals, goals, sort_index")
          .eq("user_id", userId)
          .order("sort_index", { ascending: true });

        if (habitsError) throw new Error("Failed to load habits.");

        const { data: entriesData, error: entriesError } = await supabase
          .from("entries")
          .select("date_iso, habit_id, value")
          .eq("user_id", userId)
          .gte("date_iso", `${year}-01-01`)
          .lte("date_iso", `${year}-12-31`);

        if (entriesError) throw new Error("Failed to load entries.");

        const parsedHabits = habitsData.map(normalizePublicHabit);
        const parsedEntries = {};
        entriesData.forEach((e) => {
          if (!parsedEntries[e.date_iso]) parsedEntries[e.date_iso] = {};
          parsedEntries[e.date_iso][e.habit_id] = e.value;
        });

        setPublicState({ habits: parsedHabits, entries: parsedEntries });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPublicData();
  }, [token, year]);

  const selectedYear = year;

  const yearSummary = useMemo(() => {
    const out = publicState.habits.map((h) => {
      const st = habitStats(h, publicState.entries, selectedYear);
      return { habit: h, stats: st };
    });
    out.sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0));
    return out;
  }, [publicState.habits, publicState.entries, selectedYear]);

  const monthSummary = useMemo(() => {
    const out = publicState.habits.map((h) => {
      const st = habitStats(h, publicState.entries, selectedYear, dashboardMonth);
      return { habit: h, stats: st };
    });
    out.sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0));
    return out;
  }, [publicState.habits, publicState.entries, selectedYear, dashboardMonth]);

  const dashboardSummaryItems = dashboardSummaryMode === "month" ? monthSummary : yearSummary;
  const dashboardSummaryLabel = dashboardSummaryMode === "month" ? `${dashboardMonth}-${selectedYear}` : `${selectedYear}`;

  const effectiveFocusedHabitId = focusedHabitId || publicState.habits[0]?.id || "";

  const focusedHabit = useMemo(
    () => publicState.habits.find((h) => h.id === effectiveFocusedHabitId) || publicState.habits[0],
    [publicState.habits, effectiveFocusedHabitId]
  );

  const focusedSeries = useMemo(() => {
    if (!focusedHabit) return [];
    if (dashboardSummaryMode === "month") {
      return buildHabitSeries(focusedHabit, publicState.entries, selectedYear, dashboardMonth);
    }
    return buildHabitSeries(focusedHabit, publicState.entries, selectedYear);
  }, [focusedHabit, publicState.entries, selectedYear, dashboardMonth, dashboardSummaryMode]);

  const focusedStats = useMemo(() => {
    if (!focusedHabit) return null;
    if (dashboardSummaryMode === "month") {
      return habitStats(focusedHabit, publicState.entries, selectedYear, dashboardMonth);
    }
    return habitStats(focusedHabit, publicState.entries, selectedYear);
  }, [focusedHabit, publicState.entries, selectedYear, dashboardMonth, dashboardSummaryMode]);


  /* -------------------------------------------------------------------------- */
  /* LOADING & ERROR STATES                                                     */
  /* -------------------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h3 className="text-[16px] font-bold text-foreground tracking-tight">Loading Profile</h3>
        <p className="text-[14px] text-muted-foreground mt-1">Fetching habit data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background">
        <div className="glass-card rounded-[32px] p-8 max-w-sm w-full text-center flex flex-col items-center shadow-2xl border-destructive/20 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-destructive/10 p-4 rounded-full mb-5 shadow-inner border border-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight text-foreground">Access Denied</h2>
          <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* MAIN PUBLIC VIEW RENDER                                                    */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen w-full text-foreground text-[15px] font-sans antialiased selection:bg-primary/20">
      <div className="relative mx-auto max-w-6xl p-6 md:p-8 space-y-6 md:space-y-8 z-10">
        
        {/* HEADER */}
        <header className="glass-card rounded-[32px] px-6 py-4 flex items-center justify-between transition-all duration-300">
          
          {/* Removed flex-wrap to keep things inline */}
          <div className="flex items-center gap-4">
            
            {/* Added whitespace-nowrap to prevent the title from breaking to two lines */}
            <h1 className="text-[20px] font-bold tracking-tight flex items-center gap-3 whitespace-nowrap">
              Habit Tracker
              
              {/* Changed inline-flex to hidden sm:inline-flex so it disappears on mobile */}
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase shadow-inner">
                <Lock className="h-3 w-3" /> Shared View
              </span>
            </h1>
          </div>
          
          <Button 
            onClick={toggleTheme} 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </header>

        {/* DASHBOARD COLUMNS */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch animate-in fade-in duration-500">
          
          {/* 1. SUMMARY COLUMN */}
          <div className="flex flex-col gap-4 w-full">
            
            {/* OUTSIDE THE BOX: Header */}
            <div className="px-2 space-y-1">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground">Summary</h2>
              <p className="text-[14px] text-muted-foreground">{dashboardSummaryLabel}</p>
            </div>

            {/* INSIDE THE BOX */}
            <div className="glass-card rounded-[32px] p-6 sm:px-8 flex-1 flex flex-col gap-6 min-h-[300px]">
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex h-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 backdrop-blur-md p-1 border border-black/5 dark:border-white/5 shadow-inner">
                  <button
                    onClick={() => setDashboardSummaryMode("year")}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-[13px] font-semibold transition-all duration-300 ${
                      dashboardSummaryMode === "year"
                        ? "bg-white dark:bg-black/60 text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/5"
                    }`}
                  >
                    Yearly
                  </button>
                  <button
                    onClick={() => setDashboardSummaryMode("month")}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-[13px] font-semibold transition-all duration-300 ${
                      dashboardSummaryMode === "month"
                        ? "bg-white dark:bg-black/60 text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/5"
                    }`}
                  >
                    Monthly
                  </button>
                </div>

                {dashboardSummaryMode === "month" && (
                  <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
                    <SelectTrigger className="h-10 w-[120px] rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-md shadow-sm border border-white/20 dark:border-white/10 font-medium focus:ring-2 focus:ring-primary/40 transition-all">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl glass-card">
                      {[
                        { val: "01", label: "Jan" }, { val: "02", label: "Feb" }, { val: "03", label: "Mar" },
                        { val: "04", label: "Apr" }, { val: "05", label: "May" }, { val: "06", label: "Jun" },
                        { val: "07", label: "Jul" }, { val: "08", label: "Aug" }, { val: "09", label: "Sep" },
                        { val: "10", label: "Oct" }, { val: "11", label: "Nov" }, { val: "12", label: "Dec" }
                      ].map(m => (
                        <SelectItem key={m.val} value={m.val} className="rounded-lg font-medium">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex-1 flex flex-col">
                {dashboardSummaryItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-700 flex-1">
                    <div className="bg-black/5 dark:bg-white/10 p-4 rounded-full mb-4 shadow-sm border border-black/5 dark:border-white/5">
                      <BarChart3 className="h-8 w-8 opacity-40 text-muted-foreground" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-foreground/70 tracking-tight">No habits logged</h3>
                    <p className="text-[14px] text-muted-foreground/60 max-w-[220px] mt-1.5 leading-relaxed">
                      This user hasn't logged any data yet.
                    </p>
                  </div>
                ) : (
                  <YearSummaryList
                    items={dashboardSummaryItems}
                    selectedHabitId={effectiveFocusedHabitId}
                    onSelectHabit={setFocusedHabitId}
                    mode={dashboardSummaryMode}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 2. TREND COLUMN */}
          <div className="flex flex-col gap-4 w-full">
            
            {/* OUTSIDE THE BOX: Header */}
            <div className="px-2 space-y-1">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground">Habit Trend</h2>
              <p className="text-[14px] text-muted-foreground font-medium">
                {focusedHabit ? `Analyzing ${focusedHabit.name}` : "Select a habit to view trends"}
              </p>
            </div>
            
            {/* INSIDE THE BOX */}
            <div className="glass-card rounded-[32px] p-6 sm:px-8 flex-1 flex flex-col gap-6 relative overflow-hidden min-h-[300px]">
              <div className="flex-1 flex flex-col relative z-10">
                {focusedHabit ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <HabitStatsGrid habit={focusedHabit} stats={focusedStats} mode={dashboardSummaryMode} />
                    
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/10 shadow-inner">
                      <TrendChart
                        series={focusedSeries}
                        habit={focusedHabit}
                        year={selectedYear}
                        gradientPrefix="public"
                        emptyLabel={`No data yet for this habit in ${dashboardSummaryLabel}.`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-700 flex-1">
                    <div className="bg-black/5 dark:bg-white/10 p-4 rounded-full mb-4 shadow-sm border border-black/5 dark:border-white/5">
                      <BarChart3 className="h-8 w-8 opacity-40 text-muted-foreground" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-foreground/70 tracking-tight">Not enough data</h3>
                    <p className="text-[14px] text-muted-foreground/60 max-w-[220px] mt-1.5 leading-relaxed">
                      No habit selected to visualize progress.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}