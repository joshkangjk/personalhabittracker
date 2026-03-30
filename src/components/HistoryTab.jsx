import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { CalendarX, CheckCircle2 } from "lucide-react";
import CalendarGrid from "./CalendarGrid";
import HistoryDay from "./HistoryDay";
import { formatPrettyDate } from "../lib/helpers";
import { entryToDisplay } from "../lib/stats";

export default function HistoryTab({ entries, habits, removeLog }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 1. Create a reference to the Detail pane
  const detailRef = useRef(null);

  const selectedEntries = entries[selectedDate] || {};
  const hasLogs = Object.keys(selectedEntries).length > 0;
  
  // 2. Custom handler for date selection
  const handleDateSelect = (dateISO) => {
    setSelectedDate(dateISO);
    
    // Only trigger the scroll if we are on a mobile/tablet screen (< 1024px)
    if (window.innerWidth < 1024) {
      // A tiny timeout ensures React has a split-second to start rendering the new data before moving the camera
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }, 50);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start min-h-[600px] animate-in fade-in duration-700">
      
      {/* LEFT COLUMN: THE NAVIGATOR */}
      <div className="w-full lg:w-[340px] flex flex-col gap-6 shrink-0">
        <div className="px-1">
          <h2 className="text-[28px] font-bold tracking-tight text-foreground">History</h2>
          <p className="text-[14px] text-muted-foreground">Track your long-term consistency.</p>
        </div>

        <div className="glass-card rounded-[32px] p-5 transition-all hover:ring-1 hover:ring-white/30">
          <CalendarGrid 
            viewDate={viewDate}
            setViewDate={setViewDate}
            entries={entries}
            habits={habits}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect} // 3. Use the new handler here
          />
        </div>
      </div>

      {/* RIGHT COLUMN: THE DETAIL INSPECTOR */}
      {/* 4. Attach the ref and add scroll-mt-6 for breathing room */}
      <div ref={detailRef} className="flex-1 w-full flex flex-col gap-6 scroll-mt-6">
        <div className="flex flex-col px-1">
          <h2 className="text-[22px] font-bold tracking-tight text-foreground">
            {format(new Date(selectedDate + 'T00:00:00'), "EEEE, MMMM do")}
          </h2>
          <p className="text-[13px] text-muted-foreground">Daily activity details</p>
        </div>

        <div className="glass-card flex-1 rounded-[32px] p-6 min-h-[450px] relative overflow-hidden">
          {hasLogs ? (
            <div className="animate-detail-view">
              <HistoryDay
                dateISO={selectedDate}
                dayEntries={selectedEntries}
                habits={habits}
                onDeleteOne={(habitId) => removeLog(selectedDate, habitId)}
                formatPrettyDate={formatPrettyDate}
                entryToDisplay={entryToDisplay}
                isLast={true}
              />
              
              {Object.keys(selectedEntries).length === habits.length && (
                <div className="mt-8 flex items-center gap-2 text-primary font-bold text-[13px] bg-primary/10 w-fit px-4 py-2 rounded-full border border-primary/10">
                  <CheckCircle2 className="h-4 w-4" />
                  PERFECT DAY
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-700">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-50" />
                <div className="relative glass-card p-6 rounded-3xl border-white/20 shadow-inner">
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
                  handleDateSelect(today); // Reused the handler so "Jump to Today" also scrolls!
                  setViewDate(new Date());
                }}
                className="mt-8 px-6 py-2 rounded-full bg-primary text-[13px] font-bold text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
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