// src/components/DailyLogTab.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="whitespace-nowrap text-base font-semibold tracking-tight">Daily Log</CardTitle>
        </div>
        <div className="flex items-center justify-between gap-3 w-full md:flex-row md:items-center md:justify-end md:gap-6">
          
          <div className="flex items-center gap-1 flex-1 md:order-2 md:flex-none">
            <Label className="hidden md:block text-xs text-muted-foreground mr-2">Date</Label>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={() => handleActiveDateChange({ target: { value: addDaysISO(activeDate, -1) } })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Input
              type="date"
              value={activeDate}
              onChange={handleActiveDateChange}
              className="w-[130px] rounded-xl bg-background/60 shadow-sm border-0 text-center focus-visible:ring-2 focus-visible:ring-muted/30"
            />

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={() => handleActiveDateChange({ target: { value: addDaysISO(activeDate, 1) } })}
              disabled={activeDate >= todayISO()} 
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="shrink-0 md:order-1 md:w-auto">
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