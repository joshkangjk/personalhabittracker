
export function isoFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function todayISO() {
  return isoFromDate(new Date());
}

export function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n;
}

export function countDecimalsFromValue(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v);
  const parts = s.split(".");
  return parts[1] ? parts[1].length : 0;
}

export function habitDecimals(habit) {
  if (habit?.type !== "number") return 0;
  const d = Number(habit?.decimals);
  if (Number.isFinite(d) && d >= 0 && d <= 6) return d;
  return 0;
}

export function formatNumberWithDecimals(n, decimals) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";

  if (decimals > 0) {
    return v.toFixed(decimals);
  }

  if (Number.isInteger(v)) {
    return String(v);
  }

  return v
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

export function normalizeGoals(goals) {
  const g = goals && typeof goals === "object" ? goals : {};
  const n = (v) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };

  return {
    daily: n(g.daily),
    weekly: n(g.weekly),
    monthly: n(g.monthly),
    yearly: n(g.yearly),
  };
}

export function normalizeYearlyGoalFromGoals(goals) {
  const g = goals && typeof goals === "object" ? goals : {};
  const n = (v) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };

  const yearly = n(g.yearly);
  if (yearly > 0) return yearly;

  const monthly = n(g.monthly);
  if (monthly > 0) return monthly * 12;

  const weekly = n(g.weekly);
  if (weekly > 0) return weekly * 52;

  const daily = n(g.daily);
  if (daily > 0) return daily * 365;

  return 0;
}

export function getYearlyGoal(habit) {
  return normalizeYearlyGoalFromGoals(habit?.goals);
}

export function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Math.random().toString(16).slice(2)}${Date.now()}`;
}

export function makeShareToken() {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // ignore
  }
  return `${Math.random().toString(16).slice(2)}${Date.now()}`;
}

export function formatPrettyDate(iso) {
  try {
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
  } catch {
    return iso;
  }
}

export function formatAxisDate(iso) {
  try {
    const [y, m, d] = String(iso || "").split("-");
    if (!y || !m || !d) return String(iso || "");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  } catch {
    return String(iso || "");
  }
}

export function withinYear(iso, year) {
  return iso >= `${year}-01-01` && iso <= `${year}-12-31`;
}

export function monthFromISO(iso) {
  return iso?.slice(5, 7) || "";
}

export function daysBetweenInclusive(startDate, endDate) {
  return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

export function getPublicTokenFromPath() {
  try {
    const p = window.location.pathname || "";
    const m = p.match(/^\/view\/([^/]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

export function isCurrentYear(year) {
  return Number(year) === new Date().getFullYear();
}

export function isoRangeForYear(year) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function buildYearOptions() {
  const y = new Date().getFullYear();
  return [y, y + 1];
}

export function chartGradientId(prefix, habitId) {
  return `${prefix}_actual_${String(habitId || "none")}`;
}