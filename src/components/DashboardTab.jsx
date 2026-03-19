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
    <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
      
      {/* 1. SUMMARY CARD (Subdued, supporting role) */}
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
                Summary ({dashboardSummaryLabel})
              </p>
            </div>
            
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {dashboardSummaryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-background/30 rounded-xl border border-dashed border-border/50">
              <BarChart3 className="h-8 w-8 mb-3 opacity-30" />
              <div className="text-sm font-medium">No habits logged yet</div>
              <div className="text-xs opacity-70 mt-1">Check off some habits to see your summary.</div>
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
      <Card className="rounded-2xl bg-background/80 backdrop-blur-md shadow-md border border-primary/10 ring-1 ring-black/5 dark:ring-white/5 relative overflow-hidden">
        {/* Optional decorative glow inside the trend card */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        
        <CardHeader className="pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold tracking-tight">Habit Trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              {focusedHabit ? `Analyzing ${focusedHabit.name}` : "Select a habit to view trends"}
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
                  year={selectedYear}
                  gradientPrefix="private"
                  emptyLabel={`No data yet for this habit in ${dashboardSummaryLabel}.`}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-background/30 rounded-xl border border-dashed border-border/50">
              <BarChart3 className="h-8 w-8 mb-3 opacity-30" />
              <div className="text-sm font-medium">Not enough data</div>
              <div className="text-xs opacity-70 mt-1">Add a habit first to visualize your progress.</div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}