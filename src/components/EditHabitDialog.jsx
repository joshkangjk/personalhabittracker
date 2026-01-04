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
  const [goalValue, setGoalValue] = useState(() => String(habit.goalDaily ?? 0));
  const [goalPeriod, setGoalPeriod] = useState(() => habit.goalPeriod || "daily");
  const [goalEnabled, setGoalEnabled] = useState(() => Boolean((habit.goalDaily ?? 0) > 0));

  function save() {
    const patch = {
      name: name.trim() || habit.name,
      goalDaily: goalEnabled && goalValue !== "" ? clampNumber(goalValue) : 0,
      goalPeriod,
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
              <div className="grid grid-cols-2 gap-2">
                <Select value={goalPeriod} onValueChange={(v) => setGoalPeriod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
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