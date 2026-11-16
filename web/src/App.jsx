import { useMemo, useState, useCallback, useEffect } from "react";
import Explore from "./components/Explore.jsx";
import Challenge from "./components/Challenge.jsx";
import About from "./components/About.jsx";
import { DEFAULT_TARGET } from "./lib/challenge.js";
import {
  runModel, PROJECT_BASELINE, baselineState, stateFromPreset, setValue, setIncomeConvergence,
  toEngineInputs, GROUPS,
} from "./lib/scenarioState.js";

const BASELINE_RESULT = runModel(PROJECT_BASELINE.inputs);

const VIEWS = [
  { id: "explore", label: "Explore" },
  { id: "challenge", label: "Challenge" },
  { id: "about", label: "About the Model" },
];
const HASH_TO_VIEW = { "#challenge": "challenge", "#about": "about", "#methodology": "about", "#explore": "explore", "#dashboard": "explore" };
const viewFromHash = () => (typeof window === "undefined" ? "explore" : HASH_TO_VIEW[window.location.hash] || "explore");

export default function App() {
  // ---- Explore scenario ----
  const [state, setState] = useState(baselineState);
  const { result, error } = useMemo(() => {
    try {
      return { result: runModel(toEngineInputs(state)), error: null };
    } catch (e) {
      return { result: null, error: e };
    }
  }, [state]);
  const onChange = useCallback((variable, group, value) => setState((s) => setValue(s, variable, group, value)), []);
  const onPreset = useCallback((id) => setState(stateFromPreset(id)), []);
  const onToggle = useCallback((on) => setState((s) => setIncomeConvergence(s, on)), []);
  const onReset = useCallback(() => setState(baselineState()), []);

  // ---- Challenge scenario (separate from Explore) ----
  const [challenge, setChallenge] = useState(baselineState);
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const challengeResult = useMemo(() => runModel(toEngineInputs(challenge)), [challenge]);
  const onChChange = useCallback((variable, group, value) => setChallenge((s) => setValue(s, variable, group, value)), []);
  const onChToggle = useCallback((on) => setChallenge((s) => setIncomeConvergence(s, on)), []);
  const onChReset = useCallback(() => setChallenge(baselineState()), []);
  const onChHint = useCallback((rate) => setChallenge((s) => GROUPS.reduce((acc, g) => setValue(acc, "emissions", g, rate), s)), []);

  // ---- View, kept in the URL hash ----
  const [view, setView] = useState(viewFromHash);
  useEffect(() => {
    const onHash = () => { if (HASH_TO_VIEW[window.location.hash]) setView(viewFromHash()); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = (v) => {
    setView(v);
    window.history.replaceState(null, "", `#${v}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  if (import.meta.env.DEV && typeof window !== "undefined") {
    window.__explorer = { view, state, summary: result?.summary, scenario: result?.scenario, challenge, target, challengeSummary: challengeResult.summary };
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="wrap topbar__inner">
          <div className="brand">
            <h1>Explore the Future of Climate Change</h1>
            <p>See how economic growth, energy use, and cleaner technology shape global warming through 2100.</p>
          </div>
          <nav className="nav" aria-label="Main">
            <div className="seg seg--nav" role="tablist">
              {VIEWS.map((v) => (
                <button key={v.id} type="button" role="tab" aria-selected={view === v.id}
                  className={`seg__btn${view === v.id ? " is-active" : ""}`} onClick={() => go(v.id)} data-view={v.id}>
                  {v.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="wrap main">
        {view === "explore" && (
          <Explore state={state} result={result ?? BASELINE_RESULT} baseline={BASELINE_RESULT} error={error}
            onPreset={onPreset} onChange={onChange} onToggle={onToggle} onReset={onReset} />
        )}
        {view === "challenge" && (
          <Challenge state={challenge} target={target} result={challengeResult} baseline={BASELINE_RESULT}
            onTarget={setTarget} onChange={onChChange} onToggleConvergence={onChToggle} onReset={onChReset} onApplyHint={onChHint} />
        )}
        {view === "about" && <About />}
      </main>

      <footer className="footer">
        <div className="wrap footer__inner">
          <span>Carbon Trading final project · classroom climate model (HW5 workbook)</span>
          <button type="button" className="link-btn" onClick={() => go("about")}>About the Model</button>
        </div>
      </footer>
    </div>
  );
}
