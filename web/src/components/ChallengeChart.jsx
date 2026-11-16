import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea,
  ReferenceLine, ReferenceDot,
} from "recharts";
import { num, signed, niceTicks } from "../lib/format.js";
import { peakText, digitsAbove } from "../lib/challenge.js";

const TICKS = [2000, 2020, 2040, 2060, 2080, 2100];

function ChallengeTooltip({ active, payload, label, target }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const gap = row.scenario - target;
  return (
    <div className="ttip">
      <div className="ttip__year">{label}{label <= 2020 ? " · historical" : ""}</div>
      <div className="ttip__row">
        <span className="key key--scenario" />
        <span className="ttip__name">Your scenario</span>
        <span className="ttip__val">{num(row.scenario, digitsAbove(row.scenario, target))} °C</span>
      </div>
      <div className="ttip__row">
        <span className="key key--baseline" />
        <span className="ttip__name">Project Baseline</span>
        <span className="ttip__val">{num(row.baseline, 2)} °C</span>
      </div>
      <div className="ttip__row">
        <span className="key key--target" />
        <span className="ttip__name">Target</span>
        <span className="ttip__val">{num(target, 0)} °C</span>
      </div>
      <div className={`ttip__diff ${gap > 0 ? "is-over" : ""}`}>
        {gap > 0 ? `${signed(gap, digitsAbove(gap, 0))} °C above the target` : `${num(-gap, 2)} °C below the target`}
      </div>
    </div>
  );
}

export default function ChallengeChart({ data, evaluation }) {
  const { target, peak, peakYear, crossingYear, temperatureMet } = evaluation;
  let hi = target;
  for (const d of data) hi = Math.max(hi, d.baseline, d.scenario);
  const ticks = niceTicks(0, hi * 1.04);
  const top = ticks[ticks.length - 1];
  // Highlight the part of the scenario line that is above the target.
  const rows = data.map((d) => ({ ...d, over: d.scenario > target ? d.scenario : null }));

  return (
    <article className="panel chart challenge-chart" id="challenge-chart">
      <header className="chart__head">
        <div>
          <h3 className="chart__title">Temperature vs. your target</h3>
          <p className="chart__unit">°C above the classroom model's 1850 level</p>
        </div>
        <ul className="legend" aria-label="Legend">
          <li><span className="key key--scenario" />Your scenario</li>
          <li><span className="key key--over" />Above target</li>
          <li><span className="key key--baseline" />Project Baseline</li>
          <li><span className="key key--target" />Target ({target} °C)</li>
        </ul>
      </header>
      <div className="chart__plot chart__plot--tall">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <ReferenceArea y1={target} y2={top} fill="var(--danger-zone)" fillOpacity={1} stroke="none"
              label={{ value: "Above target", position: "insideTopLeft", fill: "var(--critical-text)", fontSize: 12, fontWeight: 600, dx: 70 }} />
            <ReferenceArea x1={2000} x2={2020} fill="var(--history)" fillOpacity={0.6} stroke="none"
              label={{ value: "Historical", position: "insideBottomLeft", fill: "var(--text-3)", fontSize: 11 }} />
            <XAxis dataKey="year" type="number" domain={[2000, 2100]} ticks={TICKS}
              tick={{ fill: "var(--text-3)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--axis)" }} />
            <YAxis width={44} domain={[0, top]} ticks={ticks} tickFormatter={(v) => num(v, ticks.some((t) => !Number.isInteger(t)) ? 1 : 0)}
              tick={{ fill: "var(--text-3)", fontSize: 12 }} tickLine={false} axisLine={false} />
            <ReferenceLine y={target} stroke="var(--critical)" strokeWidth={2} strokeDasharray="2 3"
              label={{ value: `Target ${target} °C`, position: "insideBottomLeft", fill: "var(--critical-text)", fontSize: 12, fontWeight: 600, dy: -4, dx: 70 }} />
            {crossingYear && (
              <ReferenceLine x={crossingYear} stroke="var(--critical)" strokeOpacity={0.6} strokeDasharray="4 4"
                label={{ value: `Passes target in ${crossingYear}`, position: crossingYear > 2080 ? "insideBottomLeft" : "insideBottomRight", fill: "var(--critical-text)", fontSize: 11, fontWeight: 600 }} />
            )}
            <Tooltip content={<ChallengeTooltip target={target} />} cursor={{ stroke: "var(--axis)" }} isAnimationActive={false} />
            <Line type="monotone" dataKey="baseline" stroke="var(--baseline)" strokeWidth={2} strokeDasharray="6 4"
              dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--baseline)" }} />
            <Line type="monotone" dataKey="scenario" stroke="var(--scenario)" strokeWidth={2.5} dot={false}
              isAnimationActive={false} activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--scenario)" }} />
            <Line type="monotone" dataKey="over" stroke="var(--critical)" strokeWidth={3.5} dot={false}
              connectNulls={false} isAnimationActive={false} activeDot={false} legendType="none" />
            <ReferenceDot x={peakYear} y={peak} r={6} fill={temperatureMet ? "var(--good)" : "var(--critical)"}
              stroke="var(--surface)" strokeWidth={2}
              label={{ value: `Peak ${peakText(evaluation)} °C (${peakYear})`, position: "top", dx: peakYear > 2085 ? -48 : peakYear < 2012 ? 40 : 0, fill: "var(--text)", fontSize: 12, fontWeight: 600, offset: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
