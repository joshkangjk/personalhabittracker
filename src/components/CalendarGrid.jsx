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
  viewDate,      // Date object controlling which month is displayed
  setViewDate,   // Function to update viewDate
  entries,       // Your global entries object
  habits,        // Your array of habits (used for completion %)
  selectedDate,  // The currently "inspected" date string (YYYY-MM-DD)
  onSelectDate   // Function to update the selectedDate
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

  // Heatmap Calculation: Returns a value between 0 and 1
  const getDayStats = (dateISO) => {
    const dayEntries = entries[dateISO];
    if (!dayEntries) return 0;
    
    // Count how many habits have a logged value for this specific day
    const completedCount = habits.filter(h => dayEntries[h.id] !== undefined).length;
    return habits.length > 0 ? completedCount / habits.length : 0;
  };

  return (
    <div className="w-full select-none space-y-6">
      
      {/* 1. HEADER & MONTH SWITCHER */}
      <div className="flex items-center justify-between px-2">
  
        {/* Clickable Month/Year wrapper with showPicker() for desktop support */}
        <div 
          className="relative inline-flex items-center group cursor-pointer"
          onClick={(e) => {
            // Find the hidden input and force the native picker to open
            const input = e.currentTarget.querySelector('input[type="month"]');
            if (input && typeof input.showPicker === 'function') {
              try { 
                input.showPicker(); 
              } catch (err) {
                console.warn("showPicker not supported on this browser", err);
              }
            }
          }}
        >
          <h3 className="text-[16px] font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            {format(monthStart, "MMMM yyyy")}
          </h3>
          
          {/* Invisible native month picker */}
          <input 
            type="month" 
            value={format(viewDate, "yyyy-MM")}
            onChange={(e) => {
              if (e.target.value) {
                const [year, month] = e.target.value.split('-');
                setViewDate(new Date(year, month - 1, 1));
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Select Month and Year"
          />
        </div>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setViewDate(subMonths(viewDate, 1))}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all active:scale-90"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setViewDate(addMonths(viewDate, 1))}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all active:scale-90"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. WEEKDAY LABELS */}
      <div className="grid grid-cols-7 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <span key={i} className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
            {day}
          </span>
        ))}
      </div>

      {/* 3. THE DAYS GRID */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((day) => {
          const dateISO = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = selectedDate === dateISO;
          const currentIsToday = isToday(day);
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
                // Background intensity scales with completion ratio
                backgroundColor: isCurrentMonth && completionRatio > 0 
                  ? `rgba(var(--primary-rgb), ${0.15 + completionRatio * 0.75})` 
                  : "rgba(255, 255, 255, 0.03)",
                // Text color flips to white if the background is dark enough or selected
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