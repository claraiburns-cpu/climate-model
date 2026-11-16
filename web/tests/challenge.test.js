// Phase 4 Climate Challenge tests. Run with:  npm test   (inside the web folder)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  baselineState, stateFromPreset, setValue, setIncomeConvergence, toEngineInputs, runModel,
  PROJECT_BASELINE, ALL_PRESETS, GROUPS, VARIABLES,
} from "../src/lib/scenarioState.js";
import {
  TARGETS, DEFAULT_TARGET, evaluateChallenge, requiredUniformEmissionsIntensity, targetsMet,
  challengeChartData, temperatureMessage, growthMessage, HINT_RANGE,
} from "../src/lib/challenge.js";
import { getPreset } from "../../engine/scenarios.js";

const run = (state) => runModel(toEngineInputs(state));
const BASE = runModel(PROJECT_BASELINE.inputs);
const uniformEmissions = (state, r) => GROUPS.reduce((s, g) => setValue(s, "emissions", g, r), state);

describe("1. Setup", () => {
  test("targets are 2, 3 and 4 °C; unknown targets are rejected", () => {
    assert.deepEqual(TARGETS, [2, 3, 4]);
    assert.ok(TARGETS.includes(DEFAULT_TARGET));
    assert.throws(() => evaluateChallenge(BASE, 1.5), RangeError);
  });

  test("challenge starts from the Project Baseline, which fails every target", () => {
    for (const t of TARGETS) {
      const ev = evaluateChallenge(run(baselineState()), t);
      assert.equal(ev.temperatureMet, false);
      assert.equal(ev.growthMet, true);
      assert.equal(ev.success, false);
      assert.ok(Math.abs(ev.peak - 4.773) < 0.0005);
      assert.equal(ev.peakYear, 2100);
    }
  });

  test("reported peak, peak year and 2100 warming equal the engine's own values", () => {
    const r = run(uniformEmissions(baselineState(), -0.0612));
    const ev = evaluateChallenge(r, 2);
    assert.equal(ev.peak, r.summary.peakTemperature);
    assert.equal(ev.peakYear, r.summary.peakYear);
    assert.equal(ev.temperature2100, r.summary.temperature2100);
    assert.equal(ev.margin, r.summary.peakTemperature - 2);
  });
});

describe("2. Success is judged on PEAK warming, not 2100 warming", () => {
  test("a scenario below the target in 2100 but above it earlier fails", () => {
    // Uniform −6.12%/yr: 2100 warming ≈ 1.997 °C, but peak ≈ 2.001 °C in 2092.
    const ev = evaluateChallenge(run(uniformEmissions(baselineState(), -0.0612)), 2);
    assert.ok(ev.temperature2100 < 2, `2100 warming ${ev.temperature2100} should be below 2`);
    assert.ok(ev.peak > 2, `peak ${ev.peak} should be above 2`);
    assert.ok(ev.peakYear < 2100);
    assert.equal(ev.temperatureMet, false);
    assert.equal(ev.passesOnlyIn2100, true);
    assert.equal(ev.success, false);
    assert.ok(ev.crossingYear > 2021 && ev.crossingYear <= ev.peakYear);
    assert.match(temperatureMessage(ev).detail, /counts the highest point/);
  });

  test("HW5 Scenario 1 Q4 (2.000 °C in 2100, peak 2.004 °C) fails the 2 °C challenge", () => {
    const ev = evaluateChallenge(runModel(getPreset("hw5-s1-q4").inputs), 2);
    assert.ok(Math.abs(ev.temperature2100 - 2) < 1e-6);
    assert.ok(Math.abs(ev.peak - 2.004) < 0.0005);
    assert.equal(ev.peakYear, 2093);
    assert.equal(ev.temperatureMet, false);
    assert.match(temperatureMessage(ev).head, /exceeds your target by 0\.004 °C/);
  });

  test("crossing year is the first year above the target", () => {
    const r = run(baselineState());
    const ev = evaluateChallenge(r, 3);
    const T = r.global.temperatureAtmosphere;
    const at = (y) => T.values[y - T.startYear];
    assert.ok(at(ev.crossingYear) > 3 && at(ev.crossingYear - 1) <= 3);
    assert.equal(ev.yearsAbove, 2100 - ev.crossingYear + 1);
  });

  test("peak exactly at the target passes; any amount above fails", () => {
    const fake = (peak) => ({
      summary: { peakTemperature: peak, peakYear: 2100, temperature2100: peak },
      global: { temperatureAtmosphere: { startYear: 2021, values: Array(80).fill(peak) } },
      scenario: { gdpPerCapitaGrowth: { rich: 0.01, middle: 0.02, poor: 0.03 } },
    });
    assert.equal(evaluateChallenge(fake(3), 3).success, true);
    assert.equal(evaluateChallenge(fake(3 + 1e-9), 3).success, false);
  });
});

describe("3. Economic growth requirement", () => {
  // Strong decarbonization so the temperature test passes on its own.
  const cool = () => uniformEmissions(baselineState(), -0.07);

  test("the 'cool' test scenario meets the temperature target with positive growth", () => {
    const ev = evaluateChallenge(run(cool()), 2);
    assert.equal(ev.temperatureMet, true);
    assert.equal(ev.growthMet, true);
    assert.equal(ev.success, true);
  });

  for (const g of GROUPS) {
    test(`zero GDP per capita growth in the ${g} group fails, even though the temperature target is met`, () => {
      const ev = evaluateChallenge(run(setValue(cool(), "gdp", g, 0)), 4);
      assert.equal(ev.temperatureMet, true);
      assert.equal(ev.growthMet, false);
      assert.deepEqual(ev.failingGroups, [g]);
      assert.equal(ev.success, false);
      assert.match(growthMessage(ev).head, /growth is zero/);
    });

    test(`negative GDP per capita growth in the ${g} group fails`, () => {
      const ev = evaluateChallenge(run(setValue(cool(), "gdp", g, -0.005)), 4);
      assert.equal(ev.temperatureMet, true);
      assert.deepEqual(ev.failingGroups, [g]);
      assert.equal(ev.success, false);
      assert.match(growthMessage(ev).head, /Economic growth requirement not met: .* is negative/);
    });
  }

  test("several failing groups are all listed", () => {
    let s = setValue(cool(), "gdp", "rich", -0.01);
    s = setValue(s, "gdp", "poor", 0);
    const ev = evaluateChallenge(run(s), 4);
    assert.deepEqual(ev.failingGroups, ["rich", "poor"]);
    const msg = growthMessage(ev).head;
    assert.match(msg, /Rich-country GDP per capita growth is negative/);
    assert.match(msg, /Poor-country GDP per capita growth is zero/);
  });

  test("HW5 Scenario 4 inputs fail on growth (middle-income −0.58%/yr) although warming is 2.40 °C", () => {
    const ev = evaluateChallenge(runModel(getPreset("hw5-s4").inputs), 3);
    assert.equal(ev.temperatureMet, true);
    assert.deepEqual(ev.failingGroups, ["rich", "middle"]);
    assert.equal(ev.success, false);
    assert.match(growthMessage(ev).head, /Middle-income GDP per capita growth is negative \(−0\.58% per year\)/);
  });

  test("a tiny positive growth rate counts as positive", () => {
    const ev = evaluateChallenge(run(setValue(cool(), "gdp", "rich", 0.0001)), 4);
    assert.equal(ev.growthMet, true);
  });
});

describe("4. Valid scenarios that hit the target pass", () => {
  for (const [target, rate] of [[2, -0.0614], [3, -0.025], [4, -0.008]]) {
    test(`uniform emissions intensity ${rate * 100}%/yr with baseline growth passes the ${target} °C challenge`, () => {
      const ev = evaluateChallenge(run(uniformEmissions(baselineState(), rate)), target);
      assert.equal(ev.temperatureMet, true, `peak ${ev.peak}`);
      assert.equal(ev.growthMet, true);
      assert.equal(ev.success, true);
      assert.equal(ev.crossingYear, null);
      assert.match(temperatureMessage(ev).head, new RegExp(`^Target achieved: Peak warming is [0-9.]+ °C, below your ${target} °C target\\.$`));
    });
  }

  test("efficiency instead of decarbonization can also pass (energy intensity −4.5%/yr everywhere)", () => {
    const s = GROUPS.reduce((acc, g) => setValue(acc, "energy", g, -0.045), baselineState());
    const ev = evaluateChallenge(run(s), 3);
    assert.equal(ev.success, true, `peak ${ev.peak}`);
  });

  test("targetsMet reports the peak test for all three targets", () => {
    const r = run(uniformEmissions(baselineState(), -0.025));
    assert.deepEqual(targetsMet(r).map((t) => t.met), [false, true, true]);
  });
});

describe("5. 'What would it take?' hint", () => {
  for (const target of TARGETS) {
    test(`applying the suggested rate meets the ${target} °C target on peak warming`, () => {
      const h = requiredUniformEmissionsIntensity(toEngineInputs(baselineState()), target);
      assert.equal(h.status, "reachable");
      assert.ok(h.applyRate >= HINT_RANGE.low && h.applyRate <= h.rate);
      assert.ok(Math.abs(h.applyRate * 10000 - Math.round(h.applyRate * 10000)) < 1e-9, "on the slider grid");
      const ev = evaluateChallenge(run(uniformEmissions(baselineState(), h.applyRate)), target);
      assert.equal(ev.success, true);
      // The exact rate puts the peak right on the target.
      const exact = evaluateChallenge(run(uniformEmissions(baselineState(), h.rate)), target);
      assert.ok(Math.abs(exact.peak - target) < 1e-9);
    });
  }

  test("for 3 °C and 4 °C (peak in 2100) the hint matches the HW5 Q5 and Q6 answers", () => {
    const i = toEngineInputs(baselineState());
    assert.ok(Math.abs(requiredUniformEmissionsIntensity(i, 3).rate - getPreset("hw5-s1-q5").inputs.emissionsIntensityChange.rich) < 1e-9);
    assert.ok(Math.abs(requiredUniformEmissionsIntensity(i, 4).rate - getPreset("hw5-s1-q6").inputs.emissionsIntensityChange.rich) < 1e-9);
  });

  test("for 2 °C the hint is stricter than HW5 Q4, because Q4 overshoots", () => {
    const h = requiredUniformEmissionsIntensity(toEngineInputs(baselineState()), 2);
    assert.ok(h.rate < getPreset("hw5-s1-q4").inputs.emissionsIntensityChange.rich);
  });

  test("reports 'unreachable' when even −8%/yr is not enough, and 'any' when even +3%/yr is fine", () => {
    let hot = baselineState();
    for (const g of GROUPS) hot = setValue(hot, "gdp", g, 0.08);
    for (const g of GROUPS) hot = setValue(hot, "energy", g, 0.02);
    assert.equal(requiredUniformEmissionsIntensity(toEngineInputs(hot), 2).status, "unreachable");
    let cold = baselineState();
    for (const g of GROUPS) cold = setValue(cold, "energy", g, -0.06);
    for (const g of GROUPS) cold = setValue(cold, "gdp", g, 0.001);
    assert.equal(requiredUniformEmissionsIntensity(toEngineInputs(cold), 4).status, "any");
  });
});

describe("6. Income Convergence in the challenge", () => {
  test("with convergence on, the growth check uses the automatically calculated rates", () => {
    let s = setIncomeConvergence(uniformEmissions(baselineState(), -0.07), true);
    s = setValue(s, "gdp", "rich", -0.03);
    const r = run(s);
    const ev = evaluateChallenge(r, 4);
    // Rich −3% implies middle-income ≈ −0.58% under parity, as in HW5 Scenario 4.
    assert.ok(Math.abs(ev.growth.middle - -0.005773700) < 1e-6);
    assert.deepEqual(ev.growth, r.scenario.gdpPerCapitaGrowth);
    assert.deepEqual(ev.failingGroups, ["rich", "middle"]);
    assert.equal(ev.success, false);
  });

  test("with convergence on and rich growth positive, all groups grow and incomes converge", () => {
    let s = setIncomeConvergence(uniformEmissions(baselineState(), -0.07), true);
    s = setValue(s, "gdp", "rich", 0.005);
    const r = run(s);
    const ev = evaluateChallenge(r, 2);
    assert.equal(ev.growthMet, true);
    const y = Object.values(r.summary.gdpPerCapita2100);
    assert.ok((Math.max(...y) - Math.min(...y)) / Math.max(...y) < 1e-12);
    assert.equal(ev.success, true);
  });

  test("lowering rich growth with convergence on lowers middle and poor growth too", () => {
    const on = setIncomeConvergence(baselineState(), true);
    const lower = setValue(on, "gdp", "rich", 0.002);
    assert.ok(lower.values.gdp.middle < on.values.gdp.middle);
    assert.ok(lower.values.gdp.poor < on.values.gdp.poor);
  });
});

describe("7. Slider changes update the challenge results and graph", () => {
  for (const v of VARIABLES) {
    test(`moving a ${v.label} slider changes the evaluation and the graph`, () => {
      const s0 = baselineState();
      const s1 = setValue(s0, v.key, "middle", s0.values[v.key].middle - 0.01);
      const r0 = run(s0), r1 = run(s1);
      const e0 = evaluateChallenge(r0, 3), e1 = evaluateChallenge(r1, 3);
      assert.ok(e1.peak < e0.peak, "peak warming falls");
      assert.ok(e1.margin < e0.margin);
      assert.notEqual(temperatureMessage(e1).head, temperatureMessage(e0).head);
      const g0 = challengeChartData(BASE, r0), g1 = challengeChartData(BASE, r1);
      assert.equal(g1.length, 101);
      assert.equal(g1[0].year, 2000);
      assert.deepEqual(g1.map((d) => d.baseline), g0.map((d) => d.baseline), "baseline line unchanged");
      assert.ok(g1.at(-1).scenario < g0.at(-1).scenario, "scenario line moves");
      assert.ok(g1.filter((d) => d.year <= 2020).every((d, i) => d.scenario === g0[i].scenario), "history unchanged");
    });
  }

  test("crossing the target with a slider flips the result from fail to pass", () => {
    const before = evaluateChallenge(run(uniformEmissions(baselineState(), -0.020)), 3);
    const after = evaluateChallenge(run(uniformEmissions(baselineState(), -0.025)), 3);
    assert.equal(before.success, false);
    assert.equal(after.success, true);
  });
});

describe("8. Dashboard is unaffected", () => {
  test("homework presets are unchanged and still available", () => {
    assert.equal(ALL_PRESETS.length, 8);
    assert.equal(stateFromPreset("hw5-s4").values.gdp.middle, -0.0057737002848761345);
    assert.equal(getPreset("hw5-s1-q4").inputs.emissionsIntensityChange.rich, -0.06099364969052229);
  });
});
