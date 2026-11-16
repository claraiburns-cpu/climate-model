// Emissions breakdown: additive LMDI-I (logarithmic mean Divisia index) decomposition of the
// difference in annual CO₂ emissions between the user's scenario and the Project Baseline.
//
// Reads the engine's per-group Kaya factors; it never changes the engine or its equations.
//
//   Emissions of group i:  C_i = P_i × y_i × EI_i × EM_i × 10⁻⁹         (Gt CO₂, workbook column BJ:BL)
//   Contribution of factor k in group i (scenario s vs baseline b, same year):
//       ΔC_k,i = L(C_i^s, C_i^b) × ln(x_k,i^s / x_k,i^b)
//       L(a, b) = (a − b) / (ln a − ln b),  L(a, a) = a                  (logarithmic mean)
//   Because ln(C^s/C^b) = Σ_k ln(x_k^s/x_k^b), the four contributions add up exactly to C_i^s − C_i^b.
//   Global contributions are the sums over the three groups (LMDI is consistent in aggregation).
//
// These are mathematical attributions of a difference, not causal estimates of policy effects.

import { GROUPS } from "./scenarioState.js";

export const FACTORS = [
  { id: "population", key: "population", label: "Population", short: "Population" },
  { id: "gdp", key: "gdpPerCapita", label: "GDP per person", short: "GDP per capita" },
  { id: "energy", key: "energyIntensity", label: "Energy intensity", short: "Energy efficiency" },
  { id: "emissions", key: "emissionsIntensity", label: "Emissions intensity", short: "Cleaner energy" },
];
export const REGIONS = ["global", ...GROUPS];
export const FIRST_YEAR = 2021;
export const LAST_YEAR = 2100;

/** Values smaller than this (in Gt CO₂/yr) are treated as "no difference" in explanations. */
export const NEGLIGIBLE_GT = 0.005;
/** Used by logMean in place of a zero or negative input so logs stay finite. */
export const SMALL_VALUE = 1e-20;

const valueAt = (series, year) => series.values[year - series.startYear];
const safe = (x) => (Number.isFinite(x) && x > 0 ? x : SMALL_VALUE);

/** Logarithmic mean of two positive numbers; L(a, a) = a. */
export function logMean(a, b) {
  a = safe(a); b = safe(b);
  if (a === b) return a;
  const rel = Math.abs(a - b) / Math.max(a, b);
  if (rel < 1e-10) return (a + b) / 2;                       // avoids 0/0 rounding when a ≈ b
  return (a - b) / (Math.log(a) - Math.log(b));
}

/** Kaya factors of one group in one year, straight from the engine result. */
export function groupFactors(result, group, year) {
  const g = result.groups[group];
  const f = {};
  for (const { id, key } of FACTORS) f[id] = valueAt(g[key], year);
  f.emissions_total = valueAt(g.emissionsGtCO2, year);        // Gt CO₂ (engine's BJ:BL)
  return f;
}

/** LMDI-I decomposition for one income group. */
export function decomposeGroup(baseResult, scenResult, group, year) {
  const b = groupFactors(baseResult, group, year);
  const s = groupFactors(scenResult, group, year);
  const baseline = b.emissions_total, scenario = s.emissions_total;
  const difference = scenario - baseline;
  const effects = {};
  const zero = FACTORS.filter(({ id }) => !(s[id] > 0 && b[id] > 0)).map(({ id }) => id);
  if (zero.length) {
    // Zero (or invalid) factor values cannot occur within the website's slider ranges, but are handled
    // with LMDI's limiting values (Ang & Liu 2007): as a factor goes to zero, its contribution tends to the
    // whole difference and every other contribution tends to zero. Several such factors share it equally.
    for (const { id } of FACTORS) effects[id] = zero.includes(id) ? difference / zero.length : 0;
    return { group, year, baseline, scenario, difference, effects };
  }
  const w = logMean(scenario, baseline);
  for (const { id } of FACTORS) {
    const ratio = s[id] / b[id];
    effects[id] = ratio === 1 ? 0 : w * Math.log(ratio);
  }
  return { group, year, baseline, scenario, difference, effects };
}

function checkYear(year) {
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) {
    throw new RangeError(`Breakdown year must be a whole year from ${FIRST_YEAR} to ${LAST_YEAR}; got ${year}.`);
  }
}

/**
 * Decompose the scenario-minus-baseline emissions difference in one year, for "global" or one group.
 * Returns { region, year, baseline, scenario, difference, effects:{population,gdp,energy,emissions},
 *           residual, byGroup } with all values in Gt CO₂ per year.
 */
export function decompose(baseResult, scenResult, year = LAST_YEAR, region = "global") {
  checkYear(year);
  if (!REGIONS.includes(region)) throw new RangeError(`Unknown region: ${region}`);
  const groups = region === "global" ? GROUPS : [region];
  const byGroup = Object.fromEntries(groups.map((g) => [g, decomposeGroup(baseResult, scenResult, g, year)]));
  const effects = Object.fromEntries(FACTORS.map(({ id }) => [id, groups.reduce((sum, g) => sum + byGroup[g].effects[id], 0)]));
  const baseline = groups.reduce((sum, g) => sum + byGroup[g].baseline, 0);
  const scenario = groups.reduce((sum, g) => sum + byGroup[g].scenario, 0);
  const difference = scenario - baseline;
  const residual = difference - FACTORS.reduce((sum, { id }) => sum + effects[id], 0);
  return { region, year, baseline, scenario, difference, effects, residual, byGroup };
}

/** Waterfall rows: baseline total, four floating contributions, scenario total. */
export function waterfallRows(d, scenarioLabel = "Your scenario") {
  const rows = [{ id: "baseline", name: "Project Baseline", kind: "total", value: d.baseline, range: [0, d.baseline] }];
  let running = d.baseline;
  for (const { id, short } of FACTORS) {
    const v = d.effects[id];
    const next = running + v;
    rows.push({ id, name: short, kind: v > 0 ? "up" : v < 0 ? "down" : "zero", value: v, range: [Math.min(running, next), Math.max(running, next)], start: running, end: next });
    running = next;
  }
  rows.push({ id: "scenario", name: scenarioLabel, kind: "total", value: d.scenario, range: [0, d.scenario] });
  return rows;
}

// ---------------------------------------------------------------------------
// Plain-language explanation, built only from the decomposition results
// ---------------------------------------------------------------------------

const REGION_SUBJECT = { global: "the world", rich: "rich countries", middle: "middle-income countries", poor: "poor countries" };
const DRIVER = {
  population: { up: "a larger population", down: "a smaller population" },
  gdp: { up: "higher GDP per person", down: "lower GDP per person" },
  energy: { up: "less efficient energy use (higher energy intensity)", down: "more efficient energy use (lower energy intensity)" },
  emissions: { up: "more carbon-heavy energy (higher emissions intensity)", down: "cleaner energy (lower emissions intensity)" },
};
const gt = (v) => `${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Gt`;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const join = (items) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/**
 * Returns { kind: "same" | "balanced" | "change", sentences: string[] }.
 * "same": no factor differs; "balanced": factors differ but cancel out; "change": emissions differ.
 */
export function explain(d) {
  const where = d.region === "global" ? "" : ` for ${REGION_SUBJECT[d.region]}`;
  const items = FACTORS.map(({ id }) => ({ id, v: d.effects[id] })).filter((e) => Math.abs(e.v) >= NEGLIGIBLE_GT);
  if (items.length === 0 && Math.abs(d.difference) < NEGLIGIBLE_GT) {
    return {
      kind: "same",
      sentences: [`In ${d.year}, emissions${where} are the same as in the Project Baseline, so there is no difference to break down.`],
    };
  }
  const phrase = (e) => DRIVER[e.id][e.v > 0 ? "up" : "down"];

  if (Math.abs(d.difference) < NEGLIGIBLE_GT) {
    const ups = items.filter((e) => e.v > 0), downs = items.filter((e) => e.v < 0);
    return {
      kind: "balanced",
      sentences: [
        `In ${d.year}, emissions${where} are about the same as in the Project Baseline.`,
        `${capital(join(ups.map(phrase)))} add${ups.length === 1 ? "s" : ""} ${gt(ups.reduce((a, e) => a + e.v, 0))}, ` +
        `which ${join(downs.map(phrase))} cancel${downs.length === 1 ? "s" : ""} out.`,
      ],
    };
  }

  const dir = d.difference > 0 ? 1 : -1;
  const pctTxt = d.baseline > 0 ? ` (${dir > 0 ? "+" : "−"}${Math.abs((d.difference / d.baseline) * 100).toFixed(0)}%)` : "";
  const subject = d.region === "global" ? "this scenario emits" : `${REGION_SUBJECT[d.region]} emit`;
  const sentences = [
    `In ${d.year}, ${subject} ${gt(d.difference)} CO₂ per year ${dir > 0 ? "more" : "less"} than in the Project Baseline${pctTxt}.`,
  ];
  const same = items.filter((e) => Math.sign(e.v) === dir).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const opposite = items.filter((e) => Math.sign(e.v) === -dir).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const [top, ...rest] = same;
  if (top && !rest.length && !opposite.length) {
    sentences.push(`All of it comes from ${phrase(top)}.`);
  } else if (top) {
    sentences.push(`The largest contributor is ${phrase(top)}: ${dir > 0 ? "+" : "−"}${gt(top.v)}.` +
      (rest.length ? ` ${capital(join(rest.map(phrase)))} ${dir > 0 ? "add" : "remove"}${rest.length === 1 ? "s" : ""} a further ${gt(rest.reduce((a, e) => a + e.v, 0))}.` : ""));
  }
  if (opposite.length) {
    const off = opposite.reduce((a, e) => a + e.v, 0);
    sentences.push(`${capital(join(opposite.map(phrase)))} partly offset${opposite.length === 1 ? "s" : ""} this, ${dir > 0 ? "removing" : "adding"} ${gt(off)}.`);
  }
  return { kind: "change", sentences };
}
