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
    <Card className="transition-shadow hover:shadow-apple-hover">
      
      <CardHeader className="pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Left Side: Titles & Mobile Add Button */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="space-y-1">
              <CardTitle className="text-[17px] font-semibold tracking-tight">Daily Log</CardTitle>
              <p className="text-[13px] text-muted-foreground">Track your habits for today.</p>
            </div>
            
            {/* Mobile 'Add Habit' button */}
            <div className="sm:hidden block">
              <AddHabitDialog onAdd={addHabit} uuid={uuid} clampNumber={clampNumber} />
            </div>
          </div>

          {/* Right Side: Date Picker & Desktop Add Button */}
          <div className="flex items-center w-full sm:w-auto gap-4">
            
            {/* iOS-STYLE FULL-WIDTH DATE PICKER PILL */}
            <div className="flex items-center justify-between w-full sm:w-auto bg-muted/40 rounded-2xl p-1 sm:gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/60" 
                onClick={() => handleActiveDateChange({ target: { value: addDaysISO(activeDate, -1) } })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Input
                type="date"
                value={activeDate}
                onChange={handleActiveDateChange}
                className="w-full sm:w-[135px] h-8 px-1 bg-transparent shadow-none border-0 text-[15px] text-center font-medium focus-visible:ring-0 [appearance:textfield] [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-opacity cursor-pointer"
              />

              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/60" 
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

      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <ListX className="h-10 w-10 mb-3 opacity-20 strokeWidth={1.5}" />
              <div className="text-[15px] font-medium">No habits yet</div>
              <div className="text-[13px] opacity-70">Click 'Add Habit' to get started.</div>
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