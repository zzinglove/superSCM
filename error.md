# 오류 해결 기록

## 1. Supabase 조회 실패

### 증상

분석 화면에서 다음 오류가 표시되었습니다.

```text
.env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 넣어주세요.
```

### 원인

환경변수 파일이 `app/.env.local`에 있었지만, Next.js가 프로젝트 루트의 `.env.local`을 읽도록 구성되어 있었습니다.

### 해결

`app/.env.local`을 프로젝트 루트의 `.env.local`로 복사했습니다.

```bash
cp app/.env.local .env.local
```

환경변수 변경 후에는 개발 서버를 재시작해야 합니다.

## 2. `next: command not found`

### 증상

```text
sh: next: command not found
```

### 원인

프로젝트 의존성이 설치되지 않아 `node_modules/.bin/next`가 존재하지 않았습니다.

### 해결

프로젝트 루트에서 의존성을 설치했습니다.

```bash
npm install
npm run dev
```

개발 서버가 `http://localhost:3000`에서 정상적으로 시작되는 것을 확인했습니다.


## 3. STEP 6 Forecast 검증 SQL 실행 오류

### 현재 확인된 가능성

`sql/03-forecast-engine-verification.sql`은 STEP 6 migration이 먼저 적용된 상태에서 실행해야 합니다. migration 미적용 또는 일부 적용이면 `relation ... does not exist` 오류가 날 수 있습니다. 정확한 원인은 Supabase 오류 첫 줄과 LINE 번호로 확정합니다.

### 확인 순서

1. `supabase/migrations/20260828000500_create_baseline_forecast_engine.sql` 전체를 먼저 실행합니다.
2. `select to_regclass('analytics.v_model_config'), to_regclass('core.model_config');`를 실행합니다.
3. 두 결과가 모두 존재한 뒤 검증 SQL을 실행합니다.

## 4. ADMIN 계정인데 관리자 메뉴가 보이지 않음

### 원인

`app/(user)/layout.tsx`에서 Sidebar 권한을 `USER`로 고정해 관리자 계정도 사용자 메뉴만 렌더링했습니다.

### 해결

로그인한 `core.app_user.role`을 조회해 `ADMIN`이면 관리자 메뉴를 렌더링하도록 수정했습니다. 단, DB의 role이 실제로 `ADMIN`이고 `active`가 `true`여야 합니다.

## 5. Baseline 실행 후 실행 내역 0건 표시

### 원인

Baseline Server Action이 실패해도 실행 이력 화면이 URL의 `error` 메시지를 표시하지 않아 단순히 0건처럼 보였습니다. 실행 오류 표시를 추가했습니다.

## 6. 실행 후 흰 화면에 글씨만 표시

### 원인

개발 서버가 두 개 실행되어 `.next-dev` CSS 번들이 비어 있었고, 브라우저가 `layout.css`를 404로 받아 스타일 없이 HTML만 표시했습니다.

### 해결

기존 Next 개발 서버를 종료하고 하나만 다시 실행했습니다. 재시작 후 CSS 응답이 HTTP 200, 20KB 이상으로 확인되었습니다.

## 7. Baseline 실행 시 monthly forecast setting is incomplete

### 원인

`core.forecast_setting`의 `train_start`, `train_end`가 비어 있거나 `granularity`가 `month`가 아니어서 월간 Baseline 실행 조건을 만족하지 못했습니다.

### 해결

Forecast 설정을 조회한 뒤 학습 기간과 `forecast_horizon`을 설정하고 `granularity`를 `month`로 변경합니다.

## 8. Baseline 실행 시 statement timeout

### 원인

기존 RPC가 SKU·학습기간·모델마다 원본 기반 학습 Grid를 반복 조회해 Supabase statement timeout에 도달했습니다.

### 해결

실행 중 `tmp_grid`를 한 번 생성하고 `item_id, period` 인덱스를 사용하도록 최적화한 `20260828000600_optimize_baseline_forecast.sql`을 추가했습니다. 적용 후 다시 실행해야 합니다.
