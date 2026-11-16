import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList, Tooltip, ReferenceLine,
} from "recharts";
import { decompose, waterfallRows, explain, FIRST_YEAR, LAST_YEAR, REGIONS } from "../lib/decomposition.js";
import { num, signed, niceTicks } from "../lib/format.js";

const REGION_LABEL = { global: "World", rich: "Rich", middle: "Middle-income", poor: "Poor" };
const FILL = { total: "var(--wf-base)", scenario: "var(--wf-scenario)", up: "var(--wf-up)", down: "var(--wf-down)", zero: "var(--wf-base)" };
const KIND_TEXT = { up: "raises emissions", down: "lowers emissions", zero: "no effect" };

const fmt = (row) => (row.kind === "total" ? num(row.value, 1) : signed(row.value, 1));
const fillOf = (row) => (row.id === "scenario" ? FILL.scenario : FILL[row.kind]);

function BarLabel({ x, y, width, height, index, rows }) {
  const row = rows[index];
  if (!row) return null;
  return (
    <text x={x + Math.max(width, 0) + 6} y={y + height / 2} dy="0.35em" fontSize={12} fontWeight={600}
      fill="var(--text-2)" style={{ fontVariantNumeric: "tabular-nums" }}>
      {fmt(row)}
    </text>
  );
}

function WaterfallTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="ttip">
      <div className="ttip__year">{row.name}</div>
      {row.kind === "total"
        ? <div className="ttip__row"><span className="ttip__val">{num(row.value, 2)} Gt CO₂/yr</span></div>
        : <div className="ttip__row"><span className="ttip__val">{signed(row.value, 2)} Gt CO₂/yr · {KIND_TEXT[row.kind]}</span></div>}
    </div>
  );
}

function Panel({ baseline, result, scenarioName }) {
  const [year, setYear] = useState(LAST_YEAR);
  const [region, setRegion] = useState("global");
  const d = useMemo(() => decompose(baseline, result, year, region), [baseline, result, year, region]);
  const text = explain(d);
  const rows = waterfallRows(d, scenarioName);

  let lo = 0, hi = 0;
  for (const r of rows) { lo = Math.min(lo, r.range[0]); hi = Math.max(hi, r.range[1]); }
  const ticks = niceTicks(lo, hi || 1);

  return (
    <div className="breakdown__body">
      <div className="breakdown__controls">
        <label className="breakdown__year">
          <span className="breakdown__year-label">Year <strong>{year}</strong></span>
          <input type="range" min={FIRST_YEAR} max={LAST_YEAR} step={1} value={year}
            onChange={(e) => setYear(Number(e.target.value))} aria-label="Breakdown year" id="breakdown-year"
            style={{ "--fill": `${((year - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * 100}%` }} />
        </label>
        <div className="seg" role="radiogroup" aria-label="Countries">
          {REGIONS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={region === r} data-region={r}
              className={`seg__btn${region === r ? " is-active" : ""}`} onClick={() => setRegion(r)}>
              {REGION_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {text.kind === "same" ? (
        <p className="breakdown__empty" data-kind="same">{text.sentences.join(" ")}</p>
      ) : (
        <>
          <div className="breakdown__plot" role="img"
            aria-label={`Waterfall chart of CO₂ emissions in ${year}, ${REGION_LABEL[region]}: ${rows.map((r) => `${r.name} ${fmt(r)}`).join(", ")} Gt CO₂ per year.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 52, bottom: 4, left: 0 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="var(--grid)" />
                <XAxis type="number" domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} tickFormatter={(v) => num(v, 0)}
                  tick={{ fill: "var(--text-3)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--axis)" }} />
                <YAxis type="category" dataKey="name" width={124} tick={{ fill: "var(--text-2)", fontSize: 12.5 }} tickLine={false} axisLine={false} interval={0} />
                {lo < 0 && <ReferenceLine x={0} stroke="var(--axis)" />}
                <Tooltip content={<WaterfallTooltip />} cursor={{ fill: "var(--surface-2)" }} isAnimationActive={false} />
                <Bar dataKey="range" isAnimationActive={false} radius={3} minPointSize={0}>
                  {rows.map((r) => <Cell key={r.id} fill={fillOf(r)} data-row={r.id} />)}
                  <LabelList dataKey="range" content={(p) => <BarLabel {...p} rows={rows} />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="breakdown__legend" aria-hidden="true">
            <li><span className="swatch" style={{ background: "var(--wf-up)" }} />Raises emissions</li>
            <li><span className="swatch" style={{ background: "var(--wf-down)" }} />Lowers emissions</li>
            <li className="muted">Gt CO₂ per year</li>
          </ul>
          <p className="breakdown__text" data-kind={text.kind} aria-live="polite">{text.sentences.join(" ")}</p>
          <table className="sr-only">
            <caption>Emissions breakdown, {REGION_LABEL[region]}, {year} (Gt CO₂ per year)</caption>
            <tbody>{rows.map((r) => <tr key={r.id}><th scope="row">{r.name}</th><td>{fmt(r)}</td></tr>)}</tbody>
          </table>
        </>
      )}
      <p className="breakdown__note muted">
        A mathematical split of the difference (LMDI method), not a measure of what policies cause.{" "}
        <a href="#about" onClick={(e) => { e.preventDefault(); window.location.hash = "#about"; setTimeout(() => { const el = document.getElementById("about-breakdown"); if (el) { el.open = true; el.scrollIntoView({ block: "start" }); } }, 50); }}>
          How it works
        </a>
      </p>
    </div>
  );
}

export default function EmissionsBreakdown({ baseline, result, scenarioName }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="panel disclosure breakdown" id="breakdown" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>Why did emissions change?</span>
        <span className="disclosure__hint">How each driver adds to or cuts emissions vs. the baseline</span>
      </summary>
      {open && <Panel baseline={baseline} result={result} scenarioName={scenarioName} />}
    </details>
  );
}
