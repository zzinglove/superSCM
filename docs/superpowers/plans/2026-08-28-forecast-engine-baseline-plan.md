# STEP 6 Forecast Engine Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a SQL-only baseline Forecast Engine with model registry, version snapshots, immutable forecast runs/results, stale detection, and ADMIN analytics screens.

**Architecture:** Extend `core.forecast_setting` with a DB-managed horizon and add registry/snapshot/run/result tables. A single `core.run_baseline_forecast()` function reads only `core.v_train_demand_month_grid`, computes configured SQL models and residual intervals, and stores every execution under a new run ID. Server code calls the protected function and reads only analytics views; React renders persisted values without forecasting math.

**Tech Stack:** PostgreSQL/Supabase SQL migrations and RPC, Next.js 15 App Router, React 19, TypeScript, existing pure CSS and shared UI components, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-28-forecast-engine-baseline-design.md`

## Global Constraints

- Forecast calculations must read `core.v_train_demand_month_grid` and never `raw.usage_history` or `core.v_test_actual`.
- Train/test dates, horizon, model parameters, and demand-type applicability must be database-managed.
- No null forecast input may be converted to zero; unavailable outputs remain null or have no result row with a traceable reason.
- Existing forecast runs/results are never overwritten or deleted by a later run.
- ADMIN is required for model mutation and forecast execution; authenticated users may read analytics views.
- UI may query analytics views only and may not calculate MA, WMA, sigma, P80, or P90.
- Use the existing CSS/shared components; do not add Tailwind, styled-components, CSS Modules, or a chart library.
- All visible user-facing copy and comments are Korean; database/model codes remain English.

### Task 1: Add failing model contract tests

**Files:**
- Create: `lib/forecast-model.test.ts`
- Create: `lib/forecast-model.ts`

**Interfaces:**
- Produces `BASELINE_MODEL_IDS`, `normalizeForecastModel`, `normalizeForecastRun`, and `normalizeForecastResult` for server/UI read models.

- [ ] **Step 1: Write the failing tests**

  Cover: exact model IDs and demand type codes; preservation of `null` and `reason_code`; preservation of run `is_stale`; preservation of result `p50/p80/p90/sigma`; and proof that the normalizers do not consume raw/test fields.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `node --test lib/forecast-model.test.ts`

  Expected: fail because `lib/forecast-model.ts` does not yet exist.

- [ ] **Step 3: Implement the minimal normalizers**

  Keep them calculation-free. Convert numeric database values only when finite, preserve nulls, validate model codes against the exact five baseline IDs, and expose `reasonCode` without inventing fallback numbers.

- [ ] **Step 4: Run focused and full tests**

  Run: `node --test lib/forecast-model.test.ts` and `npm test`

  Expected: focused tests and all existing tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/forecast-model.ts lib/forecast-model.test.ts
  git commit -m "test: define forecast read model contracts"
  ```

### Task 2: Create the model registry, snapshots, runs, results, and SQL analytics views

**Files:**
- Create: `supabase/migrations/20260828000500_create_baseline_forecast_engine.sql`
- Create: `sql/03-forecast-engine-verification.sql`

**Interfaces:**
- Creates `core.model_config`, `core.model_version`, `core.forecast_run`, `core.forecast_result`.
- Extends `core.forecast_setting` with `forecast_horizon` and a positive-value constraint.
- Creates `core.run_baseline_forecast()` returning the new `run_id`.
- Creates `analytics.v_model_config`, `analytics.v_forecast_run`, `analytics.v_forecast_result`, `analytics.v_forecast_run_kpi`.

- [ ] **Step 1: Add migration preconditions and setting extension**

  Use `create table if not exists` and `alter table ... add column if not exists`. Keep the existing singleton setting and add `forecast_horizon integer not null default 3` with a positive check. Do not recreate or drop existing data objects.

- [ ] **Step 2: Add model registry and seed exact baseline definitions**

  Store parameters in JSONB: MA windows, WMA weights `[3,2,1]`, and seasonal lag `12`. Store applicability as a JSONB array of exact demand type codes. Seed with `on conflict` updates limited to descriptions/default metadata so an ADMIN’s parameters and enabled state are not silently overwritten.

- [ ] **Step 3: Add snapshot/run/result tables and constraints**

  Use UUID run/version IDs, composite result PK `(run_id, model_id, item_id, period)`, status checks for `RUNNING/SUCCESS/FAILED`, FK from result to run/version, and immutable-run indexes. Include `basis`, `reason_code`, `model_version`, `data_snapshot_at`, `triggered_by`, and all requested counters/timestamps.

- [ ] **Step 4: Add RLS, grants, and guarded RPC permissions**

  Revoke anon access. Grant authenticated select on analytics views and execute only to authenticated for the RPC, while the function itself checks `core.is_admin()` and uses a controlled `search_path`. Grant ADMIN-only table mutation policies for `model_config`; prevent direct authenticated writes to snapshots, runs, and results.

- [ ] **Step 5: Implement SQL helper CTEs for fitted values and forecast periods**

  Build all inputs from `core.v_train_demand_month_grid`. Generate forecast periods from the configured train end and horizon. Implement exact MA/WMA/PY/Seasonal Naive rules with window completeness checks and no null-to-zero coercion. Use the model’s stored JSONB parameters rather than literals in calculation expressions.

- [ ] **Step 6: Implement SQL residual sigma and interval calculation**

  Compute historical fitted values using the same model formula, calculate `stddev_samp(actual - fitted)` by SKU/model only when at least two residuals exist, set `p50` to the point forecast, and calculate P80/P90 only when sigma is non-null.

- [ ] **Step 7: Implement the transactional RPC and failure persistence**

  Validate settings, insert RUNNING, snapshot enabled models, insert calculable results, aggregate counts, and update SUCCESS with duration. Use an exception block that updates the created run to FAILED with SQL error text and returns the failed run ID instead of re-raising, because re-raising would roll back the failure record. Do not update prior runs.

- [ ] **Step 8: Add analytics views and stale detection**

  Expose model fields, run counters/status/snapshot/executor, result values, and KPI aggregates. Set `is_stale` when a demand row with `loaded_at > data_snapshot_at` exists, without using test data or deleting historical results.

- [ ] **Step 9: Add verification SQL**

  Include queries for WMA 3:2:1, missing 12-month/seasonal inputs, null sigma intervals, model version snapshot, SUCCESS/FAILED state, stale after a newer load, and assurance that forecast calculation dependencies do not reference `raw.usage_history` or `core.v_test_actual`.

- [ ] **Step 10: Review migration for safety and commit**

  Run a static scan for prohibited data sources and destructive DDL, then commit the migration and verification queries.

  ```bash
  git add supabase/migrations/20260828000500_create_baseline_forecast_engine.sql sql/03-forecast-engine-verification.sql
  git commit -m "feat: add SQL baseline forecast engine"
  ```

### Task 3: Add protected server repository and execution action

**Files:**
- Create: `lib/forecast.ts`
- Create: `app/(admin)/admin/forecast-actions.ts`
- Modify: `lib/menu.ts`

**Interfaces:**
- `getForecastModels()`, `getForecastRuns()`, `getForecastResults(runId)`, `getForecastRunKpi()` read analytics views.
- `runBaselineForecast()` calls `requireAdmin()` first, invokes the RPC, and returns the new run ID or a safe error.

- [ ] **Step 1: Add failing repository/action tests**

  Test model/run/result normalizers through repository-shaped fixtures and assert the action contract rejects unauthenticated/non-admin context at its boundary without doing client-side calculations.

- [ ] **Step 2: Run tests and confirm the new contract fails**

  Run: `node --test lib/forecast-model.test.ts`

  Expected: new action/repository assertions fail until the server module is added.

- [ ] **Step 3: Implement server reads against analytics views**

  Use the existing `createSupabaseServerClient()` and `.schema('analytics')`. Return `{ rows, error }` consistently and preserve database nulls.

- [ ] **Step 4: Implement ADMIN-only action**

  Call `requireAdmin()` as the first operation, call `supabase.schema('core').rpc('run_baseline_forecast')`, and return only the run ID/status needed by the page. Never accept model math or parameters from the browser.

- [ ] **Step 5: Add Forecast menu entries**

  Add `/admin/forecast-models` and `/admin/forecast-runs` under the existing admin menu definition, without hardcoding menu items in pages.

- [ ] **Step 6: Run all tests and commit**

  Run: `npm test`

  ```bash
  git add lib/forecast.ts app/'(admin)'/admin/forecast-actions.ts lib/menu.ts lib/forecast-model.test.ts
  git commit -m "feat: add protected forecast repository"
  ```

### Task 4: Build Admin Forecast Models and Runs screens

**Files:**
- Create: `app/(admin)/admin/forecast-models/page.tsx`
- Create: `app/(admin)/admin/forecast-models/model-toggle.tsx`
- Create: `app/(admin)/admin/forecast-runs/page.tsx`
- Create: `app/(admin)/admin/forecast-runs/run-actions.tsx`

**Interfaces:**
- Models page renders persisted model config and calls a server action for ADMIN-only enabled/disabled updates.
- Runs page renders persisted run KPI/table/result links and invokes the protected baseline action; it never recalculates values.

- [ ] **Step 1: Write page-level acceptance checks**

  Add a pure view-model test that a model row displays exact family/engine/version/applicability/parameters and that a run row displays status, counts, snapshot, stale, and executor while null values remain unavailable.

- [ ] **Step 2: Implement model page and toggle action**

  Call `requireAdmin()` in the page, query `analytics.v_model_config`, render shared `PageHeader`, `Panel`, `Badge`, and `EmptyValue`, and submit changes only through a server action that rechecks ADMIN and updates `core.model_config`.

- [ ] **Step 3: Implement run page and execution action**

  Call `requireAdmin()`, query `analytics.v_forecast_run` and KPI, show a run button wired to `runBaselineForecast()`, and render result values as stored. Include a concise Korean explanation that stale marks a newer data load and does not delete prior results.

- [ ] **Step 4: Add result detail access without rerun**

  Provide a run result table or detail link that calls `getForecastResults(runId)` and supports model filtering only over persisted rows.

- [ ] **Step 5: Run tests and build**

  Run: `npm test` and `npm run build`

  Expected: all tests pass and both admin routes appear in the Next.js route list.

- [ ] **Step 6: Commit**

  ```bash
  git add app/'(admin)'/admin/forecast-models app/'(admin)'/admin/forecast-runs
  git commit -m "feat: add forecast admin screens"
  ```

### Task 5: Final verification and documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-08-28-forecast-engine-baseline-design.md` only if implementation decisions materially differ.
- Modify: `error.md` only if a new implementation error occurs.

- [ ] **Step 1: Run full automated verification**

  Run: `npm test`, `npm run build`, `git diff --check`.

- [ ] **Step 2: Run static leakage/safety checks**

  Confirm Forecast-specific SQL/TS files contain no `raw.usage_history` or `core.v_test_actual` references, no destructive `drop table`, and no UI calculation of MA/WMA/sigma/P80/P90.

- [ ] **Step 3: Apply migration and run Supabase verification queries**

  Apply `supabase/migrations/20260828000500_create_baseline_forecast_engine.sql`, set `forecast_horizon`, confirm enabled models, execute the RPC as ADMIN, and run `sql/03-forecast-engine-verification.sql`. Record actual query results in the final report; do not claim DB completion without results.

- [ ] **Step 4: Verify manually as USER and ADMIN**

  Confirm USER can read analytics but cannot call the RPC or mutate model config; ADMIN can toggle a model and execute a run. Confirm a newer uploaded demand row marks the prior run stale.

- [ ] **Step 5: Commit any final documentation-only changes**

  ```bash
  git add docs/superpowers/specs/2026-08-28-forecast-engine-baseline-design.md error.md
  git commit -m "docs: verify baseline forecast engine"
  ```

