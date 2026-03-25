import React from "react";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HistoryDay({ dayData, isToday, formatNumberWithDecimals, habitDecimals }) {
  const { dateStr, prettyDate, habits } = dayData;
  
  // Calculate completion percentage for the summary badge
  const total = habits.length;
  const completed = habits.filter(h => h.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="relative mb-8 last:mb-0">
      
      {/* 1. THE STICKY APPLE-STYLE HEADER */}
      {/* It sticks to the top of the screen as you scroll past the card */}
      <div className="sticky top-14 z-20 py-2.5 mb-3 flex items-end justify-between bg-background/80 backdrop-blur-xl border-b border-border/20 -mx-2 px-2 sm:mx-0 sm:px-1">
        <h3 className="text-[17px] font-semibold tracking-tight text-foreground flex items-center gap-2">
          {isToday ? "Today" : prettyDate}
          {isToday && (
            <span className="bg-primary/10 text-primary text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ml-1">
              Live
            </span>
          )}
        </h3>
        
        {/* Subtle Completion Badge */}
        {total > 0 && (
          <span className="text-[13px] font-medium text-muted-foreground">
            {completed} of {total} • {percent}%
          </span>
        )}
      </div>

      {/* 2. THE EDGE-TO-EDGE DATA CARD */}
      <div className="bg-background/70 backdrop-blur-[10px] shadow-apple rounded-2xl overflow-hidden border border-border/20">
        
        {total === 0 ? (
          <div className="p-6 text-center text-[14px] text-muted-foreground">
            No habits tracked on this day.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {habits.map((h) => {
              const dec = habitDecimals({ type: h.type, goals: {} }); // Mock habit for decimal logic
              const isDone = h.completed;

              return (
                <div 
                  key={h.id} 
                  className="group flex items-center justify-between gap-3 bg-transparent hover:bg-muted/30 p-4 sm:p-5 transition-colors"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    {/* Minimalist Status Icon */}
                    <div className={`shrink-0 transition-colors ${isDone ? "text-green-500" : "text-muted-foreground/30"}`}>
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </div>
                    
                    {/* Habit Identity */}
                    <div className="flex flex-col truncate">
                      <span className={`text-[15px] font-medium truncate ${isDone ? "text-foreground" : "text-foreground/70"}`}>
                        {h.name}
                      </span>
                    </div>
                  </div>

                  {/* Value / Goal Display */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-[15px] font-semibold tabular-nums ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                        {h.type === "checkbox" ? (isDone ? "Done" : "Missed") : formatNumberWithDecimals(h.value, dec)}
                      </span>
                      {h.type === "number" && (
                        <span className="text-[12px] text-muted-foreground ml-1">
                          / {formatNumberWithDecimals(h.goalValue, dec)} {h.unit}
                        </span>
                      )}
                    </div>
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