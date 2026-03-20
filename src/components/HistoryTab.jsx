// src/components/HistoryTab.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarX } from "lucide-react";
import HistoryDay from "./HistoryDay";
import { formatPrettyDate } from "../lib/helpers";
import { entryToDisplay } from "../lib/stats";

export default function HistoryTab({
  historyMonth,
  setHistoryMonth,
  filteredHistory,
  entries,
  habits,
  removeLog
}) {
  return (
    <Card>
      <CardHeader className="pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Left Side: Titles */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="space-y-1">
              <CardTitle className="text-[17px] font-semibold tracking-tight">Activity Log</CardTitle>
            </div>
          </div>

          {/* Right Side: Month Selector */}
          <div className="flex items-center w-full sm:w-auto">
            <Select value={historyMonth} onValueChange={setHistoryMonth}>
              <SelectTrigger className="h-11 sm:h-9 w-full sm:w-[130px] rounded-full sm:rounded-2xl bg-background/80 shadow-sm border border-border/50 focus:ring-2 focus:ring-primary/20 transition-all text-[15px] sm:text-[13px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg text-[15px]">All Time</SelectItem>
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
          </div>

        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-background/30 rounded-xl border border-dashed border-border/50">
            <CalendarX className="h-8 w-8 mb-3 opacity-30" />
            <div className="text-[13px] font-medium">No history yet</div>
            <div className="text-[13px] opacity-70 mt-1">Your past logs will appear here.</div>
          </div>
        ) : (
          <div className="relative mt-2">
            {filteredHistory.map((d, index) => (
               <HistoryDay
                 key={d}
                 dateISO={d}
                 dayEntries={entries[d]}
                 habits={habits}
                 onDeleteOne={(habitId) => removeLog(d, habitId)}
                 formatPrettyDate={formatPrettyDate}
                 entryToDisplay={entryToDisplay}
                 isLast={index === filteredHistory.length - 1}
               />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}