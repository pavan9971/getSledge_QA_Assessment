# Sledge QA Assessment: New Project flow

I tested the **Projects > Add > Create Manually** flow on [getsledge.com](https://www.getsledge.com) (production), logged 9 bugs, and automated that flow and SLG-01 to SLG-08 with Playwright + TypeScript. SLG-09 is an onboarding bug and is documented only.

If you only have five minutes:

1. Read the bug summary below, then open the [full bug report](bug-reports/BUG-REPORT.md) for steps and screenshots.
2. Skim [How the code is organised](#how-the-code-is-organised) and [Design decisions](#design-decisions).
3. Run the suite using [How to run it](#how-to-run-it).

## Why this flow

Creating a project is the entry point for bills, lien waivers and contracts. Wrong data entered here (address, dates, contract value) spreads into everything built on top of it, so it is where a bug costs the most.

## What I did

1. **Explored** each module read-only, watching the browser console and network tab.
2. **Tested the form field by field:** empty, whitespace only, invalid email, negative amount, end date before start date, typed address vs. autocomplete.
3. **Created one project** (`QA-Test Project 01`, `/projects/451`) and compared what the UI showed with what `GET /api/v1/projects/:id` stored. That comparison found SLG-01 and SLG-02.
4. **Measured instead of eyeballing:** WCAG contrast from computed colours, text truncation from `scrollWidth`, payload size, HTTP status codes.
5. **Automated** the New Project flow and SLG-01 to SLG-08 as regression tests, wired into GitHub Actions. SLG-09 is written up only.

Environment: production, workspace "Zerostha", Chrome 157 on Windows, 1280x631 viewport, 18 Nov 2026.

## Bugs found

| ID | Bug | Priority |
| --- | --- | --- |
| SLG-01 | A typed street address is silently replaced by the first autocomplete suggestion (different street and ZIP) and saved | **P1 High** |
| SLG-02 | End date before start date is accepted by the UI and the API, and the project header then shows an end date nobody entered | **P1 High** |
| SLG-03 | Negative contract amount is accepted and shown in three different formats | P2 Medium |
| SLG-04 | Read-aloud fails silently: `POST /speech/say` returns 429 on every load | P2 Medium |
| SLG-05 | Validation error text has 1.97:1 contrast (WCAG AA needs 4.5:1) | P2 Medium |
| SLG-06 | KPI card labels are truncated at 1280px | P3 Low |
| SLG-07 | Project API sends a 1,536-number address embedding to the browser (87% of the payload) | P3 Low |
| SLG-08 | Analytics proxy `/ph/*` returns 400 on every page | P3 Low |
| [SLG-09](bug-reports/BUG-REPORT.md#slg-09) | Onboarding step 11 (mobile app sign-in) never completes on desktop web, so new users are blocked. Only bypassed by editing the URL | **P1 High** |

SLG-01 and SLG-02 were prioritised because they put wrong data into saved records without telling the user. [SLG-09](bug-reports/BUG-REPORT.md#slg-09) is also P1: a new desktop user cannot finish onboarding after signing in on the mobile app, and the only bypass is editing the URL.

Each bug in the [bug report](bug-reports/BUG-REPORT.md) has steps to reproduce, actual vs. expected result, impact, and evidence. Screenshots are in [`bug-reports/screenshots/`](bug-reports/screenshots/):

| Screenshot | Shows |
| --- | --- |
| [`SLG-01-02-03_saved-project-451.jpg`](bug-reports/screenshots/SLG-01-02-03_saved-project-451.jpg) | Wrong saved address (SLG-01), timeline 12/28 that was never entered (SLG-02), `$-5,000` (SLG-03) |
| [`SLG-05_low-contrast-errors.jpg`](bug-reports/screenshots/SLG-05_low-contrast-errors.jpg) | Dark red validation errors on a near-black background |
| [`SLG-06_kpi-labels-truncated.jpg`](bug-reports/screenshots/SLG-06_kpi-labels-truncated.jpg) | "Done this ...", "Nothing due t..." cut-off labels |

SLG-04, SLG-07 and SLG-08 are network-level bugs, so they have no screenshot. Their evidence is the request and response (status code, payload size), described in the report and asserted by their tests. SLG-09 has no screenshot; it was observed live on onboarding and is not in the test suite.

## How to run it

You need Node 22 and a Sledge account.

```bash
npm ci
npx playwright install chromium
cp .env.example .env          # then fill in SLEDGE_EMAIL and SLEDGE_PASSWORD
npm run test:smoke            # 3 quick checks
npm test                      # everything
npm run report                # open the HTML report
```

| Variable | Meaning |
| --- | --- |
| `SLEDGE_EMAIL`, `SLEDGE_PASSWORD` | Login. Read from `.env` or CI secrets only, never committed |
| `ALLOW_DATA_CREATION` | `true` lets tests create projects on the real site. Default `false`, and those tests are skipped |
| `BASE_URL`, `API_URL` | Point the suite at another environment |

Other scripts: `npm run test:bugs` (only the bug regressions), `npm run auth` (only the login step), `npm run typecheck`.

**Safe on production:** tests that create data are off by default. When on, every record is named `QA-AUTO <timestamp>`, so it is easy to find and delete by hand.

## What the tests cover

15 tests in 3 files.

| File | Tests | What it checks |
| --- | --- | --- |
| `tests/auth.setup.ts` | 1 | Logs in once and saves the session for every other test |
| `tests/new-project.spec.ts` | 5 | The form shows all fields; Create is blocked when required fields are empty; a whitespace-only name counts as empty; an invalid email is flagged; a valid project is created and the stored values match what was typed |
| `tests/known-bugs.spec.ts` | 9 | One test per bug (SLG-01 to SLG-08, plus SLG-02b for the header date) |

Tests tagged `@smoke` are the quick gate. Tests that create projects (the valid-project test and SLG-02, 02b and 03) need `ALLOW_DATA_CREATION=true`.

### How the bug tests work

Each one asserts the **correct** behaviour and is wrapped in `knownBug()` from `utils/knownBug.ts`, which marks it as an expected failure:

- While the bug exists, the test fails as expected and the run is **green**.
- When the product is fixed, the test unexpectedly passes and the run goes **red**. That is the signal to delete the marker and close the ticket.

So the suite documents open bugs without blocking CI, and it notices when one is fixed.

### UI and API are checked together

The valid-project test reads the new project back through `GET /projects/:id` and compares it with what was typed and with what the page header shows. This is how mismatches like SLG-02 get caught: the UI can look fine while the stored data is wrong.

## How the code is organised

```
config/        environment variables, nothing else
api/           ProjectsApi (reads projects from the backend), NetworkLog (records responses)
pages/         NewProjectPage (the form), components/DatePicker (the calendar popup)
utils/         dates, test data, contrast maths, the knownBug marker
tests/         specs only: what should happen, not how
bug-reports/   BUG-REPORT.md and screenshots
```

## Design decisions

**First principles.** I did not copy selectors or flows from another project. Locators come from the live accessibility tree (roles and labels). Contrast is computed from the WCAG formula using the real rendered colours, and truncation is measured from element widths. Expected values come from the requirement ("the saved value must equal what was typed"), not from whatever the site currently does.

**SOLID, applied where it fits:**

| Principle | Where |
| --- | --- |
| Single responsibility | One reason to change per class. A new form field touches `NewProjectPage`; a new endpoint touches `ProjectsApi`; a different calendar widget touches `DatePicker`; a new environment variable touches `config/env.ts` |
| Open/closed | New bug tests are added by writing a test and calling `knownBug()`. New form fields are added with an optional property on `ProjectInput`. Existing code is not edited |
| Liskov substitution | Not forced. There is only one implementation of each class here, and I did not invent an interface to claim the principle |
| Interface segregation | Specs get small, focused classes (`NetworkLog` only records responses, `ProjectsApi` only reads projects) rather than one large helper |
| Dependency inversion | Classes receive their dependencies (`Page`, `APIRequestContext`) in the constructor instead of creating them. Specs depend on page objects and API classes, never on raw selectors or URLs |

## CI

`.github/workflows/e2e.yml` runs on pull requests, pushes to `main`, weekdays at 07:30 IST, and on demand.

1. `npm ci`, then typecheck
2. Smoke gate (`@smoke`)
3. Full suite including the known-bug regressions
4. JUnit summary on the PR; HTML report, traces, videos and screenshots kept 14 days

Pull requests are read-only. Tests that create projects run only on the nightly job, or when started manually with "Run tests that create projects" ticked. Add `SLEDGE_EMAIL` and `SLEDGE_PASSWORD` as repository secrets for CI to log in.

## Limits and honest notes

- **Typechecked, not run end to end.** `npm run typecheck` passes and Playwright lists all 15 tests. The suite has not been run against the live site from this repository because that needs real credentials. Locators and the login steps are based on the live page as I observed it and may need small adjustments on the first run.
- **Bug reports reflect one session.** Everything was observed on 18 Nov 2026 on production. SLG-01 reproduced 2/2 and is conditional (it depends on the top suggestion starting with the same house number), so the test uses an address that avoids it for the happy-path tests.
- **One test record exists** on production: `QA-Test Project 01` (`/projects/451`). It holds the evidence for SLG-01 to SLG-03 and can be deleted.
- **Scope of the tests is the New Project flow only.** SLG-09 (onboarding step 11) was found in the same session and is written up in the bug report, but it is not automated. Other modules were explored read-only and are not covered by tests.
