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

  const todayISO = new Date().toISOString().split("T")[0];
  const isToday = dateISO === todayISO;

  if (!entriesExist || totalLogged === 0) return null;

  return (
    <div 
      className={`relative rounded-2xl transition-all duration-300 overflow-hidden
        ${isOpen 
          ? "bg-white/10 backdrop-blur-md shadow-apple border border-white/20 scale-[1.01]" 
          : "bg-white/5 border border-white/5 hover:bg-white/10"
        }
        ${isToday ? "ring-1 ring-primary/40" : ""}
        ${isLast ? "mb-0" : "mb-3"}
      `}
    >
      {/* HEADER: Native List Style */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 focus-visible:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-start">
            <h3 className={`text-[17px] font-semibold tracking-tight transition-colors ${isToday ? "text-primary" : "text-foreground"}`}>
              {prettyDate}
            </h3>
            <span className="text-[12px] text-muted-foreground/80 font-medium">
              {totalLogged} {totalLogged === 1 ? 'habit' : 'habits'} logged
            </span>
          </div>
        </div>
        <ChevronRight 
          className={`h-4 w-4 text-muted-foreground/50 transition-transform duration-300 
          ${isOpen ? "rotate-90" : ""}`} 
        />
      </button>

      {/* BODY: Grouped Entries */}
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="mx-4 mb-4 rounded-xl bg-black/5 dark:bg-white/5 divide-y divide-white/5 border border-white/5">
            {activeHabits.map((h, index) => {
              const entry = dayEntries[h.id];
              const isDone = h.type === "checkbox" ? Boolean(entry?.value) : Number(entry?.value) > 0;
              const displayValue = entryToDisplay ? entryToDisplay(h, entry) : entry?.value;

              return (
                <div 
                  key={h.id}
                  className="group flex items-center justify-between p-3.5 active:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isDone 
                      ? <CheckCircle2 className="h-4 w-4 text-primary" /> 
                      : <Circle className="h-4 w-4 text-muted-foreground/20" />
                    }
                    <span className="text-[14px] font-medium text-foreground/90">{h.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-semibold tabular-nums text-foreground/70">
                      {displayValue}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteOne(h.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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