// src/components/DashboardTab.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          {dashboardSummaryItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">Add habits to see stats.</div>
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
                year={selectedYear}
                gradientPrefix="private"
                emptyLabel={`No data yet for this habit in ${dashboardSummaryLabel}.`}
              />
              <div className="h-2" />
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Add a habit first.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}