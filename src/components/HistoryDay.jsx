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
  const [isOpen, setIsOpen] = useState(false);

  const entriesExist = dayEntries && Object.keys(dayEntries).length > 0;
  const prettyDate = formatPrettyDate ? formatPrettyDate(dateISO) : dateISO;
  const activeHabits = habits.filter(h => dayEntries && dayEntries[h.id] !== undefined);
  const totalLogged = activeHabits.length;

  const completionRatio = habits.length ? totalLogged / habits.length : 0;
  const todayISO = new Date().toISOString().split("T")[0];
  const isToday = dateISO === todayISO;

  if (!entriesExist || totalLogged === 0) return null;

  return (
    <div 
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden
        ${isOpen 
          ? "bg-background/90 shadow-lg border-border/30 ring-1 ring-border/40 scale-[1.01]" 
          : "bg-background/60 border-border/10 hover:bg-background/70"
        }
        ${isToday ? "ring-2 ring-primary/20" : ""}
        ${isLast ? "mb-0" : "mb-4"}
      `}
      style={undefined}
    >
      
      {/* HEADER */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 transition-colors focus-visible:outline-none"
      >
        <div className="flex items-center gap-3">
          <ChevronRight 
            className={`h-5 w-5 text-muted-foreground transition-all duration-300 ease-out 
            ${isOpen ? "rotate-90 translate-x-1" : ""}`} 
          />

          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
                {prettyDate}
              </h3>
              {isToday && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Today
                </span>
              )}
            </div>
            <span className="text-[12px] text-muted-foreground">
              {totalLogged} habits completed
            </span>
          </div>
        </div>
      </button>

      {/* BODY */}
      <div 
        className={`grid transition-all duration-300 ease-out
          ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
        `}
      >
        <div className="overflow-hidden">
          <div className="divide-y divide-border/30 border-t border-border/20 bg-background/30">
            
            {activeHabits.map((h, index) => {
              const entry = dayEntries[h.id];
              const isDone = h.type === "checkbox" ? Boolean(entry?.value) : Number(entry?.value) > 0;
              const displayValue = entryToDisplay ? entryToDisplay(h, entry) : entry?.value;

              return (
                <div 
                  key={h.id}
                  style={{
                    transitionDelay: isOpen ? `${index * 40}ms` : "0ms",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(6px)"
                  }}
                  className={`group flex items-center justify-between gap-3 p-4 transition-all
                    ${isDone ? "bg-muted/30" : "hover:bg-muted/20"}
                    active:scale-[0.99]
                  `}
                >
                  
                  {/* LEFT */}
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div 
                      className={`shrink-0 transition-colors`}
                      style={{ color: isDone ? undefined : undefined }}
                    >
                      {isDone 
                        ? <CheckCircle2 className="h-[18px] w-[18px] text-foreground" /> 
                        : <Circle className="h-[18px] w-[18px] text-muted-foreground/30" />
                      }
                    </div>

                    <span 
                      className={`text-[14px] font-medium truncate transition-all
                        ${isDone ? "text-foreground/60" : "text-foreground"}
                      `}
                    >
                      {h.name}
                    </span>
                  </div>

                  {/* RIGHT */}
                  <div className="flex items-center gap-3 shrink-0">
                    
                    <span 
                      className={`text-[15px] font-semibold tabular-nums transition-all
                        ${isDone ? "text-foreground scale-105" : "text-muted-foreground"}
                      `}
                    >
                      {displayValue}
                    </span>

                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteOne(h.id); }}
                      className="opacity-40 hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
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