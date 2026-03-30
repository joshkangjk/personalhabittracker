import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarX, Activity, CheckCircle2 } from "lucide-react";
import CalendarGrid from "./CalendarGrid";
import HistoryDay from "./HistoryDay";
import { formatPrettyDate } from "../lib/helpers";
import { entryToDisplay } from "../lib/stats";

export default function HistoryTab({ entries, habits, removeLog }) {
  // 1. STATE MANAGEMENT
  // viewDate: Controls the calendar's current month view
  const [viewDate, setViewDate] = useState(new Date());
  
  // selectedDate: The ISO string (YYYY-MM-DD) of the day clicked in the calendar
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 2. DATA CALCULATIONS
  const selectedEntries = entries[selectedDate] || {};
  const hasLogs = Object.keys(selectedEntries).length > 0;
  
  // Calculate monthly completion for the "Quick Stats"
  const currentMonthStr = format(viewDate, "yyyy-MM");
  const monthlyLogs = Object.keys(entries).filter(d => d.startsWith(currentMonthStr));
  const totalPossible = monthlyLogs.length * habits.length;
  const totalCompleted = monthlyLogs.reduce((acc, date) => {
    return acc + Object.keys(entries[date]).length;
  }, 0);
  const monthlyRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start min-h-[600px] animate-in fade-in duration-700">
      
      {/* LEFT COLUMN: THE NAVIGATOR */}
      <div className="w-full lg:w-[340px] flex flex-col gap-6 shrink-0">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-foreground">History</h2>
          <p className="text-[14px] text-muted-foreground">Track your long-term consistency.</p>
        </div>

        {/* Glass Calendar Card */}
        <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-5 shadow-apple transition-all hover:border-white/20">
          <CalendarGrid 
            viewDate={viewDate}
            setViewDate={setViewDate}
            entries={entries}
            habits={habits}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        {/* Quick Month Stats Card */}
        <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4 flex items-center gap-4">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Monthly Intensity</p>
            <p className="text-[18px] font-bold text-foreground">{monthlyRate}% <span className="text-[13px] font-medium text-muted-foreground ml-1">completion</span></p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: THE DETAIL INSPECTOR */}
      <div className="flex-1 w-full flex flex-col gap-6">
        <div className="flex flex-col">
          <h2 className="text-[22px] font-bold tracking-tight text-foreground">
            {format(new Date(selectedDate + 'T00:00:00'), "EEEE, MMMM do")}
          </h2>
          <p className="text-[13px] text-muted-foreground">Detailed activity log</p>
        </div>

        <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-[32px] border border-white/10 p-6 shadow-apple min-h-[450px] relative overflow-hidden">
          {hasLogs ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 ease-out">
              <HistoryDay
                dateISO={selectedDate}
                dayEntries={selectedEntries}
                habits={habits}
                onDeleteOne={(habitId) => removeLog(selectedDate, habitId)}
                formatPrettyDate={formatPrettyDate}
                entryToDisplay={entryToDisplay}
                isLast={true}
              />
              
              {/* Optional "Completed All" Badge */}
              {Object.keys(selectedEntries).length === habits.length && (
                <div className="mt-8 flex items-center gap-2 text-primary font-medium text-[14px] bg-primary/10 w-fit px-4 py-2 rounded-full">
                  <CheckCircle2 className="h-4 w-4" />
                  Perfect Day!
                </div>
              )}
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-700">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                <div className="relative bg-white/5 border border-white/10 p-6 rounded-3xl shadow-inner">
                  <CalendarX className="h-12 w-12 text-muted-foreground/30" />
                </div>
              </div>
              
              <h3 className="text-[18px] font-bold text-foreground/80 tracking-tight">Quiet Day</h3>
              <p className="text-[14px] text-muted-foreground/60 max-w-[220px] mt-2 leading-relaxed">
                No habits were recorded for this date.
              </p>
              
              <button 
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                  setViewDate(new Date());
                }}
                className="mt-8 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[13px] font-semibold text-foreground hover:bg-white/10 transition-all active:scale-95"
              >
                Jump to Today
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}