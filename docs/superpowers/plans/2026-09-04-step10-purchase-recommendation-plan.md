# STEP 10 Safety Stock와 Purchase Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** STEP 7 Forecast Accuracy와 STEP 9 Inventory Projection/Lead Time을 연결해 SKU별 Safety Stock, 발주추천수량, 발주권고일과 계산 근거를 DB에서 제공한다.

**Architecture:** Supabase migration에서 저장된 Champion Forecast sigma, 실적 Lead Time variability, Effective Lead Time, 등급 정책, Item MOQ/Pack Size, STEP 9 projection을 결합한다. 화면은 `analytics` view를 조회·표현만 하며, 추천 상세는 동일한 DB 결과와 `calculation_trace`를 사용한다. 정책 변경은 ADMIN RLS와 서버 `requireAdmin()`으로 보호한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL, 순수 CSS, Node built-in test runner.

**Spec:** 사용자 제공 STEP 10 요구사항 및 `AGENTS.md`, `SCHEMA.md`

## Global Constraints

- 모든 계산은 SQL/DB에서 수행한다.
- Forecast·Inventory·Lead Time·Forecast Error·Policy가 없으면 0으로 대체하지 않고 `null + reason_code`를 반환한다.
- `raw` 데이터는 화면에서 직접 조회하지 않는다.
- 정책값과 날짜 버퍼를 코드에 하드코딩하지 않는다.
- 기존 RBAC을 유지하고 정책 변경은 ADMIN만 허용한다.
- 기존 STEP 8/9 미추적 파일은 보존한다.
- 변경 후 `npm test`, `npm run build`를 실행한다.

---

### Task 1: Safety Stock 및 Recommendation DB 계약

**Files:**
- Create: `supabase/migrations/20260904000200_safety_stock_purchase_recommendation.sql`
- Create: `sql/06-safety-stock-recommendation-verification.sql`
- Modify: `SCHEMA.md`

**Interfaces:**
- Produces `core.safety_stock_policy`, `analytics.v_safety_stock`, `analytics.v_purchase_recommendation`.
- Recommendation columns include requested inputs, intermediate variables, outputs, flags, `forecast_run_id`, `model_version`, and `calculation_trace`.

- [ ] **Step 1: Write failing SQL verification queries**

Add invariant queries for `sigma_DLT`, demand basis max rule, no-order vs unavailable, MOQ/Pack Size, date calculation, immediate flags, and all six required reason codes.

- [ ] **Step 2: Run verification and confirm missing-object failure**

Run: `supabase db test` if CLI is available; otherwise record that SQL runtime is unavailable and continue with static SQL review.

- [ ] **Step 3: Implement the migration**

Use `forecast_result.sigma` from the latest successful Champion model/run as `sigma_d`, `v_leadtime_stat.std_days` as `sigma_L`, `v_leadtime_effective.effective_lead_time` as `L`, Forecast P50 divided by period days as `d`, and grade policy `z_value` as `Z`. Calculate `sqrt(L*sigma_d^2 + d^2*sigma_L^2)` and `Z*sigma_DLT` only when all inputs exist. Use STEP 9 projection for inventory, receipt and stockout date. Apply `max(forecast_qty, confirmed_order_qty)`, subtract inventory/receipt/safety stock, then MOQ and pack-size ceiling. Persist a JSON trace.

- [ ] **Step 4: Re-run static/invariant verification**

Expected: no hardcoded service level, Z, safety buffer, MOQ, pack size, or date; unavailable recommendations remain null.

### Task 2: TypeScript contracts and failing tests

**Files:**
- Modify: `lib/scm-model.ts`
- Modify: `lib/scm.ts`
- Modify: `lib/stockout-model.test.ts` or Create: `lib/purchase-recommendation-model.test.ts`

**Interfaces:**
- Produces `SafetyStock`, `PurchaseRecommendation`, `normalizeSafetyStock`, `normalizePurchaseRecommendation`, `getPurchaseRecommendations`, and `getPurchaseRecommendationDetail`.

- [ ] **Step 1: Write failing tests for CASE 1~12**

Assert Forecast/Confirmed priority, null preservation, status values, safety stock fields, MOQ/pack fields, immediate/overdue flags, trace preservation, and missing-data reasons.

- [ ] **Step 2: Run tests and confirm expected failure**

Run: `npm test -- lib/purchase-recommendation-model.test.ts`
Expected: new exports are absent.

- [ ] **Step 3: Implement normalization and read functions**

Normalize only stored values; never recompute safety stock, requirement, rounding, or dates in TypeScript. Keep `recommended_qty = 0` only for normal `NO_ORDER` results.

- [ ] **Step 4: Run focused tests**

Expected: all recommendation model tests pass.

### Task 3: Admin Safety Stock Policy management

**Files:**
- Create: `app/(admin)/admin/safety-stock/page.tsx`
- Create: `app/(admin)/admin/safety-stock/actions.ts`
- Modify: `lib/menu.ts`

**Interfaces:**
- Admin page reads/writes grade policy rows with service level and z-value.
- Server action validates grade, service level, z-value, and calls `requireAdmin()` before upsert.

- [ ] **Step 1: Add failing input-validation tests**

Reject blank grade, non-positive or >1 service level, non-positive Z, and missing reason; accept valid policy values.

- [ ] **Step 2: Implement policy page/action**

Use existing UI components and show database errors separately from empty results. Do not expose policy writes to USER.

- [ ] **Step 3: Run focused tests and build route**

Expected: policy page is ADMIN-only and compiles.

### Task 4: Purchase Recommendation list and SKU detail screens

**Files:**
- Create: `app/(user)/user/analysis/purchase-recommendation/page.tsx`
- Create: `app/(user)/user/analysis/purchase-recommendation/[item_id]/page.tsx`
- Modify: `lib/menu.ts`

**Interfaces:**
- List displays SKU, item, risk, forecast, confirmed order, inventory, safety stock, stockout, required, MOQ, pack size, recommended quantity/date.
- Detail displays Forecast → Inventory Projection → Safety Stock → Stockout → Recommendation and trace.

- [ ] **Step 1: Implement list using `getPurchaseRecommendations()`**

Use `EmptyValue` for nulls and show `IMMEDIATE`/`OVERDUE` flags. Do not perform arithmetic in JSX.

- [ ] **Step 2: Implement detail using item-filtered DB queries**

Display `calculation_trace` fields as stored, preserving null/reason codes and distinguishing `NO_ORDER` from unavailable.

- [ ] **Step 3: Run tests/build**

Expected: USER can read recommendations; only ADMIN can alter policies.

### Task 5: Full verification

**Files:**
- Modify: `error.md` only if a new error occurs.

- [ ] **Step 1: Run `npm test`**

Expected: zero failures.

- [ ] **Step 2: Run `npm run build`**

Expected: exit code 0 and list/detail/admin routes compile.

- [ ] **Step 3: Review SQL and diff**

Confirm all requested columns, CASE 1~12 coverage, DB-only arithmetic, null semantics, RBAC, and preserved existing user files.
