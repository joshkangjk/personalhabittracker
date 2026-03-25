// src/components/HistoryTab.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarX } from "lucide-react";
import HistoryDay from "./HistoryDay";
import { formatPrettyDate } from "../lib/helpers";
import { entryToDisplay } from "../lib/stats";

function useCountUp(value, duration = 400) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);

    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(interval);
  }, [value]);

  return display;
}

export default function HistoryTab({
  historyMonth,
  setHistoryMonth,
  filteredHistory,
  entries,
  habits,
  removeLog
}) {
  const animatedDays = useCountUp(filteredHistory.length);
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          
          {/* Top: Title */}
          <div>
            <CardTitle className="text-[20px] font-semibold tracking-tight">
              History
            </CardTitle>
            <p className="text-[13px] text-muted-foreground mt-1">
              Review your past activity and consistency.
            </p>
          </div>

          {/* Bottom: Controls */}
          <div className="flex items-center justify-between">
            <div className="text-[13px] text-muted-foreground">
              {animatedDays} days logged
            </div>

            <Select value={historyMonth} onValueChange={setHistoryMonth}>
              <SelectTrigger className="h-9 w-[140px] rounded-xl bg-muted/40 border-0 shadow-none focus:ring-2 focus:ring-primary/20 transition-all text-[13px] font-medium">
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-gradient-to-b from-transparent to-muted/20 rounded-2xl">
            <CalendarX className="h-9 w-9 mb-4 opacity-30" />
            <div className="text-[16px] font-semibold">No history yet</div>
            <div className="text-[13px] opacity-70 mt-1">
              Start logging habits to see your progress here.
            </div>
          </div>
        ) : (
          <>
            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mb-3" />
            <div className="relative mt-4 space-y-1">
              <div className="flex flex-col">
                {filteredHistory.map((d, index) => (
                  <div
                    key={d}
                    style={{
                      animation: `fadeUp 0.4s ease ${index * 40}ms both`
                    }}
                  >
                    <HistoryDay
                      dateISO={d}
                      dayEntries={entries[d]}
                      habits={habits}
                      onDeleteOne={(habitId) => removeLog(d, habitId)}
                      formatPrettyDate={formatPrettyDate}
                      entryToDisplay={entryToDisplay}
                      isLast={index === filteredHistory.length - 1}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}