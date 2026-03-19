// src/components/HabitLogRow.jsx
import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GripVertical } from "lucide-react";
import EditHabitDialog from "./EditHabitDialog";

export default function HabitLogRow({
  habit,
  entry,
  onLog,
  onDelete,
  onEditHabit,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isMobile,
  onTouchStartDrag,
  onTouchMoveDrag,
  onTouchEndDrag,
  touchDragging,
  clampNumber,
  habitDecimals,
  formatNumberWithDecimals,
}) {
  const [value, setValue] = useState(() => {
    if (!entry) return habit.type === "checkbox" ? false : "";
    return entry.value;
  });

  const hasEntry = entry !== null && entry !== undefined;

  const [committing, setCommitting] = useState(false);
  const [valueFlash, setValueFlash] = useState(false);

  // UPDATED: Trigger the flash animation only if the value represents a "success" (e.g. checking a box, or logging a positive number)
  const commitWithDelay = useCallback(
    (nextValue, commitFn) => {
      if (committing) return;
      setCommitting(true);
      
      // Determine if this action should trigger a success animation
      const isSuccessAction = 
        (habit.type === "checkbox" && nextValue === true) || 
        (habit.type === "number" && Number(nextValue) > 0 && Number(nextValue) > Number(value || 0));

      if (isSuccessAction) {
        setValueFlash(true);
        // Turn off the flash state after the animation completes (500ms matches the tailwind config)
        setTimeout(() => setValueFlash(false), 500); 
      }

      // Slightly faster commit so the UI feels responsive
      setTimeout(() => {
        commitFn(nextValue);
        setCommitting(false);
      }, 50);
    },
    [committing, habit.type, value]
  );

  const handleCheckboxChange = (checked) => {
    setValue(checked);
    commitWithDelay(checked, onLog);
  };

  const handleNumberChange = (e) => {
    setValue(e.target.value);
  };

  const handleNumberBlur = () => {
    if (value === "" && !hasEntry) return;
    const num = clampNumber(value);
    setValue(num);
    commitWithDelay(num, onLog);
  };

  const handleNumberKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const bump = (dir) => {
    // Treat empty string as 0 when bumping
    const currentValue = value === "" ? 0 : Number(value);
    const nextValue = clampNumber(currentValue + dir);
    setValue(nextValue);
    commitWithDelay(nextValue, onLog);
  };

  const handleTouchStart = (e) => {
    if (onTouchStartDrag) onTouchStartDrag(e);
  };
  const handleTouchMove = (e) => {
    if (onTouchMoveDrag && e.touches[0]) {
      onTouchMoveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchEnd = (e) => {
    if (onTouchEndDrag) onTouchEndDrag(e);
  };

  const goalPeriod = ["daily", "weekly", "monthly", "yearly"].find((p) => Number(habit.goals?.[p] ?? 0) > 0);
  const goalValue = goalPeriod ? Number(habit.goals[goalPeriod]) : 0;
  const dec = habitDecimals(habit);

  return (
    <div
      // ADDED: Conditional animate-success-flash class on the row wrapper
      className={`group rounded-2xl bg-background/60 shadow-sm transition-all duration-200 ease-in-out ${
        dragging ? "opacity-50 scale-[0.98]" : "hover:shadow-md"
      } ${touchDragging ? "z-50 scale-[1.02] shadow-lg" : "z-auto"} ${
        valueFlash ? "animate-success-flash ring-1 ring-green-500/50" : ""
      }`}
      draggable={!isMobile}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      data-habit-id={habit.id}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3">
        <div className="flex flex-col flex-1 min-w-0 px-1">
          <span className={`font-semibold text-base truncate transition-colors duration-200 ${valueFlash ? "text-green-600 dark:text-green-400" : ""}`}>{habit.name}</span>
          {goalValue > 0 ? (
            <span className="text-xs text-muted-foreground truncate mt-0.5">
              Goal: {formatNumberWithDecimals(goalValue, dec)} {habit.unit || ""} / {goalPeriod}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground truncate mt-0.5">{habit.unit || "No goal"}</span>
          )}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 shrink-0">
          
          {/* --- PREMIUM INPUT CONTROLS --- */}
          {habit.type === "checkbox" ? (
            <label
              // ADDED: Conditional animate-success-bounce class
              className={`cursor-pointer rounded-xl bg-background/80 shadow-sm border border-border/40 px-3 py-2 transition-all duration-200 hover:bg-muted/50 active:scale-[0.98] ${
                hasEntry && value ? "opacity-100 bg-primary/5 border-primary/20" : "opacity-80 hover:opacity-100"
              } ${valueFlash ? "animate-success-bounce" : ""} flex items-center gap-2.5`}
            >
              <Switch checked={Boolean(value)} onCheckedChange={handleCheckboxChange} className={valueFlash ? "data-[state=checked]:bg-green-500" : ""} />
              <span className={`text-sm font-medium select-none ${value ? "text-primary" : "text-muted-foreground"}`}>{value ? "Done" : "Mark"}</span>
            </label>
          ) : (
            <div 
               // ADDED: Conditional animate-success-bounce class
               className={`flex items-center bg-background/80 shadow-sm border border-border/40 rounded-xl overflow-hidden transition-all duration-200 ${
                 valueFlash ? "animate-success-bounce border-green-500/50" : ""
               }`}
            >
              <Button
                type="button"
                variant="ghost"
                className={`h-9 w-9 rounded-none border-r border-border/40 hover:bg-muted/50 active:bg-muted ${
                  committing ? "pointer-events-none opacity-50" : ""
                }`}
                onClick={() => bump(-1)}
              >
                −
              </Button>

              <Input
                type="number"
                step="any"
                value={value}
                onChange={handleNumberChange}
                onBlur={handleNumberBlur}
                onKeyDown={handleNumberKeyDown}
                className={`w-[60px] h-9 text-center font-semibold border-0 rounded-none shadow-none focus-visible:ring-0 transition-colors ${
                  valueFlash ? "text-green-600 dark:text-green-400" : "text-foreground"
                } bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />

              <Button
                type="button"
                variant="ghost"
                className={`h-9 w-9 rounded-none border-l border-border/40 hover:bg-muted/50 active:bg-muted ${
                  committing ? "pointer-events-none opacity-50" : ""
                }`}
                onClick={() => bump(1)}
              >
                +
              </Button>
            </div>
          )}
          {/* ------------------------------ */}

          <div className="flex items-center justify-end gap-1.5 pl-1">
            <div
              className={`rounded-lg p-2 text-muted-foreground transition-all duration-200 ${
                isMobile ? "" : "cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground"
              } ${dragging || touchDragging ? "opacity-100 bg-background/80 shadow-md ring-1 ring-border" : "opacity-40"}`}
              title={isMobile ? "Press and drag to reorder" : "Drag to reorder"}
              onTouchStart={isMobile ? handleTouchStart : undefined}
              onTouchMove={isMobile ? handleTouchMove : undefined}
              onTouchEnd={isMobile ? handleTouchEnd : undefined}
            >
              <GripVertical className="h-[18px] w-[18px]" />
            </div>

            <EditHabitDialog
              key={`${habit.id}-${JSON.stringify(habit.goals)}`} 
              habit={habit}
              onSave={onEditHabit}
              onDeleteHabit={onDelete}
              clampNumber={clampNumber}
            />
          </div>
        </div>
      </div>
    </div>
  );
}