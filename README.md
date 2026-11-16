# Global Climate Scenario Explorer

An interactive website for a Carbon Trading class project. It shows how population, income growth, energy efficiency and cleaner energy shape CO₂ emissions and global warming through 2100. It runs the course's classroom climate model, built for Homework 5: Kaya emissions → five-box carbon cycle → two-layer temperature model.

**Live website: https://claraiburns-cpu.github.io/climate-model/**

Results are model scenarios, not forecasts. Temperatures are measured from the classroom model's 1850 reference, not the Paris Agreement's pre-industrial baseline. See **About the Model** on the website and **MODEL_DOCUMENTATION.md** for details.

## What's in this repository

| Path | What it is |
|---|---|
| `web/` | The website (React + Vite). `web/src/` holds the pages and charts; `web/tests/` holds 120 automated tests. |
| `engine/` | The validated calculation engine. It reproduces the classroom Excel workbook exactly. `engine/data.js` holds the workbook's input data. |
| `tests/` | 40 engine tests and their answer keys (values from the workbook and recalculated copies of it). |
| `MODEL_DOCUMENTATION.md` | How the model works, the project additions, the emissions-breakdown method (LMDI) and how everything is verified. |
| `VERIFICATION_REPORT.md` | Number-by-number comparison of the website with the original workbook. |
| `.github/workflows/deploy.yml` | Automatic publishing: on every update it runs all tests, builds the site and publishes it to GitHub Pages. |

The original workbook, the homework document and the Python/Excel verification scripts are kept offline and are not part of this repository.

## Updating the website

Every change pushed to the `main` branch is tested and published automatically. If any test fails, the site is not updated, and the previous version stays online.

To work on it locally (requires Node.js 20 or later):

```
cd web
npm install
npm run dev        # preview at http://localhost:5173
npm test           # website tests
cd .. && npm test  # engine tests
```
