# STEP 9 Lead Time 정책화와 Inventory Projection 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단순 `available_inventory ÷ average_usage` 계산을 제거하고 Champion Forecast, 현재고, Open PO, 확정수주, Soft Allocation, Effective Lead Time을 SQL 기반 기간별 Inventory Projection과 Risk Status로 제공한다.

**Architecture:** Supabase migration에서 모든 수요·입고·재고·리드타임 결합과 상태 판정을 수행한다. 서버 컴포넌트는 `analytics` 뷰를 조회하고 null/reason_code를 표현하며, 관리자 변경은 서버 `requireAdmin()`과 DB RLS/RPC로 이중 보호한다. 확정수주는 별도 차감하고 Forecast는 `greatest(champion_p50 - confirmed_sales_order, 0)`인 잔여 수요로 저장해 중복 차감을 방지한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL, 순수 CSS, Node built-in test runner.

**Spec:** 사용자 제공 STEP 9 요구사항 및 `AGENTS.md`, `SCHEMA.md`

## Global Constraints

- Supabase 원본 데이터는 `raw` 스키마에서 직접 수정하지 않는다.
- 화면은 원칙적으로 `analytics` 만 조회한다.
- 모든 Inventory Projection과 Risk 계산은 SQL/DB에서 수행한다.
- 계산 불가 값은 숫자 0 또는 임의 날짜로 대체하지 않고 `null + reason_code`를 사용한다.
- 기존 route `/analysis/leadtime`, `/analysis/stockout`는 유지한다.
- 새 CSS 프레임워크를 추가하지 않는다.
- 변경 후 `npm test`와 `npm run build`를 실행한다.
- 화면 문구·주석·커밋 메시지는 한국어로 작성한다.

---

### Task 1: DB 입력 계약과 Effective Lead Time 이력

**Files:**
- Modify: `supabase/migrations/20260904000100_inventory_projection_risk.sql`
- Test: `sql/05-inventory-projection-verification.sql`

**Interfaces:**
- Produces `core.leadtime_plan_history`, `core.v_leadtime_effective`, admin-only Lead Time write policy, and verification queries.

- [ ] **Step 1: Write failing SQL verification queries**

확정값 우선순위, P80 fallback, history 생성, 권한 부여·회수를 검증하는 쿼리를 작성한다.

- [ ] **Step 2: Run the verification queries against the local/project database**

Run: `supabase db test` 또는 연결된 Supabase SQL Editor에서 `sql/05-inventory-projection-verification.sql` 실행
Expected: migration 전에는 새 객체 부재 또는 기존 구조와 불일치로 실패한다.

- [ ] **Step 3: Implement the migration contract**

`effective_from`, `updated_by`, 변경 전·후 JSONB와 actor를 history에 저장한다. `core.is_admin()`을 사용하는 RLS를 적용하고, 뷰에는 `P50/P80/P90`, 관리자 확정값, Effective 값, 적용일, 변경자를 노출한다.

- [ ] **Step 4: Re-run verification**

Expected: ADMIN만 `core.leadtime_plan`을 변경할 수 있고, Effective 값은 관리자 확정값이 있으면 그것, 없으면 유효 실적 P80이며 둘 다 없으면 null이다.

### Task 2: SQL Projection/Risk 계산 교체

**Files:**
- Modify: `supabase/migrations/20260904000100_inventory_projection_risk.sql`
- Modify: `SCHEMA.md` (새 view 컬럼 계약)
- Test: `sql/05-inventory-projection-verification.sql`

**Interfaces:**
- Produces `analytics.v_inventory_projection` with `period`, beginning/ending inventory, receipt, confirmed order, soft allocation/state, forecast demand, stockout period/date, supply metrics, risk and reason fields.
- Produces projection-based `analytics.v_stockout_risk` and KPI view.

- [ ] **Step 1: Add failing fixture assertions to the SQL verification file**

CASE 1~11의 입력 조합을 확인할 수 있는 count/anti-join/assertion 쿼리를 작성한다. 현재 migration의 forecast 없는 행 누락, `p50` null을 0 처리하는 문제, 첫 기간이 현재고가 아닌 문제를 검출한다.

- [ ] **Step 2: Run the assertions and confirm failure**

Expected: 기존 migration 구조에서 최소 NO_FORECAST, no-inventory, Open PO timing, lead-time priority 검증이 실패한다.

- [ ] **Step 3: Implement SQL-only calculation**

Champion 모델의 최신 성공 Forecast만 item-period별 하나로 선택하고, forecast row가 없어도 active item을 `NO_FORECAST`로 반환한다. 현재고가 없으면 projection 숫자는 null로 둔다. Open PO는 scheduled date의 월에만 합산하고, 수령 완료분을 뺀 잔량만 반영한다. 확정수주와 Soft Allocation은 해당 월에 차감하며 Soft Allocation은 `OBSERVED`와 `DATA_ABSENT`를 구분한다. 연속 월은 `generate_series`와 recursive/window logic으로 누적하고 누락 월도 0 수요 입력으로 채운다.

`stockout_period`는 최초 ending inventory <= 0인 period로, days/months of supply는 forecast residual 합계가 양수이고 시작 재고가 있을 때만 계산한다. Risk는 stockout period가 없으면 SAFE, Lead Time 안이면 WARNING, stockout period가 예상 입고 월보다 이르면 CRITICAL, 필수 입력 누락이면 CALCULATION_UNAVAILABLE로 반환한다. 경계와 service level은 `core.policy_config`에서 조회한다.

- [ ] **Step 4: Re-run all SQL assertions**

Expected: CASE 1~11의 기대 상태와 반영 시점이 모두 일치하고, 계산 불가 행은 숫자 0/임의 날짜가 없다.

### Task 3: TypeScript 모델과 조회 함수

**Files:**
- Modify: `lib/scm-model.ts`
- Modify: `lib/scm.ts`
- Test: `lib/stockout-model.test.ts`

**Interfaces:**
- Produces `InventoryProjection`, expanded `StockoutRisk`, `LeadtimePolicy`, and `normalizeInventoryProjection`, `normalizeStockoutRisk`, `normalizeLeadtimePolicy`.
- `getInventoryProjection()`, `getLeadtimePolicies()`, `getLeadtimeHistory()` query only `analytics`/approved server-side admin data.

- [ ] **Step 1: Write failing normalization tests**

SAFE/WARNING/CRITICAL/CALCULATION_UNAVAILABLE, all five reason codes, null metrics, projection columns, and Korean/English aliases for fields are asserted.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- lib/stockout-model.test.ts`
Expected: new types/functions are missing or old UNKNOWN-only normalization rejects the new statuses.

- [ ] **Step 3: Implement minimal types/normalizers/query functions**

Normalization never computes projection metrics. It only converts DB values and preserves null/reason_code. Query errors and empty rows remain distinct.

- [ ] **Step 4: Run focused tests**

Expected: all new normalizer tests pass and existing SCM tests remain green.

### Task 4: Admin Lead Time 정책 화면과 변경 API

**Files:**
- Create: `app/(admin)/admin/leadtime/page.tsx`
- Create: `app/(admin)/admin/leadtime/actions.ts`
- Modify: `lib/scm.ts`
- Modify: `app/(admin)/admin/page.tsx` or existing admin navigation only if needed

**Interfaces:**
- Admin page displays item/supplier, actual lead time, P50/P80/P90, admin value, Effective value, effective-from, changed-by, and history.
- `saveLeadtimePolicy(formData)` calls a server-side guarded Supabase write and revalidates the admin page.

- [ ] **Step 1: Add failing action/model tests**

Test input validation rejects missing supplier, non-positive lead time, invalid date, and blank reason; valid data maps to the database payload without client-side policy calculation.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- lib/stockout-model.test.ts`
Expected: action validation helper is absent.

- [ ] **Step 3: Implement `requireAdmin()` action and page**

Use existing `PageHeader`, `Panel`, `DataTable`, `Badge`, and `EmptyValue`. The page distinguishes read errors from empty results. The action writes `updated_by` from the authenticated user, stores effective date/reason, and relies on DB RLS as the second check.

- [ ] **Step 4: Run tests and build the admin route**

Expected: TypeScript compiles and non-admin users cannot reach the page/action.

### Task 5: Inventory Projection 화면과 기존 Stockout 화면 교체

**Files:**
- Modify: `app/(user)/user/analysis/stockout/page.tsx`
- Modify: `app/analysis/stockout/page.tsx`
- Modify: `lib/scm.ts`
- Modify: `lib/scm-model.ts`

**Interfaces:**
- Existing `/analysis/stockout` redirects as before; `/user/analysis/stockout` renders projection rows with all requested columns.

- [ ] **Step 1: Write failing UI-facing normalization assertions**

Assert that table data uses beginning inventory, scheduled receipt, confirmed order, soft allocation, forecast demand, ending inventory, stockout period/date, supply metrics, status, and reason code, and never `available_qty` or `daily_usage_avg` for new risk output.

- [ ] **Step 2: Run tests and confirm failure**

Expected: old `StockoutRisk` contract fails the new assertions.

- [ ] **Step 3: Replace the page columns and KPI copy**

The page only renders DB results; it does not average, divide, infer dates, or fallback to SAFE. It displays `EmptyValue` with reason codes for nulls and handles empty/error responses separately.

- [ ] **Step 4: Run focused tests and build**

Expected: the page type-checks and old simple stockout wording/calculation is absent from the new screen.

### Task 6: End-to-end regression tests and verification

**Files:**
- Modify: `lib/stockout-model.test.ts`
- Create or modify: `sql/05-inventory-projection-verification.sql`
- Modify: `error.md` only if a new error occurs

- [ ] **Step 1: Add CASE 1~11 automated/model and SQL checks**

Cover sufficient inventory SAFE; WARNING and CRITICAL timing; missing lead time/inventory/forecast; receipt timing; confirmed order subtraction; soft allocation subtraction; admin Lead Time priority; P80 fallback.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`
Expected: exit code 0 and zero failed tests.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: exit code 0 and all routes compile.

- [ ] **Step 4: Inspect final diff and requirement checklist**

Confirm only STEP 9 files changed, existing untracked user work is preserved, no client secret is introduced, no raw table is queried by React, and no projection calculation exists in TypeScript.
