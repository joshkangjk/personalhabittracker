import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { CalendarX } from "lucide-react";
import CalendarGrid from "./CalendarGrid";
import HistoryDay from "./HistoryDay";
import { formatPrettyDate } from "../lib/helpers";
import { entryToDisplay } from "../lib/stats";

export default function HistoryTab({ entries, habits, removeLog }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const detailRef = useRef(null);

  const selectedEntries = entries[selectedDate] || {};
  const hasLogs = Object.keys(selectedEntries).length > 0;
  
  const handleDateSelect = (dateISO) => {
    setSelectedDate(dateISO);
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    // Changed `items-start` to `items-stretch` so both columns share the same total height
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch animate-in fade-in duration-500">
      
      {/* LEFT COLUMN: THE NAVIGATOR */}
      <div className="w-full lg:w-[360px] flex flex-col gap-4 shrink-0">
        <div className="px-2">
          <h2 className="text-[22px] font-bold tracking-tight text-foreground">History</h2>
        </div>

        <div className="glass-card rounded-[32px] p-6 sm:px-8 transition-all hover:ring-1 hover:ring-white/30">
          <CalendarGrid 
            viewDate={viewDate}
            setViewDate={setViewDate}
            entries={entries}
            habits={habits}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: THE DETAIL INSPECTOR */}
      <div ref={detailRef} className="flex-1 w-full flex flex-col gap-4 scroll-mt-6">
        <div className="flex flex-col px-2">
          <h2 className="text-[22px] font-bold tracking-tight text-foreground">
            {format(new Date(selectedDate + 'T00:00:00'), "EEEE, MMMM do")}
          </h2>
          <p className="text-[14px] text-muted-foreground">Daily activity details</p>
        </div>

        {/* Removed min-h and h-fit. flex-1 allows it to dynamically match the calendar's height */}
        <div className="glass-card flex-1 rounded-[32px] p-6 sm:px-8 relative overflow-hidden flex flex-col">
          {hasLogs ? (
            <div className="animate-detail-view space-y-2">
              <HistoryDay
                dateISO={selectedDate}
                dayEntries={selectedEntries}
                habits={habits}
                onDeleteOne={(habitId) => removeLog(selectedDate, habitId)}
                formatPrettyDate={formatPrettyDate}
                entryToDisplay={entryToDisplay}
                isLast={true}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-4 text-center animate-in fade-in zoom-in-95 duration-700 flex-1">
              <div className="bg-black/5 dark:bg-white/10 p-4 rounded-full mb-4 shadow-sm border border-black/5 dark:border-white/5">
                <CalendarX className="h-8 w-8 opacity-40 text-muted-foreground" />
              </div>
              
              <h3 className="text-[16px] font-semibold text-foreground/70 tracking-tight">Quiet Day</h3>
              <p className="text-[14px] text-muted-foreground/60 max-w-[200px] mt-1.5 leading-relaxed">
                No habits were recorded.
              </p>
              
              <button 
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  handleDateSelect(today);
                  setViewDate(new Date());
                }}
                className="mt-6 px-6 py-2.5 rounded-full bg-primary text-[14px] font-bold text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
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