// Automated tests for the calculation engine.  Run with:  npm test   (or: node --test tests/)
//
// Reference ("answer key") files in tests/fixtures:
//   excel-*.json      results saved by Excel in the classroom workbook (sheets 1-4)
//   lo-*.json         modified copies of the workbook recalculated by LibreOffice (tools/build_references.py)
//   py-replica-*.json independent Python re-implementation from Phase 1 (tools/replicate.py)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runModel, at, history, GROUPS, adjustedPopulation, originalPopulationGrowthRates,
  convergenceGrowthRates, BASE_YEAR, END_YEAR,
} from "../engine/model.js";
import { DATA } from "../engine/data.js";
import { PROJECT_BASELINE, HW5_PRESETS, ALL_PRESETS, getPreset } from "../engine/scenarios.js";
import { solveUniformEmissionsIntensity } from "../engine/solve.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(here, "fixtures", `${name}.json`), "utf8"));

// Tolerances (relative). Excel and this engine both use 64-bit floating point and the same order of
// operations, so they agree to ~1e-16. LibreOffice saves 15 significant digits, so ~1e-11.
const TOL_EXCEL = 1e-12;
const TOL_LIBREOFFICE = 1e-10;
const TOL_REPLICA = 1e-9;

/** Compares two equal-length arrays year by year; failure message names the first bad year. */
function assertSeriesClose(actual, expected, startYear, tol, label) {
  assert.equal(actual.length, expected.length, `${label}: length ${actual.length} vs ${expected.length}`);
  for (let i = 0; i < expected.length; i++) {
    const a = actual[i], e = expected[i];
    const err = Math.abs(a - e);
    if (!(err <= tol * Math.abs(e) + 1e-13)) {
      assert.fail(`${label}, year ${startYear + i}: engine ${a} vs reference ${e} (relative error ${(err / Math.abs(e)).toExponential(2)})`);
    }
  }
}

/** Checks every yearly output that the workbook stores against a fixture. */
function assertMatchesWorkbookFixture(result, fx, tol) {
  const o = fx.outputs, g = result.global;
  assertSeriesClose(g.emissionsMtC.values, o.emissionsMtC, 1750, tol, "emissions (Mt C)");
  assertSeriesClose(g.ppm.values.slice(1), o.ppm_1751, 1751, tol, "CO2 concentration (ppm)");
  for (let k = 0; k < 5; k++) {
    assertSeriesClose(g.boxesPpm.values.slice(1).map((b) => b[k]), o.boxes_1751[k], 1751, tol, `carbon box ${k + 1}`);
  }
  assertSeriesClose(g.forcing.values.slice(1), o.forcing_1751, 1751, tol, "radiative forcing");
  assertSeriesClose(g.temperatureAtmosphere.values, o.tempAtmosphere_1850, 1850, tol, "atmospheric temperature");
  assertSeriesClose(g.temperatureOcean.values, o.tempOcean_1850, 1850, tol, "ocean temperature");
  assertSeriesClose(g.emissionsGtCO2.values, o.globalEmissionsGtCO2_1960, 1960, tol, "global emissions (Gt CO2)");
  for (const grp of GROUPS) {
    const r = result.groups[grp], f = o.groups_1960[grp];
    assertSeriesClose(r.population.values, f.population, 1960, tol, `${grp} population`);
    assertSeriesClose(r.gdpPerCapita.values, f.gdpPerCapita, 1960, tol, `${grp} GDP per capita`);
    assertSeriesClose(r.energyIntensity.values, f.energyIntensity, 1960, tol, `${grp} energy intensity`);
    assertSeriesClose(r.emissionsIntensity.values, f.emissionsIntensity, 1960, tol, `${grp} emissions intensity`);
    assertSeriesClose(r.emissionsGtCO2.values, f.emissionsGtCO2, 1960, tol, `${grp} emissions (Gt CO2)`);
  }
}

// ---------------------------------------------------------------------------------------------
describe("1. Original workbook scenarios (Excel stored results)", () => {
  const sheets = [
    ["excel-sheet1-hw5-s1-q7", "hw5-s1-q7"],
    ["excel-sheet2-hw5-s2", "hw5-s2"],
    ["excel-sheet3-hw5-s3", "hw5-s3"],
    ["excel-sheet4-hw5-s4", "hw5-s4"],
  ];
  for (const [fxName, presetId] of sheets) {
    test(`${fxName}: every output, every year 1750-2100, matches Excel`, () => {
      const fx = fixture(fxName);
      assertMatchesWorkbookFixture(runModel(fx.inputs), fx, TOL_EXCEL);
    });
    test(`${presetId} preset uses exactly the workbook's input values`, () => {
      const preset = getPreset(presetId), fx = fixture(fxName);
      assert.equal(preset.resultSource, "excel-stored");
      assert.deepEqual(preset.inputs.gdpPerCapitaGrowth, fx.inputs.gdpPerCapitaGrowth);
      assert.deepEqual(preset.inputs.energyIntensityChange, fx.inputs.energyIntensityChange);
      assert.deepEqual(preset.inputs.emissionsIntensityChange, fx.inputs.emissionsIntensityChange);
      assertMatchesWorkbookFixture(runModel(preset.inputs), fx, TOL_EXCEL);
    });
  }
  test("headline 2100 results equal the workbook's report cells", () => {
    const expected = { // V2, V4, V7, V9 on each sheet
      "hw5-s1-q7": [89535.43778946342, 1211.4364428201293, 7.932931741148421, 5.000000319239307],
      "hw5-s2": [26171.16, 732.709, 5.2429, 3.767010],
      "hw5-s3": [11712.18, 582.710, 4.0174, 3.156189],
      "hw5-s4": [2288.52, 449.923, 2.6338, 2.401526],
    };
    for (const [id, [mtc, ppm, f, t]] of Object.entries(expected)) {
      const s = runModel(getPreset(id).inputs).summary;
      assert.ok(Math.abs(s.emissionsMtC2100 - mtc) < 0.01, `${id} emissions`);
      assert.ok(Math.abs(s.ppm2100 - ppm) < 0.001, `${id} ppm`);
      assert.ok(Math.abs(s.forcing2100 - f) < 0.0001, `${id} forcing`);
      assert.ok(Math.abs(s.temperature2100 - t) < 0.000001, `${id} temperature`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe("2. Project Baseline", () => {
  const r = runModel(PROJECT_BASELINE.inputs);
  test("label and inputs are the approved ones", () => {
    assert.equal(PROJECT_BASELINE.label, "Project Baseline: Derived from HW5 Assumptions");
    assert.equal(PROJECT_BASELINE.resultSource, "computed");
    assert.deepEqual(PROJECT_BASELINE.inputs.gdpPerCapitaGrowth,
      { rich: 0.012, middle: 0.03727546363989566, poor: 0.05847514955676245 });
    assert.deepEqual(PROJECT_BASELINE.inputs.energyIntensityChange, { rich: -0.0148, middle: -0.0203, poor: -0.0156 });
    assert.deepEqual(PROJECT_BASELINE.inputs.emissionsIntensityChange, { rich: 0.0014, middle: 0.0045, poor: -0.0051 });
  });
  test("matches the workbook recalculated by LibreOffice with BD3:BF3 = 0.14%, 0.45%, -0.51%", () => {
    assertMatchesWorkbookFixture(r, fixture("lo-project-baseline"), TOL_LIBREOFFICE);
  });
  test("matches the independent Python replica of the workbook", () => {
    const py = fixture("py-replica-project-baseline");
    assertSeriesClose(r.global.emissionsMtC.values, py.emissionsMtC, 1750, TOL_REPLICA, "emissions");
    assertSeriesClose(r.global.ppm.values.slice(1), py.ppm_1751, 1751, TOL_REPLICA, "ppm");
    assertSeriesClose(r.global.forcing.values.slice(1), py.forcing_1751, 1751, TOL_REPLICA, "forcing");
    assertSeriesClose(r.global.temperatureAtmosphere.values, py.tempAtmosphere_1850, 1850, TOL_REPLICA, "temperature");
    for (const g of GROUPS) {
      assertSeriesClose(r.groups[g].emissionsGtCO2.values, py.groupsEmissionsGtCO2_1960[g], 1960, TOL_REPLICA, `${g} emissions`);
    }
  });
  test("2100 warming is 4.773 °C, still the peak, and incomes converge", () => {
    assert.equal(r.summary.temperature2100.toFixed(3), "4.773");
    assert.equal(r.summary.peakYear, 2100);
    const y = r.summary.gdpPerCapita2100;
    assert.ok(Math.abs(y.middle / y.rich - 1) < 1e-6 && Math.abs(y.poor / y.rich - 1) < 1e-6);
  });
});

// ---------------------------------------------------------------------------------------------
describe("3. HW5 Scenario 1 temperature targets (Q4-Q7)", () => {
  const base = {
    gdpPerCapitaGrowth: PROJECT_BASELINE.inputs.gdpPerCapitaGrowth,
    energyIntensityChange: PROJECT_BASELINE.inputs.energyIntensityChange,
  };
  for (const q of [4, 5, 6]) {
    test(`Q${q} preset: solver reproduces the stored rate, and the recalculated workbook agrees`, () => {
      const p = getPreset(`hw5-s1-q${q}`);
      assert.equal(p.resultSource, "computed");
      const solved = solveUniformEmissionsIntensity(base, p.homework.targetC);
      assert.ok(Math.abs(solved - p.inputs.emissionsIntensityChange.rich) < 1e-12);
      const r = runModel(p.inputs);
      assert.ok(Math.abs(r.summary.temperature2100 - p.homework.targetC) < 1e-9);
      assertMatchesWorkbookFixture(r, fixture(`lo-hw5-s1-q${q}`), TOL_LIBREOFFICE);
    });
  }
  test("Q7 preset (Excel Goal Seek) agrees with the engine's exact solution to 7 digits", () => {
    const p = getPreset("hw5-s1-q7");
    const solved = solveUniformEmissionsIntensity(base, 5);
    assert.ok(Math.abs(solved - p.inputs.emissionsIntensityChange.rich) < 1e-8);
  });
  test("Q4 (2 °C in 2100) overshoots: peak warming is above 2 °C", () => {
    const s = runModel(getPreset("hw5-s1-q4").inputs).summary;
    assert.ok(s.peakTemperature > 2.003 && s.peakTemperature < 2.005);
    assert.equal(s.peakYear, 2093);
  });
});

// ---------------------------------------------------------------------------------------------
describe("4. Scenarios the workbook never stored (spreadsheet-recalculated stress tests)", () => {
  for (const name of ["lo-energy-efficiency", "lo-decarbonization", "lo-independent-mixed"]) {
    test(`${name} matches the recalculated workbook`, () => {
      const fx = fixture(name);
      assertMatchesWorkbookFixture(runModel(fx.inputs), fx, TOL_LIBREOFFICE);
    });
  }
});

// ---------------------------------------------------------------------------------------------
describe("5. Population growth adjustment (project addition)", () => {
  test("zero adjustment reproduces the Excel population path exactly (bit for bit)", () => {
    for (const g of GROUPS) {
      const p = adjustedPopulation(g, 0);
      for (let t = 2021; t <= END_YEAR; t++) {
        assert.equal(at(p, t), DATA.population[g].values[t - 1960], `${g} ${t}`);
      }
      const r = runModel(PROJECT_BASELINE.inputs);
      assert.deepEqual(r.groups[g].population.values, DATA.population[g].values);
    }
  });
  test("adjusted growth rate equals original rate + adjustment in every year 2021-2100", () => {
    for (const g of GROUPS) {
      for (const adj of [-0.01, -0.002, 0.003, 0.01]) {
        const orig = originalPopulationGrowthRates(g).values;
        const p = adjustedPopulation(g, adj);
        let prev = DATA.population[g].values[BASE_YEAR - 1960];
        for (let i = 0; i < 80; i++) {
          const growth = p.values[i] / prev - 1;
          assert.ok(Math.abs(growth - (orig[i] + adj)) < 1e-12, `${g} ${2021 + i} adj ${adj}`);
          prev = p.values[i];
        }
      }
    }
  });
  test("Poor-group irregularity is preserved (0.26% in 2029, 0.32% 2030-2086, 0% from 2087)", () => {
    const g = originalPopulationGrowthRates("poor");
    assert.ok(Math.abs(at(g, 2029) - 0.0026289) < 1e-6);
    for (let t = 2030; t <= 2086; t++) assert.ok(Math.abs(at(g, t) - 0.0032) < 1e-9, `${t}`);
    for (let t = 2087; t <= 2100; t++) assert.ok(Math.abs(at(g, t)) < 1e-12, `${t}`);
    const adj = adjustedPopulation("poor", 0.001);
    let prev = DATA.population.poor.values[60];
    for (let t = 2021; t <= 2100; t++) {
      const growth = at(adj, t) / prev - 1;
      assert.ok(Math.abs(growth - at(g, t) - 0.001) < 1e-12);
      prev = at(adj, t);
    }
  });
  test("adjusted population flows through the workbook's formulas (LibreOffice check)", () => {
    const fx = fixture("lo-population-adjusted");
    assertMatchesWorkbookFixture(runModel(fx.inputs), fx, TOL_LIBREOFFICE);
  });
  test("2020 and earlier are never changed by an adjustment", () => {
    const r = runModel({ ...PROJECT_BASELINE.inputs, populationGrowthAdjustment: { rich: 0.01, middle: 0.01, poor: 0.01 } });
    for (const g of GROUPS) for (let t = 1960; t <= 2020; t++) {
      assert.equal(at(r.groups[g].population, t), DATA.population[g].values[t - 1960]);
    }
  });
  test("an adjustment that would make growth -100% or lower is rejected", () => {
    assert.throws(() => adjustedPopulation("rich", -1.5), RangeError);
  });
});

// ---------------------------------------------------------------------------------------------
describe("6. Income Convergence toggle", () => {
  test("GDP per capita is equal in all three groups in 2100 for any Rich growth rate", () => {
    for (const rich of [-0.03, -0.01, 0, 0.012, 0.02]) {
      const r = runModel({ ...PROJECT_BASELINE.inputs, gdpPerCapitaGrowth: { rich, middle: 0, poor: 0 }, incomeConvergence: true });
      const y = r.summary.gdpPerCapita2100;
      assert.ok(Math.abs(y.middle / y.rich - 1) < 1e-12, `middle, rich ${rich}`);
      assert.ok(Math.abs(y.poor / y.rich - 1) < 1e-12, `poor, rich ${rich}`);
    }
  });
  test("exact formula agrees with the workbook's Goal Seek rates on all four sheets", () => {
    // Goal Seek stops when it is "close enough": the largest gap is on sheet 4 (1.9e-7, i.e.
    // 0.000019 percentage points), which leaves 2100 incomes 0.0015% apart and changes 2100
    // warming by 0.000004 °C.
    for (const id of ["hw5-s1-q7", "hw5-s2", "hw5-s3", "hw5-s4"]) {
      const p = getPreset(id), stored = p.inputs.gdpPerCapitaGrowth;
      const exact = convergenceGrowthRates(stored.rich);
      assert.ok(Math.abs(exact.middle - stored.middle) < 5e-7, `${id} middle`);
      assert.ok(Math.abs(exact.poor - stored.poor) < 5e-7, `${id} poor`);
      const y = runModel(p.inputs).summary.gdpPerCapita2100;
      assert.ok(Math.abs(y.middle / y.rich - 1) < 2e-5 && Math.abs(y.poor / y.rich - 1) < 2e-5, `${id} parity`);
      const dT = runModel(p.inputs).summary.temperature2100 - runModel({ ...p.inputs, incomeConvergence: true }).summary.temperature2100;
      assert.ok(Math.abs(dT) < 1e-5, `${id} temperature difference ${dT}`);
    }
  });
  test("when on, typed Middle/Poor rates are ignored; when off, they are used as given", () => {
    const on = runModel({ ...PROJECT_BASELINE.inputs, gdpPerCapitaGrowth: { rich: 0.012, middle: 0.5, poor: 0.5 }, incomeConvergence: true });
    assert.deepEqual(on.scenario.gdpPerCapitaGrowth, convergenceGrowthRates(0.012));
    const off = runModel({ ...PROJECT_BASELINE.inputs, gdpPerCapitaGrowth: { rich: 0.012, middle: 0.01, poor: 0.02 } });
    assert.deepEqual(off.scenario.gdpPerCapitaGrowth, { rich: 0.012, middle: 0.01, poor: 0.02 });
  });
  test("baseline with the toggle on differs from the stored-rate baseline only negligibly", () => {
    const a = runModel(PROJECT_BASELINE.inputs).summary.temperature2100;
    const b = runModel({ ...PROJECT_BASELINE.inputs, incomeConvergence: true }).summary.temperature2100;
    assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);
  });
});

// ---------------------------------------------------------------------------------------------
describe("7. Consistency checks", () => {
  const results = ALL_PRESETS.map((p) => [p.id, runModel(p.inputs)]);
  test("Rich + Middle + Poor = global emissions, every year, every preset", () => {
    for (const [id, r] of results) for (let t = 1960; t <= 2100; t++) {
      const sum = GROUPS.reduce((s, g) => s + at(r.groups[g].emissionsGtCO2, t), 0);
      assert.ok(Math.abs(sum - at(r.global.emissionsGtCO2, t)) < 1e-12 * sum, `${id} ${t}`);
    }
  });
  test("historical Kaya emissions equal the CO2 data (1960-2020)", () => {
    const r = results[0][1];
    for (const g of GROUPS) for (let t = 1960; t <= 2020; t++) {
      const data = DATA.co2[g].values[t - 1960] / 1000;
      assert.ok(Math.abs(at(r.groups[g].emissionsGtCO2, t) / data - 1) < 1e-12, `${g} ${t}`);
    }
  });
  test("workbook's typed 1960-2020 emissions (column B) equal the Kaya history", () => {
    const h = history();
    for (let t = 1960; t <= 2020; t++) {
      const kaya = GROUPS.reduce((s, g) => s + h[g].pop[t] * h[g].y[t] * h[g].EI[t] * h[g].EM[t] * 1e-9, 0) * (12 / 44) * 1000;
      const typed = DATA.historicalEmissionsMtC.values[t - 1750];
      assert.ok(Math.abs(kaya / typed - 1) < 1e-12, `${t}`);
    }
  });
  test("every scenario has identical history through 2020 (402.67 ppm, 1.1276 °C)", () => {
    const ref = results[0][1];
    for (const [id, r] of results) {
      for (let t = 1750; t <= 2020; t++) assert.equal(at(r.global.ppm, t), at(ref.global.ppm, t), `${id} ppm ${t}`);
      for (let t = 1850; t <= 2020; t++) {
        assert.equal(at(r.global.temperatureAtmosphere, t), at(ref.global.temperatureAtmosphere, t), `${id} T ${t}`);
      }
      assert.equal(r.summary.ppm2020.toFixed(2), "402.67");
      assert.equal(r.summary.temperature2020.toFixed(4), "1.1276");
    }
  });
  test("CO2 concentration never falls below 275 ppm", () => {
    for (const [id, r] of results) assert.ok(Math.min(...r.global.ppm.values) >= 275 - 1e-9, id);
  });
  test("every preset is labelled with where its result comes from", () => {
    for (const p of ALL_PRESETS) {
      assert.ok(["excel-stored", "computed"].includes(p.resultSource), p.id);
      if (p.resultSource === "excel-stored") assert.ok(p.workbookSheet, p.id);
    }
    assert.equal(HW5_PRESETS.length, 7);
  });
});

// ---------------------------------------------------------------------------------------------
describe("8. Input checks", () => {
  const ok = PROJECT_BASELINE.inputs;
  test("missing or non-numeric rates are rejected", () => {
    assert.throws(() => runModel({ ...ok, energyIntensityChange: { rich: -0.01, middle: -0.01 } }), TypeError);
    assert.throws(() => runModel({ ...ok, gdpPerCapitaGrowth: { rich: NaN, middle: 0, poor: 0 } }), TypeError);
    assert.throws(() => runModel({ ...ok, populationGrowthAdjustment: { rich: "1" } }), TypeError);
  });
  test("rates of -100% per year or lower are rejected", () => {
    assert.throws(() => runModel({ ...ok, emissionsIntensityChange: { rich: -1, middle: 0, poor: 0 } }), RangeError);
  });
  test("runModel does not modify the scenario object passed in", () => {
    const copy = structuredClone(ok);
    runModel({ ...ok, incomeConvergence: true });
    assert.deepEqual(ok, copy);
  });
});
