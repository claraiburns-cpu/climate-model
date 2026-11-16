# Global Climate Scenario Explorer: website

The interactive website, built with React. It uses the validated Phase 2 engine in `../engine` without changing it.

## Open the website

In Terminal:

```
cd web
npm install      # first time only
npm run dev      # then open http://localhost:5173
```

## Tests

```
npm test         # in web/: 120 tests (dashboard, Climate Challenge, emissions breakdown, interface)
cd .. && npm test   # 40 engine tests from Phase 2
```

## Files

| Path | What it is |
|---|---|
| `src/lib/scenarioState.js` | Connects sliders to the engine: slider definitions, presets, Income Convergence, reset. No model equations. |
| `src/App.jsx` | Header and the three sections: Explore, Challenge, About the Model |
| `src/components/` | `Explore` (scenario bar, headline numbers, chart with selector, controls), `Challenge`, `About` (methodology in expandable sections) |
| `src/styles.css` | Design (light and dark mode, mobile layout) |
| `src/lib/challenge.js` | Climate Challenge rules: peak-warming test, positive-growth rule, feedback wording, "What would it take?" hint. No model equations. |
| `src/components/Challenge.jsx`, `ChallengeChart.jsx` | Climate Challenge view and its temperature graph |
| `tests/dashboard.test.js` | Dashboard tests |
| `tests/challenge.test.js` | Climate Challenge tests |
