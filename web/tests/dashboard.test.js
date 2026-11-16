// Phase 3 dashboard tests: checks that the website's controls drive the validated engine correctly.
// Run with:  npm test   (inside the web folder)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  VARIABLES, GROUPS, baselineState, stateFromPreset, setValue, setIncomeConvergence, toEngineInputs,
  isBaselineState, isLocked, buildChartData, runModel, PROJECT_BASELINE, ALL_PRESETS,
} from "../src/lib/scenarioState.js";

const run = (state) => runModel(toEngineInputs(state));
const BASE = runModel(PROJECT_BASELINE.inputs);
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: expected ${b}, got ${a}`);

describe("1. Default dashboard", () => {
  test("default scenario is the Project Baseline and gives ~4.773 °C in 2100", () => {
    const s = baselineState();
    assert.equal(s.presetId, "project-baseline");
    assert.equal(PROJECT_BASELINE.label, "Project Baseline: Derived from HW5 Assumptions");
    const r = run(s).summary;
    close(r.temperature2100, 4.773, 0.0005, "2100 warming");
    close(r.peakTemperature, 4.773, 0.0005, "peak warming");
    assert.equal(r.peakYear, 2100);
    close(r.emissionsGtCO2_2100, 249.2, 0.05, "2100 emissions (Gt CO2)");
    close(r.ppm2100, 1084.70, 0.005, "2100 ppm");
  });

  test("dashboard inputs reproduce the engine's baseline exactly (bit for bit)", () => {
    const r = run(baselineState());
    assert.deepEqual(r.global.temperatureAtmosphere.values, BASE.global.temperatureAtmosphere.values);
    assert.deepEqual(r.global.ppm.values, BASE.global.ppm.values);
    assert.deepEqual(r.global.emissionsGtCO2.values, BASE.global.emissionsGtCO2.values);
  });
});

describe("2. Every slider changes the corresponding calculation", () => {
  for (const v of VARIABLES) {
    for (const g of GROUPS) {
      test(`${v.label}, ${g}: +0.5 point raises that group's emissions only, and raises warming`, () => {
        const s0 = baselineState();
        const s1 = setValue(s0, v.key, g, s0.values[v.key][g] + 0.005);
        assert.equal(s1.modified, true);
        // Exactly one engine input changed.
        const i0 = toEngineInputs(s0), i1 = toEngineInputs(s1);
        for (const w of VARIABLES) for (const h of GROUPS) {
          const changed = i1[w.input][h] !== i0[w.input][h];
          assert.equal(changed, w.key === v.key && h === g, `${w.input}.${h}`);
        }
        const r0 = run(s0), r1 = run(s1);
        for (const h of GROUPS) {
          const e0 = r0.groups[h].emissionsGtCO2.values.at(-1), e1 = r1.groups[h].emissionsGtCO2.values.at(-1);
          if (h === g) assert.ok(e1 > e0, `${h} emissions should rise`);
          else assert.equal(e1, e0, `${h} emissions should not change`);
        }
        assert.ok(r1.summary.emissionsGtCO2_2100 > r0.summary.emissionsGtCO2_2100, "global emissions rise");
        assert.ok(r1.summary.ppm2100 > r0.summary.ppm2100, "ppm rises");
        assert.ok(r1.summary.temperature2100 > r0.summary.temperature2100, "warming rises");
        // History is never affected.
        assert.equal(r1.summary.temperature2020, r0.summary.temperature2020);
      });
    }
  }

  test("every preset value sits inside its slider's range", () => {
    for (const p of ALL_PRESETS) {
      const s = stateFromPreset(p.id);
      for (const v of VARIABLES) for (const g of GROUPS) {
        const x = s.values[v.key][g] * 100;
        assert.ok(x >= v.min && x <= v.max, `${p.id} ${v.key}.${g} = ${x} outside [${v.min}, ${v.max}]`);
      }
    }
  });

  test("slider extremes never make the engine reject the scenario", () => {
    for (const v of VARIABLES) for (const g of GROUPS) for (const end of [v.min, v.max]) {
      assert.doesNotThrow(() => run(setValue(baselineState(), v.key, g, end / 100)), `${v.key}.${g}=${end}`);
    }
  });
});

describe("3. Homework presets", () => {
  // Expected values from MODEL_DOCUMENTATION.md, sections 2.2-2.3.
  const expected = {
    "hw5-s1-q4": { t: 2.000, peak: 2.004, peakYear: 2093, source: "computed" },
    "hw5-s1-q5": { t: 3.000, source: "computed" },
    "hw5-s1-q6": { t: 4.000, source: "computed" },
    "hw5-s1-q7": { t: 5.000, ppm: 1211.4, gt: 328.3, source: "excel-stored" },
    "hw5-s2": { t: 3.767, ppm: 732.7, gt: 96.0, source: "excel-stored" },
    "hw5-s3": { t: 3.156, ppm: 582.7, gt: 42.9, source: "excel-stored" },
    "hw5-s4": { t: 2.402, ppm: 449.9, gt: 8.4, source: "excel-stored" },
  };

  test("dropdown offers the baseline plus exactly the seven HW5 scenarios", () => {
    assert.deepEqual(ALL_PRESETS.map((p) => p.id), ["project-baseline", ...Object.keys(expected)]);
  });

  for (const [id, e] of Object.entries(expected)) {
    test(`${id} loads into the sliders and gives the documented results`, () => {
      const preset = ALL_PRESETS.find((p) => p.id === id);
      const s = stateFromPreset(id);
      assert.equal(s.modified, false);
      assert.equal(s.incomeConvergence, false);
      assert.equal(preset.resultSource, e.source);
      // Dashboard sends the preset's exact inputs to the engine.
      const inputs = toEngineInputs(s);
      assert.deepEqual(inputs.gdpPerCapitaGrowth, preset.inputs.gdpPerCapitaGrowth);
      assert.deepEqual(inputs.energyIntensityChange, preset.inputs.energyIntensityChange);
      assert.deepEqual(inputs.emissionsIntensityChange, preset.inputs.emissionsIntensityChange);
      assert.deepEqual(inputs.populationGrowthAdjustment, { rich: 0, middle: 0, poor: 0 });
      const r = run(s).summary;
      close(r.temperature2100, e.t, 0.0005, "2100 warming");
      if (e.ppm) close(r.ppm2100, e.ppm, 0.05, "2100 ppm");
      if (e.gt) close(r.emissionsGtCO2_2100, e.gt, 0.05, "2100 Gt CO2");
      if (e.peak) { close(r.peakTemperature, e.peak, 0.0005, "peak"); assert.equal(r.peakYear, e.peakYear); }
    });
  }
});

describe("4. Income Convergence toggle", () => {
  const gdp2100 = (s) => Object.values(run(s).summary.gdpPerCapita2100);
  const spread = (xs) => (Math.max(...xs) - Math.min(...xs)) / Math.max(...xs);

  test("turning it on makes all three groups reach the same GDP per capita in 2100", () => {
    const s = setIncomeConvergence(setValue(baselineState(), "gdp", "rich", 0.02), true);
    assert.equal(s.incomeConvergence, true);
    assert.ok(spread(gdp2100(s)) < 1e-12);
    assert.ok(isLocked(s, "gdp", "middle") && isLocked(s, "gdp", "poor") && !isLocked(s, "gdp", "rich"));
  });

  test("with it on, moving the rich slider re-solves middle and poor automatically", () => {
    let s = setIncomeConvergence(baselineState(), true);
    const before = { ...s.values.gdp };
    s = setValue(s, "gdp", "rich", 0.005);
    assert.notEqual(s.values.gdp.middle, before.middle);
    assert.notEqual(s.values.gdp.poor, before.poor);
    assert.ok(spread(gdp2100(s)) < 1e-12);
    // The displayed rates equal what the engine actually used.
    assert.deepEqual(run(s).scenario.gdpPerCapitaGrowth, s.values.gdp);
  });

  test("with it on, middle and poor sliders are ignored", () => {
    const s = setIncomeConvergence(baselineState(), true);
    assert.equal(setValue(s, "gdp", "poor", 0.07), s);
  });

  test("baseline with convergence on differs only negligibly (exact formula vs Excel's Goal Seek)", () => {
    const t = run(setIncomeConvergence(baselineState(), true)).summary.temperature2100;
    close(t, BASE.summary.temperature2100, 1e-5, "2100 warming");
  });

  test("turning it off frees the sliders; incomes then diverge when a rate changes", () => {
    let s = setIncomeConvergence(setIncomeConvergence(baselineState(), true), false);
    assert.equal(s.incomeConvergence, false);
    s = setValue(s, "gdp", "poor", 0.03);
    assert.equal(s.values.gdp.poor, 0.03);
    assert.equal(toEngineInputs(s).gdpPerCapitaGrowth.poor, 0.03);
    assert.ok(spread(gdp2100(s)) > 0.1);
  });
});

describe("5. Reset and chart data", () => {
  test("reset returns every control to the Project Baseline", () => {
    let s = baselineState();
    s = setValue(s, "energy", "rich", -0.04);
    s = setValue(s, "population", "poor", 0.005);
    s = setIncomeConvergence(s, true);
    assert.equal(isBaselineState(s), false);
    const reset = baselineState();
    assert.equal(isBaselineState(reset), true);
    assert.deepEqual(reset, stateFromPreset("project-baseline"));
    close(run(reset).summary.temperature2100, 4.773, 0.0005, "after reset");
  });

  test("chart series run 1960-2100 and the scenario line moves while the baseline line stays put", () => {
    const changed = run(setValue(baselineState(), "emissions", "middle", -0.03));
    for (const key of ["emissionsGtCO2", "ppm", "temperatureAtmosphere"]) {
      const same = buildChartData(BASE, run(baselineState()), key);
      const diff = buildChartData(BASE, changed, key);
      assert.equal(same.length, 141);
      assert.equal(same[0].year, 1960);
      assert.equal(same.at(-1).year, 2100);
      assert.ok(same.every((d) => d.scenario === d.baseline), `${key}: identical at baseline`);
      assert.deepEqual(diff.map((d) => d.baseline), same.map((d) => d.baseline), `${key}: baseline unchanged`);
      assert.ok(diff.filter((d) => d.year <= 2020).every((d) => d.scenario === d.baseline), `${key}: history unchanged`);
      assert.ok(diff.at(-1).scenario < diff.at(-1).baseline, `${key}: 2100 lower with faster decarbonization`);
    }
  });
});
