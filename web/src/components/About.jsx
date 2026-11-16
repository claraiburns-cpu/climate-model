import { useMemo } from "react";
import { runModel, ALL_PRESETS } from "../lib/scenarioState.js";
import { num } from "../lib/format.js";
import { presetText, homeworkRef } from "../lib/presetNames.js";

const STEPS = [
  {
    title: "Economic activity → emissions",
    body:
      "For each income group, annual CO₂ emissions = population × GDP per person × energy per dollar of GDP × " +
      "CO₂ per unit of energy (the Kaya identity). The three groups are added together.",
    eq: "CO₂ = P × (GDP/P) × (E/GDP) × (CO₂/E)",
  },
  {
    title: "Emissions → CO₂ concentration",
    body:
      "Each year's emissions are split among five “boxes” that are absorbed by oceans and land at different speeds; " +
      "one portion never disappears. Their sum is the CO₂ concentration.",
    eq: "Five-box carbon cycle, 1750–2100 (ppm)",
  },
  {
    title: "Concentration → heating",
    body:
      "More CO₂ traps more heat. Radiative forcing (extra heating, in watts per square metre) rises with the " +
      "logarithm of concentration relative to 275 ppm.",
    eq: "F = 5.35 × ln(C / 275)",
  },
  {
    title: "Heating → temperature",
    body:
      "A two-layer model (atmosphere and deep ocean) turns forcing into warming. The ocean warms slowly and " +
      "holds the atmosphere back, so temperature keeps rising for decades after concentrations stop rising.",
    eq: "Two-layer temperature model, from 1850",
  },
];

const LIMITATIONS = [
  "Projections follow mechanically from assumed growth rates. They are scenarios, not forecasts.",
  "GDP per capita, energy intensity and emissions intensity change at constant annual rates from 2020. Nothing responds to prices, policy or climate damages.",
  "Population follows the workbook's fixed path, adjustable only by the population slider (a project addition). The workbook's irregular poor-country growth pattern is kept as-is.",
  "Only CO₂ is modelled: there are no other greenhouse gases, aerosols or carbon-cycle feedbacks.",
  "The three income groups have fixed membership; no country moves between groups.",
  "Temperatures are measured from the model's 1850 value, not the Paris Agreement's pre-industrial baseline.",
  "Modelled CO₂ in 2020 is 402.7 ppm, below the roughly 414 ppm measured that year; modelled warming in 2020 is 1.13 °C.",
  "The workbook does not state the GDP dollar base year or exchange-rate basis, or the sources of its 1960–2020 data and 1751–1959 emissions series.",
  "The Climate Challenge is a model-based exercise, not a policy assessment.",
];

function Section({ id, title, summary, open = false, children }) {
  return (
    <details className="panel disclosure about__section" id={id} open={open}>
      <summary>
        <span>{title}</span>
        <span className="disclosure__hint">{summary}</span>
      </summary>
      <div className="prose">{children}</div>
    </details>
  );
}

export default function About() {
  const rows = useMemo(() => ALL_PRESETS.map((p) => ({ p, s: runModel(p.inputs).summary })), []);
  return (
    <div className="about" id="about">
      <header className="about__head">
        <h2>About the Model</h2>
        <p>
          This simulator runs the Carbon Trading course's classroom climate model, built for Homework 5 in the workbook
          <em> hw5_solutions_lgg 1.xlsx</em>. It is a modified classroom implementation of a model in the style of
          Richard Tol's, not Tol's original model. Results are scenarios, not forecasts.
        </p>
      </header>

      <Section id="about-how" title="How the model works" summary="Four linked steps from the economy to temperature" open>
        <p>Each step's output is the next step's input, so a change to any driver flows through to warming.</p>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="steps__n">{i + 1}</span>
              <div>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
                <code>{s.eq}</code>
              </div>
            </li>
          ))}
        </ol>
        <h4>Names used on the controls</h4>
        <ul>
          <li><strong>Energy efficiency</strong> is set as the yearly change in <em>energy intensity</em> (energy used per dollar of GDP).</li>
          <li><strong>Cleaner energy</strong> is set as the yearly change in <em>emissions intensity</em> (CO₂ released per unit of energy).</li>
          <li>For both, a negative rate is an improvement, and a more negative rate means faster improvement. For example, −3% a year improves faster than −1.5% a year.</li>
        </ul>
        <h4>What “warming” means here</h4>
        <p>
          All temperatures are <strong>warming above the model's 1850 value</strong>, which the workbook sets to 0 °C.
          This is the model's own reference point. It is not the same as the Paris Agreement's “pre-industrial” baseline,
          which is defined from observed temperature records. The model's forcing is measured from 275 ppm (1750), so a
          tiny amount of forcing already exists in 1850. With these parameters, doubling CO₂ eventually gives about
          4.26 °C of warming.
        </p>
      </Section>

      <Section id="about-classroom" title="Classroom modifications to Tol's model" summary="What this implementation is, and what was added">
        <p>
          This website uses our Carbon Trading class's <strong>modified implementation</strong> of a model in the style
          of Richard Tol's, as built in the classroom Excel workbook for Homework 5. It is <strong>not Tol's original
          model</strong>, and it was not compared against Tol's published model.
        </p>
        <p>
          The calculation engine reproduces every stored value in all four workbook sheets, for every year from 1750 to
          2100, to the limit of computer arithmetic. 160 automated tests check the engine, the dashboard, the Climate
          Challenge, the emissions breakdown and the website's labels and rounding.
        </p>
        <h4>Project additions (not in the classroom workbook)</h4>
        <ul>
          <li><strong>Population slider:</strong> shifts every year's growth rate by the chosen amount. At zero it reproduces the workbook exactly.</li>
          <li><strong>Independent sliders and Income Convergence:</strong> every rate can be set separately for each group. With Income Convergence on, middle and poor growth follow the exact parity formula. The homework presets keep the workbook's stored Goal Seek rates, which differ from the formula only negligibly.</li>
          <li><strong>Climate Challenge:</strong> pass/fail rules described below.</li>
        </ul>
      </Section>

      <Section id="about-baseline" title="Project baseline assumptions" summary="The default scenario: 4.773 °C in 2100">
        <p>
          The default scenario, <strong>Project Baseline: Derived from HW5 Assumptions</strong>, combines Homework 5's
          Scenario 1 growth assumption with the historical intensity trends Homework 5 uses in Scenarios 2–4:
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Input</th><th className="num">Rich</th><th className="num">Middle</th><th className="num">Poor</th><th>Origin</th></tr></thead>
            <tbody>
              <tr><td>GDP per capita growth</td><td className="num">1.20%</td><td className="num">3.73%</td><td className="num">5.85%</td><td>HW5 Scenario 1; middle and poor reach income parity in 2100</td></tr>
              <tr><td>Energy efficiency (energy intensity change)</td><td className="num">−1.48%</td><td className="num">−2.03%</td><td className="num">−1.56%</td><td>HW5 actual 30-year averages</td></tr>
              <tr><td>Cleaner energy (emissions intensity change)</td><td className="num">+0.14%</td><td className="num">+0.45%</td><td className="num">−0.51%</td><td>HW5 actual 30-year averages</td></tr>
              <tr><td>Population</td><td colSpan={3} className="num">workbook path</td><td>Workbook's fixed projection</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          It gives <strong>4.773 °C</strong> of warming in 2100, still rising, with 1,084.7 ppm of CO₂ and 249.2 Gt CO₂
          of annual emissions. It is not itself a homework answer and is not stored in the workbook; it equals sheet 1
          with the three emissions-intensity cells set to the historical averages.
        </p>
      </Section>

      <Section id="about-presets" title="Scenario presets and their sources" summary="Website names, Homework 5 references, and where each result comes from">
        <p>
          The scenario menu uses plain names. This table links each one to its Homework 5 (HW5) question and shows where
          its results come from. <span className="badge badge--excel">Stored in Excel</span> scenarios are saved in a workbook sheet and the
          engine reproduces them exactly. <span className="badge badge--computed">Computed</span> scenarios are not saved
          in the workbook (Excel kept only the last Goal Seek answer, Q7). They were calculated by the engine and
          cross-checked by recalculating a copy of the workbook.
        </p>
        <div className="table-wrap">
          <table className="presets">
            <thead>
              <tr>
                <th>Name on this website</th><th>Homework 5 reference</th><th>Source</th>
                <th className="num">Warming 2100 (°C)</th><th className="num">Peak 2021–2100 (°C)</th>
                <th className="num">Emissions 2100 (Gt CO₂/yr)</th><th className="num">CO₂ 2100 (ppm)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, s }) => (
                <tr key={p.id} data-preset={p.id}>
                  <td>
                    <strong>{presetText(p.id).name}</strong>
                    <span className="presets__desc">{presetText(p.id).about}</span>
                  </td>
                  <td>
                    <span data-homework>{homeworkRef(p)}</span>
                    <span className="presets__desc">{p.label}</span>
                  </td>
                  <td>
                    <span className={`badge ${p.resultSource === "excel-stored" ? "badge--excel" : "badge--computed"}`}>
                      {p.resultSource === "excel-stored" ? "Stored in Excel" : "Computed"}
                    </span>
                    {p.workbookSheet && <span className="presets__desc">{p.workbookSheet}</span>}
                  </td>
                  <td className="num">{num(s.temperature2100, 3)}</td>
                  <td className="num">{num(s.peakTemperature, 3)}{s.peakYear !== 2100 ? ` (${s.peakYear})` : ""}</td>
                  <td className="num">{num(s.emissionsGtCO2_2100, 1)}</td>
                  <td className="num">{num(s.ppm2100, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          HW5 Scenario 4 (“Rich-country incomes shrink 3% a year”) gives middle-income GDP per capita a negative growth rate (−0.58%/yr), as the homework's rules
          imply. In Q4 (“Energy mix for 2 °C in 2100”), warming peaks at 2.004 °C in 2093 before easing to 2.000 °C in 2100.
        </p>
      </Section>

      <Section id="about-breakdown" title="Emissions breakdown method" summary="How “Why did emissions change?” splits the difference">
        <p>
          The breakdown on the Explore page compares your scenario with the Project Baseline in one year and splits the
          difference in annual CO₂ emissions among the four drivers of the Kaya identity: population, GDP per person,
          energy efficiency (energy intensity) and cleaner energy (emissions intensity).
        </p>
        <h4>Method: Logarithmic Mean Divisia Index (LMDI)</h4>
        <p>For each income group, the contribution of a driver is:</p>
        <code className="eq">contribution = L(scenario CO₂, baseline CO₂) × ln(scenario driver ÷ baseline driver)</code>
        <p>
          where L(a, b) = (a − b) ÷ (ln a − ln b) is the logarithmic mean of the two emissions values. Because emissions
          are the product of the four drivers, the four contributions add up <strong>exactly</strong> to the difference,
          with nothing left unexplained, and the result does not depend on the order of the drivers. Each income group
          is broken down separately; the world figures are the sums of the three groups. LMDI is the standard method for
          Kaya-type breakdowns in energy and emissions research.
        </p>
        <h4>How to read it</h4>
        <ul>
          <li>A driver contributes only if your scenario changes it. Drivers left at their baseline values contribute zero.</li>
          <li>Because every rate compounds from the same 2020 starting point, contributions grow over time; 2100 shows the largest gap.</li>
          <li>
            These are <strong>mathematical attributions, not causal estimates</strong>. They show how the model's
            arithmetic divides a difference you created; they do not measure what any real policy would achieve. In
            this model the drivers are independent assumptions, so it captures no interactions between them (for
            example, richer economies investing in cleaner energy).
          </li>
        </ul>
        <h4>Units</h4>
        <p>
          The breakdown and annual emissions use gigatonnes of CO₂ per year. The carbon-cycle part of the model counts
          carbon (Gt C); totals shown in Gt CO₂ are converted with the ratio of molecular masses, 1 Gt C = 44/12 ≈ 3.67 Gt
          CO₂. For example, the Project Baseline's total 2021–2100 emissions are 2,459 Gt C, shown as 9,018 Gt CO₂.
        </p>
      </Section>

      <Section id="about-limits" title="Limitations" summary="Important assumptions and caveats">
        <ul className="limits">{LIMITATIONS.map((l) => <li key={l}>{l}</li>)}</ul>
      </Section>

      <Section id="about-challenge" title="Climate Challenge rules" summary="How the Challenge decides pass or fail">
        <p>The Climate Challenge (a project addition) uses the same engine and the same slider ranges as Explore, with two pass/fail rules:</p>
        <ul>
          <li><strong>Peak warming:</strong> a scenario succeeds only if the highest warming in any year from 2021 to 2100 is at or below the chosen target (2, 3 or 4 °C). Warming in 2100 alone is not enough. For example, HW5 Scenario 1 Q4 ends at 2.000 °C in 2100 but peaks at 2.004 °C in 2093, so it would not pass a 2 °C challenge.</li>
          <li><strong>Positive growth:</strong> GDP per capita growth must be above zero in every income group. The rates checked are the ones the model actually uses, including those set by Income Convergence. The goal is to explore whether emissions reductions can occur alongside continued economic development.</li>
          <li>Temperatures are measured from the model's 1850 value. The rules are not applied to the homework presets, which stay in Explore for comparison.</li>
          <li>The “What would it take?” hint searches for one emissions-intensity rate for all three groups, the same idea as HW5 Scenario 1 but measured on peak warming, within the slider's range.</li>
        </ul>
      </Section>
    </div>
  );
}
