import React from "react";
import { CalendarX } from "lucide-react";
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
    <div className="space-y-6">
      {/* Refined Header Section */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-foreground">History</h2>
          <p className="text-[14px] text-muted-foreground">
            {filteredHistory.length} days of consistency
          </p>
        </div>

        <Select value={historyMonth} onValueChange={setHistoryMonth}>
          <SelectTrigger className="h-9 w-[120px] rounded-full bg-white/5 border-white/10 backdrop-blur-sm text-[13px] font-medium hover:bg-white/10 transition-all">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-white/10 bg-background/80 backdrop-blur-xl">
            <SelectItem value="all">All Time</SelectItem>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
              <SelectItem key={m} value={m}>{new Date(2026, m-1).toLocaleString('default', { month: 'short' })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[400px]">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground rounded-3xl border border-dashed border-white/10">
            <CalendarX className="h-10 w-10 mb-4 opacity-20" />
            <div className="text-[17px] font-semibold text-foreground/50">No activity found</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((d, index) => (
              <div
                key={d}
                style={{
                  animation: `fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 30}ms both`
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
        )}
      </div>
    </div>
  );
}