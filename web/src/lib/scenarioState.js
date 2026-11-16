// Dashboard state <-> engine inputs.
//
// This file contains no model equations. It only translates slider positions into the
// scenario object that the validated Phase 2 engine (../engine/model.js) expects, and
// shapes engine results for the charts. Kept free of React so it can be tested with node --test.

import { runModel, convergenceGrowthRates, at, GROUPS } from "../../../engine/model.js";
import { PROJECT_BASELINE, ALL_PRESETS, HW5_PRESETS, getPreset } from "../../../engine/scenarios.js";

export { GROUPS, PROJECT_BASELINE, ALL_PRESETS, HW5_PRESETS, runModel };

export const GROUP_LABELS = {
  rich: "Rich countries",
  middle: "Middle-income countries",
  poor: "Poor countries",
};

// Slider definitions. Values in state are decimals (0.012 = 1.2 %); `min`, `max`, `step` are in
// display units (percent per year, or percentage points per year for population).
export const VARIABLES = [
  {
    key: "population",
    input: "populationGrowthAdjustment",
    label: "Population growth",
    tab: "Population",
    unit: "pp/yr",
    unitLong: "percentage points per year, added to the workbook's population path",
    min: -1, max: 1, step: 0.05,
    signed: true,
    addition: true,
    what:
      "How fast the number of people in each group grows. The baseline follows the classroom workbook's " +
      "fixed population path (world population reaches about 10.4 billion in 2100). This slider shifts " +
      "every year's growth rate, 2021–2100, up or down by the same amount.",
    effect:
      "More people means more economic activity, and so more emissions, if nothing else changes.",
  },
  {
    key: "gdp",
    input: "gdpPerCapitaGrowth",
    label: "GDP per capita growth",
    tab: "GDP per capita",
    unit: "%/yr",
    unitLong: "percent per year, compounded annually from 2020",
    min: -4, max: 8, step: 0.01,
    signed: true,
    what:
      "How fast average income per person grows each year. In the Project Baseline, rich countries grow 1.2% a " +
      "year and middle-income and poor countries grow fast enough to catch up by 2100.",
    effect:
      "Richer people produce and consume more. Raising this rate by 1 point raises emissions by about 1% " +
      "in the first year, and the effect compounds every year to 2100.",
  },
  {
    key: "energy",
    input: "energyIntensityChange",
    label: "Energy intensity",
    tab: "Energy efficiency",
    direction: "More negative = faster efficiency gains",
    unit: "%/yr",
    unitLong: "percent change per year in energy used per dollar of GDP",
    min: -6, max: 2, step: 0.01,
    signed: true,
    what:
      "Energy efficiency is measured by energy intensity: the energy the economy uses to produce one dollar of " +
      "GDP. A negative rate means less energy per dollar each year, so the economy becomes more efficient; the " +
      "more negative the rate, the faster the improvement. The Project Baseline uses the 1990–2020 averages.",
    effect:
      "Falling energy intensity (greater efficiency) lowers emissions. Moving the slider left means faster " +
      "efficiency gains.",
  },
  {
    key: "emissions",
    input: "emissionsIntensityChange",
    label: "Emissions intensity",
    tab: "Cleaner energy",
    direction: "More negative = faster shift to cleaner energy",
    unit: "%/yr",
    unitLong: "percent change per year in CO₂ released per unit of energy",
    min: -8, max: 3, step: 0.01,
    signed: true,
    what:
      "Cleaner energy is measured by emissions intensity: the CO₂ released for each unit of energy used. A " +
      "negative rate means less CO₂ per unit of energy each year (decarbonization); the more negative the rate, " +
      "the faster the shift to cleaner energy. The Project Baseline uses the 1990–2020 averages.",
    effect:
      "Falling emissions intensity lowers emissions. This is the lever the “Energy mix for … °C” scenarios " +
      "adjust to reach each warming level.",
  },
];

export const VARIABLE_BY_KEY = Object.fromEntries(VARIABLES.map((v) => [v.key, v]));

const zeros = () => ({ rich: 0, middle: 0, poor: 0 });

/** Dashboard state for a preset (Project Baseline by default). */
export function stateFromPreset(id = PROJECT_BASELINE.id) {
  const p = getPreset(id);
  return {
    presetId: p.id,
    modified: false,
    incomeConvergence: Boolean(p.inputs.incomeConvergence),
    values: {
      population: { ...zeros(), ...(p.inputs.populationGrowthAdjustment || {}) },
      gdp: { ...p.inputs.gdpPerCapitaGrowth },
      energy: { ...p.inputs.energyIntensityChange },
      emissions: { ...p.inputs.emissionsIntensityChange },
    },
  };
}

export const baselineState = () => stateFromPreset(PROJECT_BASELINE.id);

export function isBaselineState(state) {
  return state.presetId === PROJECT_BASELINE.id && !state.modified;
}

/** Is this slider locked because Income Convergence sets it automatically? */
export function isLocked(state, variableKey, group) {
  return state.incomeConvergence && variableKey === "gdp" && group !== "rich";
}

/** Change one slider. With Income Convergence on, Middle/Poor GDP follow the Rich rate. */
export function setValue(state, variableKey, group, value) {
  if (!VARIABLE_BY_KEY[variableKey]) throw new Error(`Unknown variable ${variableKey}`);
  if (isLocked(state, variableKey, group)) return state;
  const values = { ...state.values, [variableKey]: { ...state.values[variableKey], [group]: value } };
  if (state.incomeConvergence && variableKey === "gdp") {
    values.gdp = convergenceGrowthRates(values.gdp.rich); // engine's exact parity formula
  }
  return { ...state, modified: true, values };
}

/**
 * Turn Income Convergence on or off.
 * On: Middle/Poor GDP growth come from the engine's convergenceGrowthRates(rich).
 * Off: the sliders keep the converged rates as a starting point and can then be moved freely.
 */
export function setIncomeConvergence(state, on) {
  on = Boolean(on);
  if (on === state.incomeConvergence) return state;
  const gdp = on ? convergenceGrowthRates(state.values.gdp.rich) : { ...state.values.gdp };
  return { ...state, incomeConvergence: on, modified: true, values: { ...state.values, gdp } };
}

/** The scenario object passed to runModel(). */
export function toEngineInputs(state) {
  return {
    gdpPerCapitaGrowth: { ...state.values.gdp },
    energyIntensityChange: { ...state.values.energy },
    emissionsIntensityChange: { ...state.values.emissions },
    populationGrowthAdjustment: { ...state.values.population },
    incomeConvergence: state.incomeConvergence,
  };
}

/** Baseline slider values (always the Project Baseline). */
export const BASELINE_VALUES = baselineState().values;

/** Chart rows: { year, baseline, scenario } for one global series, startYear..2100. */
export function buildChartData(baseResult, scenResult, seriesKey, startYear = 1960, endYear = 2100) {
  const b = baseResult.global[seriesKey];
  const s = scenResult.global[seriesKey];
  const rows = [];
  for (let t = startYear; t <= endYear; t++) rows.push({ year: t, baseline: at(b, t), scenario: at(s, t) });
  return rows;
}

export function presetById(id) {
  return ALL_PRESETS.find((p) => p.id === id);
}
