// src/components/HistoryTab.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarX, History } from "lucide-react";
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
    <Card className="rounded-2xl bg-background/40 backdrop-blur shadow-sm border-0">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Activity Log</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Your past habits and progress.</p>
            </div>
          </div>

          <div className="flex items-center">
            <Select value={historyMonth} onValueChange={setHistoryMonth}>
              <SelectTrigger className="h-9 w-[130px] rounded-full bg-background/80 shadow-sm border border-border/50 focus:ring-2 focus:ring-primary/20 transition-all">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg">All Time</SelectItem>
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
            <div className="text-sm font-medium">No history yet</div>
            <div className="text-xs opacity-70 mt-1">Your past logs will appear here.</div>
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