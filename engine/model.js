// Classroom climate model: calculation engine.
//
// Reproduces the formulas of "hw5_solutions_lgg 1.xlsx" exactly (see MODEL_DOCUMENTATION.md).
// This file has no knowledge of any web page; the website will only call runModel().
//
// Every rate is a decimal fraction per year: 0.012 means 1.2 % per year.
// Arithmetic is written in the same order as the Excel formulas so floating-point
// results match the workbook as closely as possible.

import { DATA } from "./data.js";

export const GROUPS = ["rich", "middle", "poor"];
export const KAYA_START = 1960;      // first year of the Kaya block (row 6)
export const CYCLE_START = 1750;     // first year of the carbon cycle (row 4)
export const TEMP_START = 1850;      // temperature model starts here (row 104), warming = 0
export const BASE_YEAR = 2020;       // last historical year
export const FIRST_PROJECTION_YEAR = 2021;
export const END_YEAR = 2100;
const HORIZON = END_YEAR - BASE_YEAR; // 80 years

const P = DATA.parameters;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A time series that starts in `startYear`. */
function makeSeries(startYear, values) {
  return { startYear, endYear: startYear + values.length - 1, values };
}

/** Value of a series in a given year (undefined outside its range). */
export function at(series, year) {
  return series.values[year - series.startYear];
}

function dataValue(entry, year) {
  return entry.values[year - entry.startYear];
}

// ---------------------------------------------------------------------------
// Historical block, 1960-2020. Identical for every scenario, so computed once.
// ---------------------------------------------------------------------------

let historyCache = null;

/**
 * Rebuilds the workbook's historical Kaya factors (rows 6-66) from the raw data.
 * Middle and Poor follow the workbook's gap-filling method (MODEL_DOCUMENTATION.md, section 3.3).
 */
export function history() {
  if (historyCache) return historyCache;
  const out = {};
  for (const g of GROUPS) {
    const pop = {}, gdp = {}, co2 = {}, y = {}, EI = {}, EM = {}, energy = {};
    for (let t = KAYA_START; t <= BASE_YEAR; t++) {
      pop[t] = dataValue(DATA.population[g], t);
      gdp[t] = dataValue(DATA.gdp[g], t);
      co2[t] = dataValue(DATA.co2[g], t);
      y[t] = (gdp[t] / pop[t]) * 1000;                        // AL6 = AI6/AC6*1000
    }
    if (g === "rich") {
      for (let t = KAYA_START; t <= BASE_YEAR; t++) {
        energy[t] = dataValue(DATA.energy.rich, t);
        EI[t] = (energy[t] / gdp[t]) * 1000;                  // AU = AR/AI*1000
        EM[t] = co2[t] / energy[t];                           // BD = BA/AR
      }
    } else {
      for (let t = 1971; t <= 2019; t++) {
        energy[t] = dataValue(DATA.energy[g], t);
        EI[t] = (energy[t] / gdp[t]) * 1000;                  // AV = AS/AJ*1000
      }
      const eiFactor = Math.pow(EI[2019] / EI[1971], 1 / 48); // AV5 = (AV65/AV17)^(1/48)
      EI[2020] = EI[2019] * eiFactor;                         // AV66 = AV65*AV5
      energy[2020] = (gdp[2020] * EI[2020]) / 1000;           // AS66 = AJ66*AV66/1000
      for (let t = 1971; t <= 2020; t++) EM[t] = co2[t] / energy[t]; // BE = BB/AS
      const emFactor = Math.pow(EM[2020] / EM[1971], 1 / 49); // BE5 = (BE66/BE17)^(1/49)
      for (let t = 1970; t >= KAYA_START; t--) {
        EM[t] = EM[t + 1] / emFactor;                         // BE6 = BE7/BE$5 (back-cast)
        energy[t] = co2[t] / EM[t];                           // AS6 = BB6/BE6 ("estimated")
        EI[t] = (energy[t] / gdp[t]) * 1000;                  // AV6 = AS6/AJ6*1000
      }
    }
    out[g] = { pop, gdp, co2, y, EI, EM, energy };
  }
  historyCache = out;
  return out;
}

// ---------------------------------------------------------------------------
// Population
// ---------------------------------------------------------------------------

/**
 * Annual growth rates implied by the workbook's typed-in population path, 2021-2100:
 * g(t) = P(t)/P(t-1) - 1. (Same formula the workbook uses for historical growth, column AF.)
 */
export function originalPopulationGrowthRates(group) {
  const d = DATA.population[group];
  const rates = [];
  for (let t = FIRST_PROJECTION_YEAR; t <= END_YEAR; t++) {
    rates.push(dataValue(d, t) / dataValue(d, t - 1) - 1);
  }
  return makeSeries(FIRST_PROJECTION_YEAR, rates);
}

/**
 * PROJECT ADDITION (not in the classroom workbook).
 * Population path with every year's growth rate shifted by `adjustment` (decimal, e.g. 0.005 = +0.5
 * percentage points), applied identically to every projection year 2021-2100.
 *
 * Built as  P'(t) = P_excel(t) * prod_{s<=t} (1 + g(s) + adj) / (1 + g(s)),
 * so the adjusted growth rate is g(t) + adj every year, the original year-to-year pattern
 * (including the Poor-group irregularity) is preserved, and adj = 0 returns the workbook values exactly.
 */
export function adjustedPopulation(group, adjustment = 0) {
  const d = DATA.population[group];
  const g = originalPopulationGrowthRates(group).values;
  const values = [];
  let factor = 1;
  for (let i = 0, t = FIRST_PROJECTION_YEAR; t <= END_YEAR; i++, t++) {
    const grown = 1 + g[i] + adjustment;
    if (!(grown > 0)) {
      throw new RangeError(`Population adjustment for ${group} makes growth ≤ -100% in ${t}.`);
    }
    factor *= grown / (1 + g[i]);
    values.push(dataValue(d, t) * factor);
  }
  return makeSeries(FIRST_PROJECTION_YEAR, values);
}

// ---------------------------------------------------------------------------
// Income convergence
// ---------------------------------------------------------------------------

/**
 * HW5 income-convergence rule: Middle and Poor growth rates such that GDP per capita in all three
 * groups is equal in 2100, given the Rich growth rate.
 *   g_i = (1 + g_rich) * (y_rich,2020 / y_i,2020)^(1/80) - 1
 * The workbook found these with Goal Seek; this is the exact closed-form solution.
 */
export function convergenceGrowthRates(richGrowth) {
  checkRate("Rich GDP per capita growth", richGrowth);
  const h = history();
  const yr = h.rich.y[BASE_YEAR];
  return {
    rich: richGrowth,
    middle: (1 + richGrowth) * Math.pow(yr / h.middle.y[BASE_YEAR], 1 / HORIZON) - 1,
    poor: (1 + richGrowth) * Math.pow(yr / h.poor.y[BASE_YEAR], 1 / HORIZON) - 1,
  };
}

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------

function checkRate(name, v) {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new TypeError(`${name} must be a finite number, got ${v}`);
  if (!(v > -1)) throw new RangeError(`${name} must be greater than -100% per year, got ${v}`);
}

const zeros = () => ({ rich: 0, middle: 0, poor: 0 });

/**
 * Fills in defaults, applies the convergence toggle and validates.
 * Returns the rates actually used, so the interface can display them.
 */
export function resolveScenario(scenario) {
  const s = {
    gdpPerCapitaGrowth: { ...scenario.gdpPerCapitaGrowth },
    energyIntensityChange: { ...scenario.energyIntensityChange },
    emissionsIntensityChange: { ...scenario.emissionsIntensityChange },
    populationGrowthAdjustment: { ...zeros(), ...(scenario.populationGrowthAdjustment || {}) },
    incomeConvergence: Boolean(scenario.incomeConvergence),
  };
  if (s.incomeConvergence) {
    s.gdpPerCapitaGrowth = convergenceGrowthRates(s.gdpPerCapitaGrowth.rich);
  }
  for (const g of GROUPS) {
    checkRate(`GDP per capita growth (${g})`, s.gdpPerCapitaGrowth[g]);
    checkRate(`Energy intensity change (${g})`, s.energyIntensityChange[g]);
    checkRate(`Emissions intensity change (${g})`, s.emissionsIntensityChange[g]);
    const a = s.populationGrowthAdjustment[g];
    if (typeof a !== "number" || !Number.isFinite(a)) throw new TypeError(`Population adjustment (${g}) must be a finite number`);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Main model
// ---------------------------------------------------------------------------

/**
 * Runs the full model for one scenario.
 *
 * scenario = {
 *   gdpPerCapitaGrowth:        { rich, middle, poor },   // e.g. 0.012
 *   energyIntensityChange:     { rich, middle, poor },   // e.g. -0.0148
 *   emissionsIntensityChange:  { rich, middle, poor },   // e.g. 0.0014
 *   populationGrowthAdjustment:{ rich, middle, poor },   // optional, percentage points as decimals; default 0
 *   incomeConvergence: false,  // if true, Middle/Poor GDP growth come from convergenceGrowthRates(rich)
 * }
 */
export function runModel(scenario) {
  const s = resolveScenario(scenario);
  const h = history();
  const nKaya = END_YEAR - KAYA_START + 1;

  // ---- Kaya block, by income group ----------------------------------------------------------
  const groups = {};
  for (const g of GROUPS) {
    const hg = h[g];
    const pop = [], y = [], EI = [], EM = [], gdp = [], K = [];
    const popProj = adjustedPopulation(g, s.populationGrowthAdjustment[g]);
    for (let t = KAYA_START; t <= END_YEAR; t++) {
      const i = t - KAYA_START;
      if (t <= BASE_YEAR) {
        pop[i] = hg.pop[t]; y[i] = hg.y[t]; EI[i] = hg.EI[t]; EM[i] = hg.EM[t]; gdp[i] = hg.gdp[t];
      } else {
        pop[i] = at(popProj, t);
        y[i] = y[i - 1] * (1 + s.gdpPerCapitaGrowth[g]);          // AL67 = AL66*(1+AL$5)
        EI[i] = EI[i - 1] * (1 + s.energyIntensityChange[g]);      // AU67 = AU66*(1+AU$4)
        EM[i] = EM[i - 1] * (1 + s.emissionsIntensityChange[g]);   // BD67 = BD66*(1+BD$3)
        gdp[i] = (pop[i] * y[i]) / 1000;                           // AI67 = AC67*AL67/1000
      }
      K[i] = pop[i] * y[i] * EI[i] * EM[i] * 1e-9;                 // BJ = AC*AL*AU*BD*10^-9  (Gt CO2)
    }
    groups[g] = {
      population: makeSeries(KAYA_START, pop),          // million people
      gdpPerCapita: makeSeries(KAYA_START, y),          // US$ per person
      gdp: makeSeries(KAYA_START, gdp),                 // billion US$
      energyIntensity: makeSeries(KAYA_START, EI),      // toe per million US$
      emissionsIntensity: makeSeries(KAYA_START, EM),   // t CO2 per toe
      emissionsGtCO2: makeSeries(KAYA_START, K),
    };
  }
  const globalGt = [], kayaMtC = [];
  for (let i = 0; i < nKaya; i++) {
    globalGt[i] = groups.rich.emissionsGtCO2.values[i] + groups.middle.emissionsGtCO2.values[i]
      + groups.poor.emissionsGtCO2.values[i];                      // BM = SUM(BJ:BL)
    kayaMtC[i] = globalGt[i] * (12 / 44) * 1000;                   // BN = BM*BN$4*BN$3
  }

  // ---- Emissions entering the carbon cycle (column B) ---------------------------------------
  // 1750-2020: the workbook's typed values (1960-2020 equal the Kaya history); 2021-2100: Kaya projection.
  const E = [];
  for (let t = CYCLE_START; t <= END_YEAR; t++) {
    E.push(t <= BASE_YEAR ? dataValue(DATA.historicalEmissionsMtC, t) : kayaMtC[t - KAYA_START]);
  }

  // ---- Five-box carbon cycle (columns C-H) --------------------------------------------------
  const a = P.boxShares, beta = P.ppmPerMtC;
  const retain = [1, ...P.boxLifetimesYears.slice(1).map((tau) => Math.exp(-1 / tau))];
  let box = [(P.preindustrialPpm / beta) * beta, 0, 0, 0, 0];      // C4 = A3*H3 with A3 = 275/H3
  const boxes = [[...box]];
  const ppm = [box[0] + box[1] + box[2] + box[3] + box[4]];
  for (let t = CYCLE_START + 1; t <= END_YEAR; t++) {
    const e = E[t - CYCLE_START];
    box = box.map((b, k) => retain[k] * b + e * a[k] * beta);      // C5 = (C$3*C4) + ($B5*C$2*$H$3)
    boxes.push([...box]);
    ppm.push(box[0] + box[1] + box[2] + box[3] + box[4]);          // H = SUM(C:G)
  }

  // ---- Radiative forcing (column L) ---------------------------------------------------------
  const forcing = ppm.map((c) => P.forcingCoefficient * Math.log(c / P.preindustrialPpm)); // L = L$2*LN(H/L$3)

  // ---- Two-layer temperature model (columns M-P), from 1850 ----------------------------------
  const AT = [0], OT = [0];
  for (let t = TEMP_START + 1; t <= END_YEAR; t++) {
    const prevA = AT[AT.length - 1], prevO = OT[OT.length - 1];
    const F = forcing[t - CYCLE_START];
    const termO = P.p1 * ((P.p2 * F) - prevA);                      // O = $O$1*(($O$2*L)-M(t-1))
    const termP = P.p3 * (prevO - prevA);                           // P = $O$3*(N(t-1)-M(t-1))
    AT.push(prevA + termO + termP);                                 // M = M(t-1)+O+P
    OT.push(prevO + (P.p4 * (prevA - prevO)));                      // N = N(t-1)+($O$4*(M(t-1)-N(t-1)))
  }

  const result = {
    scenario: s,
    groups,
    global: {
      emissionsGtCO2: makeSeries(KAYA_START, globalGt),
      emissionsMtC: makeSeries(CYCLE_START, E),
      boxesPpm: makeSeries(CYCLE_START, boxes),
      ppm: makeSeries(CYCLE_START, ppm),
      forcing: makeSeries(CYCLE_START, forcing),
      temperatureAtmosphere: makeSeries(TEMP_START, AT),   // °C above the model's 1850 value
      temperatureOcean: makeSeries(TEMP_START, OT),
    },
  };
  result.summary = summarize(result);
  return result;
}

function summarize(r) {
  const T = r.global.temperatureAtmosphere;
  let peak = -Infinity, peakYear = null;
  for (let t = FIRST_PROJECTION_YEAR; t <= END_YEAR; t++) {
    if (at(T, t) > peak) { peak = at(T, t); peakYear = t; }
  }
  let cumulative = 0;
  for (let t = FIRST_PROJECTION_YEAR; t <= END_YEAR; t++) cumulative += at(r.global.emissionsMtC, t);
  return {
    emissionsMtC2100: at(r.global.emissionsMtC, END_YEAR),
    emissionsGtCO2_2100: at(r.global.emissionsGtCO2, END_YEAR),
    ppm2100: at(r.global.ppm, END_YEAR),
    forcing2100: at(r.global.forcing, END_YEAR),
    temperature2100: at(T, END_YEAR),
    peakTemperature: peak,             // highest warming 2021-2100 (Climate Challenge criterion)
    peakYear,
    warmingRate2100: at(T, END_YEAR) - at(T, END_YEAR - 1),  // °C per year in 2100
    temperature2020: at(T, BASE_YEAR),
    ppm2020: at(r.global.ppm, BASE_YEAR),
    cumulativeEmissionsMtC_2021_2100: cumulative,
    gdpPerCapita2100: Object.fromEntries(GROUPS.map((g) => [g, at(r.groups[g].gdpPerCapita, END_YEAR)])),
    population2100: Object.fromEntries(GROUPS.map((g) => [g, at(r.groups[g].population, END_YEAR)])),
  };
}
