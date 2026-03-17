// src/components/HistoryTab.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold tracking-tight">History</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Select value={historyMonth} onValueChange={setHistoryMonth}>
            <SelectTrigger className="w-[140px] rounded-2xl bg-background/60 shadow-sm border-0 focus:ring-2 focus:ring-muted/30">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {filteredHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground">No matching days found.</div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((d) => (
               <HistoryDay
                 key={d}
                 dateISO={d}
                 dayEntries={entries[d]}
                 habits={habits}
                 onDeleteOne={(habitId) => removeLog(d, habitId)}
                 formatPrettyDate={formatPrettyDate}
                 entryToDisplay={entryToDisplay}
               />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}