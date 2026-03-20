// src/components/HistoryDay.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, ChevronDown } from "lucide-react";

export default function HistoryDay({
  dateISO,
  dayEntries,
  habits,
  onDeleteOne,
  formatPrettyDate,
  entryToDisplay,
  isLast
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const items = Object.keys(dayEntries || {})
    .map((hid) => {
      const habit = habits.find((h) => h.id === hid);
      return { hid, habit, entry: dayEntries[hid] };
    })
    .filter((x) => x.habit)
    .sort((a, b) => habits.findIndex((h) => h.id === a.hid) - habits.findIndex((h) => h.id === b.hid));

  if (items.length === 0) return null; 

  return (
    <div className="flex gap-4 w-full">
      
      {/* 1. TIMELINE SPINE */}
      <div className="flex flex-col items-center relative z-10 w-4 shrink-0">
        <div 
          className={`mt-4 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm transition-all duration-300 ${
            expanded 
              ? "bg-primary ring-4 ring-primary/20 scale-110" 
              : "bg-muted-foreground/40 hover:bg-muted-foreground"
          }`} 
        />
        {!isLast && (
          <div className="w-px h-full bg-border/50 mt-2" />
        )}
      </div>

      {/* 2. TIMELINE CONTENT CARD */}
      <div className="flex-1 pb-6">
        <div className={`rounded-2xl bg-background/70 backdrop-blur-[10px] shadow-apple transition-all duration-300 overflow-hidden ${
          expanded 
            ? "bg-background/80" 
            : "hover:shadow-apple-hover hover:bg-background/80"
        }`}>
          
          {/* Header (Clickable) */}
          <div
            className="flex items-center justify-between p-4 sm:p-6 cursor-pointer select-none group"
            onClick={() => setExpanded((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((v) => !v);
              }
            }}
          >
            <div className="space-y-0.5">
              <div className="text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground">
                {formatPrettyDate(dateISO)}
              </div>
              <div className="text-[13px] text-muted-foreground transition-colors">
                {items.length} completed habit{items.length === 1 ? "" : "s"}
              </div>
            </div>
            
            <div className={`p-1.5 rounded-full transition-all duration-300 ${expanded ? "bg-primary/10 text-primary rotate-180" : "bg-transparent text-muted-foreground"}`}>
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>

          {/* Expanded Content Grid */}
          <div 
            className={`grid transition-all duration-300 ease-in-out ${
              expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-1 pt-2">
                {items.map(({ hid, habit, entry }) => (
                  <div key={hid} className="group/item flex items-center justify-between gap-3 rounded-xl hover:bg-muted/40 px-4 py-3 transition-all">
                    
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                      <div>
                        <div className="text-[13px] font-semibold">{habit.name}</div>
                        <div className="text-[13px] font-medium tabular-nums text-muted-foreground mt-0.5">
                          {entryToDisplay(habit, entry)}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 sm:group-hover/item:opacity-100 transition-opacity focus:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete({ hid, name: habit.name });
                        setConfirmOpen(true);
                      }}
                      title="Remove entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 3. DELETE CONFIRMATION DIALOG */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove entry?</DialogTitle>
          </DialogHeader>
          <div className="text-[13px] text-muted-foreground mt-1">
            This will remove the log for <span className="font-semibold text-foreground">{pendingDelete?.name || "this habit"}</span> on{" "}
            <span className="font-semibold text-foreground">{formatPrettyDate(dateISO)}</span>.
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                setConfirmOpen(false);
                setPendingDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full shadow-sm"
              onClick={() => {
                if (pendingDelete?.hid) onDeleteOne(pendingDelete.hid);
                setConfirmOpen(false);
                setPendingDelete(null);
              }}
            >
              Remove Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}