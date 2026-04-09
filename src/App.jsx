import React, { useCallback, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Settings as SettingsIcon, Link as LinkIcon, Loader2, LogOut, CheckCircle2, AlertCircle, Sun, Moon } from "lucide-react";

import LoginScreen from "./components/LoginScreen";
import PublicView from "./components/PublicView";
import DailyLogTab from "./components/DailyLogTab";
import DashboardTab from "./components/DashboardTab";
import HistoryTab from "./components/HistoryTab";
import { YearPicker, ShareStatus } from "./components/DashboardWidgets";

import { todayISO, makeShareToken, getPublicTokenFromPath, buildYearOptions } from "./lib/helpers";
import { habitStats, habitStatsMonth, buildHabitSeries, buildHabitSeriesMonth } from "./lib/stats";

import { useHabitData } from "./hooks/useHabitData";
import { useIsMobile } from "./hooks/useIsMobile";
import { useHabitDragAndDrop } from "./hooks/useHabitDragAndDrop";
import { useTheme } from "./hooks/useTheme";

import PullToRefresh from 'react-simple-pull-to-refresh';

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
    // 1. Try modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("Modern clipboard failed, trying fallback.");
      }
    }
    
    // 2. Bulletproof fallback for older iOS Safari
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      // Prevent zooming and scrolling issues on iOS
      ta.style.fontSize = "16px";
      ta.style.position = "fixed"; 
      ta.style.top = "0";
      ta.style.left = "-9999px";
      
      document.body.appendChild(ta);
      
      // iOS requires a specific selection method, standard .select() fails
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(ta);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        ta.setSelectionRange(0, 999999);
      } else {
        ta.select();
      }
      
      const success = document.execCommand("copy");
      document.body.removeChild(ta);
      return success;
    } catch (err) {
      return false;
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

      // 1. TRY NATIVE iOS/ANDROID SHARE SHEET FIRST
      if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        try {
          await navigator.share({
            title: "Habit Tracker",
            text: "Check out my habit progress!",
            url: url,
          });
          setShareOk(true);
          setTimeout(() => setShareOk(false), 2000);
          return; // Stop here if native share succeeds
        } catch (err) {
          // If user manually closes the share sheet, abort quietly
          if (err.name === "AbortError") return; 
          // Otherwise, fall through to the clipboard copy
        }
      }

      // 2. FALLBACK TO CLIPBOARD (For Desktop or if native share fails)
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
        
        <header className="glass-card rounded-[32px] px-6 py-4 flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-4">
            <h1 className="text-[20px] font-bold tracking-tight text-foreground">Habit Tracker</h1>
            
            <div className="hidden md:flex items-center">
              {cloudError ? (
                <span className="inline-flex h-7 items-center gap-1.5 text-[12px] font-bold text-destructive bg-destructive/10 px-3 rounded-full border border-destructive/20">
                  <AlertCircle className="h-3.5 w-3.5 -mt-[1px]" /> Error
                </span>
              ) : cloudReady ? (
                <span className="inline-flex h-7 items-center gap-1.5 text-[12px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 rounded-full border border-emerald-500/20 transition-all">
                  <CheckCircle2 className="h-3.5 w-3.5 -mt-[1px]" /> Synced
                </span>
              ) : (
                <span className="inline-flex h-7 items-center gap-1.5 text-[12px] font-bold text-primary bg-primary/10 px-3 rounded-full border border-primary/20 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin -mt-[1px]" /> Syncing
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <ShareStatus shareError={shareError} shareOk={shareOk} />
              <Button onClick={handleCreateShareLink} className="gap-2 rounded-full px-5 shadow-lg shadow-primary/20 bg-primary text-white hover:scale-105 active:scale-95 transition-all font-bold text-[13px]" disabled={shareBusy}>
                {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />} Share
              </Button>
            </div>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95">
                  <SettingsIcon className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              
              <DialogContent className="glass-card sm:max-w-sm rounded-[32px] p-6 sm:p-8 border-white/20 shadow-2xl overflow-hidden" aria-describedby={undefined}>
                <DialogHeader className="pb-4 relative z-10">
                  <DialogTitle className="text-[22px] font-bold tracking-tight text-center">Settings</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 relative z-10">
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2">Appearance</h3>
                    <Button 
                      onClick={toggleTheme} 
                      variant="ghost" 
                      className="w-full justify-between rounded-2xl h-14 px-5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 shadow-inner text-[15px] font-semibold transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                        Theme
                      </div>
                      <span className="text-muted-foreground text-[13px] font-medium bg-background px-3 py-1 rounded-lg shadow-sm border border-border/50">
                        {theme === "dark" ? "Dark" : "Light"}
                      </span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2">Data</h3>
                    <div className="flex items-center justify-between rounded-2xl bg-black/5 dark:bg-white/5 px-5 h-14 border border-black/5 dark:border-white/5 shadow-inner">
                      <span className="text-[15px] font-semibold">Tracking Year</span>
                      <YearPicker
                        value={selectedYear}
                        onChange={handleYearChange}
                        options={yearOptions}
                        triggerClassName="h-8 rounded-lg bg-background/80 border border-border/50 shadow-sm focus:ring-0 text-[13px] font-medium"
                        labelClassName="hidden"
                      />
                    </div>
                  </div>

                  <div className="sm:hidden space-y-3">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2">Share</h3>
                    <Button onClick={handleCreateShareLink} variant="secondary" className="w-full gap-2 rounded-2xl h-14 text-[15px] font-bold shadow-inner border border-primary/10 bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-[0.98]" disabled={shareBusy}>
                      {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />} Share Public Link
                    </Button>
                    <div className="flex justify-center pt-1">
                      <ShareStatus shareError={shareError} shareOk={shareOk} />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2">Account</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => { exportJSON(); setSettingsOpen(false); }} variant="ghost" className="gap-2 rounded-2xl h-12 text-[13px] font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 shadow-inner transition-all active:scale-95">
                        <Download className="h-4 w-4" /> Export Data
                      </Button>
                      <Button onClick={() => { handleSignOut(); setSettingsOpen(false); }} variant="ghost" className="gap-2 rounded-2xl h-12 text-[13px] font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/10 transition-all active:scale-95">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </Button>
                    </div>
                  </div>

                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Tabs defaultValue="log" className="w-full flex flex-col items-center mt-6 sm:mt-8">
          <TabsList className="sticky top-6 z-50 glass-card rounded-full p-1.5 shadow-2xl shadow-black/10 dark:shadow-black/40 border-white/20 mb-8 flex w-fit min-w-[340px] max-w-md transition-all">
            <TabsTrigger value="log" className="flex-1 rounded-full px-6 py-2.5 text-[14px] font-bold transition-all duration-300 ease-out data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 text-muted-foreground hover:text-foreground">
              Daily Log
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 rounded-full px-6 py-2.5 text-[14px] font-bold transition-all duration-300 ease-out data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 text-muted-foreground hover:text-foreground">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-full px-6 py-2.5 text-[14px] font-bold transition-all duration-300 ease-out data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 text-muted-foreground hover:text-foreground">
              History
            </TabsTrigger>
          </TabsList>

          <div className="w-full">
            <TabsContent value="log" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              <PullToRefresh 
                onRefresh={async () => window.location.reload()}
                pullingContent={""}
                refreshingContent={<div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
              >
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
              </PullToRefresh>
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
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

            <TabsContent value="history" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              <HistoryTab
                entries={state.entries}
                habits={state.habits}
                removeLog={removeLog}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}