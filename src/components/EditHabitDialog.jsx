import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// Select removed: goals are yearly-only
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";

export default function EditHabitDialog({ habit, onSave, onDeleteHabit, clampNumber }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(() => habit.name || "");
  const [unit, setUnit] = useState(() => habit.unit || "");

  const initialGoals = habit?.goals && typeof habit.goals === "object" ? habit.goals : {};
  const n = (v) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };

  // Prefer explicit yearly goal; otherwise derive a yearly goal from legacy multi-period values.
  const initialYearly =
    n(initialGoals.yearly) ||
    (n(initialGoals.daily) ? n(initialGoals.daily) * 365 : 0) ||
    (n(initialGoals.weekly) ? n(initialGoals.weekly) * 52 : 0) ||
    (n(initialGoals.monthly) ? n(initialGoals.monthly) * 12 : 0);

  const [goalValue, setGoalValue] = useState(() => (initialYearly > 0 ? String(initialYearly) : ""));
  const [goalEnabled, setGoalEnabled] = useState(() => Boolean(initialYearly > 0));

  function save() {
    const nextGoals =
      goalEnabled && goalValue !== "" && Number(goalValue) > 0
        ? { yearly: clampNumber(goalValue) }
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

        <div className="grid gap-3">
          {habit.type === "number" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-sm text-muted-foreground">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm text-muted-foreground">Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm text-muted-foreground">Goal</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Set a goal</span>
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
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Yearly goal</Label>
                <Input type="number" value={goalValue} onChange={(e) => setGoalValue(e.target.value)} />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              Delete habit
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
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