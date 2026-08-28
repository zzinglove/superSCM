# STEP 8 Python Forecast Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Python 고급 모델을 기존 Forecast Result와 STEP 7 비교 구조에 편입한다.

**Architecture:** FastAPI 서비스가 요청을 검증하고 모델 registry를 통해 학습 전용 데이터를 받아 결과를 생성한다. Supabase 저장 adapter는 run/version/result를 기존 스키마에 기록하며 Next.js는 계산하지 않는다.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic, pandas, httpx, pytest; 선택적 statsmodels/prophet/xgboost/lightgbm.

**Spec:** `docs/superpowers/specs/2026-08-28-python-forecast-service-design.md`

## Global Constraints

- `forecast(train_df, horizon, params) -> DataFrame` 인터페이스를 지킨다.
- test actual을 학습에 사용하지 않는다.
- 결과에는 run_id와 model_version을 포함한다.
- Python 서비스 장애가 기존 저장 결과 조회를 막지 않는다.

---

### Task 1: Python 모델 계약과 테스트

**Files:** `python-forecast-service/app/models/base.py`, `python-forecast-service/app/models/simple.py`, `python-forecast-service/tests/test_models.py`

- [ ] 모델 registry, result schema, Exponential Smoothing/Holt/Croston/SBA/TSB를 추가한다.
- [ ] 빈 학습 데이터는 임의 예측 대신 계산 불가 reason을 반환한다.
- [ ] pytest로 모델 출력 컬럼, intermittent 적용, 재현성을 검증한다.

### Task 2: FastAPI와 Supabase adapter

**Files:** `python-forecast-service/app/main.py`, `python-forecast-service/app/service.py`, `python-forecast-service/app/repository.py`, `python-forecast-service/requirements.txt`, `.env.example`

- [ ] `/health`, `/models`, `/forecast/run`, `/backtest/run`을 구현한다.
- [ ] repository는 service key를 서버 환경변수에서만 읽고 DB 저장 실패를 명확한 오류로 반환한다.
- [ ] forecast endpoint는 학습 rows와 설정을 검증해 model result를 저장한다.

### Task 3: Next.js trigger and documentation

**Files:** `app/api/admin/python-forecast/route.ts`, `lib/menu.ts`, `docs/step8-python-service.md`

- [ ] ADMIN 전용 trigger를 추가하고 서비스 장애 시 기존 analytics 조회를 유지한다.
- [ ] Demand Type별 모델 후보와 실행/배포 방법을 문서화한다.

### Task 4: Verification

- [ ] pytest, npm test, npm run build를 실행한다.
- [ ] SQL/TypeScript/Python에 test actual 학습 참조가 없는지 정적 검사한다.
