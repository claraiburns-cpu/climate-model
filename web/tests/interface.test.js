// Final-polish interface tests: plain preset names, control labels, and safe rounding.
// Run with:  npm test   (inside the web folder)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_PRESETS, PROJECT_BASELINE, VARIABLES, VARIABLE_BY_KEY, GROUPS, baselineState, setValue, stateFromPreset,
  toEngineInputs, runModel,
} from "../src/lib/scenarioState.js";
import { PRESET_TEXT, PRESET_GROUPS, presetText, homeworkRef } from "../src/lib/presetNames.js";
import { evaluateChallenge, temperatureMessage, peakText, digitsAbove, TARGETS } from "../src/lib/challenge.js";
import { FACTORS } from "../src/lib/decomposition.js";
import { headlineDelta, num } from "../src/lib/format.js";

const TECHNICAL = /HW5|Homework|\bQ[0-9]\b|Excel|Computed|Scenario [0-9]|sheet|BD3|AL5/i;
const run = (state) => runModel(toEngineInputs(state));

describe("1. Plain scenario names", () => {
  test("every preset has a unique plain name and a short chart label", () => {
    const names = ALL_PRESETS.map((p) => presetText(p.id).name);
    assert.equal(new Set(names).size, ALL_PRESETS.length);
    assert.equal(new Set(ALL_PRESETS.map((p) => presetText(p.id).short)).size, ALL_PRESETS.length);
    assert.deepEqual(Object.keys(PRESET_TEXT).sort(), ALL_PRESETS.map((p) => p.id).sort());
  });
  test("names, short labels, menu groups and descriptions contain no homework or spreadsheet jargon", () => {
    for (const p of ALL_PRESETS) {
      const t = presetText(p.id);
      for (const text of [t.name, t.short, t.about]) assert.doesNotMatch(text, TECHNICAL, `${p.id}: ${text}`);
    }
    for (const g of PRESET_GROUPS) assert.doesNotMatch(g.label, TECHNICAL);
  });
  test("every non-baseline preset appears in exactly one menu group", () => {
    const grouped = ALL_PRESETS.filter((p) => p.id !== PROJECT_BASELINE.id).map((p) => presetText(p.id).group);
    for (const g of grouped) assert.ok(PRESET_GROUPS.some((x) => x.id === g), g);
    assert.equal(presetText(PROJECT_BASELINE.id).group, "baseline");
  });
  test("homework references and Excel/Computed sources are still available for About the Model", () => {
    const refs = Object.fromEntries(ALL_PRESETS.map((p) => [p.id, homeworkRef(p)]));
    assert.equal(refs["hw5-s1-q4"], "HW5 Scenario 1, Q4");
    assert.equal(refs["hw5-s1-q7"], "HW5 Scenario 1, Q7");
    assert.equal(refs["hw5-s2"], "HW5 Scenario 2");
    assert.equal(refs[PROJECT_BASELINE.id], "Not a homework scenario");
    assert.equal(PROJECT_BASELINE.label, "Project Baseline: Derived from HW5 Assumptions", "engine label unchanged");
    for (const p of ALL_PRESETS) assert.ok(["excel-stored", "computed"].includes(p.resultSource));
  });
  test("energy-mix descriptions quote each preset's actual emissions-intensity rate", () => {
    assert.match(presetText("hw5-s1-q4").about, /−6\.10%/);
    assert.match(presetText("hw5-s1-q5").about, /−2\.34%/);
    assert.match(presetText("hw5-s1-q7").about, /\+0\.35%/);
    assert.match(presetText("hw5-s1-q4").about, /2\.004 °C in 2093/);
  });
});

describe("2. Control labels", () => {
  test("accessible tab names with the precise terms kept", () => {
    assert.equal(VARIABLE_BY_KEY.energy.tab, "Energy efficiency");
    assert.equal(VARIABLE_BY_KEY.emissions.tab, "Cleaner energy");
    assert.equal(VARIABLE_BY_KEY.energy.label, "Energy intensity");
    assert.equal(VARIABLE_BY_KEY.emissions.label, "Emissions intensity");
    assert.match(VARIABLE_BY_KEY.energy.what, /energy intensity/);
    assert.match(VARIABLE_BY_KEY.emissions.what, /emissions intensity/);
  });
  test("both intensity controls explain that more negative means faster improvement", () => {
    for (const k of ["energy", "emissions"]) {
      assert.match(VARIABLE_BY_KEY[k].direction, /^More negative = faster/);
      assert.match(VARIABLE_BY_KEY[k].what, /more negative the rate, the faster/);
    }
  });
  test("every control has a tab name, and none of the explanations mention homework labels", () => {
    for (const v of VARIABLES) {
      assert.ok(v.tab, v.key);
      assert.doesNotMatch(`${v.what} ${v.effect}`, /HW5/);
    }
  });
  test("the emissions breakdown uses the same names as the controls", () => {
    const short = Object.fromEntries(FACTORS.map((f) => [f.id, f.short]));
    assert.equal(short.energy, VARIABLE_BY_KEY.energy.tab);
    assert.equal(short.emissions, VARIABLE_BY_KEY.emissions.tab);
    assert.equal(short.gdp, VARIABLE_BY_KEY.gdp.tab);
    assert.equal(short.population, VARIABLE_BY_KEY.population.tab);
  });
});

describe("3. Rounding never makes a failed target look met", () => {
  test("digitsAbove adds decimals only when a value above the limit would round down to it", () => {
    assert.equal(digitsAbove(2.4, 2), 2);
    assert.equal(digitsAbove(2.004, 2), 3);
    assert.equal(digitsAbove(2.0004, 2), 4);
    assert.equal(digitsAbove(1.9996, 2), 2, "values at or below the limit keep 2 decimals");
    assert.equal(digitsAbove(2, 2), 2);
  });

  const fake = (peak, t2100 = peak, peakYear = 2100) => ({
    summary: { peakTemperature: peak, peakYear, temperature2100: t2100 },
    global: { temperatureAtmosphere: { startYear: 2021, values: Array.from({ length: 80 }, (_, i) => (2021 + i === peakYear ? peak : Math.min(peak, t2100))) } },
    scenario: { gdpPerCapitaGrowth: { rich: 0.01, middle: 0.02, poor: 0.03 } },
  });
  const shownPeak = (ev) => Number(peakText(ev).replace(/,/g, ""));

  test("near-miss peaks show enough decimals to stay above the target", () => {
    for (const target of TARGETS) {
      for (const over of [1e-6, 4e-5, 4e-4, 0.0049, 0.004, 0.006, 0.05]) {
        const ev = evaluateChallenge(fake(target + over), target);
        assert.equal(ev.temperatureMet, false);
        assert.ok(shownPeak(ev) > target, `${target} + ${over} shown as ${peakText(ev)}`);
        const m = temperatureMessage(ev);
        assert.match(m.head, /^Target not achieved/);
        const by = Number(m.head.match(/by ([0-9.]+) °C/)[1]);
        assert.ok(by > 0, `margin shown as ${by}`);
        const inDetail = Number(m.detail.match(/peaking at ([0-9.]+) °C/)[1]);
        assert.ok(inDetail > target);
      }
    }
  });
  test("successes use 2 decimals and say when the margin is under 0.01 °C", () => {
    const ev = evaluateChallenge(fake(2.9995), 3);
    const m = temperatureMessage(ev);
    assert.equal(m.head, "Target achieved: Peak warming is 3.00 °C, below your 3 °C target.");
    assert.match(m.detail, /^Just within the target: less than 0\.01 °C to spare\./);
    const roomy = temperatureMessage(evaluateChallenge(fake(2.41), 3));
    assert.match(roomy.detail, /^That is 0\.59 °C of room to spare\./);
    assert.match(temperatureMessage(evaluateChallenge(fake(3), 3)).head, /exactly at your 3 °C target/);
  });
  test("HW5 Q4 (peak 2.0038 °C) still reads as a failure at 2 °C", () => {
    const ev = evaluateChallenge(run(stateFromPreset("hw5-s1-q4")), 2);
    assert.equal(peakText(ev), "2.004");
    assert.match(temperatureMessage(ev).head, /exceeds your target by 0\.004 °C/);
  });
  test("sweep: 221 uniform emissions-intensity rates × 3 targets — display always agrees with pass/fail", () => {
    for (let bp = -800; bp <= 300; bp += 5) {
      const r = run(GROUPS.reduce((s, g) => setValue(s, "emissions", g, bp / 10000), baselineState()));
      for (const target of TARGETS) {
        const ev = evaluateChallenge(r, target);
        const shown = shownPeak(ev);
        if (ev.temperatureMet) assert.ok(shown <= target, `${bp} bp, ${target} °C: met but shown ${shown}`);
        else assert.ok(shown > target, `${bp} bp, ${target} °C: failed but shown ${shown}`);
        assert.equal(/^Target achieved/.test(temperatureMessage(ev).head), ev.temperatureMet);
      }
    }
  });
});

describe("4. Headline rounding", () => {
  test("baseline headline values: 4.77 °C and 1,085 ppm", () => {
    const b = runModel(PROJECT_BASELINE.inputs).summary;
    assert.equal(num(b.temperature2100, 2), "4.77");
    assert.equal(num(b.ppm2100, 0), "1,085");
  });
  test("'Same as Project Baseline' only for an exact match; tiny changes are not hidden", () => {
    assert.equal(headlineDelta(4.773163, 4.773163, 2, "°C").text, "Same as Project Baseline");
    assert.equal(headlineDelta(4.775, 4.773, 2, "°C").text, "Within 0.01 °C of the baseline");
    assert.equal(headlineDelta(4.775, 4.773, 2, "°C").direction, null);
    assert.deepEqual(headlineDelta(3.86327, 4.77316, 2, "°C"), { text: "−0.91 °C vs. baseline 4.77", direction: "down" });
    assert.equal(headlineDelta(1100.2, 1084.7, 0, "ppm").text, "+16 ppm vs. baseline 1,085");
  });
});
