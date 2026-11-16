import { useState } from "react";
import InfoTip from "./InfoTip.jsx";
import { VARIABLES, GROUPS, BASELINE_VALUES, isLocked } from "../lib/scenarioState.js";
import { sliderText, money, num } from "../lib/format.js";

const EPS = 1e-12;
const GROUP_NAME = { rich: "Rich", middle: "Middle-income", poor: "Poor" };

function Slider({ variable, group, value, baseline, locked, onChange, footnote, warn }) {
  const id = `slider-${variable.key}-${group}`;
  const display = value * 100;
  const clamped = Math.min(variable.max, Math.max(variable.min, display));
  const span = variable.max - variable.min;
  const fill = ((clamped - variable.min) / span) * 100;
  const basePos = ((baseline * 100 - variable.min) / span) * 100;
  const changed = Math.abs(value - baseline) > EPS;
  return (
    <div className={`slider${locked ? " is-locked" : ""}${changed ? " is-changed" : ""}${warn ? " is-warn" : ""}`}>
      <div className="slider__head">
        <label htmlFor={id} className="slider__label">
          {GROUP_NAME[group]}
          {locked && <span className="slider__auto">auto</span>}
        </label>
        <output htmlFor={id} className="slider__value" title={`${(value * 100).toPrecision(8)}`}>
          {sliderText(variable, value)}
        </output>
      </div>
      <div className="slider__track" style={{ "--fill": `${fill}%` }}>
        <input
          id={id}
          type="range"
          min={variable.min}
          max={variable.max}
          step={variable.step}
          value={clamped}
          disabled={locked}
          data-variable={variable.key}
          data-group={group}
          aria-valuetext={sliderText(variable, value)}
          onChange={(e) => onChange(variable.key, group, Number(e.target.value) / 100)}
        />
        <span className="slider__base-mark" style={{ left: `${basePos}%` }} aria-hidden="true" />
      </div>
      <div className="slider__foot">
        <span>Baseline {sliderText(variable, baseline)}</span>
        {footnote && <span className="slider__note">{footnote}</span>}
        {changed && !locked && (
          <button type="button" className="link-btn" onClick={() => onChange(variable.key, group, baseline)}
            aria-label={`Reset ${GROUP_NAME[group]} ${variable.tab} to baseline`}>
            Reset
          </button>
        )}
      </div>
      {warn && <p className="slider__warn" role="status">{warn}</p>}
    </div>
  );
}

export default function Controls({ state, summary, baselineSummary, onChange, growthRule = false, title = "Assumptions" }) {
  const [tab, setTab] = useState("gdp");
  const variable = VARIABLES.find((v) => v.key === tab);

  const changedCount = (key) => GROUPS.filter((g) => Math.abs(state.values[key][g] - BASELINE_VALUES[key][g]) > EPS).length;
  const totalChanged = VARIABLES.reduce((n, v) => n + changedCount(v.key), 0);
  const growthBroken = growthRule && GROUPS.some((g) => !(state.values.gdp[g] > 0));

  const footnoteFor = (g) => {
    if (tab === "population") return `2100: ${num(summary.population2100[g] / 1000, 2)} bn`;
    if (tab === "gdp") return `2100: ${money(summary.gdpPerCapita2100[g])}/person`;
    return null;
  };

  return (
    <section className="panel controls" aria-label="Scenario assumptions">
      <header className="panel__head">
        <h2>{title}</h2>
        {totalChanged > 0
          ? <span className="pill pill--changed" data-changed={totalChanged}>{totalChanged} changed from baseline</span>
          : <span className="pill">Baseline values</span>}
      </header>

      <div className="vtabs" role="tablist" aria-label="Assumption">
        {VARIABLES.map((v) => {
          const n = changedCount(v.key);
          const warn = growthRule && v.key === "gdp" && growthBroken;
          return (
            <button
              key={v.key}
              type="button"
              role="tab"
              id={`tab-${v.key}`}
              aria-selected={tab === v.key}
              aria-controls={`panel-${v.key}`}
              className={`vtab${tab === v.key ? " is-active" : ""}`}
              onClick={() => setTab(v.key)}
            >
              <span>{v.tab}</span>
              {warn
                ? <span className="vtab__badge vtab__badge--warn" title="Growth requirement not met">!</span>
                : n > 0 && <span className="vtab__badge" title={`${n} changed`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="panel__body" role="tabpanel" id={`panel-${variable.key}`} aria-labelledby={`tab-${variable.key}`}>
        <div className="panel__sub">
          <span className="panel__unit">
            {variable.key === "population" ? "Change in annual growth, percentage points"
              : variable.key === "gdp" ? "Annual growth, % per year"
                : `${variable.label} change, % per year`}
          </span>
          <InfoTip label={`What is ${variable.tab}?`} align="right">
            <strong>{variable.tab === variable.label ? variable.label : `${variable.tab} (${variable.label.toLowerCase()})`}.</strong> {variable.what} <br /><br />
            <strong>Effect on emissions:</strong> {variable.effect}<br /><br />
            Units: {variable.unitLong}.
            {variable.addition && <><br /><br />Project addition: the classroom workbook uses one fixed population path. At 0 this reproduces it exactly.</>}
          </InfoTip>
        </div>

        {variable.direction && <p className="panel__direction" data-direction={variable.key}>{variable.direction}</p>}

        {tab === "gdp" && state.incomeConvergence && (
          <p className="notice">Income Convergence is on: middle-income and poor rates follow the rich rate so all groups reach the same income in 2100.</p>
        )}

        {GROUPS.map((g) => (
          <Slider
            key={g}
            variable={variable}
            group={g}
            value={state.values[variable.key][g]}
            baseline={BASELINE_VALUES[variable.key][g]}
            locked={isLocked(state, variable.key, g)}
            onChange={onChange}
            footnote={footnoteFor(g)}
            warn={growthRule && variable.key === "gdp" && !(state.values.gdp[g] > 0)
              ? "Must be above 0% per year to pass the Climate Challenge." : null}
          />
        ))}
        <p className="panel__range">Range {sliderText(variable, variable.min / 100)} to {sliderText(variable, variable.max / 100)} · the tick marks the baseline</p>
      </div>
    </section>
  );
}
