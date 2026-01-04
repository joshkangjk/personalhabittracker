import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

export default function HistoryDay({
  dateISO,
  dayEntries,
  habits,
  onDeleteOne,
  formatPrettyDate,
  entryToDisplay,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const items = Object.keys(dayEntries || {})
    .map((hid) => {
      const habit = habits.find((h) => h.id === hid);
      return { hid, habit, entry: dayEntries[hid] };
    })
    .filter((x) => x.habit)
    .sort((a, b) => habits.findIndex((h) => h.id === a.hid) - habits.findIndex((h) => h.id === b.hid));

  return (
    <div className="rounded-2xl bg-background/60 shadow-sm p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold tracking-tight">{formatPrettyDate(dateISO)}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {items.map(({ hid, habit, entry }) => (
          <div key={hid} className="flex items-start justify-between gap-3 rounded-2xl bg-background/60 shadow-sm px-3 py-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{habit.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">{entryToDisplay(habit, entry)}</div>
            </div>

            <Button
              variant="ghost"
              className="h-9 px-3 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setPendingDelete({ hid, name: habit.name });
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove entry?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            This will remove the log for <span className="font-medium text-foreground">{pendingDelete?.name || "this habit"}</span> on{" "}
            <span className="font-medium text-foreground">{formatPrettyDate(dateISO)}</span>.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmOpen(false);
                setPendingDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete?.hid) onDeleteOne(pendingDelete.hid);
                setConfirmOpen(false);
                setPendingDelete(null);
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}