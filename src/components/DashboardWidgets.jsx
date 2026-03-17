import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ReferenceLine } from "recharts";
import { CheckCircle2 } from "lucide-react";

import {
  habitDecimals,
  formatNumberWithDecimals,
  formatPrettyDate,
  formatAxisDate,
  isCurrentYear,
  chartGradientId,
  todayISO,
  getYearlyGoal
} from "../lib/helpers";

// --- UI Formatters ---
export function formatStatTotal(habit, total) {
  if (habit.type === "checkbox") return `${Math.round(total)} days`;
  const dec = habitDecimals(habit);
  return `${formatNumberWithDecimals(total, dec)} ${habit.unit || ""}`.trim();
}

export function formatStatAvg(habit, avg) {
  if (habit.type === "checkbox") return `${avg.toFixed(2)} / day`;
  const dec = habitDecimals(habit);
  return `${formatNumberWithDecimals(avg, dec)} ${habit.unit || ""}`.trim();
}

export function formatStatBest(habit, best) {
  if (habit.type === "checkbox") return "";
  if (best === null || best === undefined) return "";
  const dec = habitDecimals(habit);
  return `${formatNumberWithDecimals(best, dec)} ${habit.unit || ""}`.trim();
}

export function formatPct01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n * 100)}%`;
}

export function formatStreakDays(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "0";
  return String(Math.round(v));
}

export function formatRequired(habit, v) {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";

  if (habit.type === "checkbox") {
    return `${n.toFixed(2)} / day`;
  }

  const dec = habitDecimals(habit);
  return `${formatNumberWithDecimals(n, dec)} ${habit.unit || ""}`.trim();
}

// --- Components ---
export function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-background/60 backdrop-blur shadow-sm p-3">
      <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
        {value || ""}
      </div>
    </div>
  );
}

function makeTrendTooltipFormatter(habit, habitDecimalsFn, formatNumberFn) {
  return (v, name) => {
    if (v === null || v === undefined) return ["", ""];

    const labelText = name === "goalCum" ? "Goal" : "Actual";

    if (habit?.type === "checkbox") {
      return [String(Math.round(Number(v))), labelText];
    }

    const dec = habitDecimalsFn(habit);
    return [formatNumberFn(v, dec), labelText];
  };
}

function makeTrendYAxisTickFormatter(habit, habitDecimalsFn, formatNumberFn) {
  return (v) => {
    if (habit?.type === "checkbox") return String(v);
    return formatNumberFn(v, habitDecimalsFn(habit));
  };
}

export function GlassTooltip({ active, label, payload, formatter, labelFormatter }) {
  if (!active || !payload || payload.length === 0) return null;

  const title = labelFormatter ? labelFormatter(label) : String(label ?? "");

  return (
    <div className="pointer-events-none max-w-[220px] rounded-2xl bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm px-3 py-2">
      <div className="text-xs font-medium text-foreground/90">{title}</div>
      <div className="mt-1 space-y-1">
        {[...payload]
          .filter((p) => p && p.value !== null && p.value !== undefined)
          .reduce((acc, p) => {
            const k = String(p.dataKey || p.name || "");
            if (!k) return acc;
            if (acc.seen.has(k)) return acc;
            acc.seen.add(k);
            acc.items.push(p);
            return acc;
          }, { items: [], seen: new Set() })
          .items
          .sort((a, b) => {
            const order = (k) => (k === "actualCum" ? 0 : k === "goalCum" ? 1 : 2);
            return order(String(a.dataKey)) - order(String(b.dataKey));
          })
          .map((p) => {
            const name = p.dataKey || p.name;
            const res = formatter ? formatter(p.value, name, p, payload) : [String(p.value), String(name)];
            const valueText = Array.isArray(res) ? res[0] : String(res);
            const labelText = Array.isArray(res) ? res[1] : String(name);

            return (
              <div key={String(name)} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {(() => {
                    const labelKey = String(labelText || "").toLowerCase();
                    const rawKey = String(p.dataKey || p.name || "").toLowerCase();

                    const forced =
                      labelKey === "goal" || rawKey.includes("goal")
                        ? "#ef4444"
                        : labelKey === "actual" || rawKey.includes("actual")
                          ? "#3b82f6"
                          : null;

                    const dotColor = forced || p.color || p.stroke || "currentColor";

                    return (
                      <span
                        aria-hidden="true"
                        style={{
                          color: dotColor,
                          fontSize: 12,
                          lineHeight: 1,
                          flex: "0 0 auto",
                        }}
                      >
                        ●
                      </span>
                    );
                  })()}
                  <span>{labelText}</span>
                </div>
                <span className="tabular-nums text-foreground">{valueText}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function HabitStatsGrid({ habit, stats, mode }) {
  if (!habit) return null;

  const isMonth = mode === "month";
  const coverageText = stats ? formatPct01(stats.coveragePct) : "";
  const onTrackText = (() => {
    if (!stats) return "";
    if (stats.onTrackPct === null) return "";
    return formatPct01(stats.onTrackPct);
  })();

  const requiredText = stats ? formatRequired(habit, stats.requiredPerDay) : "";
  const goalText = stats && stats.goalTotal > 0 ? formatStatTotal(habit, stats.goalTotal) : "";
  const daysLoggedText = stats ? `${Math.round(stats.daysLogged || 0)} days` : "";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
      <MiniStat label="Total" value={stats ? formatStatTotal(habit, stats.total) : ""} />
      <MiniStat label="Goal" value={goalText} />
      <MiniStat label="On track" value={onTrackText} />
      <MiniStat label="Coverage" value={coverageText} />
      <MiniStat label="Avg/day" value={stats ? formatStatAvg(habit, stats.avgPerDay) : ""} />
      <MiniStat label="Avg logged" value={stats ? formatStatAvg(habit, stats.avgPerLoggedDay) : ""} />
      <MiniStat label="Best day" value={stats ? formatStatBest(habit, stats.best) : ""} />
      {isMonth ? (
        <MiniStat label="Days logged" value={daysLoggedText} />
      ) : (
        <MiniStat label="Req/day" value={requiredText} />
      )}
    </div>
  );
}

export function TrendChart({ series, habit, year, gradientPrefix, emptyLabel }) {
  if (!habit) return null;

  return (
    <div className="h-[260px] min-h-[260px] w-full rounded-2xl bg-background/60 backdrop-blur shadow-sm p-2">
      {!(series || []).length ? (
        <div className="h-full rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
          {emptyLabel || `No data yet for this habit in ${year}.`}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={chartGradientId(gradientPrefix, habit?.id)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fontFamily: "inherit" }}
              tickFormatter={formatAxisDate}
              interval="preserveStartEnd"
              minTickGap={60}
              tickMargin={8}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fontFamily: "inherit" }}
              axisLine={false}
              tickLine={false}
              padding={{ top: 12, bottom: 12 }}
              tickFormatter={makeTrendYAxisTickFormatter(habit, habitDecimals, formatNumberWithDecimals)}
            />
            <Tooltip
              content={<GlassTooltip />}
              labelFormatter={(l) => formatPrettyDate(l)}
              formatter={makeTrendTooltipFormatter(habit, habitDecimals, formatNumberWithDecimals)}
            />
            {isCurrentYear(year) ? (
              <ReferenceLine x={todayISO()} stroke="currentColor" strokeOpacity={0.18} strokeDasharray="2 6" />
            ) : null}
            <Area
              type="monotone"
              dataKey="actualCum"
              stroke="none"
              fill={`url(#${chartGradientId(gradientPrefix, habit?.id)})`}
              isAnimationActive
            />
            <Line type="monotone" dataKey="actualCum" dot={false} activeDot={{ r: 4 }} strokeWidth={2} isAnimationActive />
            {getYearlyGoal(habit) > 0 ? (
              <Line
                type="monotone"
                dataKey="goalCum"
                dot={false}
                strokeWidth={1.75}
                strokeDasharray="6 6"
                stroke="#ef4444"
                strokeOpacity={0.65}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function YearSummaryList({ items, selectedHabitId, onSelectHabit, mode = "year" }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No habits yet.</div>;
  }

  const labelFor = (stats) => {
    const logged = Math.round(Number(stats?.daysLogged ?? 0));
    const elapsed = Math.round(Number(stats?.daysElapsed ?? stats?.daysTotal ?? 0));
    const denom = elapsed > 0 ? elapsed : Math.round(Number(stats?.daysTotal ?? 0));

    if (denom > 0) return `${logged}/${denom} days logged`;
    return `${logged} days logged`;
  };

  return (
    <div className="space-y-2">
      {items.map(({ habit, stats }) => (
        <button
          key={habit.id}
          onClick={() => onSelectHabit?.(habit.id)}
          className={`w-full text-left rounded-2xl bg-background/60 backdrop-blur shadow-sm p-3 hover:bg-accent/20 transition-colors active:scale-[0.99] transition-transform focus:outline-none focus:ring-2 focus:ring-muted/30 ${
            selectedHabitId === habit.id ? "ring-2 ring-muted/30 bg-accent/10" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{habit.name}</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">{formatStatTotal(habit, stats.total)}</span>
            </div>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{labelFor(stats)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function YearPicker({ value, onChange, options, triggerClassName, labelClassName }) {
  return (
    <div className="flex items-center gap-2">
      <Label className={labelClassName || "text-xs text-muted-foreground"}>Year</Label>
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger
          className={
            triggerClassName ||
            "w-[120px] rounded-2xl bg-background/60 shadow-sm border-0 focus:ring-2 focus:ring-muted/30"
          }
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(options || []).map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ShareStatus({ shareError, shareOk }) {
  return (
    <>
      {shareError ? <div className="text-xs text-destructive">{shareError}</div> : null}
      {shareOk ? (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Copied
        </div>
      ) : null}
    </>
  );
}