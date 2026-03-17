import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

      const nextHabitsRaw = res.data?.habits ?? [];
      const nextEntries = res.data?.entries ?? {};
      const nextHabits = (nextHabitsRaw || []).map(normalizePublicHabit);

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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Select value={dashboardSummaryMode} onValueChange={setDashboardSummaryMode}>
                      <SelectTrigger className="w-auto h-auto px-0 py-0 border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 rounded-none">
                        <div className="text-base font-semibold tracking-tight">
                          <SelectValue placeholder="Year Summary" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Year Summary</SelectItem>
                        <SelectItem value="month">Month Summary</SelectItem>
                      </SelectContent>
                    </Select>
                    {dashboardSummaryMode === "month" ? (
                      <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
                        <SelectTrigger className="w-[140px] rounded-2xl bg-background/60 shadow-sm border-0 focus:ring-2 focus:ring-muted/30">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
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
                    ) : (
                      <div />
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">Totals for {dashboardSummaryLabel}.</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <YearSummaryList
                  items={dashboardSummaryItems}
                  selectedHabitId={effectiveFocusedHabitId}
                  onSelectHabit={(id) => setFocusedHabitId(id)}
                  mode={dashboardSummaryMode}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold tracking-tight">Trend</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {focusedHabit ? `Showing: ${focusedHabit.name} (${dashboardSummaryLabel})` : "Pick a habit"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {focusedHabit ? (
                  <>
                    <HabitStatsGrid habit={focusedHabit} stats={focusedStats} mode={dashboardSummaryMode} />
                    <TrendChart
                      series={focusedSeries}
                      habit={focusedHabit}
                      year={year}
                      gradientPrefix="public"
                      emptyLabel={`No data yet for this habit in ${dashboardSummaryLabel}.`}
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
                  const expanded = !!expandedDates[d];
                  return (
                    <div key={d} className="rounded-2xl bg-background/60 shadow-sm p-3">
                      <div
                        className={`flex items-center justify-between gap-3 cursor-pointer select-none rounded-xl px-2 py-1 transition-colors ${expanded ? "bg-muted/40" : "hover:bg-muted/30"}`}
                        onClick={() =>
                          setExpandedDates((prev) => ({
                            ...(prev || {}),
                            [d]: !prev?.[d],
                          }))
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setExpandedDates((prev) => ({
                              ...(prev || {}),
                              [d]: !prev?.[d],
                            }));
                          }
                        }}
                      >
                        <div className={`text-sm tracking-tight ${expanded ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                          {formatPrettyDate(d)}
                        </div>
                        <div className={`text-xs transition-colors ${expanded ? "text-foreground/70" : "text-muted-foreground"}`}>
                          {items.length} item{items.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      {expanded ? (
                        items.length ? (
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
                        )
                      ) : null}
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