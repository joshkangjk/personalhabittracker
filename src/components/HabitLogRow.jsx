// src/components/HabitLogRow.jsx
import React, { useCallback, useMemo, useState } from "react";
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

  const commitWithDelay = useCallback(
    (nextValue, commitFn) => {
      if (committing) return;
      setCommitting(true);
      setTimeout(() => {
        commitFn(nextValue);
        setValueFlash(true);
        setTimeout(() => setValueFlash(false), 180);
        setCommitting(false);
      }, 120);
    },
    [committing]
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
    let current = clampNumber(value);
    current += dir;
    setValue(current);
    commitWithDelay(current, onLog);
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
      className={`group rounded-2xl bg-background/60 shadow-sm transition-all ${
        dragging ? "opacity-50 scale-[0.98]" : "hover:shadow-md"
      } ${touchDragging ? "z-50 scale-[1.02] shadow-lg" : "z-auto"}`}
      draggable={!isMobile}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      data-habit-id={habit.id}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-semibold text-base truncate">{habit.name}</span>
          {goalValue > 0 ? (
            <span className="text-xs text-muted-foreground truncate">
              Goal: {formatNumberWithDecimals(goalValue, dec)} {habit.unit || ""} / {goalPeriod}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground truncate">{habit.unit || "No goal"}</span>
          )}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 shrink-0">
          
          {/* --- PREMIUM INPUT CONTROLS --- */}
          {habit.type === "checkbox" ? (
            <label
              className={`cursor-pointer rounded-2xl bg-background/60 shadow-sm px-3 py-1.5 transition-opacity transition-transform active:scale-[0.98] ${valueFlash ? "opacity-70" : ""} ${
                hasEntry ? "opacity-70 hover:opacity-90" : ""
              } flex items-center gap-2`}
            >
              <Switch checked={Boolean(value)} onCheckedChange={handleCheckboxChange} />
              <span className="text-sm font-medium select-none">Done</span>
            </label>
          ) : (
            <div className="flex items-center bg-background/60 md:bg-muted/30 shadow-sm border border-border/40 rounded-xl overflow-hidden">
              <Button
                type="button"
                variant="ghost"
                className={`h-9 w-9 rounded-none border-r border-border/40 hover:bg-background/80 active:bg-muted ${
                  hasEntry ? "opacity-60" : ""
                } ${committing ? "pointer-events-none opacity-50" : ""}`}
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
                className={`w-[70px] h-9 text-center font-medium border-0 rounded-none shadow-none focus-visible:ring-0 ${
                  valueFlash ? "opacity-70" : "opacity-100"
                } ${hasEntry ? "bg-muted/10 text-foreground" : "bg-transparent text-foreground"} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />

              <Button
                type="button"
                variant="ghost"
                className={`h-9 w-9 rounded-none border-l border-border/40 hover:bg-background/80 active:bg-muted ${
                  hasEntry ? "opacity-60" : ""
                } ${committing ? "pointer-events-none opacity-50" : ""}`}
                onClick={() => bump(1)}
              >
                +
              </Button>
            </div>
          )}
          {/* ------------------------------ */}

          <div className="flex items-center justify-end gap-2">
            <div
              className={`rounded-xl px-2 py-1.5 text-muted-foreground transition-opacity ${
                isMobile ? "" : "cursor-grab active:cursor-grabbing"
              } ${dragging || touchDragging ? "opacity-80 bg-background/60 shadow-sm" : "opacity-35 hover:opacity-70"}`}
              title={isMobile ? "Press and drag to reorder" : "Drag to reorder"}
              onTouchStart={isMobile ? handleTouchStart : undefined}
              onTouchMove={isMobile ? handleTouchMove : undefined}
              onTouchEnd={isMobile ? handleTouchEnd : undefined}
            >
              <GripVertical className="h-4 w-4" />
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