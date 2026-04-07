import React from "react";

export default function HistoryDay({ 
  dateISO, 
  dayEntries, 
  habits, 
  onDeleteOne, 
  entryToDisplay 
}) {
  const activeHabits = habits.filter(h => dayEntries && dayEntries[h.id] !== undefined);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* HEADER: Standardized text */}
      <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-[14px] font-semibold text-foreground/80">
            {activeHabits.length} {activeHabits.length === 1 ? "habit" : "habits"} completed
          </span>
        </div>
      </div>

      {/* LIST: Grouped habit entries */}
      <div className="space-y-3">
        {activeHabits.map((h, index) => {
          const entry = dayEntries[h.id];
          const displayValue = entryToDisplay ? entryToDisplay(h, entry) : entry?.value;

          return (
            <div 
              key={h.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="group flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            >
              {/* LEFT: Habit Info */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-semibold text-foreground/90 leading-none">
                    {h.name}
                  </span>
                  {entry?.timestamp && (
                    <div className="text-[12px] text-muted-foreground/60 font-medium">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Value & Delete */}
              <div className="flex items-center gap-5">
                <span className="text-[16px] font-bold tabular-nums text-foreground">
                  {displayValue}
                </span>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm("Delete this log?")) onDeleteOne(h.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[12px] font-bold transition-all hover:bg-destructive hover:text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}