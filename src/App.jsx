import React, { useCallback, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Settings, Link as LinkIcon, Loader2, LogOut, CheckCircle2, AlertCircle, Sun, Moon } from "lucide-react";

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
import { useTheme } from "./hooks/useTheme";

export default function HabitTrackerMVP() {
  const { theme, toggleTheme } = useTheme();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    <div className="min-h-screen w-full text-foreground text-[15px] font-sans antialiased selection:bg-primary/20">
      <div className="relative mx-auto max-w-6xl p-6 md:p-8 space-y-6 md:space-y-8 z-10">
        
        <header className="relative flex items-center justify-between bg-background/70 backdrop-blur-[10px] rounded-2xl px-6 py-4 shadow-apple border border-border/20">
          
          {/* LEFT SIDE: Title & Cloud Status */}
          <div className="flex items-center gap-3 md:gap-4">
            <h1 className="text-xl font-semibold tracking-tight">Habit Tracker</h1>
            
            <div className="hidden md:flex items-center">
              {cloudError ? (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
                  <AlertCircle className="h-3.5 w-3.5" /> Error
                </span>
              ) : cloudReady ? (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500/70" /> Synced
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing
                </span>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Desktop Share Button (Hidden on tiny mobile screens) */}
            <div className="hidden sm:flex items-center gap-3">
              <ShareStatus shareError={shareError} shareOk={shareOk} />
              <Button onClick={handleCreateShareLink} variant="default" className="gap-2 rounded-full px-5 shadow-sm" disabled={shareBusy}>
                {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />} Share
              </Button>
            </div>

            {/* UNIFIED SETTINGS MODAL */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <SettingsIcon className="h-[1.2rem] w-[1.2rem]" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm rounded-2xl p-6">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-[17px] font-semibold tracking-tight text-center">Settings</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6">
                  
                  {/* Section: Appearance */}
                  <div className="space-y-2.5">
                    <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Appearance</h3>
                    <Button 
                      onClick={toggleTheme} 
                      variant="ghost" 
                      className="w-full justify-between rounded-xl h-12 px-4 bg-muted/40 hover:bg-muted/60 text-[15px] font-medium shadow-none transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {theme === "dark" ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                        Theme
                      </div>
                      <span className="text-muted-foreground text-[13px] font-normal">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
                    </Button>
                  </div>

                  {/* Section: Data & Time */}
                  <div className="space-y-2.5">
                    <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Data</h3>
                    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 h-12">
                      <span className="text-[15px] font-medium">Tracking Year</span>
                      <YearPicker
                        value={selectedYear}
                        onChange={handleYearChange}
                        options={yearOptions}
                        triggerClassName="h-8 rounded-lg bg-background/80 border-0 shadow-sm focus:ring-0 text-[13px] font-medium"
                        labelClassName="hidden"
                      />
                    </div>
                  </div>

                  {/* Section: Mobile Share (Only visible on phones) */}
                  <div className="sm:hidden space-y-2.5">
                    <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Share</h3>
                    <Button onClick={handleCreateShareLink} variant="default" className="w-full gap-2 rounded-xl h-12 text-[15px] font-medium shadow-sm" disabled={shareBusy}>
                      {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />} Share Public Link
                    </Button>
                    <div className="flex justify-center pt-1">
                      <ShareStatus shareError={shareError} shareOk={shareOk} />
                    </div>
                  </div>

                  {/* Section: Account */}
                  <div className="space-y-2.5">
                    <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Account</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => { exportJSON(); setSettingsOpen(false); }} variant="ghost" className="gap-2 rounded-xl h-11 text-[13px] bg-muted/40 hover:bg-muted/60 shadow-none">
                        <Download className="h-4 w-4" /> Export Data
                      </Button>
                      <Button onClick={() => { handleSignOut(); setSettingsOpen(false); }} variant="ghost" className="gap-2 rounded-xl h-11 text-[13px] bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive shadow-none">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </Button>
                    </div>
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
              className="rounded-full text-[13px] font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Daily Log
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="rounded-full text-[13px] font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-full text-[13px] font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-6 mt-6">
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

          <TabsContent value="dashboard" className="space-y-6 mt-6">
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

          <TabsContent value="history" className="space-y-6 mt-6">
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