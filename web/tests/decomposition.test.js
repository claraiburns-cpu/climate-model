// Phase 5 Emissions Breakdown (LMDI) tests. Run with:  npm test   (inside the web folder)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  baselineState, stateFromPreset, setValue, setIncomeConvergence, toEngineInputs, runModel,
  PROJECT_BASELINE, ALL_PRESETS, GROUPS,
} from "../src/lib/scenarioState.js";
import {
  decompose, decomposeGroup, logMean, waterfallRows, explain, FACTORS, REGIONS, FIRST_YEAR, LAST_YEAR, SMALL_VALUE,
} from "../src/lib/decomposition.js";
import { mtcToGtCO2 } from "../src/lib/format.js";

const run = (state) => runModel(toEngineInputs(state));
const BASE = runModel(PROJECT_BASELINE.inputs);
const sumEffects = (d) => FACTORS.reduce((a, { id }) => a + d.effects[id], 0);
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b} (tol ${tol})`);
const engineEmissions = (r, g, y) => r.groups[g].emissionsGtCO2.values[y - r.groups[g].emissionsGtCO2.startYear];

/** A mixed scenario: every factor changes, in both directions, across groups. */
function mixedState() {
  let s = baselineState();
  s = setValue(s, "population", "poor", 0.003);
  s = setValue(s, "population", "rich", -0.002);
  s = setValue(s, "gdp", "rich", 0.02);
  s = setValue(s, "gdp", "poor", 0.065);
  s = setValue(s, "energy", "middle", -0.03);
  s = setValue(s, "energy", "poor", -0.025);
  s = setValue(s, "emissions", "rich", -0.03);
  s = setValue(s, "emissions", "middle", -0.03);
  s = setValue(s, "emissions", "poor", 0.005);
  return s;
}
const MIXED = run(mixedState());

describe("1. Logarithmic mean and edge cases", () => {
  test("L(a, a) = a; L is symmetric and lies between geometric and arithmetic means", () => {
    assert.equal(logMean(7.5, 7.5), 7.5);
    close(logMean(2, 8), logMean(8, 2), 1e-15);
    const l = logMean(2, 8);
    assert.ok(l > Math.sqrt(16) && l < 5);
    close(logMean(1, 1 + 1e-13), 1 + 5e-14, 1e-15, "near-equal values do not lose precision");
  });
  test("zero or negative inputs are replaced by a tiny positive value, so results stay finite", () => {
    assert.ok(Number.isFinite(logMean(0, 5)) && logMean(0, 5) > 0);
    assert.ok(Number.isFinite(logMean(-1, 5)));
    assert.equal(logMean(0, 0), SMALL_VALUE);
  });
  test("a group whose emissions fall to zero still decomposes to (almost exactly) the full difference", () => {
    const one = (v) => ({ startYear: 2100, values: [v] });
    const mk = (p, y, ei, em) => ({ groups: { rich: { population: one(p), gdpPerCapita: one(y), energyIntensity: one(ei), emissionsIntensity: one(em), emissionsGtCO2: one(p * y * ei * em * 1e-9) } } });
    const d = decomposeGroup(mk(1000, 30000, 100, 2), mk(1000, 30000, 100, 0), "rich", 2100);
    close(d.difference, -6, 1e-12);
    close(Object.values(d.effects).reduce((a, b) => a + b, 0), d.difference, 1e-12);
    close(d.effects.emissions, -6, 1e-12, "the factor that reaches zero takes the whole difference");
    assert.equal(d.effects.population, 0);
    const both = decomposeGroup(mk(1000, 30000, 100, 0), mk(1000, 30000, 100, 0), "rich", 2100);
    assert.deepEqual(Object.values(both.effects), [0, 0, 0, 0]);
    // limit check: as the scenario factor shrinks toward zero, ordinary LMDI approaches the same split
    const near = decomposeGroup(mk(1000, 30000, 100, 2), mk(1000, 30000, 100, 1e-12), "rich", 2100);
    close(near.effects.emissions, near.difference, 1e-12);
  });
  test("years outside 2021–2100 and unknown regions are rejected", () => {
    assert.throws(() => decompose(BASE, BASE, 2020), RangeError);
    assert.throws(() => decompose(BASE, BASE, 2101), RangeError);
    assert.throws(() => decompose(BASE, BASE, 2050.5), RangeError);
    assert.throws(() => decompose(BASE, BASE, 2100, "europe"), RangeError);
    assert.deepEqual(REGIONS, ["global", "rich", "middle", "poor"]);
    assert.equal(FIRST_YEAR, 2021);
    assert.equal(LAST_YEAR, 2100);
  });
});

describe("2. Contributions add up to the emissions difference", () => {
  const scenarios = [
    ...ALL_PRESETS.map((p) => [p.id, run(stateFromPreset(p.id))]),
    ["mixed", MIXED],
    ["convergence, rich 2%", run(setValue(setIncomeConvergence(baselineState(), true), "gdp", "rich", 0.02))],
  ];
  for (const [name, r] of scenarios) {
    test(`${name}: every year 2021–2100, every region`, () => {
      for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
        for (const region of REGIONS) {
          const d = decompose(BASE, r, y, region);
          close(sumEffects(d), d.difference, 1e-9 * Math.max(1, Math.abs(d.baseline)), `${name} ${region} ${y}`);
          close(d.residual, 0, 1e-9 * Math.max(1, Math.abs(d.baseline)));
        }
      }
    });
  }
  test("baseline and scenario totals equal the engine's own emissions (Gt CO₂)", () => {
    for (const y of [2021, 2050, 2100]) {
      const d = decompose(BASE, MIXED, y);
      close(d.baseline, BASE.global.emissionsGtCO2.values[y - BASE.global.emissionsGtCO2.startYear], 1e-12);
      close(d.scenario, MIXED.global.emissionsGtCO2.values[y - MIXED.global.emissionsGtCO2.startYear], 1e-12);
      for (const g of GROUPS) close(decompose(BASE, MIXED, y, g).scenario, engineEmissions(MIXED, g, y), 1e-12);
    }
  });
  test("global contributions are the sums of the three groups' contributions", () => {
    for (const y of [2030, 2075, 2100]) {
      const glob = decompose(BASE, MIXED, y);
      for (const { id } of FACTORS) {
        close(glob.effects[id], GROUPS.reduce((a, g) => a + decompose(BASE, MIXED, y, g).effects[id], 0), 1e-12);
      }
    }
  });
});

describe("3. No difference → zero contributions", () => {
  test("Project Baseline vs itself: all contributions exactly zero, every year and region", () => {
    const same = run(baselineState());
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
      for (const region of REGIONS) {
        const d = decompose(BASE, same, y, region);
        for (const { id } of FACTORS) assert.equal(d.effects[id], 0);
        assert.equal(d.difference, 0);
      }
    }
    assert.equal(explain(decompose(BASE, same, 2100)).kind, "same");
  });
  test("a factor left at its baseline value contributes exactly zero", () => {
    const r = run(setValue(baselineState(), "energy", "rich", -0.03));
    const d = decompose(BASE, r, 2100);
    assert.ok(d.effects.energy < 0);
    assert.equal(d.effects.population, 0);
    assert.equal(d.effects.gdp, 0);
    assert.equal(d.effects.emissions, 0);
    assert.equal(decompose(BASE, r, 2100, "poor").difference, 0, "other groups are untouched");
    assert.equal(explain(decompose(BASE, r, 2100, "poor")).kind, "same");
  });
  test("each single-driver change is attributed entirely to that driver", () => {
    const cases = { population: ["population", 0.004], gdp: ["gdp", 0.02], energy: ["energy", -0.03], emissions: ["emissions", -0.02] };
    for (const [id, [variable, v]] of Object.entries(cases)) {
      const r = run(GROUPS.reduce((s, g) => setValue(s, variable, g, v), baselineState()));
      const d = decompose(BASE, r, 2100);
      close(d.effects[id], d.difference, 1e-9);
      for (const other of FACTORS) if (other.id !== id) assert.equal(d.effects[other.id], 0);
    }
  });
});

describe("4. Increases, decreases, years and income groups", () => {
  test("higher emissions (Q7, +0.35%/yr emissions intensity): positive total and emissions-intensity effect", () => {
    const d = decompose(BASE, run(stateFromPreset("hw5-s1-q7")), 2100);
    assert.ok(d.difference > 0);
    close(d.effects.emissions, 79.104, 0.001);
    assert.match(explain(d).sentences[0], /more than/);
  });
  test("lower emissions (S2, rich 0% growth): the whole reduction is GDP per person", () => {
    const d = decompose(BASE, run(stateFromPreset("hw5-s2")), 2100);
    close(d.difference, -153.232, 0.001);
    close(d.effects.gdp, d.difference, 1e-9);
    assert.match(explain(d).sentences.join(" "), /less than.*All of it comes from lower GDP per person/);
  });
  test("Q7 lowers middle-income emissions (+0.35% < +0.45%) but raises rich and poor emissions", () => {
    const r = run(stateFromPreset("hw5-s1-q7"));
    assert.ok(decompose(BASE, r, 2100, "middle").effects.emissions < 0);
    assert.ok(decompose(BASE, r, 2100, "rich").effects.emissions > 0);
    assert.ok(decompose(BASE, r, 2100, "poor").effects.emissions > 0);
  });
  test("the gap grows over time for a constant-rate change (2030 < 2060 < 2100)", () => {
    const r = run(stateFromPreset("hw5-s1-q5"));
    const gaps = [2030, 2060, 2100].map((y) => -decompose(BASE, r, y).difference);
    assert.ok(gaps[0] > 0 && gaps[0] < gaps[1] && gaps[1] < gaps[2]);
  });
  test("mixed scenario: drivers point in different directions and group results differ", () => {
    const d = decompose(BASE, MIXED, 2100);
    assert.ok(d.effects.population > 0 && d.effects.gdp > 0, "more people and higher income raise emissions");
    assert.ok(d.effects.energy < 0, "lower energy intensity reduces emissions");
    assert.ok(decompose(BASE, MIXED, 2100, "poor").effects.emissions > 0);
    assert.ok(decompose(BASE, MIXED, 2100, "middle").effects.emissions < 0);
    assert.equal(decompose(BASE, MIXED, 2100, "middle").effects.population, 0);
    assert.ok(decompose(BASE, MIXED, 2021, "global").difference !== decompose(BASE, MIXED, 2100, "global").difference);
  });
});

describe("5. Independent check against Excel (Python LMDI on the workbook's own Kaya factors)", () => {
  const X = JSON.parse(fs.readFileSync(new URL("./fixtures/excel-lmdi.json", import.meta.url), "utf8"));
  const asResult = (factors, year) => {
    const one = (v) => ({ startYear: year, values: [v] });
    return {
      groups: Object.fromEntries(GROUPS.map((g) => [g, {
        population: one(factors[g].population), gdpPerCapita: one(factors[g].gdp), energyIntensity: one(factors[g].energy),
        emissionsIntensity: one(factors[g].emissions), emissionsGtCO2: one(factors[g].total),
      }])),
    };
  };
  for (const [name, byYear] of Object.entries(X.cases)) {
    test(`${name}: website decomposition of Excel's numbers matches the Python result`, () => {
      for (const [y, c] of Object.entries(byYear)) {
        const year = Number(y);
        const d = decompose(asResult(c.baselineFactors, year), asResult(c.scenarioFactors, year), year);
        close(d.difference, c.lmdi.difference, 1e-9, `${name} ${y} difference`);
        for (const { id } of FACTORS) close(d.effects[id], c.lmdi.effects[id], 1e-9, `${name} ${y} ${id}`);
        for (const g of GROUPS) {
          for (const { id } of FACTORS) close(d.byGroup[g].effects[id], c.lmdi.groups[g].effects[id], 1e-9, `${name} ${y} ${g} ${id}`);
        }
      }
    });
  }
  const enginePresets = { "hw5-s1-q7 (sheet 1, stored)": "hw5-s1-q7", "hw5-s2 (sheet 2, stored)": "hw5-s2", "hw5-s4 (sheet 4, stored)": "hw5-s4", "hw5-s1-q4 (Excel recalculation)": "hw5-s1-q4" };
  test("for the homework presets, the website's breakdown of engine results equals the breakdown of Excel's values", () => {
    for (const [name, id] of Object.entries(enginePresets)) {
      const r = run(stateFromPreset(id));
      for (const [y, c] of Object.entries(X.cases[name])) {
        const d = decompose(BASE, r, Number(y));
        close(d.baseline, Object.values(c.baselineFactors).reduce((a, f) => a + (f.total ?? 0), 0), 1e-9);
        for (const { id: k } of FACTORS) close(d.effects[k], c.lmdi.effects[k], 1e-9, `${name} ${y} ${k}`);
      }
    }
  });
});

describe("6. Waterfall and explanation", () => {
  test("waterfall: baseline, four steps, scenario; each step starts where the previous ended", () => {
    const d = decompose(BASE, MIXED, 2100);
    const rows = waterfallRows(d, "Your scenario");
    assert.deepEqual(rows.map((r) => r.id), ["baseline", "population", "gdp", "energy", "emissions", "scenario"]);
    assert.deepEqual(rows[0].range, [0, d.baseline]);
    for (let i = 1; i <= 4; i++) {
      const prevEnd = i === 1 ? d.baseline : rows[i - 1].end;
      close(rows[i].start, prevEnd, 1e-12);
      assert.equal(rows[i].kind, rows[i].value > 0 ? "up" : rows[i].value < 0 ? "down" : "zero");
    }
    close(rows[4].end, d.scenario, 1e-9, "last step lands on the scenario total");
    assert.equal(rows[5].name, "Your scenario");
  });
  test("explanation names the largest driver and the offsetting ones, using the actual numbers", () => {
    const d = decompose(BASE, run(mixedState()), 2100);
    const text = explain(d).sentences.join(" ");
    const down = FACTORS.map(({ id }) => [id, d.effects[id]]).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
    const top = down[0];
    assert.equal(explain(d).kind, "change");
    assert.match(text, /less than in the Project Baseline/);
    assert.ok(text.includes(Math.abs(d.difference).toFixed(1)), "states the total difference");
    assert.ok(text.includes(Math.abs(top[1]).toFixed(1)), "states the largest contribution");
    assert.match(text, /partly offset/);
  });
  test("offsetting drivers that cancel out are described as balanced", () => {
    const d = { region: "global", year: 2050, baseline: 100, scenario: 100, difference: 0, effects: { population: 5, gdp: 0, energy: -5, emissions: 0 } };
    const e = explain(d);
    assert.equal(e.kind, "balanced");
    assert.match(e.sentences.join(" "), /about the same.*larger population adds 5\.0 Gt.*lower energy intensity/);
  });
  test("region wording", () => {
    const d = decompose(BASE, MIXED, 2100, "poor");
    assert.match(explain(d).sentences[0], /^In 2100, poor countries emit/);
  });
});

describe("7. Cumulative emissions shown in Gt CO₂", () => {
  test("2,459 Gt C = 9,018 Gt CO₂ (× 44/12); underlying engine value unchanged", () => {
    assert.equal(BASE.summary.cumulativeEmissionsMtC_2021_2100.toFixed(2), "2459403.65");
    close(mtcToGtCO2(BASE.summary.cumulativeEmissionsMtC_2021_2100), 9017.813, 0.001);
    close(mtcToGtCO2(1000), 44 / 12, 1e-15);
  });
});
