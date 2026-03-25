import React from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";

export default function HistoryDay({ 
  dateISO, 
  dayEntries, 
  habits, 
  onDeleteOne, 
  formatPrettyDate, 
  entryToDisplay,
  isLast 
}) {
  // 1. Safety check: If there are no entries for this day, handle it gracefully
  const entriesExist = dayEntries && Object.keys(dayEntries).length > 0;
  
  // 2. Format the date text using the helper function passed from the parent
  const prettyDate = formatPrettyDate ? formatPrettyDate(dateISO) : dateISO;

  // 3. Find only the habits that were actually logged on this specific day
  const activeHabits = habits.filter(h => dayEntries && dayEntries[h.id] !== undefined);
  const totalLogged = activeHabits.length;

  return (
    <div className={`relative ${isLast ? "mb-0" : "mb-8"}`}>
      
      {/* THE STICKY APPLE-STYLE HEADER */}
      <div className="sticky top-14 z-20 py-2.5 mb-3 flex items-end justify-between bg-background/80 backdrop-blur-xl border-b border-border/20 -mx-2 px-2 sm:mx-0 sm:px-1">
        <h3 className="text-[17px] font-semibold tracking-tight text-foreground flex items-center gap-2">
          {prettyDate}
        </h3>
        
        {totalLogged > 0 && (
          <span className="text-[13px] font-medium text-muted-foreground">
            {totalLogged} logged
          </span>
        )}
      </div>

      {/* THE EDGE-TO-EDGE DATA CARD */}
      <div className="bg-background/70 backdrop-blur-[10px] shadow-apple rounded-2xl overflow-hidden border border-border/20">
        
        {!entriesExist ? (
          <div className="p-6 text-center text-[14px] text-muted-foreground">
            No habits tracked on this day.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {activeHabits.map((h) => {
              const entry = dayEntries[h.id];
              
              // Determine if it was "successful" for the green checkmark
              const isDone = h.type === "checkbox" ? Boolean(entry?.value) : Number(entry?.value) > 0;
              
              // Use your app's built-in formatter for the number/text
              const displayValue = entryToDisplay ? entryToDisplay(h, entry) : entry?.value;

              return (
                <div 
                  key={h.id} 
                  className="group flex items-center justify-between gap-3 bg-transparent hover:bg-muted/30 p-4 sm:p-5 transition-colors"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    {/* Status Icon */}
                    <div className={`shrink-0 transition-colors ${isDone ? "text-green-500" : "text-muted-foreground/30"}`}>
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </div>
                    
                    {/* Habit Name */}
                    <div className="flex flex-col truncate">
                      <span className={`text-[15px] font-medium truncate ${isDone ? "text-foreground" : "text-foreground/70"}`}>
                        {h.name}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Value and Hover-Delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-[15px] font-semibold tabular-nums ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                        {displayValue}
                      </span>
                    </div>
                    
                    {/* The Delete Button (Only appears on hover) */}
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
        )}
      </div>
      
    </div>
  );
}