import { useMemo } from "react";
import Controls from "./Controls.jsx";
import ConvergenceSwitch from "./ConvergenceSwitch.jsx";
import ChallengeChart from "./ChallengeChart.jsx";
import InfoTip from "./InfoTip.jsx";
import { GROUPS, toEngineInputs, isBaselineState } from "../lib/scenarioState.js";
import {
  TARGETS, evaluateChallenge, requiredUniformEmissionsIntensity, challengeChartData, HINT_RANGE,
  temperatureMessage, growthMessage, digitsAbove,
} from "../lib/challenge.js";
import { num, signed, pct, money, mtcToGtCO2 } from "../lib/format.js";

const GROUP_SHORT = { rich: "rich", middle: "middle-income", poor: "poor" };

function Check({ ok, title, message }) {
  return (
    <div className={`check ${ok ? "is-ok" : "is-fail"}`} data-check={title}>
      <span className="check__icon" aria-hidden="true">{ok ? "✓" : "✕"}</span>
      <div>
        <p className="check__title">{title} <span className="check__state">{ok ? "Met" : "Not met"}</span></p>
        <p className="check__head">{message.head}</p>
        <p className="check__detail">{message.detail}</p>
      </div>
    </div>
  );
}

function Comparison({ result, baseline, target }) {
  const s = result.summary, b = baseline.summary;
  const pctChange = (x, y) => signed(((x - y) / y) * 100, 0) + "%";
  const rows = [
    ["Peak warming 2021–2100", `${num(s.peakTemperature, digitsAbove(s.peakTemperature, target))} °C (${s.peakYear})`, `${num(b.peakTemperature, 2)} °C`, `${signed(s.peakTemperature - b.peakTemperature, 2)} °C`],
    ["Warming in 2100", `${num(s.temperature2100, 2)} °C`, `${num(b.temperature2100, 2)} °C`, `${signed(s.temperature2100 - b.temperature2100, 2)} °C`],
    ["CO₂ emissions in 2100", `${num(s.emissionsGtCO2_2100, 1)} Gt CO₂`, `${num(b.emissionsGtCO2_2100, 1)} Gt CO₂`, pctChange(s.emissionsGtCO2_2100, b.emissionsGtCO2_2100)],
    ["Total emissions 2021–2100", `${num(mtcToGtCO2(s.cumulativeEmissionsMtC_2021_2100), 0)} Gt CO₂`, `${num(mtcToGtCO2(b.cumulativeEmissionsMtC_2021_2100), 0)} Gt CO₂`, pctChange(s.cumulativeEmissionsMtC_2021_2100, b.cumulativeEmissionsMtC_2021_2100)],
    ["CO₂ concentration in 2100", `${num(s.ppm2100, 0)} ppm`, `${num(b.ppm2100, 0)} ppm`, `${signed(s.ppm2100 - b.ppm2100, 0)} ppm`],
    ...GROUPS.map((g) => [
      `GDP per person in 2100, ${GROUP_SHORT[g]}`,
      money(s.gdpPerCapita2100[g]), money(b.gdpPerCapita2100[g]), pctChange(s.gdpPerCapita2100[g], b.gdpPerCapita2100[g]),
    ]),
  ];
  return (
    <article className="panel compare">
      <h3>Compared with the Project Baseline</h3>
      <p className="muted small">What your choices changed, including incomes in 2100.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Result</th><th className="num">Your scenario</th><th className="num">Baseline</th><th className="num">Change</th></tr></thead>
          <tbody>
            {rows.map(([k, a, bb, c]) => (
              <tr key={k}><td>{k}</td><td className="num">{a}</td><td className="num">{bb}</td><td className="num">{c}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function Hint({ state, target, onApply }) {
  const hint = useMemo(() => requiredUniformEmissionsIntensity(toEngineInputs(state), target), [state, target]);
  return (
    <article className="panel hint">
      <h3>
        What would it take?
        <InfoTip label="About this hint" align="right">
          Like the “Energy mix for … °C” scenarios, this searches for one cleaner-energy (emissions intensity) rate for
          all three groups, holding your other settings fixed. Unlike those scenarios, it targets peak warming, as the
          challenge does. It only searches the slider's range.
        </InfoTip>
      </h3>
      {hint.status === "reachable" && (
        <>
          <p>
            With your other settings unchanged, cleaner energy (emissions intensity) would need to change by
            <strong> {pct(hint.applyRate, 2, true)} per year</strong> in all three groups to keep peak warming at or
            below {target} °C.
          </p>
          <button type="button" className="btn btn--primary" onClick={() => onApply(hint.applyRate)}>
            Apply {pct(hint.applyRate, 2, true)} to all three groups
          </button>
        </>
      )}
      {hint.status === "any" && (
        <p>Your other settings already keep peak warming below {target} °C even at the slider's highest emissions-intensity rate ({pct(HINT_RANGE.high, 2, true)} per year).</p>
      )}
      {hint.status === "unreachable" && (
        <p>
          Even the fastest decarbonization on the slider ({pct(HINT_RANGE.low, 2, true)} per year in every group) can't
          keep peak warming at or below {target} °C with your other settings. Try faster energy-efficiency gains or
          different growth or population settings.
        </p>
      )}
      <p className="muted small">The growth requirement still applies separately.</p>
    </article>
  );
}

const LESSONS = [
  {
    title: "Why GDP growth can raise emissions",
    text: "In the model, emissions = population × GDP per person × energy per dollar × CO₂ per unit of energy. If incomes grow and nothing else changes, emissions grow at the same rate.",
  },
  {
    title: "Energy efficiency: less energy per dollar",
    text: "Energy efficiency is measured by energy intensity, the energy needed to produce one dollar of GDP. If it falls 2% a year, the economy needs 2% less energy each year for the same output, so emissions fall even while it grows.",
  },
  {
    title: "Cleaner energy: less CO₂ per unit of energy",
    text: "Cleaner energy is measured by emissions intensity, the CO₂ released for each unit of energy. Cleaner energy lowers it, cutting emissions without cutting energy use.",
  },
  {
    title: "Why warming can keep rising after emissions fall",
    text: "CO₂ builds up: the amount in the air keeps rising while emissions exceed what oceans and land absorb, and part of it never leaves. The deep ocean also warms slowly, so air temperature keeps catching up for decades.",
  },
];

export default function Challenge({ state, target, result, baseline, onTarget, onChange, onToggleConvergence, onReset, onApplyHint }) {
  const ev = useMemo(() => evaluateChallenge(result, target), [result, target]);
  const tMsg = temperatureMessage(ev);
  const gMsg = growthMessage(ev);
  const metCount = Number(ev.temperatureMet) + Number(ev.growthMet);
  const chartData = useMemo(() => challengeChartData(baseline, result), [baseline, result]);

  return (
    <div className="challenge" id="challenge">
      <section className="challenge-top">
        <div className="challenge-top__text">
          <h2 className="challenge-top__q">
            Can you limit global warming while maintaining positive economic growth across all three income groups?
          </h2>
          <ol className="rules">
            <li>
              <strong>Peak warming</strong> from 2021 to 2100 must stay at or below your target, not just warming in 2100.
              <InfoTip label="Why the peak?" align="left">
                The challenge checks the highest temperature in any year from 2021 to 2100. A scenario that goes over the
                target and comes back down by 2100 does not pass.
              </InfoTip>
            </li>
            <li>
              <strong>GDP per capita growth</strong> must stay above 0% in every income group.
              <InfoTip label="Why require growth?" align="left">
                Shrinking economies would cut emissions (as in “Rich-country incomes shrink 3% a year”). The goal is to explore whether emissions
                reductions can occur alongside continued economic development in rich, middle-income, and poor countries.
                Zero or negative growth fails, even if the temperature target is met.
              </InfoTip>
            </li>
          </ol>
        </div>
        <div className="challenge-top__controls">
          <span className="scenariobar__label" id="target-label">Target</span>
          <div className="seg seg--target" role="radiogroup" aria-labelledby="target-label" aria-describedby="target-note">
            {TARGETS.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={target === t}
                className={`seg__btn${target === t ? " is-active" : ""}`} onClick={() => onTarget(t)} data-target={t}>
                {t} °C
              </button>
            ))}
          </div>
          <p className="target-note" id="target-note">
            Warming is measured from the classroom model's 1850 level (0 °C), which is not the same as the Paris
            Agreement's pre-industrial baseline.
          </p>
          <ConvergenceSwitch on={state.incomeConvergence} onChange={onToggleConvergence} id="challenge-convergence" />
          <button type="button" className="btn btn--quiet" onClick={onReset} disabled={isBaselineState(state)} data-action="challenge-reset">
            Start over from Project Baseline
          </button>
        </div>
      </section>

      <section className={`panel verdict ${ev.success ? "is-success" : "is-fail"}`} aria-live="polite" data-success={ev.success}>
        <div className="verdict__head">
          <span className="verdict__icon" aria-hidden="true">{ev.success ? "✓" : "✕"}</span>
          <div>
            <p className="verdict__kicker">{ev.success ? "Challenge complete" : `Not yet · ${metCount} of 2 requirements met`}</p>
            <h2 className="verdict__title">
              {ev.success
                ? `You kept peak warming within ${ev.target} °C while every income group kept growing.`
                : !ev.temperatureMet && !ev.growthMet
                  ? "Warming is too high and at least one economy is not growing."
                  : !ev.temperatureMet
                    ? `Economies are growing, but warming goes above ${ev.target} °C.`
                    : "Warming stays within the target, but not every economy is growing."}
            </h2>
          </div>
        </div>
        <div className="checks">
          <Check ok={ev.temperatureMet} title="Temperature goal" message={tMsg} />
          <Check ok={ev.growthMet} title="Economic growth" message={gMsg} />
        </div>
      </section>

      {/* One grid: sliders in a sticky side column on wide screens; first after the verdict on narrow screens. */}
      <div className="layout layout--flow" style={{ "--side-span": 2 }}>
        <ChallengeChart data={chartData} evaluation={ev} />
        <div className="duo">
          <Hint state={state} target={target} onApply={onApplyHint} />
          <Comparison result={result} baseline={baseline} target={target} />
        </div>
        <aside className="layout__side">
          <Controls state={state} summary={result.summary} baselineSummary={baseline.summary} onChange={onChange}
            growthRule title="Your challenge scenario" />
        </aside>
      </div>

      <details className="panel disclosure lessons">
        <summary><span>What drives the result?</span><span className="disclosure__hint">Four short explanations</span></summary>
        <div className="lessons__grid">
          {LESSONS.map((l) => (
            <article key={l.title} className="lesson">
              <h3>{l.title}</h3>
              <p>{l.text}</p>
            </article>
          ))}
        </div>
        <p className="lessons__key">
          <strong>The key idea:</strong> because the four factors multiply, emissions fall roughly when energy efficiency and
          cleaner energy together improve faster than population and GDP per person grow.
        </p>
      </details>
    </div>
  );
}
