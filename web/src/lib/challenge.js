// Climate Challenge rules (Phase 4).
//
// Uses the validated engine's results only; no model equations live here. The rules follow the
// approved Climate Challenge criteria in MODEL_DOCUMENTATION.md, section 9.3:
//   * Success test: PEAK warming between 2021 and 2100 must be at or below the target
//     (not just warming in 2100).
//   * Temperature reference: warming since the model's 1850 value.
//   * Positive-growth rule: GDP per capita growth must be above zero in every income group.
//     Zero counts as a failure. The rates checked are the ones the engine actually used, so the
//     Income Convergence toggle is handled automatically.

import { runModel, at, GROUPS, FIRST_PROJECTION_YEAR, END_YEAR } from "../../../engine/model.js";
import { num, pct } from "./format.js";

export const TARGETS = [2, 3, 4];
export const DEFAULT_TARGET = 3;

/** Uniform emissions-intensity search range = the dashboard's emissions-intensity slider range. */
export const HINT_RANGE = { low: -0.08, high: 0.03 };

/**
 * Score one engine result against a temperature target (°C above the model's 1850 value).
 */
export function evaluateChallenge(result, target) {
  if (!TARGETS.includes(target)) throw new RangeError(`Target must be one of ${TARGETS.join(", ")} °C`);
  const s = result.summary;
  const T = result.global.temperatureAtmosphere;
  const growth = { ...result.scenario.gdpPerCapitaGrowth };

  const failingGroups = GROUPS.filter((g) => !(growth[g] > 0));
  let crossingYear = null;
  let yearsAbove = 0;
  for (let t = FIRST_PROJECTION_YEAR; t <= END_YEAR; t++) {
    if (at(T, t) > target) {
      yearsAbove++;
      if (crossingYear === null) crossingYear = t;
    }
  }
  const temperatureMet = s.peakTemperature <= target;
  const growthMet = failingGroups.length === 0;
  return {
    target,
    peak: s.peakTemperature,
    peakYear: s.peakYear,
    temperature2100: s.temperature2100,
    margin: s.peakTemperature - target,            // > 0 means above the target
    temperatureMet,
    // True when the 2100 value alone would have passed but the peak does not.
    passesOnlyIn2100: !temperatureMet && s.temperature2100 <= target,
    crossingYear,                                  // first year (2021-2100) above the target, or null
    yearsAbove,
    growth,
    failingGroups,
    growthMet,
    success: temperatureMet && growthMet,
  };
}

/**
 * "What would it take?" helper.
 * Holding every other setting fixed, finds the single emissions-intensity change, applied equally to all
 * three groups, that brings PEAK warming down to the target. This is the same kind of question as HW5
 * Scenario 1 (Q4-Q7), but measured on the peak, as the Challenge requires.
 * Peak warming rises steadily with this rate, so bisection converges. Searches only the slider range.
 *
 * Returns { status: "reachable", rate, applyRate } | { status: "unreachable" } | { status: "any" }.
 * applyRate is rounded down to the slider's 0.01-point grid, so applying it always meets the target.
 */
export function requiredUniformEmissionsIntensity(inputs, target, { iterations = 45 } = {}) {
  const peakAt = (r) =>
    runModel({ ...inputs, emissionsIntensityChange: { rich: r, middle: r, poor: r } }).summary.peakTemperature;
  let lo = HINT_RANGE.low, hi = HINT_RANGE.high;
  if (peakAt(lo) > target) return { status: "unreachable" };
  if (peakAt(hi) <= target) return { status: "any" };
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (peakAt(mid) <= target) lo = mid; else hi = mid;
  }
  const applyRate = Math.max(HINT_RANGE.low, Math.floor(lo * 10000) / 10000);
  return { status: "reachable", rate: lo, applyRate };
}

/** Which of the three targets the scenario meets on temperature alone (peak test). */
export function targetsMet(result) {
  return TARGETS.map((t) => ({ target: t, met: result.summary.peakTemperature <= t }));
}

/** Chart rows for the challenge temperature graph, 2000-2100. */
export function challengeChartData(baseResult, scenResult, startYear = 2000) {
  const b = baseResult.global.temperatureAtmosphere;
  const s = scenResult.global.temperatureAtmosphere;
  const rows = [];
  for (let t = startYear; t <= END_YEAR; t++) rows.push({ year: t, baseline: at(b, t), scenario: at(s, t) });
  return rows;
}

// ---------------------------------------------------------------------------
// Feedback wording (built from actual model results)
// ---------------------------------------------------------------------------

const GROUP_PHRASE = { rich: "Rich-country", middle: "Middle-income", poor: "Poor-country" };

/** Enough decimals that a near-miss never rounds to look like a pass (e.g. 3.004 vs 3). */
export function tDigits(margin) {
  const m = Math.abs(margin);
  return m < 0.0005 ? 4 : m < 0.005 ? 3 : 2;
}

/**
 * Decimal places for showing `value` against a `limit`: 2 normally, more only when needed so that a value
 * above the limit never rounds down to (or below) it. Values at or below the limit always use `min`.
 */
export function digitsAbove(value, limit, min = 2, max = 9) {
  if (!(value > limit)) return min;
  for (let d = min; d <= max; d++) if (Number(value.toFixed(d)) > limit) return d;
  return max;
}

/** Peak warming as displayed next to the target. A failing peak always shows above the target. */
export function peakText(ev) {
  return num(ev.peak, digitsAbove(ev.peak, ev.target));
}

export function temperatureMessage(ev) {
  if (ev.temperatureMet) {
    const spare = -ev.margin;
    const peaks = `Warming peaks in ${ev.peakYear}${ev.peakYear < 2100 ? " and then declines" : ""}.`;
    return {
      head: ev.margin === 0
        ? `Target achieved: Peak warming is ${num(ev.peak, 2)} °C, exactly at your ${ev.target} °C target.`
        : `Target achieved: Peak warming is ${num(ev.peak, 2)} °C, below your ${ev.target} °C target.`,
      detail: ev.margin === 0
        ? peaks
        : spare < 0.005
          ? `Just within the target: less than 0.01 °C to spare. ${peaks}`
          : `That is ${num(spare, 2)} °C of room to spare. ${peaks}`,
    };
  }
  const p = peakText(ev);
  let detail = `Warming first passes ${ev.target} °C in ${ev.crossingYear} and stays above it for ${ev.yearsAbove} ${ev.yearsAbove === 1 ? "year" : "years"}, peaking at ${p} °C in ${ev.peakYear}.`;
  if (ev.passesOnlyIn2100) {
    detail += ` It falls back to ${num(ev.temperature2100, 2)} °C by 2100, but the challenge counts the highest point, not just 2100.`;
  }
  return { head: `Target not achieved: Peak warming exceeds your target by ${num(ev.margin, digitsAbove(ev.margin, 0))} °C.`, detail };
}

export function growthMessage(ev) {
  if (ev.growthMet) {
    return {
      head: "Growth requirement met: GDP per capita keeps growing in all three income groups.",
      detail: `Rich ${pct(ev.growth.rich, 2, true)}, middle-income ${pct(ev.growth.middle, 2, true)}, poor ${pct(ev.growth.poor, 2, true)} per year.`,
    };
  }
  const parts = ev.failingGroups.map(
    (g) => `${GROUP_PHRASE[g]} GDP per capita growth is ${ev.growth[g] === 0 ? "zero" : "negative"} (${pct(ev.growth[g], 2, true)} per year)`
  );
  return {
    head: `Economic growth requirement not met: ${parts.join("; ")}.`,
    detail: "Every group needs growth above 0% per year, even if the temperature target is met.",
  };
}
