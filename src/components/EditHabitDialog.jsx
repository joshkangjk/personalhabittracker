import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";

export default function EditHabitDialog({ habit, onSave, onDeleteHabit, clampNumber }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(() => habit.name || "");
  const [unit, setUnit] = useState(() => habit.unit || "");

  const initialGoals = habit?.goals && typeof habit.goals === "object" ? habit.goals : {};
  const order = ["daily", "weekly", "monthly", "yearly"];
  const initialPeriod = order.find((p) => Number(initialGoals?.[p] ?? 0) > 0) || "daily";
  const initialValue = Number(initialGoals?.[initialPeriod] ?? 0);

  const [goalPeriod, setGoalPeriod] = useState(() => initialPeriod);
  const [goalValue, setGoalValue] = useState(() => (initialValue > 0 ? String(initialValue) : ""));
  const [goalEnabled, setGoalEnabled] = useState(() => Boolean(initialValue > 0));

  function save() {
    const baseGoals = habit?.goals && typeof habit.goals === "object" ? habit.goals : {};
    const nextGoals =
      goalEnabled && goalValue !== "" && Number(goalValue) > 0
        ? { ...baseGoals, [goalPeriod]: clampNumber(goalValue) }
        : {};

    const patch = {
      name: name.trim() || habit.name,
      goals: nextGoals,
    };
    if (habit.type === "number") patch.unit = unit.trim() || habit.unit || "value";
    onSave(patch);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 px-0 rounded-xl" aria-label="Edit habit">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit habit</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          {habit.type === "number" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input className="h-11 text-base" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Unit</Label>
                <Input className="h-11 text-base" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input className="h-11 text-base" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}

          <div className={`grid gap-1.5 transition-opacity ${goalEnabled ? "opacity-100" : "opacity-70"}`}>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground">Goal</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{goalEnabled ? "On" : "Off"}</span>
                <Switch
                  checked={goalEnabled}
                  onCheckedChange={(v) => {
                    setGoalEnabled(Boolean(v));
                    if (!v) setGoalValue("");
                  }}
                />
              </div>
            </div>

            {goalEnabled ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Period</Label>
                  <Select value={goalPeriod} onValueChange={(v) => setGoalPeriod(v)}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Goal</Label>
                  <Input
                    type="number"
                    className="h-11 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={goalValue}
                    onChange={(e) => setGoalValue(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmOpen(true)}
            >
              Delete habit
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete habit?</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              This will delete <span className="font-medium text-foreground">{habit.name}</span> and all its logs. This cannot be undone.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setConfirmOpen(false);
                  setOpen(false);
                  onDeleteHabit?.();
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}