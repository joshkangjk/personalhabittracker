import React, { useCallback, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, MoreVertical, Link as LinkIcon, Loader2 } from "lucide-react";

import LoginScreen from "./components/LoginScreen";
import PublicView from "./components/PublicView";
import DailyLogTab from "./components/DailyLogTab";
import DashboardTab from "./components/DashboardTab";
import HistoryTab from "./components/HistoryTab";
import { YearPicker, ShareStatus } from "./components/DashboardWidgets";

import { todayISO, makeShareToken, monthFromISO, getPublicTokenFromPath, buildYearOptions } from "./lib/helpers";
import { listDatesInYear, habitStats, habitStatsMonth, buildHabitSeries, buildHabitSeriesMonth } from "./lib/stats";

import { useHabitData } from "./hooks/useHabitData";
import { useIsMobile } from "./hooks/useIsMobile";
import { useHabitDragAndDrop } from "./hooks/useHabitDragAndDrop";

export default function HabitTrackerMVP() {
  const {
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
    reorderHabits,
    reorderHabitsLocal,
    persistHabitOrder
  } = useHabitData();

  const [historyMonth, setHistoryMonth] = useState("all");
  const [dashboardMonth, setDashboardMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [dashboardSummaryMode, setDashboardSummaryMode] = useState("year");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [focusedHabitId, setFocusedHabitId] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareOk, setShareOk] = useState(false);
  const [shareError, setShareError] = useState("");

  const isMobile = useIsMobile();

  const { getHabitDnDProps } = useHabitDragAndDrop({
    isMobile,
    reorderHabitsLocal,
    reorderHabits,
    persistHabitOrder
  });

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

  const yearOptions = useMemo(() => buildYearOptions(), []);

  const handleYearChange = useCallback((v) => {
    setState((s) => ({ ...s, ui: { ...s.ui, selectedYear: Number(v) } }));
  }, [setState]);

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
  }, [setActiveDate]);

  const selectedYear = state.ui.selectedYear;

  const getHabitRowHandlers = useCallback(
    (habit) => {
      return {
        onLog: (value) => logValue(activeDate, habit, value),
        onDelete: () => deleteHabit(habit.id),
        onEditHabit: (patch) => updateHabit(habit.id, patch),
      };
    },
    [activeDate, deleteHabit, logValue, updateHabit]
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

  const monthSummary = useMemo(() => {
    const activeHabits = state.habits;
    const out = activeHabits.map((h) => {
      const st = habitStatsMonth(h, state.entries, selectedYear, dashboardMonth);
      return { habit: h, stats: st };
    });
    out.sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0));
    return out;
  }, [state.habits, state.entries, selectedYear, dashboardMonth]);

  const dashboardSummaryItems = dashboardSummaryMode === "month" ? monthSummary : yearSummary;
  const dashboardSummaryLabel = dashboardSummaryMode === "month" ? `${dashboardMonth}-${selectedYear}` : `${selectedYear}`;

  const effectiveFocusedHabitId = focusedHabitId || state.habits[0]?.id || "";

  const focusedHabit = useMemo(
    () => state.habits.find((h) => h.id === effectiveFocusedHabitId) || state.habits[0],
    [state.habits, effectiveFocusedHabitId]
  );

  const focusedSeries = useMemo(() => {
    if (!focusedHabit) return [];
    if (dashboardSummaryMode === "month") {
      return buildHabitSeriesMonth(focusedHabit, state.entries, selectedYear, dashboardMonth);
    }
    return buildHabitSeries(focusedHabit, state.entries, selectedYear);
  }, [focusedHabit, state.entries, selectedYear, dashboardMonth, dashboardSummaryMode]);

  const focusedStats = useMemo(() => {
    if (!focusedHabit) return null;
    if (dashboardSummaryMode === "month") {
      return habitStatsMonth(focusedHabit, state.entries, selectedYear, dashboardMonth);
    }
    return habitStats(focusedHabit, state.entries, selectedYear);
  }, [focusedHabit, state.entries, selectedYear, dashboardMonth, dashboardSummaryMode]);

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
          <TabsList className="sticky top-2 z-10 backdrop-blur-md grid w-full grid-cols-3 rounded-full bg-muted/50 p-1 shadow-inner">
            <TabsTrigger
              value="log"
              className="rounded-full text-sm transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Daily Log
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="rounded-full text-sm transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-full text-sm transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-4">
            <DailyLogTab
              habits={state.habits}
              entries={state.entries}
              activeDate={activeDate}
              handleActiveDateChange={handleActiveDateChange}
              addHabit={addHabit}
              isMobile={isMobile}
              getHabitRowHandlers={getHabitRowHandlers}
              getHabitDnDProps={getHabitDnDProps}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <DashboardTab
              dashboardSummaryMode={dashboardSummaryMode}
              setDashboardSummaryMode={setDashboardSummaryMode}
              dashboardMonth={dashboardMonth}
              setDashboardMonth={setDashboardMonth}
              dashboardSummaryLabel={dashboardSummaryLabel}
              dashboardSummaryItems={dashboardSummaryItems}
              effectiveFocusedHabitId={effectiveFocusedHabitId}
              setFocusedHabitId={setFocusedHabitId}
              focusedHabit={focusedHabit}
              focusedStats={focusedStats}
              focusedSeries={focusedSeries}
              selectedYear={selectedYear}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <HistoryTab
              historyMonth={historyMonth}
              setHistoryMonth={setHistoryMonth}
              filteredHistory={filteredHistory}
              entries={state.entries}
              habits={state.habits}
              removeLog={removeLog}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}