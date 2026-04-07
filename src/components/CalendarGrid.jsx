import React from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  addMonths, 
  subMonths 
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarGrid({ 
  viewDate,      
  setViewDate,   
  entries,       
  habits,        
  selectedDate,  
  onSelectDate   
}) {
  // Calendar Logic
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ 
    start: startDate, 
    end: endDate 
  });

  // Heatmap Calculation
  const getDayStats = (dateISO) => {
    const dayEntries = entries[dateISO];
    if (!dayEntries) return 0;
    
    const completedCount = habits.filter(h => dayEntries[h.id] !== undefined).length;
    return habits.length > 0 ? completedCount / habits.length : 0;
  };

  // Navigation Handlers
  const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));
  const handleToday = () => setViewDate(new Date());

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* HEADER & NAVIGATION */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[16px] font-bold text-foreground tracking-tight">
          {format(monthStart, "MMMM yyyy")}
        </h3>
        
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-black/5 dark:border-white/5">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <button 
            onClick={handleToday}
            className="px-3 py-1.5 text-[12px] font-bold rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            Today
          </button>

          <button 
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* WEEKDAY LABELS */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1">
        {weekDays.map(day => (
          <div key={day} className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest text-center">
            {day}
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarDays.map((day) => {
          const dateISO = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, monthStart);
          const currentIsToday = isToday(day);
          const isSelected = selectedDate === dateISO;
          const completionRatio = getDayStats(dateISO);

          return (
            <button
              key={dateISO}
              onClick={() => isCurrentMonth && onSelectDate(dateISO)}
              className={`
                relative aspect-square rounded-xl transition-all duration-300 flex items-center justify-center text-[13px] font-semibold
                ${!isCurrentMonth ? "opacity-20 pointer-events-none" : "opacity-100"}
                ${isSelected 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10 shadow-lg" 
                  : "hover:bg-white/10 active:scale-95"
                }
              `}
              style={{
                backgroundColor: isCurrentMonth && completionRatio > 0 
                  ? `rgba(var(--primary-rgb), ${0.15 + completionRatio * 0.75})` 
                  : "rgba(255, 255, 255, 0.03)",
                color: (isCurrentMonth && completionRatio > 0.4) || isSelected 
                  ? "#FFFFFF" 
                  : "var(--foreground)"
              }}
            >
              {format(day, "d")}
              
              {/* Today Indicator */}
              {currentIsToday && !isSelected && (
                <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}