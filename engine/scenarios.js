// Scenario presets.
//
// resultSource:
//   "excel-stored"  - the workbook contains this exact scenario; results must match the saved sheet.
//   "computed"      - not saved in the workbook; results come from this engine (and were cross-checked
//                     by recalculating a modified copy of the workbook in a spreadsheet program).
//
// All presets use incomeConvergence: false and list the Middle/Poor growth rates explicitly, so the
// workbook's own (Goal Seek) rates are preserved. The Income Convergence toggle (exact formula) is
// for user scenarios.

const HW5_ENERGY_INTENSITY = { rich: -0.0148, middle: -0.0203, poor: -0.0156 };     // HW5 table, cells AU4:AW4
const HW5_EMISSIONS_INTENSITY = { rich: 0.0014, middle: 0.0045, poor: -0.0051 };    // HW5 table, sheets 2-4 BD3:BF3
const S1_GROWTH = { rich: 0.012, middle: 0.03727546363989566, poor: 0.05847514955676245 }; // sheet 1 AL5:AN5

const uniform = (r) => ({ rich: r, middle: r, poor: r });

export const PROJECT_BASELINE = {
  id: "project-baseline",
  label: "Project Baseline: Derived from HW5 Assumptions",
  shortLabel: "Project Baseline",
  category: "baseline",
  resultSource: "computed",
  description:
    "Rich GDP per capita grows 1.2%/yr (HW5 Scenario 1); Middle and Poor grow at the rates that reach " +
    "income parity in 2100; energy and emissions intensity follow HW5's actual 30-year historical averages. " +
    "Not a homework answer: equivalent to sheet 1 with BD3:BF3 set to 0.14%, 0.45%, -0.51%.",
  inputs: {
    gdpPerCapitaGrowth: { ...S1_GROWTH },
    energyIntensityChange: { ...HW5_ENERGY_INTENSITY },
    emissionsIntensityChange: { ...HW5_EMISSIONS_INTENSITY },
    incomeConvergence: false,
  },
};

const s1 = (q, targetC, rate, source, extra = {}) => ({
  id: `hw5-s1-q${q}`,
  label: `HW5 Scenario 1, Q${q}: ${targetC} °C target in 2100`,
  shortLabel: `S1 · ${targetC} °C`,
  category: "homework",
  homework: { scenario: 1, question: q, targetC },
  resultSource: source,
  description:
    `Rich growth 1.2%/yr with income parity in 2100; historical energy-intensity trends; one uniform ` +
    `emissions-intensity change for all groups chosen so warming in 2100 is ${targetC} °C.`,
  inputs: {
    gdpPerCapitaGrowth: { ...S1_GROWTH },
    energyIntensityChange: { ...HW5_ENERGY_INTENSITY },
    emissionsIntensityChange: uniform(rate),
    incomeConvergence: false,
  },
  ...extra,
});

export const HW5_PRESETS = [
  s1(4, 2, -0.06099364969052229, "computed", {
    note: "Warming peaks at about 2.004 °C in 2093 before easing to 2.000 °C in 2100, so this scenario " +
      "would not pass a 2 °C peak-warming test.",
  }),
  s1(5, 3, -0.023389812968956758, "computed"),
  s1(6, 4, -0.007408500899485138, "computed"),
  s1(7, 5, 0.003520486165895995, "excel-stored", {
    workbookSheet: "Hw5 template (1)",
    note: "Rate as saved by Excel's Goal Seek (BD3). The engine's exact solution, 0.0035204831, agrees to 7 digits.",
  }),
  {
    id: "hw5-s2",
    label: "HW5 Scenario 2: No growth in rich-country GDP per capita",
    shortLabel: "S2 · Rich 0%",
    category: "homework",
    homework: { scenario: 2, questions: [8, 9, 10] },
    resultSource: "excel-stored",
    workbookSheet: "Hw5 template (2)",
    description: "Rich growth 0%/yr; Middle and Poor reach parity in 2100; historical intensity trends.",
    inputs: {
      gdpPerCapitaGrowth: { rich: 0, middle: 0.024975756052128425, poor: 0.0459240680892377 },
      energyIntensityChange: { ...HW5_ENERGY_INTENSITY },
      emissionsIntensityChange: { ...HW5_EMISSIONS_INTENSITY },
      incomeConvergence: false,
    },
  },
  {
    id: "hw5-s3",
    label: "HW5 Scenario 3: Rich-country GDP per capita falls 1% per year",
    shortLabel: "S3 · Rich −1%",
    category: "homework",
    homework: { scenario: 3, questions: [11, 12, 13, 14] },
    resultSource: "excel-stored",
    workbookSheet: "Hw5 template (3)",
    description: "Rich growth −1%/yr; Middle and Poor reach parity in 2100; historical intensity trends.",
    inputs: {
      gdpPerCapitaGrowth: { rich: -0.01, middle: 0.014725977216462856, poor: 0.03546479999076827 },
      energyIntensityChange: { ...HW5_ENERGY_INTENSITY },
      emissionsIntensityChange: { ...HW5_EMISSIONS_INTENSITY },
      incomeConvergence: false,
    },
  },
  {
    id: "hw5-s4",
    label: "HW5 Scenario 4: Rich-country GDP per capita falls 3% per year",
    shortLabel: "S4 · Rich −3%",
    category: "homework",
    homework: { scenario: 4, questions: [15, 16, 17, 18] },
    resultSource: "excel-stored",
    workbookSheet: "Hw5 template (4)",
    description: "Rich growth −3%/yr; Middle and Poor reach parity in 2100; historical intensity trends.",
    note: "Middle-income GDP per capita shrinks (−0.58%/yr). Kept unchanged as in the homework; it would not " +
      "qualify under the Climate Challenge's positive-growth rule.",
    inputs: {
      gdpPerCapitaGrowth: { rich: -0.03, middle: -0.0057737002848761345, poor: 0.014546153046831883 },
      energyIntensityChange: { ...HW5_ENERGY_INTENSITY },
      emissionsIntensityChange: { ...HW5_EMISSIONS_INTENSITY },
      incomeConvergence: false,
    },
  },
];

export const ALL_PRESETS = [PROJECT_BASELINE, ...HW5_PRESETS];

export function getPreset(id) {
  const p = ALL_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown preset: ${id}`);
  return structuredClone(p);
}
