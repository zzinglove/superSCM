# superSCM 아키텍처 문서

> 기준일: 2026-08-27  
> 대상: `procurement-planning-mvp` / 기기·옵션 월간 발주계획 MVP

## 1. 문서 목적

이 문서는 프로젝트를 처음 접하는 개발자가 전체 구조를 빠르게 이해할 수 있도록 다음 내용을 설명합니다.

- 각 폴더가 담당하는 기능
- 각 폴더에 있는 파일의 역할
- 사용자의 업무 흐름이 화면과 데이터 계층을 거치는 방식
- 현재 구현된 범위와 아직 연결되지 않은 예정 기능

설명은 현재 저장소의 코드, `AGENTS.md`, `SCHEMA.md`, Supabase 마이그레이션을 기준으로 작성했습니다. 화면에 표시되는 대표값과 향후 구현 예정이라고 표시된 기능은 실제 운영 데이터 처리와 구분했습니다.

## 2. 한눈에 보는 구조 요약

### 2.1 최상위 구조 요약

| 위치 | 핵심 기능 | 현재 상태 |
|---|---|---|
| `app/` | Next.js App Router 페이지, 공통 레이아웃, API 라우트, 전역 CSS | 구현됨 |
| `components/` | 업무 단계 화면과 분석 화면의 재사용 UI | 구현됨. 업무 단계는 주로 샘플 화면 |
| `lib/` | Supabase 클라이언트, 환경변수, SCM 조회 함수, 화면 모델·정규화 | 분석 화면용 조회 구현 |
| `supabase/` | Supabase 로컬 설정과 데이터베이스 마이그레이션 | 수요확정 핵심 테이블 마이그레이션 포함 |
| `sql/` | 권한·정책 설정 SQL | 배포 시 실행할 SQL 스크립트 |
| `docs/` | 실습 안내, 설계 문서, 작업 계획 | 프로젝트 지식 보관소 |
| `outputs/` | 실습 산출물, 미리보기 이미지, Excel 결과물 | 참고·검토용 산출물 |
| 루트 설정 파일 | 실행, 빌드, 타입스크립트, 배포, 환경변수 설정 | 구현됨 |

### 2.2 전체 실행 구조

```text
브라우저
  ├─ /                         → app/page.tsx
  │                              → ProcurementApp
  │                              → DashboardStep / DemandStep / SupplyStep
  │                                / MasterStep / CalculationStep / ReportStep
  │
  ├─ /analysis/leadtime        → app/analysis/layout.tsx
  │                              → AnalysisTabs + AnalysisFrame
  │                              → app/analysis/leadtime/page.tsx
  │                              → lib/scm.ts
  │                              → lib/supabase/server.ts
  │                              → Supabase analytics.v_leadtime_gap
  │
  └─ /api/health/supabase      → app/api/health/supabase/route.ts
                                 → lib/supabase/env.ts
                                 → 환경변수 설정 여부 반환
```

### 2.3 계층별 책임

1. **라우팅 계층(`app/`)**: URL과 페이지 조합을 결정하고 서버 조회 결과를 화면에 전달합니다.
2. **표현 계층(`components/`)**: 업무 화면, 카드, 표, 탭, 버튼, 단계 이동을 렌더링합니다.
3. **데이터 계층(`lib/`)**: Supabase 접속과 조회를 담당하며, 화면이 직접 Supabase를 호출하지 않도록 경계를 둡니다.
4. **데이터베이스 계층(`supabase/`, `sql/`, 외부 Supabase 스키마)**: 원본·기준·분석 데이터와 데이터베이스 규칙을 관리합니다.
5. **문서·산출물 계층(`docs/`, `outputs/`)**: 기능 이해와 실습 결과 검토를 지원합니다.

## 3. 폴더별 요약

### `app/`

Next.js App Router의 진입점입니다. 루트 업무 플로우, 분석 화면, API 상태 확인 라우트, 전역 스타일을 포함합니다.

### `app/analysis/`

분석 기능 전용 라우트 영역입니다. 분석 화면 공통 레이아웃을 한 번 제공하고, 각각의 분석 기능은 하위 폴더의 `page.tsx`로 추가합니다.

### `app/api/`

브라우저나 운영 도구가 호출할 서버 API 라우트 영역입니다. 현재는 Supabase 환경변수 설정 상태를 확인하는 헬스 체크만 있습니다.

### `components/`

페이지에 직접 넣기에는 큰 UI를 업무 단계와 분석 UI 단위로 나눠 보관합니다.

### `components/workflow/`

월간 발주계획의 업무 단계를 표시합니다. 현재 데이터 저장이나 실제 계산보다 전체 프로세스와 입력·검토 순서를 확인하는 프로토타입 성격이 강합니다.

### `components/analysis/`

Supabase 분석 뷰를 읽어 표와 KPI 카드로 보여주는 공통 UI입니다. 새 분석 화면이 추가되어도 프레임과 표 컴포넌트를 재사용하도록 설계되어 있습니다.

### `lib/`

업무 도메인 모델, Supabase 조회 함수, Supabase 클라이언트와 환경변수 처리를 담당합니다.

### `lib/supabase/`

브라우저용·서버용 Supabase 클라이언트와 환경변수 검증을 분리합니다.

### `supabase/`

Supabase CLI 설정과 데이터베이스 마이그레이션을 보관합니다.

### `sql/`

권한과 RLS 정책 등 데이터베이스 운영 SQL을 보관합니다. 마이그레이션과 별도로 실행해야 하는 정책성 SQL이 있는 구조입니다.

### `docs/`

사용 안내와 프로젝트 설계·계획을 보관합니다. `docs/superpowers/`는 작업 과정에서 작성한 요구사항, 설계, 계획 문서를 별도 관리합니다.

### `outputs/`

프로토타입 검토용 이미지와 Excel 결과물을 보관합니다. 애플리케이션 실행 코드의 의존 파일이라기보다 실습 및 검증 산출물입니다.

## 4. 폴더와 파일 상세 설명

## 4.1 `app/`

### `app/layout.tsx`

애플리케이션 전체의 루트 레이아웃입니다.

- `globals.css`를 전역으로 불러옵니다.
- HTML 언어를 `ko`로 설정합니다.
- 브라우저 탭 제목과 설명을 `Metadata`로 지정합니다.
- 모든 페이지의 `children`을 `<body>` 안에 렌더링합니다.

### `app/page.tsx`

루트 경로(`/`)의 진입점입니다. 별도 화면 로직을 넣지 않고 `ProcurementApp`을 렌더링해 업무 플로우 UI를 시작합니다.

### `app/globals.css`

전체 화면에서 공유하는 순수 CSS 스타일입니다.

- 색상 변수, 폰트, 기본 리셋을 정의합니다.
- 사이드바·상단바·콘텐츠 영역을 구성합니다.
- 카드, KPI, 배지, 표, 입력, 버튼, 업무 단계 진행 표시를 스타일링합니다.
- 분석 화면 클래스(`analysis-page`, `analysis-table` 등)도 이 파일에서 관리합니다.
- Tailwind, CSS Modules, styled-components를 사용하지 않는 프로젝트 규칙의 중심 파일입니다.

### `app/analysis/layout.tsx`

`/analysis/*` 하위 라우트에 공통으로 적용되는 레이아웃입니다.

- 루트 업무 화면으로 돌아가는 링크를 제공합니다.
- `AnalysisTabs`를 표시합니다.
- 실제 분석 페이지 내용은 `children`으로 주입받습니다.

새 분석 페이지를 추가할 때 이 파일을 반복 수정하지 않고, 라우트 폴더와 분석 탭 목록을 함께 갱신하는 방식이 기본입니다.

### `app/analysis/leadtime/page.tsx`

공급처별 리드타임 격차 분석 화면이며 새 분석 화면의 기준 예시입니다.

처리 순서는 다음과 같습니다.

1. `getLeadtimeGap()`으로 서버에서 분석 데이터를 조회합니다.
2. 조회 오류가 있으면 오류 메시지를 표시합니다.
3. 데이터가 있으면 공급처 수, 실제 리드타임이 더 긴 공급처 수, 표본 부족 공급처 수를 계산합니다.
4. `DataTable`로 공급처별 마스터 리드타임, 실적평균, P80, 격차를 표시합니다.
5. 격차가 양수이면 위험 색상, 음수이면 양호 색상으로 표시합니다.

`dynamic = 'force-dynamic'`을 사용하므로 페이지 캐시보다 최신 Supabase 조회 결과를 우선합니다.

### `app/api/health/supabase/route.ts`

`GET /api/health/supabase` API를 제공합니다.

- `getSupabaseEnv()`로 필수 환경변수 존재 여부만 확인합니다.
- 설정이 없으면 HTTP 503과 `configured: false`를 반환합니다.
- 설정이 있으면 `configured: true`를 반환합니다.
- 실제 데이터베이스 연결 쿼리를 실행하는 헬스 체크는 아니며, 환경변수 설정 점검에 가깝습니다.

## 4.2 `components/`

### `components/procurement-app.tsx`

월간 발주계획 프로토타입의 전체 셸과 단계 전환 상태를 관리하는 클라이언트 컴포넌트입니다.

- `StepId`로 여섯 업무 단계의 식별자를 정의합니다.
- `steps` 배열에 단계명, 짧은 이름, 영문 kicker, 아이콘을 정의합니다.
- `active` 상태로 현재 단계를 관리합니다.
- 사이드바와 상단 진행 표시에서 같은 `steps` 배열을 재사용합니다.
- 현재 단계에 따라 각 workflow 컴포넌트를 선택해 렌더링합니다.
- 분석 화면으로 이동하는 `Link`를 제공합니다.
- 단계 화면 간 이동은 `onNext`, `onBack` 콜백으로 전달합니다.

현재 단계 상태는 브라우저 메모리에만 존재합니다. URL, 서버 세션, 데이터베이스에는 저장되지 않습니다.

## 4.3 `components/workflow/`

### `step-frame.tsx`

업무 단계 화면의 공통 하단 내비게이션 프레임입니다.

- 자식 화면 내용을 렌더링합니다.
- `이전 단계` 버튼과 다음 단계 버튼을 제공합니다.
- 버튼 클릭 동작은 상위 `ProcurementApp`에서 받은 콜백을 호출합니다.
- 기본 다음 단계 문구는 `다음 단계`이며 각 화면이 `nextLabel`로 바꿀 수 있습니다.

### `dashboard-step.tsx`

전체 현황 화면입니다.

- 당월 발주금액, 수요 확정 상태, 발주량 예외, 보고자료 상태를 KPI 카드로 표시합니다.
- 프로세스 준비상태 체크리스트를 보여줍니다.
- 카드와 버튼으로 다른 업무 단계로 진입할 수 있습니다.
- 최근 발주계획 목록을 샘플 행으로 표시합니다.
- 카드에 키보드 `Enter`와 `Space` 동작을 지원합니다.

표시값은 현재 대표 샘플값이며 실제 발주계획 조회와 연결되어 있지 않습니다.

### `demand-step.tsx`

수요 입력 및 확정 화면입니다. 여섯 파일 중 가장 상호작용이 많은 클라이언트 컴포넌트입니다.

- 대상월도 선택
- OL 수요 행 편집 및 행 추가
- SFDC Pipeline 수량·수주확률 편집
- Bulk-deal 사전재고 확보 여부와 수요 상태 편집
- 과거 실적 Trend 참고
- 수급회의 일자·참석부서·결정사항 입력
- 필수값 검증, 수요 확정, 안내 문구 표시

`useMemo`로 OL, SFDC, Bulk 수요 합계를 계산하고, 수요 확정 후보를 `OL + SFDC 수주확률 가중치 + Bulk 반영률`로 미리 계산합니다. 현재 상태는 React 상태로만 관리되며 저장 버튼도 실제 저장 API를 호출하지 않습니다.

### `supply-step.tsx`

재고·Open PO 준비 화면입니다.

- 전월말 가용재고
- 가용 Open PO
- 납기 위험 Open PO
- 재고 상태별 반영·제외 기준
- Open PO의 예정월도와 반영 여부
- Supplier, Lead Time, 운송·통관, 검수 입력 항목

현재는 대표 수치와 샘플 PO를 표시하며 실제 재고·입고 데이터 조회는 연결되어 있지 않습니다.

### `master-step.tsx`

발주 계산 전에 필요한 마스터 데이터의 준비 상태를 표시합니다.

- 품목·기종
- BOM·Common품
- 장착율·사용량
- MOQ·발주단위
- Supplier별 Lead Time
- Flexibility Rule

검증 체크리스트와 향후 직접 입력·Excel/CSV 업로드 영역을 제공합니다. 현재 Lead Time 항목은 확인 필요 상태로 표시되며, 업로드 버튼은 비활성화되어 있습니다.

### `calculation-step.tsx`

발주량 계산 결과와 예외 검토 흐름을 보여주는 샘플 화면입니다.

- 기기·옵션·부품 최종 발주량
- 총 발주금액
- Flexibility Rule 및 MOQ 예외
- 확정수요, 가용재고, 순소요량, 최종발주량 표
- 예외 검토 순서
- 계산량과 최종량을 분리 저장한다는 향후 설계 안내

실제 계산식과 저장 기능은 아직 연결되지 않았습니다. `AGENTS.md` 규칙에 따라 계산 로직은 향후 `lib/scm.ts` 또는 순수 모델 함수에 두는 것이 맞습니다.

### `report-step.tsx`

경영진 보고자료 미리보기 화면입니다.

- 당월 발주금액
- 전년 동월 대비
- OL 제출 대비 차이
- 주요 감소 품목
- 전월과 당월 발주금액 비교
- 보고서 레이아웃 미리보기
- Excel/PDF 다운로드 버튼

다운로드 버튼은 현재 비활성화되어 있으며, 계산 결과 확정 후 파일 생성 기능을 연결하도록 안내합니다.

## 4.4 `components/analysis/`

### `analysis-frame.tsx`

분석 페이지의 공통 콘텐츠 껍데기입니다.

- 분석 제목과 설명을 표시합니다.
- `ANALYSIS` kicker와 `SUPABASE LIVE` 배지를 표시합니다.
- 실제 KPI 카드와 표는 `children`으로 받습니다.

### `analysis-tabs.tsx`

분석 화면 간 이동 탭을 관리하는 클라이언트 컴포넌트입니다.

- `usePathname()`으로 현재 경로를 읽어 활성 탭을 표시합니다.
- `ready: true`인 탭은 링크로 렌더링합니다.
- `ready: false`인 탭은 404를 만들지 않고 잠금 상태로 표시합니다.
- 현재는 리드타임 격차만 활성화되어 있고 재고 소진 위험은 오후 실습 예정으로 표시됩니다.

새 분석 화면을 추가할 때는 해당 라우트를 만든 뒤 `tabs` 배열에 항목을 추가합니다.

### `data-table.tsx`

분석 결과를 타입에 관계없이 표시하는 제네릭 표 컴포넌트입니다.

- `Column<T>`으로 컬럼 키, 표시명, 정렬, 사용자 지정 렌더러를 정의합니다.
- `formatNumber()`는 정수·소수와 접미사를 포맷하고 `null`을 `—`로 표시합니다.
- 행이 비어 있으면 `empty` 문구를 표시합니다.
- `rowKey`를 받으면 도메인에 맞는 행 키를 사용할 수 있습니다.
- 값 변환이나 색상 표현은 각 화면의 `render`에서 결정합니다.

## 4.5 `lib/`

### `lib/scm.ts`

SCM 도메인 조회 함수를 모아두는 서버 데이터 접근 경계입니다.

#### `getLeadtimeGap()`

- 서버용 Supabase 클라이언트를 생성합니다.
- `analytics.v_leadtime_gap`를 조회합니다.
- 각 원본 행을 `normalizeLeadtimeGap()`으로 화면 모델로 변환합니다.
- `{ rows, error }` 형태로 반환해 오류와 빈 결과를 화면이 구분할 수 있게 합니다.

#### `getStockoutKpi()`

- `analytics.v_stockout_kpi`에서 요약 한 행을 조회합니다.
- 결과가 없으면 `data: null`을 반환합니다.
- 현재 공개 화면에서는 아직 호출되지 않는 준비된 조회 함수입니다.

### `lib/scm-model.ts`

화면과 데이터베이스 뷰 사이의 타입·정규화 계층입니다.

#### `LeadtimeGap`

리드타임 분석 화면이 사용하는 정규화된 모델입니다.

- `supplier`, `country`
- `masterLeadTime`, `actualAverage`, `p80`, `gap`
- `sampleCount`

리드타임이 없을 수 있으므로 관련 수치는 `number | null`입니다.

#### `normalizeLeadtimeGap()`

분석 뷰의 컬럼명이 변하거나 한글 별칭으로 들어와도 화면 모델을 유지하도록 여러 후보 키를 순서대로 확인합니다. 숫자 값은 `Number()`로 변환한 후 유한한 값만 허용하며, 변환할 수 없으면 `null`을 사용합니다.

### `lib/scm-model.test.ts`

Node 기본 테스트 러너를 사용하는 정규화 함수 테스트입니다.

- 영문 분석 뷰 컬럼명 입력
- 한글 별칭 입력
- 실제 `analytics.v_leadtime_gap` 컬럼명 입력

세 입력 형식이 동일한 `LeadtimeGap` 모델로 변환되는지 검증합니다.

### `lib/supabase.ts`

Supabase 하위 모듈을 한 곳에서 재-export하는 공개 진입점입니다. 애플리케이션 코드는 `@/lib/supabase`를 통해 브라우저 클라이언트, 서버 클라이언트, 환경변수 함수를 사용할 수 있습니다.

## 4.6 `lib/supabase/`

### `client.ts`

브라우저 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트를 생성합니다. `requireSupabaseEnv()`로 URL과 publishable key를 검증한 뒤 `createClient()`를 호출합니다.

### `server.ts`

서버 컴포넌트와 서버 조회 함수가 사용할 Supabase 클라이언트를 생성합니다.

- `persistSession: false`
- `autoRefreshToken: false`

현재 조회 중심 프로토타입이며 세션 유지가 필요하지 않다는 전제입니다.

### `env.ts`

Supabase 환경변수 접근을 중앙화합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`getSupabaseEnv()`는 없으면 `null`을 반환하고, `requireSupabaseEnv()`는 없으면 한국어 오류를 던집니다. secret key는 브라우저 노출을 막기 위해 다루지 않습니다.

## 4.7 `supabase/`

### `supabase/config.toml`

Supabase CLI의 로컬 프로젝트 설정 파일입니다. 로컬 Supabase 명령과 마이그레이션 실행의 기준점입니다.

### `supabase/migrations/20260813000100_create_procurement_demand_core.sql`

수요확정 핵심 업무를 위한 데이터베이스 구조를 생성하는 마이그레이션입니다.

생성 테이블:

- `planning_runs`: 발주계획 실행 단위, 기준월도·대상월도·상태·계산 버전
- `ol_demand`: 영업 OL 수요
- `sfdc_pipeline`: SFDC Pipeline 후보 수요
- `bulk_deals`: Bulk-deal 조건부 수요
- `historical_actuals`: 과거 실적
- `demand_confirmations`: 수급회의 결과와 확정수요 요약

각 수요 테이블은 `planning_runs(id)`를 참조하며, 주요 외래키 컬럼에 인덱스를 생성합니다. `set_updated_at()` 트리거 함수는 업데이트 시 `updated_at`을 현재 시각으로 갱신합니다.

주의할 점은 이 마이그레이션의 테이블이 `public` 스키마에 생성된다는 것입니다. 반면 `SCHEMA.md`의 분석 규칙은 `raw`, `core`, `analytics` 스키마와 해당 뷰를 전제로 합니다. 실제 운영 연결 시에는 마이그레이션과 분석 뷰의 스키마 설계를 일치시키거나, 두 영역의 역할을 문서와 코드에서 명확히 분리해야 합니다.

## 4.8 `sql/`

### `sql/01-grants.sql`

데이터베이스 객체에 대한 권한 부여 SQL입니다. Supabase의 역할별 접근 정책을 배포할 때 사용하는 운영 스크립트입니다.

### `sql/02-policies.sql`

테이블 접근 정책과 RLS 관련 SQL입니다. 마이그레이션이 테이블 구조를 만든다면 이 파일은 누가 어떤 데이터를 읽고 쓸 수 있는지를 보완합니다.

## 4.9 `docs/`

### `docs/04-실습안내.md`

4회차 실습의 목적, 순서, 확인 항목을 설명하는 사용자·학습자용 안내 문서입니다.

### `docs/superpowers/04-실습안내.md`

실습 안내의 작업 프로세스 버전입니다. 구현 과정에서 따라야 할 단계와 확인 기준을 보관합니다.

### `docs/superpowers/plans/2026-08-13-procurement-planning-mvp-plan.md`

월간 발주계획 MVP 구현 계획입니다. 업무 흐름과 파일 단위의 구현 순서를 이해하는 데 참고할 수 있습니다.

### `docs/superpowers/specs/2026-08-13-procurement-planning-mvp-prd.md`

MVP의 요구사항과 업무 규칙을 정의한 설계 문서입니다. 화면에 표시되는 업무 단계와 향후 실제 기능 범위를 판단할 때 기준이 됩니다.

## 4.10 `outputs/`

### `outputs/<실습 산출물 ID>/preview_*.png`

사용 안내, 프로세스 맵, 상세 프로세스, 계산 규칙, 데이터 정의, RACI, KPI, 발주 계산 템플릿, 입력사항, 샘플 자료, 정책 결정표, FXLIVE 연계정의 등 실습 결과를 시각적으로 확인하기 위한 미리보기 이미지입니다. 런타임 코드가 직접 import하는 자산은 아닙니다.

### `outputs/<실습 산출물 ID>/*.xlsx`

기기·옵션 월간 발주 프로세스 정의서 Excel 산출물입니다. 업무 정의와 검토 결과를 보관하는 참고 자료입니다.

### `*.inspect.ndjson`

Excel 산출물 검사·추출 결과를 보관한 JSON Lines 형식의 검토 파일입니다.

## 4.11 루트 문서·스크립트·설정 파일

### `AGENTS.md`

프로젝트 작업 규칙입니다. 스키마 역할, 환경변수 보안, 계산 로직 위치, 오류·빈 결과 구분, 한국어 문구, 빌드 검증 규칙을 정의합니다.

### `SCHEMA.md`

Supabase 데이터 모델과 분석 뷰의 업무 의미를 설명합니다.

- `raw`: CSV 원본
- `core`: 정제·매핑·확정 기준
- `analytics`: 화면과 AI가 읽는 분석 뷰

또한 `v_leadtime_gap`, `v_stockout_risk`, `v_stockout_kpi`, `v_usage_profile`, `v_usage_anomaly`의 컬럼과 계산 의미를 정의합니다.

### `README.md`

프로젝트 소개, 설치·실행 방법, 현재 Phase 1 범위, 향후 구현 항목, Supabase 연결 방법을 설명합니다.

### `README_배포전_확인.md`

배포 전 설정과 확인사항을 기록한 체크 문서입니다.

### `2026-08-13-procurement-planning-mvp-prd.md`

월간 발주계획 MVP의 제품 요구사항 문서입니다. 도메인 문제, 업무 흐름, 화면·계산·보고 기능의 목표를 확인하는 기준 문서입니다.

### `적용방법.md`

실습 결과나 프로젝트 변경사항을 적용하는 방법을 설명하는 보조 안내 문서입니다.

### `build_dummy_demand_data.mjs`

수요 관련 더미 데이터를 생성하는 Node.js 스크립트입니다. 실제 입력 데이터가 준비되기 전 화면이나 데이터 구조를 검증하는 용도로 사용합니다.

### `build_workbook.mjs`

발주 프로세스 정의 또는 검토용 Excel 워크북을 생성하는 Node.js 스크립트입니다. 애플리케이션 런타임과 분리된 산출물 생성 도구입니다.

### `dump.sql`

데이터베이스 객체 또는 샘플 데이터의 덤프 파일입니다. 현재 애플리케이션 코드가 직접 호출하는 파일은 아니며, 데이터 구조 재현·검토용으로 취급합니다.

### `.env.example`

`.env.local`을 만들 때 사용하는 환경변수 예시입니다. 실제 값은 포함하지 않습니다.

### `.env.local.example`

로컬 환경변수 설정을 위한 추가 예시 파일입니다. 실제 비밀값은 커밋하지 않는 전제가 필요합니다.

### `package.json`

프로젝트 메타데이터, 실행 명령, 의존성을 정의합니다.

- `npm run dev`: 개발 서버
- `npm run build`: Next.js 빌드
- `npm run start`: 빌드 결과 실행
- `npm run test`: `lib/**/*.test.ts` Node 테스트 실행

주요 의존성은 Next.js 15, React 19, TypeScript, Supabase JS/SSR, `lucide-react`입니다.

### `package-lock.json`

설치된 npm 의존성 버전을 고정합니다.

### `next.config.ts`

Next.js 설정 파일입니다. 현재 `reactStrictMode: true`만 설정되어 있습니다.

### `tsconfig.json`

TypeScript 컴파일 옵션과 경로 별칭을 정의합니다. `@/*`가 프로젝트 루트를 가리키므로 `@/components/...`, `@/lib/...` 형태의 import가 가능합니다.

### `vercel.json`

Vercel에서 이 프로젝트를 Next.js 프레임워크로 인식하도록 지정합니다.

### `.gitignore`

`node_modules`, Next.js 빌드 결과, 로컬 환경변수, 인증서, Vercel 로컬 파일 등을 Git에서 제외합니다.

### `~$차 강의안_수정.docx`

문서 편집 프로그램이 만든 임시 잠금 파일로 보입니다. 애플리케이션 실행에는 필요하지 않은 산출물입니다. 저장소에 포함하지 않는 편이 안전합니다.

## 5. 핵심 데이터 흐름

## 5.1 현재 구현된 분석 조회 흐름

```text
analytics.v_leadtime_gap
        ↓ Supabase schema('analytics').from(...)
lib/scm.ts: getLeadtimeGap()
        ↓ normalizeLeadtimeGap()
lib/scm-model.ts: LeadtimeGap
        ↓
app/analysis/leadtime/page.tsx
        ↓ props
AnalysisFrame + DataTable
        ↓
브라우저 분석 표와 KPI 카드
```

화면은 Supabase를 직접 호출하지 않습니다. 조회·오류 처리·정규화가 각각 `lib/scm.ts`와 `lib/scm-model.ts`에 모여 있어 화면이 데이터베이스 컬럼명에 직접 의존하지 않습니다.

## 5.2 현재 프로토타입 업무 흐름

```text
전체 현황
  → 수요 확정
  → 재고·공급
  → 마스터 검증
  → 발주량 계산
  → 보고자료
```

현재 이 흐름은 `ProcurementApp`의 `active` 상태와 콜백으로만 이동합니다. 각 단계의 일부 입력은 컴포넌트 로컬 상태이고, 실제 `planning_runs` 및 수요 테이블 저장과는 아직 연결되지 않았습니다.

## 5.3 목표 데이터 모델 흐름

`SCHEMA.md`가 설명하는 운영 모델은 다음과 같습니다.

```text
raw 원본 CSV·거래 데이터
        ↓ 정제·표기 통일·품질 판정
core 기준·매핑·확정값
        ↓ 계산·집계 뷰
analytics 화면용 분석 뷰
        ↓ 조회 함수
Next.js 분석 화면
```

원본 `raw`를 화면에서 직접 조회하지 않고, `core`와 `analytics`를 통해 일관된 계산 결과를 제공하는 것이 핵심 설계 원칙입니다.

## 6. 상태·오류 처리 규칙

### 분석 조회

- 조회 오류와 빈 배열을 구분해야 합니다.
- 조회 오류는 사용자에게 실패 상태와 오류 메시지를 표시합니다.
- 빈 배열은 데이터 없음으로 표시하되, Supabase Exposed schemas 설정 누락 가능성을 함께 안내해야 합니다.

### 계산 불가

- 사용 이력이나 리드타임이 없으면 임의의 숫자 대신 `null`과 사유 코드를 사용합니다.
- `999` 같은 대체 숫자로 계산 불가 상태를 표현하지 않습니다.

### 프로토타입 상태

- workflow 화면의 입력·계산·저장은 현재 브라우저 상태 또는 샘플값입니다.
- 페이지 새로고침 시 업무 단계와 편집 상태가 유지된다는 보장은 없습니다.
- 실제 저장이 연결되면 `planning_runs.id`를 중심으로 업무 단계의 상태를 영속화해야 합니다.

## 7. 보안·환경변수 경계

- `.env.local`은 커밋하지 않습니다.
- 브라우저에 노출 가능한 Supabase publishable key만 클라이언트에서 사용합니다.
- `sb_secret_...` 형태의 secret key를 클라이언트 코드에 넣지 않습니다.
- 서버 클라이언트도 현재는 publishable key 기반의 읽기 중심 구조입니다.
- 실제 쓰기 기능을 추가할 때는 RLS 정책, 사용자 인증, 서버 액션/API 경계를 함께 검토해야 합니다.

## 8. 테스트·빌드·운영 명령

```bash
npm install
npm run dev
npm run test
npm run build
npm run start
```

Supabase 연결 점검:

```bash
curl http://localhost:3000/api/health/supabase
```

배포 전에는 최소한 다음을 확인해야 합니다.

1. `.env.local`의 URL과 publishable key 설정
2. Supabase API의 `core`, `analytics` Exposed schemas 설정
3. 마이그레이션과 실제 분석 뷰의 스키마 일치 여부
4. `npm run test` 통과
5. `npm run build` 통과
6. 분석 화면의 오류 상태와 빈 결과 상태 구분

## 9. 현재 범위와 확장 지점

### 현재 구현된 범위

- 월간 발주 업무의 전체 단계 UX 프로토타입
- 수요 화면의 로컬 입력·검증·확정 후보 계산 미리보기
- 분석 화면 공통 레이아웃과 리드타임 격차 화면
- Supabase 환경변수와 서버·브라우저 클라이언트
- 리드타임 분석 조회와 컬럼 정규화
- 정규화 함수 단위 테스트
- 수요확정 핵심 테이블 마이그레이션

### 다음 확장 시 연결할 위치

| 확장 기능 | 우선 변경 위치 |
|---|---|
| 수요 데이터 저장 | `lib/scm.ts`, 서버 액션/API, `DemandStep` 경계 |
| 재고·Open PO 실데이터 | `lib/scm-model.ts`, `lib/scm.ts`, `SupplyStep` |
| 재고 소진 위험 분석 | `getStockoutKpi()`, 새 `app/analysis/stockout/page.tsx`, `AnalysisTabs` |
| 실제 발주량 계산 | `lib/scm-model.ts`의 순수 함수와 `lib/scm.ts`의 조회·저장 |
| 마스터 입력·업로드 | 별도 API/서버 액션과 `components/workflow/master-step.tsx` |
| 수동 조정 이력 | 계산 결과와 조정 결과를 분리한 테이블·서비스 계층 |
| Excel/PDF 출력 | 보고서 전용 서버 처리와 `report-step.tsx` 버튼 연결 |
| 인증·권한 | Supabase Auth, RLS, 서버 접근 정책 |

## 10. 아키텍처상 주의사항

1. **현재 루트 workflow와 분석 화면의 데이터 성숙도가 다릅니다.** workflow는 샘플·로컬 상태 중심이고, 리드타임 분석은 Supabase 조회 중심입니다.
2. **`SCHEMA.md`와 현재 마이그레이션의 스키마가 다릅니다.** 문서는 `raw/core/analytics`를 설명하지만 마이그레이션은 `public`에 수요 테이블을 생성합니다. 운영 데이터 연결 전 이 차이를 해소해야 합니다.
3. **계산식은 화면에 넣지 않아야 합니다.** 화면은 입력·표현을 담당하고, 계산은 순수 모델 함수나 데이터베이스 뷰로 이동해야 합니다.
4. **빈 결과는 장애일 수 있습니다.** Supabase의 스키마 노출 누락은 에러 없이 빈 배열처럼 보일 수 있으므로 별도 안내가 필요합니다.
5. **`app/.env.local`은 로컬 비밀 설정으로 취급해야 합니다.** 루트 `.gitignore`의 `.env*.local` 규칙에 걸리더라도 실제 값이 문서나 로그에 노출되지 않도록 관리해야 합니다.
6. **임시 문서 파일과 생성 산출물은 런타임 코드와 분리해야 합니다.** 특히 `~$`로 시작하는 잠금 파일은 저장소에서 제거를 검토할 대상입니다.

## 11. 새 분석 화면 추가 순서

`AGENTS.md`의 규칙과 현재 구현을 기준으로 새 분석 기능은 다음 순서로 추가합니다.

1. `lib/scm-model.ts`에 화면 모델 타입과 컬럼 정규화 함수를 추가합니다.
2. `lib/scm.ts`에 `analytics` 뷰 조회 함수를 추가합니다.
3. `app/analysis/<기능이름>/page.tsx`에 서버 페이지를 만듭니다.
4. `components/analysis/analysis-tabs.tsx`의 탭 항목을 `ready: true`로 바꿉니다.
5. 필요한 경우 `AnalysisFrame`과 `DataTable`의 재사용 API만 확장합니다.
6. 정규화 함수 테스트를 추가합니다.
7. `npm run test`와 `npm run build`를 실행합니다.

이 순서를 지키면 데이터베이스 컬럼명 변화가 화면 컴포넌트 전체로 퍼지는 것을 줄이고, 분석 화면 간 일관된 오류·빈 결과 처리를 유지할 수 있습니다.
