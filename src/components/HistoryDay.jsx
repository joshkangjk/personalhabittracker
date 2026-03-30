import React from "react";
import { CheckCircle2, Circle, Trash2, Clock, Zap } from "lucide-react";

export default function HistoryDay({ 
  dateISO, 
  dayEntries, 
  habits, 
  onDeleteOne, 
  entryToDisplay 
}) {
  // Filter only habits that have entries for this specific day
  const activeHabits = habits.filter(h => dayEntries && dayEntries[h.id] !== undefined);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* HEADER: Summary of the day */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-medium">
            {activeHabits.length} {activeHabits.length === 1 ? "habit" : "habits"} completed
          </span>
        </div>
      </div>

      {/* LIST: Grouped habit entries */}
      <div className="space-y-2">
        {activeHabits.map((h, index) => {
          const entry = dayEntries[h.id];
          const isDone = h.type === "checkbox" ? Boolean(entry?.value) : Number(entry?.value) > 0;
          const displayValue = entryToDisplay ? entryToDisplay(h, entry) : entry?.value;

          return (
            <div 
              key={h.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-[0.99] animate-in fade-in slide-in-from-right-4"
            >
              {/* LEFT: Status & Name */}
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  {isDone ? (
                    <div className="bg-primary/20 p-1 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/20" />
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold text-foreground/90 leading-none">
                    {h.name}
                  </span>
                  {entry?.timestamp && (
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground/50">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Value & Actions */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[16px] font-bold tabular-nums text-foreground">
                    {displayValue}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-bold">
                    Value
                  </span>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm("Delete this log?")) onDeleteOne(h.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-destructive/10 text-destructive transition-all hover:bg-destructive hover:text-white"
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
  );
}