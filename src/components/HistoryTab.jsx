import React, { useState } from "react";
import { CalendarX } from "lucide-react";
import HistoryDay from "./HistoryDay";
import { formatPrettyDate } from "../lib/helpers";
import { entryToDisplay } from "../lib/stats";
// Imagine a CalendarGrid component you'll create
// import CalendarGrid from "./CalendarGrid"; 

export default function HistoryTab({ filteredHistory, entries, habits, removeLog }) {
  const [selectedDate, setSelectedDate] = useState(filteredHistory[0] || null);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[600px]">
      
      {/* LEFT: The Master Calendar */}
      <div className="w-full md:w-[400px] flex flex-col gap-4">
        <div className="px-1">
          <h2 className="text-[24px] font-bold tracking-tight">History</h2>
          <p className="text-[13px] text-muted-foreground">Select a date to view logs</p>
        </div>
        
        <div className="flex-1 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-4 shadow-apple">
          {/* CalendarGrid would go here, passing setSelectedDate */}
          <div className="text-center py-20 text-muted-foreground/50 border border-dashed border-white/10 rounded-2xl">
            [Calendar Placeholder]
          </div>
        </div>
      </div>

      {/* RIGHT: The Detail Inspector */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="px-1">
          <h2 className="text-[24px] font-bold tracking-tight opacity-0">Detail</h2> 
          <p className="text-[13px] text-muted-foreground">Daily Activity</p>
        </div>

        <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-apple overflow-y-auto">
          {selectedDate && entries[selectedDate] ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               <HistoryDay
                  dateISO={selectedDate}
                  dayEntries={entries[selectedDate]}
                  habits={habits}
                  onDeleteOne={(habitId) => removeLog(selectedDate, habitId)}
                  formatPrettyDate={formatPrettyDate}
                  entryToDisplay={entryToDisplay}
                  isLast={true}
                  defaultOpen={true} // We'd tweak HistoryDay to stay open here
                />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <CalendarX className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-[15px]">No logs for this date</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}