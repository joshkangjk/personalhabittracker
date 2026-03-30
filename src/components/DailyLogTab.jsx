// src/components/DailyLogTab.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="glass-card rounded-[32px] transition-all duration-300 border-white/20">
      
      <CardHeader className="pb-6 pt-6 px-6 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Left Side: Titles & Mobile Add Button */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="space-y-1">
              <CardTitle className="text-[22px] font-bold tracking-tight text-foreground">Daily Log</CardTitle>
              <p className="text-[14px] text-muted-foreground">Track your habits for today.</p>
            </div>
            
            {/* Mobile 'Add Habit' button */}
            <div className="sm:hidden block">
              <AddHabitDialog onAdd={addHabit} uuid={uuid} clampNumber={clampNumber} />
            </div>
          </div>

          {/* Right Side: Date Picker & Desktop Add Button */}
          <div className="flex items-center w-full sm:w-auto gap-4">
            
            {/* iOS-STYLE FULL-WIDTH DATE PICKER PILL */}
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

            {/* Desktop 'Add Habit' button */}
            <div className="hidden sm:block">
              <AddHabitDialog onAdd={addHabit} uuid={uuid} clampNumber={clampNumber} />
            </div>
          </div>
          
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-6 sm:px-8 pb-8">
        <div className="grid gap-3">
          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-black/10 dark:border-white/10">
              <ListX className="h-12 w-12 mb-3 opacity-20" />
              <div className="text-[16px] font-semibold text-foreground/70">No habits yet</div>
              <div className="text-[14px] opacity-70 mt-1">Click 'Add Habit' to get started.</div>
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
      </CardContent>
    </Card>
  );
}