# Website Number Verification

**Date:** 15 November 2026
**Result:** Every number checked on the website matches the original workbook (or a copy recalculated in Microsoft Excel). No discrepancies were found, and nothing in the engine or the website was changed.

## How the check was done

The check used three sources, each produced separately from the others:

| Source | What it is | How it was read |
|---|---|---|
| **Original workbook** | `source/hw5_solutions_lgg 1.xlsx` (SHA-256 `81c36355…8086`, unmodified) | A new dependency-free reader (`tools/verify/xlsx.py`) reads Excel's own saved values straight from the file's XML. It does not use openpyxl, the test fixtures or the engine. |
| **Excel recalculation** | Copies of the workbook changed in **Microsoft Excel** itself, recalculated with *Calculate Full* and saved (`tools/verify/run.applescript`) | Same reader. Replaces the earlier LibreOffice check for the scenarios that are not stored in the workbook. |
| **Website** | The running site at `localhost:5173` | Text read from the page itself: headline stats, chart facts, decade tables, chart tooltip, slider labels, About tables. |

Excel copies made:
- **Unchanged workbook, recalculated:** reproduces the stored values exactly.
- **Project Baseline:** sheet 1 with BD3 = 0.14%, BE3 = 0.45%, BF3 = −0.51%.
- **Q4, Q5 and Q6:**
  - with the website's emissions-intensity rates typed into BD3;
  - separately, with Excel's own **Goal Seek** run on V9 for 2, 3 and 4 °C.

The engine was then compared with Excel for every year from 1750 to 2100, for all 8 presets: emissions, CO₂ and temperature.
- Largest difference in CO₂ and emissions: **0**. They match to the last binary digit.
- Largest temperature difference: **4 × 10⁻¹⁶ °C**, the limit of computer arithmetic.

## Comparison table

✅ = match at the precision the website displays (and, for the underlying value, to ≤ 4 × 10⁻¹⁶).

### 1. Baseline assumptions

| Item | Website shows | Independent value | Source cell / calculation | Match |
|---|---|---|---|---|
| GDP/capita growth, Rich | +1.20% | 0.012 | Sheet 1 `AL5`; HW5 doc "1.20%" | ✅ |
| GDP/capita growth, Middle | +3.73% (engine uses 3.727546%) | 0.0372754636 | Sheet 1 `AM5` (Goal Seek); parity formula from `AL66:AM66` gives 0.0372754643 | ✅ |
| GDP/capita growth, Poor | +5.85% (engine uses 5.847515%) | 0.0584751496 | Sheet 1 `AN5`; parity formula gives 0.0584751503 | ✅ |
| Energy intensity, Rich / Middle / Poor | −1.48% / −2.03% / −1.56% | −0.0148 / −0.0203 / −0.0156 | `AU4:AW4` (all sheets). 1990–2020 trend from workbook data (`AU36→AU66`, etc.): −1.479 / −2.029 / −1.556% | ✅ |
| Emissions intensity, Rich / Middle / Poor | +0.14% / +0.45% / −0.51% | 0.0014 / 0.0045 / −0.0051 | Sheets 2–4 `BD3:BF3`. 1990–2020 trend from workbook data (`BD36→BD66`, etc.): +0.140 / +0.450 / −0.512% | ✅ |
| Population adjustment | 0.00 pp (all groups) | workbook path | `AC67:AE146`. 2100 values: 1,182.5 / 3,593.3 / 5,629.2 million; site shows 1.18 / 3.59 / 5.63 bn | ✅ |
| GDP/capita in 2100 (all groups) | $94,896/person | 94,895.90 | Excel baseline copy, `AL146:AN146` | ✅ |

All 9 rate values the engine receives for the baseline are bit-for-bit equal to the workbook cells. This was checked in the engine inputs and in the website's live state.

### 2–4. Baseline results, 2020 and 2100

| Item | Website shows | Independent value | Source cell / calculation | Match |
|---|---|---|---|---|
| Warming in 2100 | 4.773 °C | **4.7731630** °C (→ 4.7732) | Excel baseline copy `V9` = `M354` | ✅ |
| Peak warming 2021–2100 | 4.773 °C in 2100 | max of `M275:M354` = 4.7731630 in 2100 | Excel baseline copy | ✅ |
| CO₂ in 2100 | 1,084.7 ppm | 1,084.7018 | Excel baseline copy `H354` | ✅ |
| Emissions in 2100 (Mt C) | 67,962 Mt C | 67,961.647 | Excel baseline copy `BN146` (= `B354`) | ✅ |
| Emissions in 2100 (Gt CO₂) | 249.2 Gt CO₂/yr | 249.1927 | `BM146`. Check: 249.1927 × 12/44 × 1000 = 67,961.647 = `BN146` | ✅ |
| Radiative forcing 2100 (About text) | 7.342 W/m² (docs) | 7.34175 | `L354` | ✅ |
| CO₂ in 2020 | 402.7 ppm | 402.66603 | Original workbook `H274` (all 4 sheets identical) | ✅ |
| Warming in 2020 | 1.128 °C (About page: "1.13 °C") | 1.1275768 | Original workbook `M274` | ✅ |
| Emissions in 2020 | 38.3 Gt CO₂ (decade table) | 38.2876 | `BM66` | ✅ |

### 5. Historical graph value

| Item | Website shows | Independent value | Source cell / calculation | Match |
|---|---|---|---|---|
| CO₂ in 1991 (chart tooltip, "1991 · historical") | 337.4 ppm | 337.41881 | Original workbook `H245` (row label `A245` = 1991). Neighbouring years: 1990 = 335.71, 1992 = 339.14, so a one-year shift would be visible. | ✅ |

### 6. Cumulative emissions

| Item | Website shows | Independent value | Source cell / calculation | Match |
|---|---|---|---|---|
| Total 2021–2100 (Project Baseline) | 2,459 Gt C | 2,459,403.65 Mt C = **2,459.40 Gt C** | `SUM(B275:B354)` on Excel baseline copy (80 years, 2021 and 2100 both included) | ✅ |

### 7. Years, units and conversions on the graphs

| Check | Result | Match |
|---|---|---|
| Every plotted point, 1960–2100: 3 charts × 8 presets × 141 years (3,384 points, scenario and baseline lines) vs. the Excel row for that same year | Largest relative difference 2 × 10⁻¹⁶ | ✅ |
| Chart x-axis runs 1960–2100 (141 rows); the Challenge chart runs 2000–2100 | Confirmed | ✅ |
| The historical period (1960–2020) is identical in every scenario | Max difference 0 across all 8 presets | ✅ |
| Temperature: °C above the model's 1850 value (`M104` = 0) | Label "°C above the model's 1850 level" | ✅ |
| CO₂: ppm (column H) | Label "parts per million" | ✅ |
| Emissions chart: Gt CO₂/yr = column BM | Label "billion tonnes of CO₂ per year" | ✅ |
| Gt CO₂ → Mt C: × 12/44 × 1000 (`BN4`, `BN3`) | Reproduces `BN146` exactly | ✅ |
| Decade tables (2020, 2030 … 2100) for all three charts | Each matches the Excel row for that year | ✅ |
| CO₂ doubling sensitivity (About page) | "about 4.26 °C"; 1.15 × 5.35 × ln 2 = 4.2646 | ✅ |

### 8. Homework presets

For each preset, the first value is what the website shows and the second is the independent value.

| Preset | Source label on site | Independent source | Warming 2100 (°C) | Peak 2021–2100 | CO₂ 2100 (ppm) | Emissions 2100 (Gt CO₂) | Total 2021–2100 (Gt C) | Match |
|---|---|---|---|---|---|---|---|---|
| Project Baseline | Computed | Excel copy, BD3:BF3 = historical | 4.773 / 4.77316 | 4.773 (2100) / same | 1,084.7 / 1,084.70 | 249.2 / 249.19 | 2,459 / 2,459.4 | ✅ |
| S1 Q4 (2 °C) | Computed | Excel copy, BD3 = −6.0994% | 2.000 / 2.000000 | **2.004 in 2093** / 2.00384 in 2093 | 400.8 / 400.77 | 1.6 / 1.61 | 239 / 238.8 | ✅ |
| S1 Q5 (3 °C) | Computed | Excel copy, BD3 = −2.3390% | 3.000 / 3.000000 | 3.000 / same | 554.9 / 554.93 | 37.3 / 37.31 | 782 / 782.0 | ✅ |
| S1 Q6 (4 °C) | Computed | Excel copy, BD3 = −0.7409% | 4.000 / 4.000000 | 4.000 / same | 813.6 / 813.55 | 136.7 / 136.71 | 1,609 / 1,609.1 | ✅ |
| S1 Q7 (5 °C) | Stored in Excel | Sheet 1, original file | 5.000 / 5.0000003 | 5.000 / same | 1,211.4 / 1,211.44 | 328.3 / 328.30 | 2,825 / 2,824.9 | ✅ |
| S2 (Rich 0%) | Stored in Excel | Sheet 2, original file | 3.767 / 3.76701 | 3.767 / same | 732.7 / 732.71 | 96.0 / 95.96 | 1,365 / 1,365.2 | ✅ |
| S3 (Rich −1%) | Stored in Excel | Sheet 3, original file | 3.156 / 3.15619 | 3.156 / same | 582.7 / 582.71 | 42.9 / 42.94 | 880 / 879.7 | ✅ |
| S4 (Rich −3%) | Stored in Excel | Sheet 4, original file | 2.402 / 2.40153 | 2.402 / same | 449.9 / 449.92 | 8.4 / 8.39 | 425 / 424.6 | ✅ |

Each preset's input rates (9 per preset) are bit-for-bit equal to the workbook cells (`AL5:AN5`, `AU4:AW4`, `BD3:BF3`). For Q4–Q6 the comparison is with the rates Excel was given. The same values appear in Explore (headlines and chart facts) and in the About → Homework presets table.

**Excel's own Goal Seek (separate check of the Q4–Q6 rates).** Excel's Goal Seek on V9 found these rates:
- Q4: −6.0944%, giving 2.0006 °C.
- Q5: −2.3388%, giving 3.0001 °C.
- Q6: −0.7408%, giving 4.00003 °C.

Goal Seek stops at a tolerance of about 0.001 °C, so these are within that tolerance of the website's rates. The website's rates give exactly 2.000000, 3.000000 and 4.000000 °C when typed into Excel.

## Observations (no change made)

These are display or wording points, not calculation errors:

1. **Slider labels are rounded to 2 decimals.** The engine uses the full-precision values. For example:
   - Q4's emissions intensity shows **−6.10%**; the engine uses −6.0994%.
   - Middle-income growth shows **3.73%**; the engine uses 3.727546%.

   The results shown are from the full-precision values, which match Excel.
2. **2020 warming precision varies.** It appears as 1.128 °C on the Explore chart and as 1.13 °C in the About → Limitations text. Both are correct roundings of 1.12758.
3. **Two units in the emissions facts.** The emissions chart and "Emissions in 2100" use Gt CO₂, while "Total 2021–2100" is in Gt C. That follows the workbook (Kaya in CO₂, carbon cycle in carbon), and both are labelled. For reference, 2,459 Gt C = 9,018 Gt CO₂.
4. **The homework's energy- and emissions-intensity tables couldn't be read automatically.** In `HW5_updated.docx` they are embedded pictures (EMF), so their numbers were checked against the workbook's cells and its 1990–2020 data instead. The GDP row (1.20% / 3.97% / 2.20%) is text in the document and matches the workbook's 1990–2020 averages (1.207 / 3.971 / 2.197%).

## Tests

| Suite | Result |
|---|---|
| Engine (`npm test` in project root) | **40 / 40 pass**, 0 fail |
| Website (`npm test` in `web/`) | **68 / 68 pass**, 0 fail (31 dashboard + 37 challenge) |
| Production build (`vite build`) | Succeeds |

The engine files (`engine/*.js`) are unchanged since 9 November.

## Re-running the check

The scripts are in `tools/verify/`:
- `run.applescript`: makes the Excel copies. Requires Microsoft Excel; the copies are written to Excel's own container folder.
- `extract.py`: reads the original file and the Excel copies into `excel_results.json`.
- `compare.mjs`: compares the engine with Excel for every year.
- `chartcheck.mjs`: compares every chart point and unit conversion.
