// src/components/DashboardTab.jsx
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3 } from "lucide-react";
import { YearSummaryList, HabitStatsGrid, TrendChart } from "./DashboardWidgets";

export default function DashboardTab({
  dashboardSummaryMode,
  setDashboardSummaryMode,
  dashboardMonth,
  setDashboardMonth,
  dashboardSummaryLabel,
  dashboardSummaryItems,
  effectiveFocusedHabitId,
  setFocusedHabitId,
  focusedHabit,
  focusedStats,
  focusedSeries,
  selectedYear
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch animate-in fade-in duration-500">
      
      {/* 1. SUMMARY COLUMN */}
      <div className="flex flex-col gap-4 w-full">
        
        {/* OUTSIDE THE BOX: Header */}
        <div className="px-2 space-y-1">
          <h2 className="text-[22px] font-bold tracking-tight text-foreground">Summary</h2>
          <p className="text-[14px] text-muted-foreground">{dashboardSummaryLabel}</p>
        </div>

        {/* INSIDE THE BOX: Content & Controls */}
        <div className="glass-card rounded-[32px] p-6 sm:px-8 flex-1 flex flex-col gap-6 min-h-[300px]">
          
          {/* Controls nested inside to keep the top of the glass cards aligned */}
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
                  Check off some habits to see your summary.
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
        
        {/* INSIDE THE BOX: Content */}
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
                    gradientPrefix="private"
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
                  Add a habit first to visualize your progress.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}