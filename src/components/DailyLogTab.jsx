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
    <Card className="rounded-2xl bg-background/60 backdrop-blur shadow-sm transition-shadow hover:shadow-md">
      
      {/* UPDATED HEADER: Responsive stacking and spacing */}
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
        
        {/* Mobile Top Row / Desktop Left Side */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <CardTitle className="text-base font-semibold tracking-tight">Daily Log</CardTitle>
          {/* Mobile 'Add Habit' button */}
          <div className="md:hidden block">
            <AddHabitDialog onAdd={addHabit} uuid={uuid} clampNumber={clampNumber} />
          </div>
        </div>

        {/* Mobile Bottom Row / Desktop Right Side */}
        <div className="flex items-center justify-center md:justify-end gap-4 w-full md:w-auto">
          
          {/* PREMIUM DATE PICKER PILL */}
          <div className="flex items-center bg-background/80 md:bg-muted/40 shadow-sm md:shadow-none border md:border-0 border-border/40 rounded-2xl p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground" 
              onClick={() => handleActiveDateChange({ target: { value: addDaysISO(activeDate, -1) } })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Input
              type="date"
              value={activeDate}
              onChange={handleActiveDateChange}
              className="w-[135px] h-8 px-1 bg-transparent shadow-none border-0 text-center font-medium focus-visible:ring-0 [appearance:textfield] [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-opacity cursor-pointer"
            />

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground" 
              onClick={() => handleActiveDateChange({ target: { value: addDaysISO(activeDate, 1) } })}
              disabled={activeDate >= todayISO()} 
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop 'Add Habit' button */}
          <div className="hidden md:block">
            <AddHabitDialog onAdd={addHabit} uuid={uuid} clampNumber={clampNumber} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-3">
          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <ListX className="h-10 w-10 mb-3 opacity-20" />
              <div className="text-sm font-medium">No habits yet</div>
              <div className="text-xs opacity-70">Click 'Add Habit' to get started.</div>
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