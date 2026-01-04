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

  const goalText = useMemo(() => {
    const g = Number(habit.goalDaily ?? 0);
    if (!g) return "";
    const period = habit.goalPeriod || "daily";

    if (habit.type === "checkbox") {
      return period === "weekly" ? `Goal: ${Math.round(g)}x per week` : "Goal: Daily";
    }

    const unit = habit.unit ? ` ${habit.unit}` : "";
    const dec = habitDecimals(habit);
    const amount = formatNumberWithDecimals(g, dec);
    return period === "weekly" ? `Goal: ${amount}${unit} per week` : `Goal: ${amount}${unit} per day`;
  }, [habit, habitDecimals, formatNumberWithDecimals]);

  const save = useCallback(() => {
    if (habit.type === "checkbox") {
      onLog(Boolean(value));
      return;
    }
    if (value === "" || value === null || value === undefined) return;
    const n = clampNumber(value);
    onLog(n);
  }, [habit.type, onLog, value, clampNumber]);

  const bump = useCallback(
    (delta) => {
      if (habit.type !== "number") return;
      const current = value === "" || value === null || value === undefined ? 0 : clampNumber(value);
      const next = Math.max(0, current + delta);
      setValue(next);
      onLog(next);
    },
    [habit.type, onLog, value, clampNumber]
  );

  const handleCheckboxChange = useCallback(
    (v) => {
      setValue(v);
      onLog(Boolean(v));
    },
    [onLog]
  );

  const handleNumberChange = useCallback((e) => setValue(e.target.value), []);
  const handleNumberBlur = useCallback(() => save(), [save]);

  const handleNumberKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
        save();
      }
    },
    [save]
  );

  const handleTouchStart = useCallback(
    (e) => {
      e.preventDefault();
      onTouchStartDrag?.();
    },
    [onTouchStartDrag]
  );

  const handleTouchMove = useCallback(
    (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      onTouchMoveDrag?.(t.clientX, t.clientY);
    },
    [onTouchMoveDrag]
  );

  const handleTouchEnd = useCallback(() => onTouchEndDrag?.(), [onTouchEndDrag]);

  return (
    <div
      data-habit-id={habit.id}
      className={`rounded-2xl bg-background/60 shadow-sm p-2 md:p-3 transition-colors hover:bg-accent/15 ${
        dragging ? "opacity-60" : ""
      }`}
      draggable={!isMobile}
      onDragStart={isMobile ? undefined : onDragStart}
      onDragOver={isMobile ? undefined : onDragOver}
      onDrop={isMobile ? undefined : onDrop}
      onDragEnd={isMobile ? undefined : onDragEnd}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-base font-medium tracking-tight">{habit.name}</div>
          </div>
          {goalText ? <div className="text-xs text-muted-foreground">{goalText}</div> : null}
        </div>

        <div className="flex flex-row flex-wrap items-center justify-between gap-2 md:flex-nowrap rounded-2xl bg-background/60 shadow-sm px-2 py-2">
          {habit.type === "checkbox" ? (
            <div className="flex items-center gap-2 rounded-2xl bg-background/60 shadow-sm px-3 py-2">
              <Switch checked={Boolean(value)} onCheckedChange={handleCheckboxChange} />
              <span className="text-sm">Done</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" className="h-9 w-9 px-0 rounded-xl" onClick={() => bump(-1)}>
                −
              </Button>

              <Input
                type="number"
                step="any"
                value={value}
                onChange={handleNumberChange}
                onBlur={handleNumberBlur}
                onKeyDown={handleNumberKeyDown}
                className="w-[110px] text-center rounded-xl"
              />

              <Button type="button" variant="ghost" className="h-9 w-9 px-0 rounded-xl" onClick={() => bump(1)}>
                +
              </Button>
            </div>
          )}

          <div className="flex items-center">
            <div
              className={`rounded-xl bg-background/60 shadow-sm px-2 py-2 text-muted-foreground ${
                isMobile ? "" : "cursor-grab active:cursor-grabbing"
              } ${touchDragging ? "opacity-60" : ""}`}
              title={isMobile ? "Press and drag to reorder" : "Drag to reorder"}
              onTouchStart={isMobile ? handleTouchStart : undefined}
              onTouchMove={isMobile ? handleTouchMove : undefined}
              onTouchEnd={isMobile ? handleTouchEnd : undefined}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </div>

          <EditHabitDialog
            key={habit.id}
            habit={habit}
            onSave={onEditHabit}
            onDeleteHabit={onDelete}
            clampNumber={clampNumber}
          />
        </div>
      </div>
    </div>
  );
}