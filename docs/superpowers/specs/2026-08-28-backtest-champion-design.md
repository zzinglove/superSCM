# STEP 7 Backtest + Champion + Model Comparison 설계

## 목표

STEP 6에서 저장한 `core.forecast_result`와 STEP 3의 `core.v_test_actual`을 비교해 모델 성능을 DB에서 계산하고, SKU별 Champion과 선정 근거를 재현 가능하게 저장한다.

## 데이터 흐름

`forecast_result + v_test_actual → backtest_run → model_performance → champion_model`

Forecast 재실행이나 `raw.usage_history` 직접 scoring은 하지 않는다. 화면은 analytics view와 저장 결과만 조회한다.

## 지표 정책

- WAPE: `sum(abs(actual-forecast)) / sum(abs(actual)) * 100`; 실제 합계가 0이면 `NULL`, `ACTUAL_SUM_ZERO`.
- MAPE: Actual이 0인 기간은 분모에서 제외한다. 유효 기간이 없으면 `NULL`, `MAPE_NO_VALID_PERIODS`.
- Bias: `sum(forecast - actual) / sum(abs(actual)) * 100`; 양수는 과대예측, 음수는 과소예측이다.
- MAE: 유효 비교 행의 절대오차 평균.
- RMSE: 유효 비교 행의 제곱오차 평균의 제곱근.
- Forecast 또는 Actual 누락은 해당 비교행에서 제외하되, 유효행이 없으면 `NO_COMPARABLE_PERIODS`를 기록한다.

## Champion 정책

`core.forecast_setting.champion_metric`을 우선 사용하고 기본값은 WAPE로 둔다. 낮은 값이 우선이며 동률은 absolute Bias, RMSE, model_id 순으로 결정한다. 유효 성능이 있는 후보만 AUTO Champion이 된다. 전체 후보 성능은 `candidate_performance` JSONB에 저장한다. MANUAL 변경은 ADMIN만 가능하고 reason을 필수로 하며 audit log에 기록한다.

## 권한

ADMIN만 Backtest 실행과 MANUAL Champion 변경을 수행한다. 인증 사용자는 허용된 analytics 비교 결과를 조회한다. RPC와 RLS에서도 같은 권한을 강제한다.

## 화면

`/analysis/model-comparison`에 Forecast Run/SKU/모델 필터, 성능표, Actual·Forecast overlay chart를 제공한다. 모델 토글은 이미 저장된 결과의 표시만 바꾸며 RPC를 호출하지 않는다.
