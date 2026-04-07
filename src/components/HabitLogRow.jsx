// src/components/HabitLogRow.jsx
import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Minus, Plus } from "lucide-react";
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
    
    // NEW: If the user manually clears the input box, delete the log
    if (value === "") {
      commitWithDelay("", onLog);
      return;
    }

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
    // NEW: If the user tries to subtract when the value is already 0, clear it completely
    if (dir === -1 && (value === "" || Number(value) <= 0)) {
      setValue("");
      commitWithDelay("", onLog);
      return;
    }

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
      className={`group rounded-2xl bg-background/70 backdrop-blur-[10px] shadow-apple transition-all duration-200 ease-in-out ${
        dragging ? "opacity-50 scale-[0.98]" : "hover:shadow-apple-hover hover:border-border/40 hover:bg-background/80"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5">
        {/* 1. THE IDENTITY ZONE (Left Side) */}
        <div className="flex flex-col flex-1 min-w-0 px-1">
          {/* We wrap the name in the Edit Dialog so the name itself is the button! */}
          <EditHabitDialog
            key={`${habit.id}-${JSON.stringify(habit.goals)}`} 
            habit={habit}
            onSave={onEditHabit}
            onDeleteHabit={onDelete}
            clampNumber={clampNumber}
          >
            <button className={`text-left font-medium text-[15px] truncate transition-colors duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:opacity-70 ${valueFlash ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
              {habit.name}
            </button>
          </EditHabitDialog>

          {goalValue > 0 ? (
            <span className="text-[13px] text-muted-foreground truncate mt-0.5">
              {formatNumberWithDecimals(goalValue, dec)} {habit.unit || ""} / {goalPeriod}
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground truncate mt-0.5">{habit.unit || "No goal"}</span>
          )}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          
          {habit.type === "checkbox" ? (
            <label
              className={`cursor-pointer rounded-xl bg-muted/40 px-3 py-2 transition-all duration-200 hover:bg-muted/50 active:scale-[0.98] ${
                hasEntry && value ? "opacity-100 bg-primary/5 border-primary/20" : "opacity-80 hover:opacity-100"
              } ${valueFlash ? "animate-success-bounce" : ""} flex items-center gap-2.5`}
            >
              <Switch checked={Boolean(value)} onCheckedChange={handleCheckboxChange} className={valueFlash ? "data-[state=checked]:bg-green-500" : ""} />
              <span className={`text-[13px] font-medium select-none ${value ? "text-primary" : "text-muted-foreground"}`}>{value ? "Done" : "Mark"}</span>
            </label>
          ) : (
            /* --- THE NEW UNIFIED STEPPER ISLAND --- */
            <div 
               className={`flex items-center bg-muted/40 rounded-full p-1 border border-border/50 transition-all duration-200 ${
                 valueFlash ? "animate-success-bounce border-green-500/50 shadow-sm" : ""
               }`}
            >
              {/* Wider horizontal padding (px-3) for a larger tap target, keeping vertical slim (py-1.5) */}
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground ${
                  committing ? "pointer-events-none opacity-50" : ""
                }`}
                onClick={() => bump(-1)}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              {/* 1. Bulletproof iOS Anti-Zoom: style={{ fontSize: "16px" }} 
                2. Longer surface area: w-[70px] sm:w-[80px]
              */}
              <Input
                type="number"
                step="any"
                value={value}
                onChange={handleNumberChange}
                onBlur={handleNumberBlur}
                onKeyDown={handleNumberKeyDown}
                style={{ fontSize: "16px" }} 
                className={`w-[70px] sm:w-[80px] h-7 px-1 text-center font-medium tabular-nums border-0 rounded-none shadow-none focus-visible:ring-0 transition-colors ${
                  valueFlash ? "text-green-600 dark:text-green-400" : "text-foreground"
                } bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />

              <button
                type="button"
                className={`px-3 py-1.5 rounded-full hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground ${
                  committing ? "pointer-events-none opacity-50" : ""
                }`}
                onClick={() => bump(1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* 2. THE TRAILING ACTION TRAY (Grouped seamlessly) */}
          <div className="flex items-center gap-2 pl-2 border-l border-border/50">
            <div
              className={`rounded-lg p-1.5 text-muted-foreground transition-all duration-200 ${
                isMobile ? "" : "cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground"
              } ${dragging || touchDragging ? "opacity-100 bg-background/80 shadow-md ring-1 ring-border" : "opacity-40"}`}
              title={isMobile ? "Press and drag to reorder" : "Drag to reorder"}
              onTouchStart={isMobile ? handleTouchStart : undefined}
              onTouchMove={isMobile ? handleTouchMove : undefined}
              onTouchEnd={isMobile ? handleTouchEnd : undefined}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}