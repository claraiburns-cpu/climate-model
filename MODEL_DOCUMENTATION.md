# Classroom Climate Model — Documentation

**Sources:** `hw5_solutions_lgg 1.xlsx` (the classroom workbook) and `HW5_updated.docx` (Homework 5, Carbon Trading course)
**Version:** Phase 2 — calculation engine built and validated (9 November 2026). Updated 15 November 2026 for Phase 5 (emissions breakdown, Section 9.5).

**Scope.** This documents the *classroom* implementation exactly as it appears in the workbook, plus a small number of clearly marked **project additions** (Section 9). It does not describe, and was not compared against, Richard Tol's published model.

**Validation status.** The engine (`engine/model.js`) reproduces every stored value in all four workbook sheets, for every year 1750–2100, to within **2 × 10⁻¹⁶** relative difference (the limit of computer arithmetic). Scenarios the workbook never stored were checked against copies of the workbook recalculated by a spreadsheet program. Details in Section 11.

---

## 1. The model in one paragraph

For each of three income groups (Rich, Middle, Poor), annual CO₂ emissions are the product of four factors: **population × GDP per person × energy per dollar of GDP × CO₂ per unit of energy** (the *Kaya identity*). The three groups are summed and converted from tonnes of CO₂ to tonnes of carbon. Those emissions enter a **five-box carbon-cycle model**: each year's emissions are split into five portions that disappear at different speeds (one portion never disappears). The resulting CO₂ concentration (ppm) gives **radiative forcing** through a logarithmic formula, and a **two-layer temperature model** (atmosphere and ocean) turns forcing into warming above the model's 1850 level.

```
Population ─┐
GDP/capita ─┤  Kaya, per income group    Sum of 3 groups   Five-box         5.35·ln(C/275)   Two-layer
Energy int.─┼──────────────────────────► Gt CO₂ ─► Mt C ─► carbon cycle ─► ppm ──────────► W/m² ───────► °C
Emiss. int.─┘  (Rich, Middle, Poor)                         (1750–2100)                               (1850–2100)
```

---

## 2. Homework 5 and the four workbook sheets

### 2.1 What the homework asks

Homework 5 ("Global Warming and Income Parity", assigned 9.24) uses the model to study scenarios in which **GDP per capita in all three groups reaches the same level ("parity") in 2100**. In every scenario, the Rich growth rate is chosen, and the Middle and Poor rates are whatever is needed to catch up by 2100.

The homework lists these "actual 30-year averages":

| | Rich | Middle | Poor |
|---|---|---|---|
| GDP per capita growth | 1.20% | 3.97% | 2.20% |
| Energy intensity change | −1.48% | −2.03% | −1.56% |
| Emissions intensity change | +0.14% | +0.45% | −0.51% |

All three rows match the workbook's own data, measured as the average compound annual rate from 1990 to 2020 (1.207/3.971/2.197%, −1.479/−2.029/−1.556%, +0.140/+0.450/−0.512%). The homework and workbook use the rounded values. The GDP row is reference information only; no scenario uses the Middle or Poor historical growth rates.

### 2.2 Mapping homework questions to sheets

| Homework | Rich growth | Middle / Poor growth | Emissions intensity | Stored in workbook? | 2100 warming |
|---|---|---|---|---|---|
| Scenario 1, Q1–3 (1.2% rich growth, parity) | 1.2% | 3.7275% / 5.8475% | (unknown being solved) | Sheet 1: AL5:AN5, AL146 | — |
| Scenario 1, Q4 (2 °C) | 1.2% | same | −6.0994%/yr, all groups | No (computed) | 2.000 °C (peak 2.004 °C in 2093) |
| Scenario 1, Q5 (3 °C) | 1.2% | same | −2.3390%/yr | No (computed) | 3.000 °C |
| Scenario 1, Q6 (4 °C) | 1.2% | same | −0.7409%/yr | No (computed) | 4.000 °C |
| **Scenario 1, Q7 (5 °C)** | 1.2% | same | **+0.3520%/yr** | **Sheet 1** (BD3; BE3 = BF3 = BD3) | 5.000 °C |
| **Scenario 2** (Q8–10) | 0% | 2.4976% / 4.5924% | Historical | **Sheet 2** | 3.767 °C |
| **Scenario 3** (Q11–14) | −1% | 1.4726% / 3.5465% | Historical | **Sheet 3** | 3.156 °C |
| **Scenario 4** (Q15–18) | −3% | −0.5774% / 1.4546% | Historical | **Sheet 4** | 2.402 °C |

Scenario 1, Questions 4–7 ask for a single emissions-intensity rate, the same for all three groups, that produces a given amount of warming **in 2100**. Sheet 1 holds only the last Goal Seek result (Q7). The Q4–Q6 answers were overwritten in the workbook, so they were recomputed with the validated engine (Section 9.4) and confirmed by recalculating the workbook with those rates.

### 2.3 What differs between the sheets

Only six input cells differ (plus one negligible floating-point difference in sheet 4, cell AI7):

| Input | Cell(s) | Sheet 1 | Sheet 2 | Sheet 3 | Sheet 4 |
|---|---|---|---|---|---|
| Rich GDP/capita growth | AL5 | 1.2% | 0% | −1% | −3% |
| Middle GDP/capita growth | AM5 | 3.727546% | 2.497576% | 1.472598% | −0.577370% |
| Poor GDP/capita growth | AN5 | 5.847515% | 4.592407% | 3.546480% | 1.454615% |
| Rich emissions-intensity change | BD3 | +0.352049% | +0.14% | +0.14% | +0.14% |
| Middle emissions-intensity change | BE3 | = BD3 | +0.45% | +0.45% | +0.45% |
| Poor emissions-intensity change | BF3 | = BE3 | −0.51% | −0.51% | −0.51% |

Every sheet shares the historical data, population path, energy-intensity rates (AU4:AW4) and all carbon-cycle and temperature parameters.

**Results in 2100:**

| | Sheet 1 (S1 Q7) | Sheet 2 (S2) | Sheet 3 (S3) | Sheet 4 (S4) |
|---|---|---|---|---|
| Global emissions (Mt C/yr) | 89,535 | 26,171 | 11,712 | 2,289 |
| Global emissions (Gt CO₂/yr) | 328.3 | 96.0 | 42.9 | 8.4 |
| CO₂ concentration (ppm) | 1,211.4 | 732.7 | 582.7 | 449.9 |
| Radiative forcing (W/m²) | 7.933 | 5.243 | 4.017 | 2.634 |
| Warming vs 1850 (°C) | 5.000 | 3.767 | 3.156 | 2.402 |
| GDP/capita, all groups ($/person) | 94,896 | 36,543 | 16,354 | 3,196 |

### 2.4 Discrepancies between the homework and the workbook

1. The Q4–Q6 answers are not stored; only Q7 survives on sheet 1.
2. Sheet 1's emissions-intensity rate is a Goal Seek answer (the rate that gives 5 °C), not a historical assumption, so sheet 1 is not a baseline.
3. The homework and workbook use rounded historical rates (e.g., −0.51% rather than −0.512%). The engine uses the same rounded values.
4. Under the homework's rules, Scenario 4 gives Middle-income GDP per capita a negative growth rate (−0.58%/yr).
5. The homework header gives inconsistent years ("Fall 2025", "Due October 1, 2025", "assigned 9.24.26"). The workbook label "corrected 9.24" (cell BF1) matches the assignment date.
6. The homework says "three different scenarios" but contains four.
7. The homework does not mention population; all scenarios use the workbook's fixed population path.
8. Excel's Goal Seek stopped slightly short of exact parity. On sheet 4 the stored Middle and Poor rates differ from the exact solution by about 1.9 × 10⁻⁷, leaving 2100 incomes 0.0015% apart and changing 2100 warming by 0.000004 °C. This is negligible.
9. Unexplained, with no effect on calculations: cell BN149 (54,709.47 Mt C) with the note "with negative -.51 for poor countries". It does not match any sheet, any Q4–Q6 answer, or the project baseline.

---

## 3. Project Baseline: Derived from HW5 Assumptions

**Approved 9 November 2026.** The baseline combines Scenario 1's growth assumption with the historical intensity trends the homework uses in Scenarios 2–4:

| Input | Rich | Middle | Poor | Origin |
|---|---|---|---|---|
| GDP per capita growth | 1.2% | 3.727546% | 5.847515% | HW5 Scenario 1; Middle/Poor = sheet 1's parity rates (AL5:AN5) |
| Energy intensity change | −1.48% | −2.03% | −1.56% | HW5 table (actual 30-year averages); AU4:AW4 |
| Emissions intensity change | +0.14% | +0.45% | −0.51% | HW5 table (actual 30-year averages); sheets 2–4 BD3:BF3 |
| Population | workbook path | workbook path | workbook path | AC67:AE146 |

**Results:**

| 2100 | Value |
|---|---|
| Emissions | 67,962 Mt C/yr (249.2 Gt CO₂) |
| CO₂ concentration | 1,084.70 ppm |
| Radiative forcing | 7.342 W/m² |
| Warming vs 1850 | **4.773 °C** (still rising about 0.07 °C per year; 2100 is the peak) |

This combination is not a homework answer and is not stored on any sheet. It equals **sheet 1 with BD3 = 0.14%, BE3 = 0.45%, BF3 = −0.51%**. Anyone can confirm it in Excel by making those three changes in a copy of the workbook: cell V9 then shows 4.773.

---

## 4. Emissions: the Kaya model (columns AB–BN)

### 4.1 Plain-English explanation

For each income group, emissions in a year are:

> **Emissions = Population × (GDP ÷ Population) × (Energy ÷ GDP) × (CO₂ ÷ Energy)**

The middle terms cancel, so this simply equals CO₂, but splitting it this way shows four separate levers:

- **Population**: more people means more economic activity.
- **GDP per capita**: richer people produce and consume more.
- **Energy intensity**: how much energy the economy uses to produce one unit of GDP. *Falling* energy intensity means greater efficiency.
- **Emissions intensity**: how much CO₂ is released per unit of energy. *Falling* emissions intensity means cleaner energy (decarbonization).

Because the factors are multiplied, a 1% change in any one of them changes emissions by 1%, holding the others fixed. Over 80 years these annual changes compound.

### 4.2 Equations (per income group *i*, year *t*)

| Quantity | Symbol | Unit (as computed) | Historical (1960–2020) | Projection (2021–2100) |
|---|---|---|---|---|
| Population | P | million people | data | workbook's typed values (4.4), optionally adjusted (9.1) |
| GDP | Y | billion US$ | data | `Y = P × y / 1000` |
| GDP per capita | y | US$ per person per year | `y = Y / P × 1000` | `y(t) = y(t−1) × (1 + g_y)` |
| Energy use | E | Mtoe | data (with gaps, 4.3) | not computed |
| Energy intensity | EI | toe per million US$ | `EI = E / Y × 1000` | `EI(t) = EI(t−1) × (1 + g_EI)` |
| CO₂ emissions | CO₂ | Mt CO₂ | data | — |
| Emissions intensity | EM | t CO₂ per toe | `EM = CO₂ / E` | `EM(t) = EM(t−1) × (1 + g_EM)` |
| **Kaya emissions** | K | **Gt CO₂** | `K = P × y × EI × EM × 10⁻⁹` | same formula |

```
Global (Gt CO₂)  BM = K_rich + K_middle + K_poor
Global (Mt C)    BN = BM × (12/44) × 1000
```

12/44 is the mass ratio of carbon to CO₂. **BN (Mt C) feeds the carbon cycle**: cells B275:B354 (2021–2100) are `=BN67 … =BN146`. Historically, K equals the CO₂ data exactly.

### 4.3 How the 2020 starting point is built (Middle and Poor)

Rich-country energy data cover 1960–2020. Middle and Poor energy data cover only **1971–2019**, so the workbook fills the gaps:

1. **2020 energy intensity** is extrapolated from the 1971–2019 trend: `AV5 = (EI₂₀₁₉ / EI₁₉₇₁)^(1/48)`, then `EI₂₀₂₀ = EI₂₀₁₉ × AV5`. Energy in 2020 is `E = Y × EI / 1000`, and `EM₂₀₂₀ = CO₂₂₀₂₀ / E₂₀₂₀`.
2. **1960–1970 emissions intensity** is back-cast: `BE5 = (EM₂₀₂₀ / EM₁₉₇₁)^(1/49)`, then `EM(t) = EM(t+1) / BE5` from 1970 back to 1960. Energy is then estimated as `E = CO₂ / EM`.

Step 1 sets the 2020 starting intensities for Middle and Poor, and so affects all projections. Step 2 affects only the historical 1960–1970 factor values; emissions in those years equal the data regardless.

### 4.4 Population projection

Projected population for 2021–2100 is **typed in as numbers**, not calculated, and is identical on all four sheets. Reading the pattern from the numbers, each year's growth rate starts from the 2020 observed rate and falls by a fixed amount:

| Group | 2020 observed growth | Annual decline in growth rate | Later path | Pop. 2020 → 2100 (million) |
|---|---|---|---|---|
| Rich | 0.584% | 0.058 pp/yr | ≈0% from 2030 | 1,151.6 → 1,182.5 (+2.7%) |
| Middle | 1.171% | 0.02925 pp/yr | 0% from 2061 | 2,861.9 → 3,593.3 (+25.6%) |
| Poor | 2.585% | 0.258 pp/yr through 2029 (0.263% in 2029) | **held at 0.32% for 2030–2086, then 0% from 2087** | 4,179.8 → 5,629.2 (+34.7%) |

World population in 2100 is 10,405 million (cell AE2). The Poor-group pattern is irregular. **By decision, it is preserved as-is.** The growth columns AF–AH for 2021–2100 are not used by any formula.

### 4.5 Rates and 2020 starting values

| Rate | Rich | Middle | Poor | Cells |
|---|---|---|---|---|
| GDP/capita growth | scenario-specific | scenario-specific | scenario-specific | AL5:AN5 |
| Energy-intensity change | −1.48%/yr | −2.03%/yr | −1.56%/yr | AU4:AW4 (all sheets) |
| Emissions-intensity change | scenario-specific | scenario-specific | scenario-specific | BD3:BF3 |

| 2020 (all scenarios) | Rich | Middle | Poor | Global |
|---|---|---|---|---|
| Population (million) | 1,151.6 | 2,861.9 | 4,179.8 | 8,193.3 |
| GDP per capita (US$) | 36,543 | 5,078 | 1,006 | |
| Energy intensity (toe per million US$) | 115.6 | 503.3 | 527.5 | |
| Emissions intensity (t CO₂/toe) | 2.382 | 3.143 | 1.672 | |
| Emissions (Gt CO₂) | 11.58 | 22.99 | 3.71 | 38.29 |
| Emissions (Mt C) | | | | 10,442 |

### 4.6 Income convergence (the homework's parity rule)

In every homework scenario, the Middle and Poor growth rates are those that make all three groups reach the same GDP per capita in 2100:

```
g_middle = (1 + g_rich) × (y_rich,2020 / y_middle,2020)^(1/80) − 1
g_poor   = (1 + g_rich) × (y_rich,2020 / y_poor,2020)^(1/80)  − 1
```

The workbook stores Goal Seek results (typed values). This formula is the exact solution and agrees with them to between 7 × 10⁻¹⁰ and 1.9 × 10⁻⁷ (Section 2.4, item 8).

---

## 5. From emissions to CO₂ concentration (columns A–H)

### 5.1 Plain-English explanation

CO₂ emitted today does not stay in the air as a single lump. Some is absorbed by the ocean and land within a few years, some over decades or centuries, and some effectively stays for good. The model represents this with **five boxes**. Each year's emissions are split among the boxes in fixed shares, and each box then shrinks by a fixed fraction every year according to its lifetime. The concentration is the sum of the five boxes.

### 5.2 Equations

| Box *i* | Share of new emissions aᵢ (C2:G2) | Lifetime τᵢ (years) | Yearly retention δᵢ = e^(−1/τ) (C3:G3) |
|---|---|---|---|
| 1 | 0.13 | permanent | 1 |
| 2 | 0.20 | 363 | 0.99725 |
| 3 | 0.32 | 74 | 0.98658 |
| 4 | 0.25 | 17 | 0.94287 |
| 5 | 0.10 | 2 | 0.60653 |

```
Box_i(t) = δ_i × Box_i(t−1) + E(t) × a_i × β             (C5:G354)
C(t)     = Σ Box_i(t)                                      (H5:H354, ppm)
```

- β = **0.00047 ppm per Mt C** (H3).
- In 1750, Box 1 = 275 ppm (C4 = A3 × H3, where A3 = 275 / H3) and Boxes 2–5 = 0.
- Emissions in year *t* enter the boxes in year *t*, without decaying that year.

### 5.3 Emissions timeline (column B, Mt C/yr)

| Years | Source |
|---|---|
| 1750 | 0 |
| 1751–1959 | Typed historical values (e.g., 3 in 1751, 54 in 1850, 534 in 1900, 1,630 in 1950); source not stated |
| 1960–2020 | Typed values that exactly equal the Kaya history BN6:BN66 |
| 2021–2100 | Live links to the Kaya projection BN67:BN146 |

Modeled concentration: 275.4 ppm in 1850, 298.7 ppm in 1959, **402.67 ppm in 2020**. Scenario inputs affect only 2021 onward.

---

## 6. From concentration to temperature (columns L–P)

### 6.1 Plain-English explanation

More CO₂ traps more heat. **Radiative forcing** measures that extra heating in watts per square metre. The atmosphere warms toward an equilibrium level proportional to forcing, but only gradually. The deep ocean warms even more slowly and pulls on the atmosphere as it lags behind, so temperature keeps rising for decades after concentrations stop rising.

### 6.2 Equations

```
Forcing:   F(t) = 5.35 × ln( C(t) / 275 )                             (L5:L354, W/m²)

Atmosphere temperature AT (M) and ocean temperature OT (N), from 1850 (row 104):
   AT(1850) = 0,  OT(1850) = 0
   O(t)  = p1 × ( p2 × F(t) − AT(t−1) )                                (O105:O354)
   P(t)  = p3 × ( OT(t−1) − AT(t−1) )                                  (P105:P354)
   AT(t) = AT(t−1) + O(t) + P(t)                                       (M105:M354)
   OT(t) = OT(t−1) + p4 × ( AT(t−1) − OT(t−1) )                        (N105:N354)
```

| Parameter | Cell | Value | Workbook description |
|---|---|---|---|
| Forcing coefficient | L2 | 5.35 W/m² | "sensitivity factor" |
| Reference concentration | L3 | 275 ppm | "Starting ppm" |
| p1 | O1 | 0.0256 | rate temperature moves toward new equilibrium |
| p2 | O2 | 1.15 °C per W/m² | converts forcing to new equilibrium temperature |
| p3 | O3 | 0.00738 | atmospheric temperature response to ocean temp |
| p4 | O4 | 0.00568 | ocean temperature response to atmospheric temperature |

Implied equilibrium warming for a doubling of CO₂: 1.15 × 5.35 × ln 2 ≈ **4.26 °C**. Modeled warming is 0.70 °C in 2000 and **1.13 °C in 2020**.

### 6.3 Temperature reference point

All temperatures are **warming above the model's 1850 value**, which the workbook sets to 0. This is the model's own reference. It is not the same as the Paris Agreement's "pre-industrial" baseline, which is defined from observed temperature records. The website will label temperatures "warming since 1850 (model)" and explain this distinction. Two related model properties, stated rather than changed:
- forcing is measured from 275 ppm (1750), so the model already has 0.008 W/m² of forcing in 1850;
- modeled 2020 concentration (402.7 ppm) is below the roughly 414 ppm measured that year.

---

## 7. Units and conventions

| Item | Unit / convention |
|---|---|
| Time step | 1 year; projections 2021–2100 |
| Population | million people |
| GDP | billion US$ (base year and market vs PPP: not stated in the workbook) |
| GDP per capita | US$ per person per year |
| Energy | Mtoe |
| Energy intensity | toe per **million** US$ (the workbook header says "TOE/dollar"; the website uses the correct unit) |
| Emissions intensity | t CO₂ per toe |
| Kaya emissions | Gt CO₂ (BJ:BM); Mt C (BN) |
| Website display of emissions | Gt CO₂ per year (annual) and Gt CO₂ (2021–2100 total). The total is computed in Mt C (sum of B275:B354) and converted for display only: Gt CO₂ = Mt C ÷ 1000 × 44/12. Project Baseline: 2,459.4 Gt C = 9,017.8 Gt CO₂ |
| Carbon-cycle emissions | Mt C per year |
| Concentration | ppm CO₂ |
| Forcing | W/m² relative to 275 ppm |
| Temperature | °C above the model's 1850 value |
| Rates | decimal fractions per year (0.012 = 1.2%/yr), compounded annually |

---

## 8. Cells that are present but unused

| Cell(s) | Content | Note |
|---|---|---|
| K4 | 0.015, "Annual Rate of change after 2020" | Not referenced by any formula |
| AF5 | 0.95 | Not referenced; meaning unknown |
| AF67:AH146 | Constant population growth numbers | Not referenced |
| AO–AQ, AX–AZ, BG–BI | Historical growth rates and averages | Informational |
| AU5, BD5 | Rich historical average factors | Informational (AV5, AW5, BE5, BF5 are used) |
| AB147:AB346, BM324:BM346 | Years 2101–2300 and sums of empty cells | Leftover fill-down |
| AC147:AE147, AI149:AN157 | Population change and GDP summaries | Summary only |
| BN149, BP149 | 54,709.47 and "with negative -.51 for poor countries" | Unexplained note |
| BO66, BO67, BO146 | Mt CO₂ conversions | Display only |
| M103, K1, K6, L4, V2–V9 | Copies of 2020/2100 results | Display only |
| BF1 | "corrected 9.24" | Label |

---

## 9. Project additions (not part of the classroom workbook)

Everything in this section was added for the website by decision of the project owner. The website will label these features as additions.

### 9.1 Population growth adjustment

Users can raise or lower each group's annual population growth rate by a chosen number of percentage points, Δ.

1. The original annual growth rates are derived from the workbook's population values: `g(t) = P(t) / P(t−1) − 1` for 2021–2100.
2. The adjusted path has growth `g(t) + Δ` in **every** year 2021–2100, including years where the original growth is zero.
3. It is computed as `P'(t) = P(t) × Π_{s≤t} (1 + g(s) + Δ) / (1 + g(s))`. With Δ = 0 every factor is exactly 1, so the workbook's population is reproduced **exactly** (tested bit for bit).
4. The year-to-year pattern, including the Poor-group irregularity, is preserved; it is only shifted.

Consequence to note: because Δ applies every year, a positive adjustment keeps Rich and Middle populations growing after the dates when their original growth stops (2030 and 2060).

### 9.2 Independent sliders and the Income Convergence toggle

In user scenarios, each group's GDP per capita growth, energy-intensity change, emissions-intensity change and population adjustment can be set independently.

The optional **Income Convergence** setting reproduces the homework rule. When it is on, only the Rich growth rate is chosen; Middle and Poor rates come from the exact formula in Section 4.6. Homework presets keep the workbook's stored (Goal Seek) rates, so they reproduce their sheets exactly.

### 9.3 Climate Challenge criteria

- **Success test:** a scenario succeeds only if **peak warming between 2021 and 2100 is at or below the target**. Both peak warming and 2100 warming are displayed. The engine reports `peakTemperature`, `peakYear` and `temperature2100`.
- **Temperature reference:** warming since 1850 in the model (Section 6.3).
- **Positive-growth rule:** user scenarios in Challenge Mode must keep GDP per capita growth above zero in every group. This rule is not applied to the homework presets, which stay available for comparison even when they would fail it (e.g., Scenario 4).
- Under these rules, HW5 Scenario 1 Q4 ("2 °C") would fail: it reaches 2.000 °C in 2100 but peaks at 2.004 °C in 2093.

### 9.4 Computing the missing homework answers (Q4–Q6)

`engine/solve.js` replaces Excel's Goal Seek. It finds the uniform emissions-intensity rate that gives the target warming in 2100 (the homework's definition), using repeated halving of the search range (bisection). Its Q7 answer (0.0035204831) agrees with Excel's (0.0035204862) to 7 digits.

### 9.5 Emissions breakdown: "Why did emissions change?" (Phase 5)

**Purpose.** For a chosen year *t* (2021–2100) and region (world, or one income group), the website splits the difference in annual CO₂ emissions between the user's scenario (*s*) and the Project Baseline (*b*) among the four Kaya factors. Code: `web/src/lib/decomposition.js`. It only reads the engine's results; it does not change any model equation.

**Why LMDI fits this model.** Emissions in each group are an exact product of four strictly positive factors (Section 4.2): `C = P × y × EI × EM × 10⁻⁹`. This is the case the additive Logarithmic Mean Divisia Index (LMDI-I; Ang 2004, 2015) was designed for:
- it is **exact**: the contributions add up to the difference with no residual (unlike simple one-at-a-time or Laspeyres methods, which leave an "interaction" remainder);
- it is **order-independent** and symmetric (swapping scenario and baseline flips every sign);
- it is **consistent in aggregation**: group results add up to the world result;
- it compares any two states, so comparing two scenarios in the same year is as valid as comparing two years.

The Shapley/Sun method is also exact, but for four factors it is more complex and it is not the field's standard. Logarithms need positive values; every factor stays positive for all slider settings (the most negative rate, −8%/yr, still leaves 0.92⁸⁰ > 0).

**Equations** (group *i*, factor *k* ∈ {P, y, EI, EM}, year *t*):

```
ΔC_i     = C_i^s − C_i^b                                        (Gt CO₂/yr; engine columns BJ:BL)
L(a, b)  = (a − b) / (ln a − ln b),   L(a, a) = a                (logarithmic mean)
ΔC_k,i   = L(C_i^s, C_i^b) × ln( x_k,i^s / x_k,i^b )
Σ_k ΔC_k,i = L × ln(C_i^s / C_i^b) = ΔC_i                        (exact, since ln C = Σ ln x_k + const)
World:   ΔC_k = Σ_i ΔC_k,i ,   ΔC = Σ_i ΔC_i                     (BM = BJ + BK + BL)
```

**Edge cases.**
- Scenario equal to the baseline, or a factor left at its baseline value: the ratio is exactly 1, so the contribution is exactly 0.
- Nearly equal emissions (relative gap < 10⁻¹⁰): L uses the arithmetic mean to avoid 0/0 rounding.
- A zero or negative factor cannot occur within the website's ranges. It is still handled using LMDI's limiting values (Ang & Liu 2007): the factor that reaches zero takes the whole difference and the others contribute zero. If several do, they share it equally. Both values zero: all contributions are zero.
- Years up to 2020 are historical and identical in every scenario, so the breakdown covers 2021–2100 only.

**Interpretation.** These are **mathematical attributions, not causal estimates of policy effects**. In this model the four drivers are independent assumptions (constant growth rates from 2020), so the breakdown shows how the model's arithmetic divides a difference the user created. It does not capture interactions that happen in reality (for example, income growth funding cleaner energy). Because each rate compounds from the same 2020 value, `ln(x^s/x^b) = (t − 2020) × ln((1 + g^s)/(1 + g^b))` for GDP per person and both intensities, so contributions grow over time.

**Display.** A horizontal waterfall in Gt CO₂/yr: Project Baseline → Population → GDP per person → Energy intensity → Emissions intensity → scenario. Increases are red and decreases blue; every bar also has a signed number label, so colour is never the only cue. A short explanation underneath is generated only from the computed contributions: the total difference, the largest contributor in the direction of the change, and any offsetting drivers.

**Verification.**
- The Kaya factors were read directly from Excel's saved values: workbook sheets 1, 2 and 4, plus copies recalculated in Microsoft Excel (the baseline, Q4, and two mixed scenarios that change every factor, including population).
- A separate Python LMDI (`tools/verify/lmdi_excel.py`) was applied to those values:
  - Excel's BJ:BL equal the product of its factor columns exactly.
  - LMDI closes to within 1.2 × 10⁻¹³ Gt CO₂ for every year 2021–2100.
- The website's JavaScript, run on the same Excel numbers, matches the Python results to within 10⁻⁹ (`web/tests/fixtures/excel-lmdi.json`, tested in `web/tests/decomposition.test.js`).
- Example, 2100, world: HW5 Scenario 2 is −153.2 Gt CO₂, all of it from GDP per person. Q7 is +79.1 Gt CO₂, all of it from emissions intensity.

---

## 10. Presets

| Preset | Label | Result source |
|---|---|---|
| `project-baseline` | Project Baseline: Derived from HW5 Assumptions | Computed (verified in the recalculated workbook) |
| `hw5-s1-q4` | HW5 Scenario 1, Q4: 2 °C target in 2100 | Computed (verified in the recalculated workbook) |
| `hw5-s1-q5` | HW5 Scenario 1, Q5: 3 °C target in 2100 | Computed (verified in the recalculated workbook) |
| `hw5-s1-q6` | HW5 Scenario 1, Q6: 4 °C target in 2100 | Computed (verified in the recalculated workbook) |
| `hw5-s1-q7` | HW5 Scenario 1, Q7: 5 °C target in 2100 | **Stored in Excel**, sheet 1 |
| `hw5-s2` | HW5 Scenario 2: No growth in rich-country GDP per capita | **Stored in Excel**, sheet 2 |
| `hw5-s3` | HW5 Scenario 3: Rich-country GDP per capita falls 1% per year | **Stored in Excel**, sheet 3 |
| `hw5-s4` | HW5 Scenario 4: Rich-country GDP per capita falls 3% per year | **Stored in Excel**, sheet 4 |


**Names on the website.** The scenario menu shows plain names (defined in `web/src/lib/presetNames.js`; the engine's labels are unchanged). About the Model lists each one next to its Homework 5 reference and its source (Stored in Excel or Computed).

| Preset | Name on the website |
|---|---|
| `project-baseline` | Project Baseline: current trends |
| `hw5-s1-q4` … `hw5-s1-q7` | Energy mix for 2 / 3 / 4 / 5 °C in 2100 |
| `hw5-s2` | Rich-country incomes stop growing |
| `hw5-s3` | Rich-country incomes shrink 1% a year |
| `hw5-s4` | Rich-country incomes shrink 3% a year |

On the controls, energy intensity appears as **Energy efficiency** and emissions intensity as **Cleaner energy**. The precise terms are kept in tooltips and in About the Model. Headline numbers are rounded for display: temperatures to 0.01 °C and ppm to whole numbers. Around a Climate Challenge target, a failing peak gets extra decimals so it never rounds down to the target (for example, 2.004 °C). All calculations keep full precision.

---

## 11. How the engine is verified

### 11.1 Reference results ("answer keys")

| Reference | What it is | How it was made |
|---|---|---|
| `excel-sheet1…4` | The four sheets' stored results | Read directly from the workbook as Excel saved it |
| `lo-*` (8 files) | Copies of the workbook with input cells changed, recalculated by LibreOffice | `tools/build_references.py`. LibreOffice was first checked against Excel: recalculating the unchanged workbook reproduces all 8,720 numeric cells per sheet to 4 × 10⁻¹¹ |
| `py-replica-project-baseline` | The Phase 1 Python re-implementation, run with baseline inputs | `tools/replica_baseline.py` |

The LibreOffice references cover the project baseline, Q4–Q6, three stress tests (all-group energy intensity −3%/yr; all-group emissions intensity −2%/yr; nine different, non-converging rates), and a population-adjusted run. For that run, the adjusted population was computed by separate Python code using a different formula, written into the workbook's population cells, and carried through the workbook's own formulas.

### 11.2 Automated tests (`npm test`): 40 tests, all passing

| Group | What is checked | Result |
|---|---|---|
| 1. Workbook sheets | Every stored output (emissions, 5 boxes, ppm, forcing, both temperatures, all 15 group series) for every year, all 4 sheets | Max difference 2 × 10⁻¹⁶ |
| 2. Project Baseline | Approved inputs and label; matches recalculated workbook and Python replica; 4.773 °C | Pass |
| 3. Q4–Q7 | Solver reproduces stored rates; targets hit; recalculated workbook agrees; Q4 overshoot | Pass |
| 4. Stress tests | Three unstored scenarios vs recalculated workbook | Pass |
| 5. Population | Zero adjustment exact; growth = original + Δ every year; Poor irregularity kept; recalculated-workbook check | Pass |
| 6. Convergence | Equal 2100 incomes; exact formula vs Goal Seek rates; toggle behaviour | Pass |
| 7. Consistency | Groups sum to global; history equals data; identical history through 2020 in every preset; ppm ≥ 275 | Pass |
| 8. Input checks | Invalid inputs rejected; inputs not modified | Pass |

**Sensitivity check:** three deliberate small errors were introduced into the engine one at a time (a 48 → 49-year extrapolation period, a 0.1% change to the ocean coupling, and a 0.0000001-percentage-point change to GDP growth). Each one caused 16–20 tests to fail.

**Website tests (`npm test` inside `web/`): 120 tests.** 31 cover the dashboard, 37 the Climate Challenge, 36 the emissions breakdown and 16 the interface wording and rounding (plain preset names with homework references kept for About; control labels; a sweep showing rounding never displays a failed temperature target as met). The breakdown tests check:
- exact closure for every preset, every year and every region;
- zero contributions when nothing changes;
- single-driver attribution;
- increases, decreases, different years and income groups;
- the zero-value limits;
- the waterfall layout and the generated explanations;
- the independent Excel/Python comparison described in Section 9.5.

### 11.3 Re-running the checks

- `npm test` runs all automated tests (requires Node.js 20 or later; no other installs).
- If the workbook ever changes: run `python3 -I tools/extract_workbook.py data <workbook>`, regenerate the four `excel-*` fixtures, and rerun `python3 -I tools/build_references.py` (requires LibreOffice).

---

## 12. Limitations to state on the website

- This is a **modified classroom implementation** of a Tol-style model, not Tol's original model.
- Projections follow mechanically from assumed growth rates. They are scenarios, not forecasts.
- Population follows a fixed path (adjustable only by the project addition in 9.1). GDP growth, energy intensity and emissions intensity change at constant annual rates. Nothing responds to prices, policy or climate damages.
- There are no non-CO₂ gases, aerosols or carbon-cycle feedbacks.
- The three income groups have fixed membership; no country moves between groups.
- Temperatures are relative to the model's 1850 value, not the Paris Agreement's pre-industrial baseline.
- The Climate Challenge is a model-based exercise, not a policy assessment.

---

## 13. Remaining open items

- **Data sources and units** (for the methodology page): GDP dollar base year and exchange-rate basis; sources of the 1960–2020 data and the 1751–1959 emissions series.
- ~~Emissions breakdown method~~: resolved in Phase 5 — additive LMDI-I (Section 9.5).
- **Stray notes:** BN149 and BP149 (Section 2.4, item 9).
