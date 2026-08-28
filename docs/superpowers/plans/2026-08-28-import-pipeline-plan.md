# STEP 4 Import Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSV/Excel 데이터를 서버에서 검증하고 staging 후 ADMIN 승인된 행만 RAW에 저장하며 이력·오류 다운로드·batch rollback을 제공한다.

**Architecture:** 순수 import 모듈이 타입·스키마·파싱·검증을 담당하고 Route Handler가 ADMIN 인증과 Supabase persistence를 담당한다. 원본/매핑 데이터는 core.import_staging에 보관하고 commit은 batch 상태와 validation 결과를 재확인한 뒤 서버에서 실행한다.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase SSR, PapaParse, xlsx, PostgreSQL RLS/RPC.

**Spec:** docs/superpowers/specs/2026-08-28-import-pipeline-design.md

## Global Constraints

- 파일은 validation 완료 전 raw 테이블에 저장하지 않는다.
- 모든 import는 batch_id와 FILE_UPLOAD source_type을 가진다.
- null/오류값을 0 또는 추정값으로 보정하지 않는다.
- import/rollback은 ADMIN 서버 인증과 DB RLS를 모두 통과해야 한다.
- replace는 별도 확인 없이는 실행하지 않는다.
- 기존 raw 계산 SQL과 forecast 결과를 삭제하지 않는다.
- validation 로직은 UI가 아닌 재사용 가능한 lib/import 모듈에 둔다.

---

### Task 1: Import dependency and schema migration

**Files:**
- Modify: package.json, package-lock.json
- Create: supabase/migrations/20260828000300_create_import_pipeline.sql

**Interfaces:**
- Produces `core.upload_batch`, `core.import_staging`, `core.validation_error`, `core.column_mapping`, raw batch indexes, rollback/import functions or equivalent SQL contracts.

- [ ] Add `papaparse` and `xlsx` dependencies.
- [ ] Create batch, staging, validation error, mapping tables with foreign keys and RLS.
- [ ] Add source batch indexes to supported raw tables.
- [ ] Add ADMIN-only commit/rollback security boundary and stale marker view.
- [ ] Verify migration references only existing raw tables and preserves data.

### Task 2: Pure import schemas, parser, and validator

**Files:**
- Create: lib/import/types.ts
- Create: lib/import/schema.ts
- Create: lib/import/parse.ts
- Create: lib/import/validate.ts
- Create: lib/import/import.test.ts

**Interfaces:**
- `parseImportFile(file, importType)` returns headers, rows, file metadata.
- `inferColumnMapping(headers, importType)` returns source-to-target mapping with confidence.
- `validateRows(importType, rows, options)` returns row statuses and field errors without mutating input.
- `toErrorCsv(rows)` returns CSV text for ERROR/WARNING rows.

- [ ] Write failing tests for required/null/date/number/duplicate/master/logical validation and null preservation.
- [ ] Implement supported type schemas and Korean/English aliases.
- [ ] Implement CSV/XLSX server parsing.
- [ ] Implement validation and error CSV serialization.
- [ ] Run focused tests and then all tests.

### Task 3: Server repository and import APIs

**Files:**
- Create: lib/import/repository.ts
- Create: lib/import/history.ts
- Create: app/api/admin/import/parse/route.ts
- Create: app/api/admin/import/validate/route.ts
- Create: app/api/admin/import/commit/route.ts
- Create: app/api/admin/import/history/route.ts
- Create: app/api/admin/import/errors/route.ts
- Create: app/api/admin/import/rollback/route.ts

**Interfaces:**
- Parse creates batch + staging only.
- Validate updates batch/error records and never writes raw.
- Commit rejects non-validated batches and unconfirmed replace mode.
- Rollback deletes only rows matching batch_id and marks the batch.
- History/errors return admin-scoped records.

- [ ] Add `requireAdmin()` at the beginning of every handler.
- [ ] Persist raw rows with server-generated batch metadata only after approval.
- [ ] Make append/upsert/replace behavior explicit.
- [ ] Mark demand-related forecast results stale without deleting them.
- [ ] Verify unauthorized and invalid-state requests are rejected.

### Task 4: ADMIN Data Management UI

**Files:**
- Create: app/(admin)/admin/data-management/page.tsx
- Create: app/(admin)/admin/data-management/import-wizard.tsx
- Create: app/(admin)/admin/data-management/actions.ts
- Modify: lib/menu.ts

**Interfaces:**
- Wizard calls parse/validate/commit APIs and exposes preview, mapping, result, error CSV, and approval.
- History table shows file/type/mode/counts/user/time/status and rollback action.
- Replace requires an explicit confirmation control.

- [ ] Build upload/type/mode selection.
- [ ] Build preview and editable mapping.
- [ ] Disable import until validation succeeds and enforce server rejection.
- [ ] Build history/error download/rollback controls.
- [ ] Use existing shell and shared UI components.

### Task 5: Tests, docs, and verification

**Files:**
- Modify: design.md, README.md if needed
- Create: lib/import/import.integration.test.ts if needed

- [ ] Verify supported type coverage against raw schema.
- [ ] Verify no app/lib direct raw read bypasses import repository.
- [ ] Run npm test.
- [ ] Run npm run build.
- [ ] Run git diff --check.
- [ ] Document Supabase migration application, RLS checks, and operational constraints.

