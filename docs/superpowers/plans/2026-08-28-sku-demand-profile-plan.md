# STEP 5 SKU Demand Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습기간 데이터만으로 SKU별 ADI/CV²/수요유형/추세/계절성을 SQL에서 계산하고 보호된 Demand Profile 화면에서 조회한다.

**Architecture:** `core.v_train_demand`를 유일한 원천으로 월별 SKU Grid를 만들고, analytics View에서 모든 통계를 계산한다. Next.js는 View를 조회해 KPI와 필터 UI를 제공하며 통계를 재계산하지 않는다.

**Tech Stack:** PostgreSQL views, Next.js App Router, Supabase SSR, existing Badge/EmptyValue/DataTable components.

**Spec:** docs/superpowers/specs/2026-08-28-sku-demand-profile-design.md

## Global Constraints

- `raw.usage_history`, `core.v_test_actual`은 Demand Profile 계산에서 사용하지 않는다.
- 학습/검증 기간은 `core.forecast_setting`에서만 읽는다.
- ADI/CV/CV²/Trend/Seasonality는 SQL에서 계산한다.
- 수요가 없는 기간의 0과 원본 null은 구분한다.
- 계산 불가 값은 null과 reason_code로 반환한다.
- 화면 필터는 저장된 View 결과를 대상으로 동작한다.
- Demand Type DB 값은 SMOOTH, INTERMITTENT, ERRATIC, LUMPY만 사용한다.

---

### Task 1: SQL profile views and grants

**Files:**
- Create: supabase/migrations/20260828000400_create_sku_demand_profile.sql

- [ ] Create a monthly train-only item-period grid.
- [ ] Calculate ADI, CV, CV², zero-demand rate, trend, recent change, peak period, seasonality, demand type and stability.
- [ ] Return null/reason_code for no demand, insufficient samples and insufficient periods.
- [ ] Create KPI view with Croston and calculation-unavailable counts.
- [ ] Add authenticated read grants and anon denial.

### Task 2: Read model and tests

**Files:**
- Create: lib/demand-profile-model.ts
- Create: lib/demand-profile-model.test.ts
- Create: lib/demand-profile.ts

- [ ] Add row normalization preserving nulls and reason codes.
- [ ] Add server query functions for profile and KPI views.
- [ ] Test normalization for all demand types, unavailable values and test-only fields not being consumed.
- [ ] Keep calculations out of TypeScript.

### Task 3: Demand Profile routes and UI

**Files:**
- Create: app/(user)/user/analysis/demand-profile/page.tsx
- Create: app/(user)/user/analysis/demand-profile/demand-profile-table.tsx
- Create: app/analysis/demand-profile/page.tsx
- Modify: lib/menu.ts

- [ ] Protect the actual page through the user layout.
- [ ] Render KPI cards and profile table with Badge/EmptyValue.
- [ ] Add Demand Type, calculability and SKU filters over fetched rows.
- [ ] Add legacy redirect route.

### Task 4: Documentation and verification

**Files:**
- Modify: design.md
- Modify: README.md only if operational instructions need updating.

- [ ] Document train-only source and classification rules.
- [ ] Scan app/lib for forbidden raw/test reads.
- [ ] Run npm test, npm run build and git diff --check.
- [ ] Provide Supabase verification SQL and remaining operational settings.

