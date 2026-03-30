// src/components/DashboardTab.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid md:grid-cols-2 gap-6 lg:gap-8 animate-in fade-in duration-500">
      
      {/* 1. SUMMARY CARD (Subdued, supporting role) */}
      <Card className="glass-card rounded-[32px] h-full flex flex-col">
        <CardHeader className="pb-6 pt-6 px-6 sm:px-8">
          <div className="flex flex-col gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Segmented Control / Pill Toggle - Upgraded to Glass */}
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

              {/* Conditional Month Selector */}
              {dashboardSummaryMode === "month" && (
                <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
                  <SelectTrigger className="h-10 w-[120px] rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-md shadow-sm border border-white/20 dark:border-white/10 font-medium focus:ring-2 focus:ring-primary/40 transition-all">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl glass-card">
                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                      <SelectItem key={m} value={m} className="rounded-lg font-medium">
                        {new Date(2026, parseInt(m)-1).toLocaleString('default', { month: 'short' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-foreground/80 tracking-tight">
                Summary ({dashboardSummaryLabel})
              </p>
            </div>
            
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 px-6 sm:px-8 pb-8 flex-1">
          {dashboardSummaryItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-black/5 dark:bg-white/5 rounded-[24px] border border-dashed border-black/10 dark:border-white/10">
              <div className="bg-white/50 dark:bg-white/10 p-4 rounded-full mb-4 shadow-sm border border-white/20 dark:border-white/5">
                <BarChart3 className="h-8 w-8 opacity-40" />
              </div>
              <div className="text-[16px] font-semibold text-foreground/70">No habits logged yet</div>
              <div className="text-[14px] opacity-70 mt-1 max-w-[200px] text-center leading-relaxed">Check off some habits to see your summary.</div>
            </div>
          ) : (
            <YearSummaryList
              items={dashboardSummaryItems}
              selectedHabitId={effectiveFocusedHabitId}
              onSelectHabit={setFocusedHabitId}
              mode={dashboardSummaryMode}
            />
          )}
        </CardContent>
      </Card>

      {/* 2. TREND CARD (Dominant, primary analytical tool) */}
      <Card className="glass-card rounded-[32px] relative overflow-hidden h-full flex flex-col">
        {/* Decorative glow inside the trend card */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        
        <CardHeader className="pb-6 pt-6 px-6 sm:px-8 relative z-10">
          <div className="space-y-1">
            <CardTitle className="text-[22px] font-bold tracking-tight text-foreground">Habit Trend</CardTitle>
            <p className="text-[14px] text-muted-foreground font-medium">
              {focusedHabit ? `Analyzing ${focusedHabit.name}` : "Select a habit to view trends"}
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-0 px-6 sm:px-8 pb-8 flex-1 relative z-10">
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
             <div className="h-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-black/5 dark:bg-white/5 rounded-[24px] border border-dashed border-black/10 dark:border-white/10">
              <div className="bg-white/50 dark:bg-white/10 p-4 rounded-full mb-4 shadow-sm border border-white/20 dark:border-white/5">
                <BarChart3 className="h-8 w-8 opacity-40" />
              </div>
              <div className="text-[16px] font-semibold text-foreground/70">Not enough data</div>
              <div className="text-[14px] opacity-70 mt-1 max-w-[200px] text-center leading-relaxed">Add a habit first to visualize your progress.</div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}