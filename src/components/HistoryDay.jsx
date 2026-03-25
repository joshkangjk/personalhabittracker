import React, { useState } from "react";
import { CheckCircle2, Circle, Trash2, ChevronRight } from "lucide-react";

export default function HistoryDay({ 
  dateISO, 
  dayEntries, 
  habits, 
  onDeleteOne, 
  formatPrettyDate, 
  entryToDisplay,
  isLast 
}) {
  // 1. The state to track if this specific day is expanded or closed
  const [isOpen, setIsOpen] = useState(false);

  const entriesExist = dayEntries && Object.keys(dayEntries).length > 0;
  const prettyDate = formatPrettyDate ? formatPrettyDate(dateISO) : dateISO;
  const activeHabits = habits.filter(h => dayEntries && dayEntries[h.id] !== undefined);
  const totalLogged = activeHabits.length;

  // If there are no logs for this day, we can just skip rendering it entirely 
  // to keep the history feed hyper-focused on actual activity.
  if (!entriesExist || totalLogged === 0) return null;

  return (
    <div className={`relative bg-background/70 backdrop-blur-[10px] shadow-apple rounded-2xl border border-border/20 overflow-hidden ${isLast ? "mb-0" : "mb-3"}`}>
      
      {/* --- 1. THE CLICKABLE HEADER (Summary) --- */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:px-5 sm:py-4 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          {/* The Chevron smoothly rotates 90 degrees when opened */}
          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ease-out ${isOpen ? "rotate-90" : ""}`} />
          <h3 className="text-[16px] font-semibold tracking-tight text-foreground">
            {prettyDate}
          </h3>
        </div>
        
        {/* Subtle pill showing how much was accomplished */}
        <span className="text-[13px] font-medium text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">
          {totalLogged} logged
        </span>
      </button>

      {/* --- 2. THE ANIMATED BODY (Dropdown Content) --- */}
      {/* We use a CSS Grid trick here to animate height from 0 to auto beautifully */}
      <div 
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {/* The top border separates the header from the expanded list */}
          <div className="divide-y divide-border/30 border-t border-border/20 bg-background/30">
            {activeHabits.map((h) => {
              const entry = dayEntries[h.id];
              const isDone = h.type === "checkbox" ? Boolean(entry?.value) : Number(entry?.value) > 0;
              const displayValue = entryToDisplay ? entryToDisplay(h, entry) : entry?.value;

              return (
                <div 
                  key={h.id} 
                  className="group flex items-center justify-between gap-3 p-4 sm:px-5 sm:py-3.5 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden pl-2 sm:pl-8">
                    {/* Status Icon */}
                    <div className={`shrink-0 transition-colors ${isDone ? "text-green-500" : "text-muted-foreground/30"}`}>
                      {isDone ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <Circle className="h-[18px] w-[18px]" />}
                    </div>
                    
                    {/* Habit Name */}
                    <div className="flex flex-col truncate">
                      <span className={`text-[14px] font-medium truncate ${isDone ? "text-foreground" : "text-foreground/70"}`}>
                        {h.name}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Value and Hover-Delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-[14px] font-semibold tabular-nums ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                        {displayValue}
                      </span>
                    </div>
                    
                    {/* The Delete Button */}
                    <button 
                      onClick={() => onDeleteOne(h.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                      title="Delete log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
    </div>
  );
}