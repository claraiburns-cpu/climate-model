const MINUS = "−";

export function num(v, digits = 0) {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return (v < 0 && Number(s.replace(/,/g, "")) !== 0 ? MINUS : "") + s;
}

export function signed(v, digits = 2) {
  const rounded = Number(Math.abs(v).toFixed(digits));
  if (rounded === 0) return num(0, digits);
  return (v > 0 ? "+" : MINUS) + num(Math.abs(v), digits);
}

/** Decimal rate -> "1.20%" / "+1.20%" */
export function pct(rate, digits = 2, withSign = false) {
  const v = rate * 100;
  return (withSign ? signed(v, digits) : num(v, digits)) + "%";
}

/** Decimal pp adjustment -> "+0.25 pp" */
export function pp(rate, digits = 2) {
  return signed(rate * 100, digits) + " pp";
}

export function sliderText(variable, rate) {
  return variable.key === "population" ? pp(rate) : pct(rate, 2, true);
}

export function money(v) {
  return "$" + num(v, 0);
}

/** Round axis ticks (steps of 1, 2, 2.5 or 5 × 10^k), about 5 intervals. */
export function niceTicks(lo, hi) {
  const raw = (hi - lo) / 5 || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** Carbon (Mt C) to carbon dioxide (Gt CO₂): × 44/12 (molar masses), ÷ 1000. Display-only conversion. */
export const CO2_PER_C = 44 / 12;
export function mtcToGtCO2(mtc) {
  return (mtc / 1000) * CO2_PER_C;
}

/**
 * Text under a headline number: exact match, a change too small to show at this precision, or the signed
 * change. Never says "same" unless the values are actually equal.
 */
export function headlineDelta(value, base, digits, unit) {
  const d = value - base;
  if (Math.abs(d) < 1e-9) return { text: "Same as Project Baseline", direction: null };
  if (Math.abs(d) < 0.5 * Math.pow(10, -digits)) {
    return { text: `Within ${num(Math.pow(10, -digits), digits)} ${unit} of the baseline`, direction: null };
  }
  return { text: `${signed(d, digits)} ${unit} vs. baseline ${num(base, digits)}`, direction: d > 0 ? "up" : "down" };
}
