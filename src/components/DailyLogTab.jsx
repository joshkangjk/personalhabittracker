// src/components/DailyLogTab.jsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ListX } from "lucide-react";

import AddHabitDialog from "./AddHabitDialog";
import HabitLogRow from "./HabitLogRow";
import { getEntry } from "../lib/stats";
import { 
  clampNumber, 
  habitDecimals, 
  formatNumberWithDecimals, 
  uuid,
  addDaysISO,
  todayISO
} from "../lib/helpers";

export default function DailyLogTab({
  habits,
  entries,
  activeDate,
  handleActiveDateChange,
  addHabit,
  isMobile,
  getHabitRowHandlers,
  getHabitDnDProps
}) {
  return (
    // Outer wrapper manages the spacing between the external header and the glass box
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-500">
      
      {/* OUTSIDE THE BOX: Page Header & Global Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
        
        {/* Left Side: Titles */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="space-y-1">
            <h2 className="text-[22px] font-bold tracking-tight text-foreground">Daily Log</h2>
          </div>
          
          <div className="sm:hidden block">
            <AddHabitDialog onAdd={addHabit} uuid={uuid} clampNumber={clampNumber} />
          </div>
        </div>

        {/* Right Side: Date Picker & Desktop Add Button */}
        <div className="flex items-center w-full sm:w-auto gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto bg-black/5 dark:bg-white/5 backdrop-blur-md rounded-2xl p-1 sm:gap-1 border border-black/5 dark:border-white/5 shadow-inner">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-black/50 transition-all active:scale-95" 
              onClick={() => handleActiveDateChange({ target: { value: addDaysISO(activeDate, -1) } })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Input
              type="date"
              value={activeDate}
              onChange={handleActiveDateChange}
              className="w-full sm:w-[135px] h-8 px-1 bg-transparent shadow-none border-0 text-[15px] text-center font-semibold focus-visible:ring-0 [appearance:textfield] [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-opacity cursor-pointer"
            />

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-black/50 transition-all active:scale-95" 
              onClick={() => handleActiveDateChange({ target: { value: addDaysISO(activeDate, 1) } })}
              disabled={activeDate >= todayISO()} 
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden sm:block">
            <AddHabitDialog onAdd={addHabit} uuid={uuid} clampNumber={clampNumber} />
          </div>
        </div>
      </div>

      {/* INSIDE THE BOX: The Habit Content */}
      <div className="glass-card rounded-[32px] p-6 sm:px-8 flex-1 flex flex-col gap-3 min-h-[300px]">
        {habits.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-700 flex-1">
            <h3 className="text-[16px] font-semibold text-foreground/70 tracking-tight">No habits yet</h3>
            <p className="text-[14px] text-muted-foreground/60 max-w-[220px] mt-1.5 leading-relaxed">
              Click 'Add Habit' to get started.
            </p>
          </div>
        ) : (
          habits.map((h) => (
            <HabitLogRow
              key={`${h.id}-${activeDate}`}
              habit={h}
              entry={getEntry(entries, activeDate, h.id)}
              isMobile={isMobile}
              {...getHabitRowHandlers(h)}
              {...getHabitDnDProps(h.id)}
              clampNumber={clampNumber}
              habitDecimals={habitDecimals}
              formatNumberWithDecimals={formatNumberWithDecimals}
            />
          ))
        )}
      </div>
    </div>
  );
}