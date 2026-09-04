# STEP 8 Python Forecast Service

`python-forecast-service`는 Next.js와 분리된 FastAPI 배치 서비스다. Next.js는 `/api/admin/python-forecast`에서 ADMIN 실행만 전달하고, 저장 결과 조회는 기존 `analytics.v_forecast_run`/`analytics.v_forecast_result`를 그대로 사용한다.

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 서비스 환경변수로 설정하고 `uvicorn app.main:app --host 0.0.0.0 --port 8000`으로 실행한다. `/forecast/run`은 `train_rows`를 직접 받거나 `core.v_train_demand_month_grid`에서 학습 데이터를 읽는다. `v_test_actual`은 학습 경로에 사용하지 않는다.

결과는 실행별 `model_version` snapshot과 `core.forecast_result`에 저장되므로 STEP 7의 기존 `core.run_backtest`가 Python 모델을 자동 비교·Champion 후보로 처리한다. Croston/SBA/TSB는 `INTERMITTENT`와 `LUMPY`에만 적용된다. 실행 row를 먼저 `RUNNING`으로 만든 뒤 실패하면 `FAILED`와 오류 메시지를 남기며, Next.js 결과 조회는 서비스 상태와 독립적이다.
