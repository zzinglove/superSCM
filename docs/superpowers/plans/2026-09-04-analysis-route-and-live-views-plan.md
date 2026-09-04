# Analysis Route and Live View Queries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 분석 화면을 `/analysis/*`로 단일화하고 Supabase analytics 실데이터 뷰 조회 함수를 추가한다.

**Architecture:** `app/(user)/analysis/*`를 분석 화면의 단일 소유 위치로 삼고 route group으로 URL에는 `(user)`가 노출되지 않게 한다. 공통 타입과 snake_case 정규화는 `lib/scm-model.ts`, Supabase 조회는 `lib/scm.ts`에 둔다. 기존 STEP 9/10 계산 함수와 더미 Forecast 모듈은 변경하지 않는다.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase SSR client, Node test runner.

**Spec:** 사용자 요청 및 `AGENTS.md`, `ARCHITECTURE.md`, `design.md`

## Global Constraints

- 화면 계산은 하지 않고 analytics 결과를 조회한다.
- Supabase 원본 raw 데이터는 수정하지 않는다.
- 조회 오류는 throw하지 않고 `{ rows: [], error }`로 반환한다.
- 값이 없으면 0으로 대체하지 않고 null을 보존하며 `reason_code`를 보존한다.
- `lib/demand-profile.ts`, `forecast.ts`, `backtest.ts`와 기존 `lib/scm.ts` 함수는 변경하지 않는다.
- 새 CSS 프레임워크를 추가하지 않는다.
- 한국어 화면 문구와 주석을 사용한다.

### Task 1: Live view query contract test

**Files:**
- Create: `lib/live-analytics.test.ts`
- Modify: `lib/scm-model.ts`

**Interfaces:**
- Produces `ShipmentTrendRow` and `normalizeShipmentTrend` used by the query implementation.

- [ ] Write a focused fixture test for `normalizeShipmentTrend` with item code `602K02693`, `n_months: 40`, `avg_3m: 779.0`, and `avg_12m: 772.3`; assert missing numeric values remain null and `reason_code` is preserved.
- [ ] Run the focused test and confirm it fails because the new type/normalizer is absent.

### Task 2: Add normalized live view types

**Files:**
- Modify: `lib/scm-model.ts`

- [ ] Add camelCase types and normalizers for shipment trend, real-time demand profile, OL accuracy (detail/FY), and BOM requirement.
- [ ] Support the view's snake_case names and established Korean/English aliases without changing existing normalizers.
- [ ] Keep nullable fields nullable and preserve `reason_code`.

### Task 3: Add analytics query functions

**Files:**
- Modify: `lib/scm.ts`
- Test: `lib/live-analytics.test.ts`

- [ ] Add `getShipmentTrend(itemCode?)`, querying `analytics.v_shipment_trend`.
- [ ] Add `getDemandProfileRt(itemCode?)`, querying `analytics.v_item_demand_profile`.
- [ ] Add `getOlAccuracy(modelBase?)`, querying both OL accuracy views and returning normalized detail/FY rows.
- [ ] Add `getBomRequirement(modelBase)`, querying `analytics.v_bom_requirement_x`.
- [ ] Use the existing `createSupabaseServerClient` import and `.schema('analytics')` for every query.
- [ ] Return `{ rows: [], error }` on query failures and normalize successful rows.
- [ ] Run the live shipment trend assertion if Supabase environment is configured; otherwise report the environment limitation without weakening the unit fixture coverage.

### Task 4: Consolidate analysis routes

**Files:**
- Create/move: `app/(user)/analysis/layout.tsx`
- Create/move: `app/(user)/analysis/{leadtime,stockout,demand-profile,model-comparison}/page.tsx`
- Delete: `app/analysis/*`
- Delete: `app/(user)/user/analysis/*`
- Modify: `lib/menu.ts`

- [ ] Move the shared analysis layout and four existing screens to the canonical route-group location.
- [ ] Remove the old redirect/layout copies after confirming the destination paths exist.
- [ ] Change only analysis menu hrefs to `/analysis/...`; keep dashboard/workflow routes unchanged.
- [ ] Search for stale `/user/analysis` links and update them where they reference these screens.

### Task 5: Verify

**Files:**
- No production file changes expected.

- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` and confirm no stale analysis route remains.
