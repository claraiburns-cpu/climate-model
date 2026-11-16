import InfoTip from "./InfoTip.jsx";
import ConvergenceSwitch from "./ConvergenceSwitch.jsx";
import { ALL_PRESETS, PROJECT_BASELINE, isBaselineState } from "../lib/scenarioState.js";
import { PRESET_GROUPS, presetText } from "../lib/presetNames.js";

function ScenarioInfo({ state }) {
  const t = presetText(state.presetId);
  return (
    <InfoTip label="About this scenario" align="left">
      {state.modified
        ? <>Started from <strong>{t.name}</strong> and adjusted with the sliders.</>
        : <><strong>{t.name}.</strong> {t.about}</>}
      <br /><br />
      Where each scenario comes from (including its Homework 5 question) is listed in About the Model.
    </InfoTip>
  );
}

export default function ScenarioBar({ state, onPreset, onToggleConvergence, onReset }) {
  const value = state.modified ? "__custom" : state.presetId;
  return (
    <section className="scenariobar" aria-label="Scenario">
      <div className="scenariobar__pick">
        <label htmlFor="preset" className="scenariobar__label">Scenario</label>
        <div className="select">
          <select id="preset" value={value} onChange={(e) => onPreset(e.target.value)}>
            {state.modified && <option value="__custom" disabled>Your custom scenario</option>}
            <option value={PROJECT_BASELINE.id}>{presetText(PROJECT_BASELINE.id).name}</option>
            {PRESET_GROUPS.map((g) => (
              <optgroup key={g.id} label={g.label}>
                {ALL_PRESETS.filter((p) => presetText(p.id).group === g.id).map((p) => (
                  <option key={p.id} value={p.id}>{presetText(p.id).name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {state.modified && <span className="badge badge--custom" data-source="custom">Custom</span>}
        <ScenarioInfo state={state} />
      </div>
      <div className="scenariobar__actions">
        <ConvergenceSwitch on={state.incomeConvergence} onChange={onToggleConvergence} />
        <button type="button" className="btn btn--quiet" onClick={onReset} disabled={isBaselineState(state)} data-action="reset">
          Reset
        </button>
      </div>
    </section>
  );
}
