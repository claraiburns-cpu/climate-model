// Plain-language names for the scenario presets, shown on the website.
//
// The presets themselves (inputs, homework references, "Stored in Excel" / "Computed" source) live in
// ../../../engine/scenarios.js and are unchanged. Homework labels and sources are shown in About the Model.

import { ALL_PRESETS, PROJECT_BASELINE } from "./scenarioState.js";
import { pct } from "./format.js";

const rateOf = (id) => ALL_PRESETS.find((p) => p.id === id).inputs.emissionsIntensityChange.rich;

const energyMix = (id, t, extra = "") => ({
  name: `Energy mix for ${t} °C in 2100`,
  short: `Energy mix · ${t} °C`,
  group: "energy-mix",
  about:
    `Incomes, population and energy efficiency follow the Project Baseline. The energy mix (CO₂ per unit of energy, ` +
    `set with the Cleaner energy control) ` +
    `changes by ${pct(rateOf(id), 2, true)} a year in every income group, the rate that makes warming reach ${t} °C in 2100.` + extra,
});

export const PRESET_TEXT = {
  [PROJECT_BASELINE.id]: {
    name: "Project Baseline: current trends",
    short: "Project Baseline",
    group: "baseline",
    about:
      "Rich-country income per person grows 1.2% a year, and middle-income and poor countries grow fast enough to " +
      "catch up by 2100. Energy efficiency and the energy mix keep changing at their 1990–2020 pace.",
  },
  "hw5-s1-q4": energyMix("hw5-s1-q4", 2, " Warming peaks at 2.004 °C in 2093 before easing to 2.000 °C, so it would not pass a 2 °C Climate Challenge."),
  "hw5-s1-q5": energyMix("hw5-s1-q5", 3),
  "hw5-s1-q6": energyMix("hw5-s1-q6", 4),
  "hw5-s1-q7": energyMix("hw5-s1-q7", 5, " This is slightly more carbon-heavy than today's trend."),
  "hw5-s2": {
    name: "Rich-country incomes stop growing",
    short: "Rich growth 0%",
    group: "rich-growth",
    about:
      "Rich-country income per person stays flat (0% a year). Middle-income and poor countries grow fast enough to " +
      "catch up by 2100. Energy efficiency and the energy mix follow 1990–2020 trends.",
  },
  "hw5-s3": {
    name: "Rich-country incomes shrink 1% a year",
    short: "Rich growth −1%",
    group: "rich-growth",
    about:
      "Rich-country income per person falls 1% a year. Middle-income and poor countries grow fast enough to catch " +
      "up by 2100. Energy efficiency and the energy mix follow 1990–2020 trends.",
  },
  "hw5-s4": {
    name: "Rich-country incomes shrink 3% a year",
    short: "Rich growth −3%",
    group: "rich-growth",
    about:
      "Rich-country income per person falls 3% a year, and the other groups converge to the same level by 2100. " +
      "Middle-income incomes also shrink (−0.58% a year), so this would not pass the Climate Challenge's growth rule.",
  },
};

export const PRESET_GROUPS = [
  { id: "energy-mix", label: "Change the energy mix to reach a warming level" },
  { id: "rich-growth", label: "Slower income growth in rich countries" },
];

export function presetText(id) {
  const t = PRESET_TEXT[id];
  if (!t) throw new Error(`No display name for preset ${id}`);
  return t;
}

/** "Homework 5, Scenario 1, Q4" style reference, for About the Model. */
export function homeworkRef(p) {
  if (!p.homework) return "Not a homework scenario";
  return p.homework.question ? `HW5 Scenario ${p.homework.scenario}, Q${p.homework.question}` : `HW5 Scenario ${p.homework.scenario}`;
}
