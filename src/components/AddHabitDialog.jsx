import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";

export default function AddHabitDialog({ onAdd, uuid, clampNumber }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("number");
  const [unit, setUnit] = useState("");
  const [goalValue, setGoalValue] = useState("");
  const [goalPeriod, setGoalPeriod] = useState("daily");
  const [goalEnabled, setGoalEnabled] = useState(false);

  function reset() {
    setName("");
    setType("number");
    setUnit("");
    setGoalValue("");
    setGoalPeriod("daily");
    setGoalEnabled(false);
  }

  function create() {
    const cleanName = name.trim();
    if (!cleanName) return;

    const goals =
      goalEnabled && goalValue !== "" && Number(goalValue) > 0
        ? { [goalPeriod]: clampNumber(goalValue) }
        : {};

    const h = {
      id: uuid(),
      name: cleanName,
      unit: type === "number" ? unit.trim() || "value" : undefined,
      type,
      goals,
    };

    onAdd(h);
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2 w-auto rounded-2xl shadow-sm">
          <Plus className="h-4 w-4" /> Add Habit
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a habit</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input className="h-11 text-base" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v)}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "number" ? (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Unit</Label>
                <Input className="h-11 text-base" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>

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
                  <div className="flex gap-2">
                    <Select value={goalPeriod} onValueChange={(v) => setGoalPeriod(v)}>
                      <SelectTrigger className="flex-1 h-11 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-[140px] h-11 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      type="number"
                      value={goalValue}
                      onChange={(e) => setGoalValue(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
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
                <div className="flex gap-2">
                  <Select value={goalPeriod} onValueChange={(v) => setGoalPeriod(v)}>
                    <SelectTrigger className="flex-1 h-11 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-[140px] h-11 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    type="number"
                    value={goalValue}
                    onChange={(e) => setGoalValue(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button onClick={create} disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}