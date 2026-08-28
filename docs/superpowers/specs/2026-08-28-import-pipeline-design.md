# STEP 4 Import Pipeline Design

## Goal

CSV/Excel 파일을 서버에서 파싱·검증하고, 사용자가 승인한 행만 RAW에 적재하며 batch 이력과 rollback을 제공한다.

## Architecture

- 브라우저는 파일 선택, preview, mapping 확인, 승인만 담당한다.
- Route Handler가 인증, parse, validation, staging, commit을 수행한다.
- staging은 원본 JSONB를 보존하고 validation_error는 행·필드 단위로 기록한다.
- DB RPC 또는 단일 트랜잭션으로 승인된 행만 RAW에 저장한다.

## Supported types

현재 raw 스키마에 존재하는 usage_history, inventory, item_master, supplier_master, purchase_order, goods_receipt, sales_order, business_event만 지원한다.

## Flow

파일 선택 → type/mode 선택 → 서버 parse → staging → preview → column mapping → validation → result/error CSV → ADMIN 승인 → RAW 저장 → history. Validation 성공 전 commit은 거부한다.

## Security and integrity

- 모든 import/rollback endpoint는 requireAdmin()으로 보호한다.
- service role key는 서버에서만 사용하며 브라우저에 전달하지 않는다.
- source_type은 FILE_UPLOAD, batch_id/loaded_at/source_record_id는 서버가 생성·기록한다.
- append/upsert/replace는 명시적으로 분리하고 replace는 별도 확인을 요구한다.
- rollback은 batch_id 조건으로만 삭제하며 replace는 완전 rollback 불가 상태를 표시한다.

## Data model

- core.upload_batch: 파일·타입·모드·행 수·상태·사용자·시간
- core.import_staging: batch_id, row_number, original_row, mapped_row, status
- core.validation_error: batch_id, row_number, field_name, error_code, error_message, severity, original_value
- core.column_mapping: import_type, source_column, target_column, confidence, saved_by

## Forecast freshness

수요 관련 batch import 후 raw.forecast 결과를 삭제하지 않고 data_snapshot_at보다 최신인 import batch가 있으면 stale 상태를 조회할 수 있는 view/컬럼으로 연결한다.

## Verification

- validation 순수 모듈 테스트: 필수값, 날짜, 숫자, 중복, master 존재, 논리 오류, null 보존
- npm test, npm run build
- Supabase 적용 후 batch별 count, error, rollback, RLS를 SQL Editor에서 확인
