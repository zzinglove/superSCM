# STEP 6 Forecast Engine Baseline 설계

## 목표

STEP 3의 학습 구간과 STEP 5의 수요 유형을 입력으로 사용해 SQL Baseline Forecast를 실행하고, 모델 정의·버전·실행·결과를 재현 가능하게 저장한다. STEP 7 Backtest가 동일한 저장 결과를 참조할 수 있도록 매 실행 결과를 immutable run 단위로 보존한다.

## 범위와 제약

- Forecast 계산은 `core.v_train_demand_month_grid`만 사용한다.
- `raw.usage_history`, `core.v_test_actual`, test Actual은 계산 경로에 포함하지 않는다.
- 학습/검증 날짜와 horizon은 `core.forecast_setting`에서 읽는다.
- 계산 불가 값은 0이나 임의 값으로 보정하지 않고 null 또는 결과 행 미생성으로 남긴다.
- 화면은 analytics view만 조회하며 계산은 React에서 수행하지 않는다.
- 모델 설정 변경과 Forecast 실행은 ADMIN Server Action/API에서만 허용한다.

## 데이터 모델

### `core.model_config`

모델의 현재 설정을 저장한다. `model_id`가 PK이고 `parameters`는 JSONB다. `applicable_demand_type`은 `SMOOTH`, `INTERMITTENT`, `ERRATIC`, `LUMPY` 코드 배열이며, enabled/is_default와 함께 DB에서 관리한다. 기본 등록 모델은 `MA_3M`, `MA_6M`, `WMA_3M`, `PY_SAME_MONTH`, `SEASONAL_NAIVE`다.

### `core.model_version`

Forecast 실행 시 선택된 모델의 정의를 복사하는 snapshot 테이블이다. `version_id`, `model_id`, `version`, `parameters`, `definition`, `created_at`, `created_by`를 저장한다. 이후 `model_config`가 변경되어도 결과의 `model_version`과 snapshot을 통해 당시 정의를 재조회할 수 있다.

### `core.forecast_run`

실행 단위의 상태와 입력 경계를 저장한다. `run_id`, `status`, `granularity`, train 기간, `horizon`, `data_snapshot_at`, 모델/품목/결과 행 수, 시작·종료·소요시간, 실행자, 메시지를 저장한다. 상태는 `RUNNING`, `SUCCESS`, `FAILED`다.

### `core.forecast_result`

`run_id + model_id + item_id + period` 복합 PK로 결과를 저장한다. `model_version`, `predicted_qty`, `p50`, `p80`, `p90`, `sigma`, `basis`, `reason_code`를 포함한다. 기존 run을 update하지 않고 새 run에만 insert한다.

## Baseline 계산

모든 계산은 월별 grid의 학습 구간 값으로만 수행한다.

- `MA_3M`: 직전 3개 학습 월 평균. 3개가 모두 존재하지 않으면 결과를 만들지 않는다.
- `MA_6M`: 직전 6개 학습 월 평균. 6개가 모두 존재하지 않으면 결과를 만들지 않는다.
- `WMA_3M`: 직전 3개 월에 최근순 3:2:1 가중치 적용. 3개가 모두 존재하지 않으면 결과를 만들지 않는다.
- `PY_SAME_MONTH`: forecast period에서 12개월 전 학습 period의 실제값을 사용한다. 없으면 결과를 만들지 않는다.
- `SEASONAL_NAIVE`: 설정된 seasonality 주기(월 12)의 이전 값을 사용한다. 해당 학습 period가 없으면 결과를 만들지 않는다.

월 grid에서 기간상 수요가 없었던 값은 0이지만 원천 null은 null 상태로 보존한다. 모델 계산에 필요한 기간의 값이 null이면 그 예측 구간은 생성하지 않고 `SOURCE_NULL` 사유를 남긴다.

## Forecast interval

학습 구간에서 각 모델의 과거 fitted value를 동일한 모델 규칙으로 계산한다. `residual = actual - fitted`로 두고 SKU·모델별 표본이 2개 이상일 때 `stddev_samp(residual)`을 sigma로 저장한다. `p50 = predicted_qty`, `p80 = p50 + 0.8416 * sigma`, `p90 = p50 + 1.2816 * sigma`를 사용한다. sigma를 계산할 수 없으면 p80/p90은 null이다.

## 실행 흐름

`core.run_baseline_forecast()`는 다음을 하나의 DB 트랜잭션으로 처리한다.

1. default `forecast_setting`을 검증하고 train_end 다음 월부터 horizon만큼 forecast period를 생성한다.
2. enabled SQL 모델과 applicable demand type을 조회한다.
3. 현재 timestamp를 `data_snapshot_at`으로 정하고 `forecast_run`을 RUNNING으로 생성한다.
4. 선택 모델별 `model_version` snapshot을 생성한다.
5. 학습 grid에서 모델별 fitted residual과 미래 forecast를 계산해 결과를 insert한다.
6. n_items, n_rows, duration을 집계하고 SUCCESS로 종료한다.
7. 예외가 발생하면 FAILED 상태와 오류 메시지를 저장한다.

모델이 비활성화되었거나 수요 유형이 허용되지 않으면 결과를 만들지 않는다. 실행 전체가 실패하는 경우에도 run 기록은 FAILED로 남긴다.

## Stale 판정

`analytics.v_forecast_run`은 run의 `data_snapshot_at` 이후 적재된 수요 데이터가 존재하는지 확인해 `is_stale`을 계산한다. stale은 과거 결과를 삭제하거나 수정하지 않고, 최신 데이터 기준 재실행이 필요하다는 표시만 제공한다.

## 권한과 화면

- `core` 테이블은 anon 접근을 차단한다.
- authenticated 사용자는 analytics Forecast 결과와 실행 이력을 조회한다.
- ADMIN만 `model_config` 변경과 `run_baseline_forecast()` 실행을 할 수 있다.
- `/admin/forecast-models`는 `analytics.v_model_config`를, `/admin/forecast-runs`는 `analytics.v_forecast_run`과 KPI/result view를 조회한다.
- 모델 체크박스나 비교 화면은 재실행하지 않고 저장된 `run_id` 결과만 조회한다.

## 검증

SQL 검증 쿼리로 WMA 3:2:1, 데이터 부족, model version snapshot, FAILED/SUCCESS, stale, test 기간 독립성을 확인한다. TypeScript 테스트는 모델 코드·숫자 null 보존·실행 결과 정규화가 화면 계산을 포함하지 않는지 검증한다.
