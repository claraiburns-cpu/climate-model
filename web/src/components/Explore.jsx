import ScenarioBar from "./ScenarioBar.jsx";
import Controls from "./Controls.jsx";
import ExploreChart from "./ExploreChart.jsx";
import EmissionsBreakdown from "./EmissionsBreakdown.jsx";
import InfoTip from "./InfoTip.jsx";
import { isBaselineState, PROJECT_BASELINE } from "../lib/scenarioState.js";
import { presetText } from "../lib/presetNames.js";
import { num, headlineDelta } from "../lib/format.js";

function Headline({ label, value, unit, base, digits, tip, statKey }) {
  const delta = headlineDelta(value, base, digits, unit);
  return (
    <div className="headline" data-stat={statKey}>
      <p className="headline__label">{label}<InfoTip label={`About ${label}`}>{tip}</InfoTip></p>
      <p className="headline__value">
        <span className="headline__number">{num(value, digits)}</span>
        <span className="headline__unit">{unit}</span>
      </p>
      <p className={`headline__delta${delta.direction ? ` is-${delta.direction}` : ""}`}>{delta.text}</p>
    </div>
  );
}

export default function Explore({ state, result, baseline, error, onPreset, onChange, onToggle, onReset }) {
  const s = result.summary, b = baseline.summary;
  const scenarioName = state.modified || state.presetId === PROJECT_BASELINE.id ? "Your scenario" : presetText(state.presetId).short;
  return (
    <div className="explore">
      <ScenarioBar state={state} onPreset={onPreset} onToggleConvergence={onToggle} onReset={onReset} />
      {error && <p className="error" role="alert">These settings can't be calculated: {error.message} Showing the baseline instead.</p>}
      {/* One grid: on wide screens the sliders sit in a sticky side column; on narrow screens they follow the headline numbers. */}
      <div className="layout layout--flow" style={{ "--side-span": 3 }}>
        <div className="headlines layout__lead" aria-label="Headline results">
          <Headline statKey="t2100" label="Warming in 2100" value={s.temperature2100} base={b.temperature2100} unit="°C" digits={2}
            tip="Global temperature increase in 2100, measured from the classroom model's 1850 value (0 °C)." />
          <Headline statKey="ppm" label="CO₂ concentration in 2100" value={s.ppm2100} base={b.ppm2100} unit="ppm" digits={0}
            tip="Parts per million of CO₂ in the atmosphere. The model starts at 275 ppm in 1750." />
        </div>
        <ExploreChart baseline={baseline} result={result} scenarioName={scenarioName} same={isBaselineState(state)} />
        <EmissionsBreakdown baseline={baseline} result={result} scenarioName={scenarioName} />
        <aside className="layout__side">
          <Controls state={state} summary={s} baselineSummary={b} onChange={onChange} />
        </aside>
      </div>
    </div>
  );
}
