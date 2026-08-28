# STEP 8 Python Forecast Service 설계

FastAPI 기반 별도 배치 서비스가 `v_train_demand`에서 받은 학습 데이터만 사용해 Python Forecast 결과를 생성한다. 서비스는 공통 `forecast(train_df, horizon, params) -> DataFrame` 계약을 사용하며, Supabase 저장은 adapter를 통해 기존 `forecast_run`, `model_version`, `forecast_result` 구조에 기록한다.

표준 라이브러리로 실행 가능한 Exponential Smoothing, Holt, Croston, SBA, TSB를 우선 제공하고 SARIMA, Prophet, XGBoost/LightGBM은 선택적 의존성 adapter로 둔다. 서비스 실패는 FAILED 실행으로 기록하며 기존 저장 결과 조회는 서비스 상태와 독립적이다.
