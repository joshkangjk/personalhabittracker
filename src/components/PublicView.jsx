// src/components/PublicView.jsx
import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, History, BarChart3, Lock } from "lucide-react";

import { formatPrettyDate } from "../lib/helpers";
import {
  listDatesInYear,
  habitStats,
  habitStatsMonth,
  buildHabitSeries,
  buildHabitSeriesMonth,
  entryToDisplay
} from "../lib/stats";
import { normalizePublicHabit } from "../services/habitService";
import { YearSummaryList, HabitStatsGrid, TrendChart } from "./DashboardWidgets";

export default function PublicView({ token }) {
  const [year] = useState(new Date().getFullYear());
  const [dashboardSummaryMode, setDashboardSummaryMode] = useState("year");
  const [dashboardMonth, setDashboardMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publicState, setPublicState] = useState({ habits: [], entries: {} });
  const [focusedHabitId, setFocusedHabitId] = useState("");
  const [expandedDates, setExpandedDates] = useState(() => ({}));

  const habits = useMemo(() => publicState.habits || [], [publicState.habits]);
  const entries = useMemo(() => publicState.entries || {}, [publicState.entries]);

  const yearSummary = useMemo(() => {
    const out = (habits || []).map((h) => ({ habit: h, stats: habitStats(h, entries, year) }));
    out.sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0));
    return out;
  }, [habits, entries, year]);

  const monthSummary = useMemo(() => {
    const out = (habits || []).map((h) => ({ habit: h, stats: habitStatsMonth(h, entries, year, dashboardMonth) }));
    out.sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0));
    return out;
  }, [habits, entries, year, dashboardMonth]);

  const dashboardSummaryItems = dashboardSummaryMode === "month" ? monthSummary : yearSummary;
  const dashboardSummaryLabel = dashboardSummaryMode === "month" ? `${dashboardMonth}-${year}` : `${year}`;

  const effectiveFocusedHabitId = focusedHabitId || habits[0]?.id || "";

  const focusedHabit = useMemo(
    () => (habits || []).find((h) => h.id === effectiveFocusedHabitId) || habits[0],
    [habits, effectiveFocusedHabitId]
  );

  const focusedSeries = useMemo(() => {
    if (!focusedHabit) return [];
    if (dashboardSummaryMode === "month") {
      return buildHabitSeriesMonth(focusedHabit, entries, year, dashboardMonth);
    }
    return buildHabitSeries(focusedHabit, entries, year);
  }, [focusedHabit, entries, year, dashboardMonth, dashboardSummaryMode]);

  const focusedStats = useMemo(() => {
    if (!focusedHabit) return null;
    if (dashboardSummaryMode === "month") {
      return habitStatsMonth(focusedHabit, entries, year, dashboardMonth);
    }
    return habitStats(focusedHabit, entries, year);
  }, [focusedHabit, entries, year, dashboardMonth, dashboardSummaryMode]);

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

      // Handle null/empty states safely
      const rawHabits = res.data?.habits;
      const nextHabitsRaw = Array.isArray(rawHabits) ? rawHabits : [];
      const nextEntries = res.data?.entries ?? {};
      const nextHabits = nextHabitsRaw.map(normalizePublicHabit);

      setPublicState({ habits: nextHabits, entries: nextEntries });

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
      <div className="min-h-screen flex items-center justify-center text-sm font-medium text-muted-foreground">
        Loading shared tracker...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-medium text-destructive bg-destructive/5">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full text-foreground text-[15px] font-sans antialiased selection:bg-primary/20">
      <div className="relative mx-auto max-w-6xl p-4 md:p-6 space-y-4 md:space-y-6 z-10">
        
        {/* PREMIUM HEADER */}
        <header className="relative flex flex-col sm:flex-row sm:items-center justify-between bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50 rounded-2xl px-4 py-3 shadow-sm border border-border/40 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Habit Tracker</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-full border border-border/50">
            <Lock className="h-3.5 w-3.5" />
            Public View
          </div>
        </header>

        <div className="grid gap-4 lg:gap-6">
          <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
            
            {/* 1. SUMMARY CARD (Subdued) */}
            <Card className="rounded-2xl bg-background/40 backdrop-blur shadow-sm border-0">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Segmented Control / Pill Toggle */}
                    <div className="inline-flex h-9 items-center justify-center rounded-full bg-muted/60 p-1 text-muted-foreground shadow-inner">
                      <button
                        onClick={() => setDashboardSummaryMode("year")}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1 text-sm font-medium transition-all duration-200 ${
                          dashboardSummaryMode === "year"
                            ? "bg-background text-foreground shadow-sm"
                            : "hover:text-foreground"
                        }`}
                      >
                        Yearly
                      </button>
                      <button
                        onClick={() => setDashboardSummaryMode("month")}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1 text-sm font-medium transition-all duration-200 ${
                          dashboardSummaryMode === "month"
                            ? "bg-background text-foreground shadow-sm"
                            : "hover:text-foreground"
                        }`}
                      >
                        Monthly
                      </button>
                    </div>

                    {/* Conditional Month Selector */}
                    {dashboardSummaryMode === "month" && (
                      <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
                        <SelectTrigger className="h-9 w-[110px] rounded-full bg-background/60 shadow-sm border border-border/50 focus:ring-2 focus:ring-primary/20 transition-all">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="01" className="rounded-lg">Jan</SelectItem>
                          <SelectItem value="02" className="rounded-lg">Feb</SelectItem>
                          <SelectItem value="03" className="rounded-lg">Mar</SelectItem>
                          <SelectItem value="04" className="rounded-lg">Apr</SelectItem>
                          <SelectItem value="05" className="rounded-lg">May</SelectItem>
                          <SelectItem value="06" className="rounded-lg">Jun</SelectItem>
                          <SelectItem value="07" className="rounded-lg">Jul</SelectItem>
                          <SelectItem value="08" className="rounded-lg">Aug</SelectItem>
                          <SelectItem value="09" className="rounded-lg">Sep</SelectItem>
                          <SelectItem value="10" className="rounded-lg">Oct</SelectItem>
                          <SelectItem value="11" className="rounded-lg">Nov</SelectItem>
                          <SelectItem value="12" className="rounded-lg">Dec</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      Leaderboard ({dashboardSummaryLabel})
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {dashboardSummaryItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-background/30 rounded-xl border border-dashed border-border/50">
                    <BarChart3 className="h-8 w-8 mb-3 opacity-30" />
                    <div className="text-sm font-medium">No habits to show</div>
                  </div>
                ) : (
                  <YearSummaryList
                    items={dashboardSummaryItems}
                    selectedHabitId={effectiveFocusedHabitId}
                    onSelectHabit={(id) => setFocusedHabitId(id)}
                    mode={dashboardSummaryMode}
                  />
                )}
              </CardContent>
            </Card>

            {/* 2. TREND CARD (Dominant) */}
            <Card className="rounded-2xl bg-background/80 backdrop-blur-md shadow-md border border-primary/10 ring-1 ring-black/5 dark:ring-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
              <CardHeader className="pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold tracking-tight">Habit Trend</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {focusedHabit ? `Analyzing ${focusedHabit.name}` : "No habit selected"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {focusedHabit ? (
                  <div className="space-y-6">
                    <HabitStatsGrid habit={focusedHabit} stats={focusedStats} mode={dashboardSummaryMode} />
                    <div className="p-1 bg-background/50 rounded-xl border border-border/40 shadow-inner">
                      <TrendChart
                        series={focusedSeries}
                        habit={focusedHabit}
                        year={year}
                        gradientPrefix="public"
                        emptyLabel={`No data yet for this habit in ${dashboardSummaryLabel}.`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-background/30 rounded-xl border border-dashed border-border/50">
                    <BarChart3 className="h-8 w-8 mb-3 opacity-30" />
                    <div className="text-sm font-medium">Not enough data</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 3. HISTORY TIMELINE CARD */}
          <Card className="rounded-2xl bg-background/40 backdrop-blur shadow-sm border-0">
            <CardHeader className="pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold tracking-tight">Activity Log</CardTitle>
                <p className="text-sm text-muted-foreground">Last 30 days of activity.</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {recentDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-background/30 rounded-xl border border-dashed border-border/50">
                  <History className="h-8 w-8 mb-3 opacity-30" />
                  <div className="text-sm font-medium">No recent logs</div>
                </div>
              ) : (
                <div className="relative mt-2">
                  {recentDates.map((d, index) => {
                    const day = entries[d] || {};
                    const items = (habits || [])
                      .map((h) => {
                        const e = day[h.id];
                        if (!e) return null;
                        return { id: h.id, label: h.name, value: entryToDisplay(h, e) };
                      })
                      .filter(Boolean);
                    
                    if (items.length === 0) return null; // Skip empty days in the timeline
                    
                    const expanded = !!expandedDates[d];
                    const isLast = index === recentDates.length - 1;

                    return (
                      <div key={d} className="flex gap-4 w-full">
                        
                        {/* Timeline Spine */}
                        <div className="flex flex-col items-center relative z-10 w-4 shrink-0">
                          <div 
                            className={`mt-4 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm transition-all duration-300 ${
                              expanded 
                                ? "bg-primary ring-4 ring-primary/20 scale-110" 
                                : "bg-muted-foreground/40 hover:bg-muted-foreground"
                            }`} 
                          />
                          {!isLast && (
                            <div className="w-px h-full bg-border/50 mt-2" />
                          )}
                        </div>

                        {/* Timeline Content */}
                        <div className="flex-1 pb-6">
                          <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                            expanded 
                              ? "bg-background/80 shadow-md border-border/60 backdrop-blur-md" 
                              : "bg-background/40 shadow-sm border-border/20 hover:border-border/40 hover:bg-background/60"
                          }`}>
                            
                            <div
                              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer select-none group"
                              onClick={() => setExpandedDates(prev => ({ ...prev, [d]: !prev[d] }))}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setExpandedDates(prev => ({ ...prev, [d]: !prev[d] }));
                                }
                              }}
                            >
                              <div className="space-y-0.5">
                                <div className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground">
                                  {formatPrettyDate(d)}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground transition-colors">
                                  {items.length} completed habit{items.length === 1 ? "" : "s"}
                                </div>
                              </div>
                              
                              <div className={`p-1.5 rounded-full transition-all duration-300 ${expanded ? "bg-primary/10 text-primary rotate-180" : "bg-transparent text-muted-foreground"}`}>
                                <ChevronDown className="h-4 w-4" />
                              </div>
                            </div>

                            {expanded && (
                              <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-2 pt-1 border-t border-border/40">
                                {items.map((it) => (
                                  <div key={it.id} className="flex items-center justify-between gap-3 rounded-xl bg-background/50 shadow-sm border border-transparent px-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                      <div className="text-sm font-semibold">{it.label}</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded">
                                      {it.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}