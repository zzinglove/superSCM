# STEP 7 Backtest + Champion + Model Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** STEP 6 Forecast Result와 검증 Actual을 비교해 성능, Rank, Champion을 저장하고 비교 화면에서 재사용한다.

**Architecture:** DB migration이 Backtest 지표·순위·Champion을 계산하고 저장한다. Server Action은 ADMIN 인증 후 RPC만 호출하며, 화면은 analytics view를 조회하고 차트는 저장 결과를 렌더링한다.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL, SQL RPC/View, 기존 CSS 디자인 시스템, Recharts 공통 wrapper.

**Spec:** `docs/superpowers/specs/2026-08-28-backtest-champion-design.md`

## Global Constraints

- Forecast를 Backtest 화면에서 다시 실행하지 않는다.
- scoring은 `forecast_result + v_test_actual`만 사용한다.
- 모든 metric 계산은 SQL에서 수행한다.
- 계산 불가 값은 임의 숫자 대신 `NULL + reason_code`를 사용한다.
- ADMIN 권한은 Server Action과 DB RPC/RLS에서 모두 검증한다.
- 모델 토글은 저장 결과 조회만 바꾸며 재실행하지 않는다.

---

### Task 1: 성능 계산 도메인 테스트

**Files:**
- Create: `lib/backtest-model.ts`
- Create: `lib/backtest-model.test.ts`

**Interfaces:**
- Produces `normalizePerformanceRow`, `normalizeChampionRow`, `buildComparisonSeries`.

- [ ] Write failing tests for WAPE 0, positive/negative Bias, zero-actual MAPE exclusion, null reason preservation, and no forecast rerun in comparison data shaping.
- [ ] Run `npm test -- lib/backtest-model.test.ts` and confirm failure because the module is missing.
- [ ] Implement normalization and display-series shaping only; do not calculate metrics in React.
- [ ] Run the focused test, then the full test suite.

### Task 2: Backtest SQL schema and scoring RPC

**Files:**
- Create: `supabase/migrations/20260828000800_create_backtest_champion.sql`
- Create: `sql/04-backtest-verification.sql`

**Interfaces:**
- Creates `core.backtest_run`, `core.model_performance`, `core.champion_model`.
- Creates analytics views `v_backtest_run`, `v_model_performance`, `v_champion_model`, `v_model_comparison`.
- Creates `core.run_backtest(p_forecast_run_id uuid)` and `core.set_manual_champion(p_item_id text,p_model_id text,p_reason text)`.

- [ ] Add tables, constraints, indexes, comments, and RLS without dropping STEP 6 objects.
- [ ] Add scoring SQL using only `core.forecast_result` and `core.v_test_actual` with explicit zero-denominator reason codes.
- [ ] Add rank window ordered by configured champion metric, absolute Bias, RMSE, model_id.
- [ ] Add AUTO Champion rows with complete candidate JSONB and selection reason.
- [ ] Add MANUAL Champion RPC with required reason and audit insert.
- [ ] Add authenticated SELECT grants and ADMIN-only mutation/execute grants.
- [ ] Add verification queries for metrics, ranks, candidates, permissions, and source restrictions.

### Task 3: Server repository and ADMIN actions

**Files:**
- Create: `lib/backtest.ts`
- Create: `app/(admin)/admin/backtest-actions.ts`

**Interfaces:**
- `getBacktestRuns`, `getModelPerformance`, `getChampions`, `getComparisonData` read analytics views.
- `runBacktest(forecastRunId)` calls `requireAdmin()` then `core.run_backtest`.
- `setManualChampion(formData)` calls `requireAdmin()` then `core.set_manual_champion`.

- [ ] Add repository normalizers and preserve null/reason fields.
- [ ] Add Server Actions with redirect error handling and cache revalidation.
- [ ] Test TypeScript compilation through build.

### Task 4: Model Comparison screen and chart wrapper

**Files:**
- Create: `components/chart/forecast-overlay-chart.tsx`
- Create: `app/(user)/user/analysis/model-comparison/page.tsx`
- Create: `app/(user)/user/analysis/model-comparison/model-comparison-table.tsx`
- Modify: `lib/menu.ts`

**Interfaces:**
- Chart accepts pre-shaped `{ period, actual, forecasts, p80, p90 }` data and only draws it.
- Table renders stored metrics, rank, Champion badge, and EmptyValue for unavailable metrics.

- [ ] Load latest available run and saved comparison rows from analytics views.
- [ ] Add SKU, run, model, and period filters as query parameters.
- [ ] Add model checkboxes that filter displayed series locally without invoking Forecast or Backtest RPCs.
- [ ] Add ADMIN-only Backtest trigger entry where appropriate; keep USER read-only.
- [ ] Verify all visible states use existing Badge, Panel, EmptyValue, and chart CSS.

### Task 5: Export and verification

**Files:**
- Modify: `lib/backtest.ts`
- Create: `app/api/analysis/model-comparison/export/route.ts`
- Modify: `error.md`

- [ ] Export exactly the stored performance/detail rows currently allowed by the authenticated user.
- [ ] Add tests for CSV headers and null values.
- [ ] Run `npm test`, `npm run build`, `git diff --check`, and static scans ensuring no scoring query references `raw.usage_history` or `core.v_test_actual` outside the scoring SQL input.
- [ ] Run the SQL verification file after migrations are applied and record observed results.
