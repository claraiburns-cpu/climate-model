// Goal-seek helpers (the engine's equivalent of Excel's Goal Seek).

import { runModel } from "./model.js";

/**
 * HW5 Scenario 1, Questions 4-7: find the single emissions-intensity change, applied equally to
 * Rich, Middle and Poor, that makes warming IN 2100 equal `targetC`, holding everything else in
 * `baseScenario` fixed. (The homework defines the target by the 2100 value, not the peak.)
 *
 * Warming in 2100 rises steadily with this rate, so bisection always converges.
 * Returns the rate as a decimal (e.g. 0.00352 = +0.352 % per year).
 */
export function solveUniformEmissionsIntensity(baseScenario, targetC, { low = -0.5, high = 0.2, iterations = 200 } = {}) {
  const t2100 = (rate) =>
    runModel({ ...baseScenario, emissionsIntensityChange: { rich: rate, middle: rate, poor: rate } }).summary.temperature2100;
  if (t2100(low) > targetC || t2100(high) < targetC) {
    throw new RangeError(`A ${targetC} °C target cannot be reached with a uniform rate between ${low} and ${high}.`);
  }
  for (let i = 0; i < iterations && high - low > 0; i++) {
    const mid = (low + high) / 2;
    if (mid === low || mid === high) break;
    if (t2100(mid) < targetC) low = mid; else high = mid;
  }
  return (low + high) / 2;
}
