import { useState, useEffect } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea,
} from "recharts";
import InfoTip from "./InfoTip.jsx";
import { buildChartData } from "../lib/scenarioState.js";
import { num, signed, niceTicks, mtcToGtCO2 } from "../lib/format.js";

const TICKS = [1960, 1980, 2000, 2020, 2040, 2060, 2080, 2100];
const TICKS_NARROW = [1960, 2000, 2020, 2060, 2100];

function useNarrow(query = "(max-width: 520px)") {
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [narrow, setNarrow] = useState(get);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setNarrow(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return narrow;
}
const DECADES = [2020, 2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100];

export const SERIES = {
  temperature: {
    label: "Temperature",
    title: "Global temperature increase",
    key: "temperatureAtmosphere",
    unit: "°C",
    axis: "°C above the model's 1850 level",
    digits: 2,
    zeroBased: true,
    tip: "Atmospheric warming from the two-layer temperature model, measured from the model's 1850 value (0 °C).",
  },
  ppm: {
    label: "CO₂ concentration",
    title: "Atmospheric CO₂ concentration",
    key: "ppm",
    unit: "ppm",
    axis: "parts per million",
    digits: 1,
    zeroBased: false,
    tip: "Calculated by the five-box carbon cycle from all emissions since 1750 (starting at 275 ppm).",
  },
  emissions: {
    label: "Emissions",
    title: "Global CO₂ emissions",
    key: "emissionsGtCO2",
    unit: "Gt CO₂/yr",
    axis: "billion tonnes of CO₂ per year",
    digits: 1,
    zeroBased: true,
    tip: "Sum of rich, middle-income and poor-country emissions. Up to 2020 these are historical data; later values come from the scenario's growth rates.",
  },
};

function ChartTooltip({ active, payload, label, unit, digits, scenarioName }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const diff = row.scenario - row.baseline;
  return (
    <div className="ttip">
      <div className="ttip__year">{label}{label <= 2020 ? " · historical" : ""}</div>
      <div className="ttip__row"><span className="key key--scenario" /><span className="ttip__name">{scenarioName}</span><span className="ttip__val">{num(row.scenario, digits)} {unit}</span></div>
      <div className="ttip__row"><span className="key key--baseline" /><span className="ttip__name">Project Baseline</span><span className="ttip__val">{num(row.baseline, digits)} {unit}</span></div>
      {Math.abs(diff) >= 0.5 * Math.pow(10, -digits) && <div className="ttip__diff">Difference: {signed(diff, digits)} {unit}</div>}
    </div>
  );
}

/** Small facts shown under the chart for the selected series. */
function facts(kind, s, b) {
  if (kind === "temperature") {
    // 2 decimals, or 3 when the peak comes before 2100 and would otherwise look equal to 2100 warming (e.g. 2.004 vs 2.000).
    const pd = s.peakYear < 2100 && num(s.peakTemperature, 2) === num(s.temperature2100, 2) ? 3 : 2;
    return [
      ["Peak warming 2021–2100", `${num(s.peakTemperature, pd)} °C in ${s.peakYear}`, `baseline ${num(b.peakTemperature, 2)} °C`],
      ["Model warming in 2020", `${num(s.temperature2020, 2)} °C`, "same in every scenario"],
    ];
  }
  if (kind === "ppm") {
    return [
      ["CO₂ in 2100", `${num(s.ppm2100, 0)} ppm`, `baseline ${num(b.ppm2100, 0)}`],
      ["Model CO₂ in 2020", `${num(s.ppm2020, 0)} ppm`, "same in every scenario"],
    ];
  }
  return [
    ["Emissions in 2100", `${num(s.emissionsGtCO2_2100, 1)} Gt CO₂/yr`, `baseline ${num(b.emissionsGtCO2_2100, 1)}`,
      `Equal to ${num(s.emissionsMtC2100, 0)} Mt of carbon per year (Mt C), the unit the carbon-cycle model uses.`],
    ["Total 2021–2100", `${num(mtcToGtCO2(s.cumulativeEmissionsMtC_2021_2100), 0)} Gt CO₂`, `baseline ${num(mtcToGtCO2(b.cumulativeEmissionsMtC_2021_2100), 0)}`,
      `Sum of annual emissions 2021–2100. Equal to ${num(s.cumulativeEmissionsMtC_2021_2100 / 1000, 0)} Gt of carbon (Gt C), the unit the carbon-cycle model uses; 1 Gt C = 44/12 ≈ 3.67 Gt CO₂.`],
  ];
}

export default function ExploreChart({ baseline, result, scenarioName, same }) {
  const [kind, setKind] = useState("temperature");
  const [showTable, setShowTable] = useState(false);
  const narrow = useNarrow();
  const cfg = SERIES[kind];
  const data = buildChartData(baseline, result, cfg.key);

  let lo = Infinity, hi = -Infinity;
  for (const d of data) { lo = Math.min(lo, d.baseline, d.scenario); hi = Math.max(hi, d.baseline, d.scenario); }
  const yTicks = niceTicks(cfg.zeroBased ? 0 : lo, hi);
  const tickDigits = yTicks.some((v) => !Number.isInteger(v)) ? 1 : 0;

  return (
    <section className="panel chart" aria-label="Scenario chart" id="explore-chart" data-kind={kind}>
      <header className="chart__head">
        <div className="seg" role="tablist" aria-label="Chart">
          {Object.entries(SERIES).map(([k, v]) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k}
              className={`seg__btn${kind === k ? " is-active" : ""}`} onClick={() => setKind(k)} data-chart={k}>
              {v.label}
            </button>
          ))}
        </div>
        <ul className="legend" aria-label="Legend">
          <li><span className="key key--scenario" />{scenarioName}</li>
          <li><span className="key key--baseline" />Project Baseline</li>
        </ul>
      </header>

      <div className="chart__title-row">
        <h2 className="chart__title">{cfg.title}</h2>
        <span className="chart__unit">{cfg.axis}</span>
        <InfoTip label={`About ${cfg.title}`}>{cfg.tip}</InfoTip>
      </div>

      <div className="chart__plot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <ReferenceArea x1={1960} x2={2020} fill="var(--history)" fillOpacity={1} stroke="none"
              label={{ value: "Historical", position: "insideTopLeft", fill: "var(--text-3)", fontSize: 11 }} />
            <XAxis dataKey="year" type="number" domain={[1960, 2100]} ticks={narrow ? TICKS_NARROW : TICKS}
              tick={{ fill: "var(--text-3)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--axis)" }} />
            <YAxis width={48} domain={[yTicks[0], yTicks[yTicks.length - 1]]} ticks={yTicks}
              tickFormatter={(v) => num(v, tickDigits)} tick={{ fill: "var(--text-3)", fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip unit={cfg.unit} digits={cfg.digits} scenarioName={scenarioName} />}
              cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="baseline" stroke="var(--baseline)" strokeWidth={2} strokeDasharray="6 4"
              dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--baseline)" }} />
            <Line type="monotone" dataKey="scenario" stroke="var(--scenario)" strokeWidth={2.5}
              dot={false} isAnimationActive={false} activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--scenario)" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <dl className="facts">
        {facts(kind, result.summary, baseline.summary).map(([k, v, sub, tip]) => (
          <div key={k} className="facts__item" data-fact={k}>
            <dt>{k}{tip && <InfoTip label={`About ${k}`}>{tip}</InfoTip>}</dt>
            <dd>{v}</dd>
            <dd className="facts__sub">{sub}</dd>
          </div>
        ))}
      </dl>

      <div className="chart__foot">
        {same ? <span className="muted">Your scenario matches the baseline. Move a slider or pick a preset to compare.</span> : <span />}
        <button type="button" className="link-btn" onClick={() => setShowTable((x) => !x)} aria-expanded={showTable}>
          {showTable ? "Hide data" : "View data by decade"}
        </button>
      </div>

      {showTable && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Year</th><th className="num">{scenarioName}</th><th className="num">Baseline</th><th className="num">Difference</th></tr></thead>
            <tbody>
              {DECADES.map((y) => {
                const r = data.find((d) => d.year === y);
                return (
                  <tr key={y}><td>{y}</td><td className="num">{num(r.scenario, cfg.digits)}</td><td className="num">{num(r.baseline, cfg.digits)}</td><td className="num">{signed(r.scenario - r.baseline, cfg.digits)}</td></tr>
                );
              })}
            </tbody>
          </table>
          <p className="table-note">Units: {cfg.unit}</p>
        </div>
      )}
    </section>
  );
}
