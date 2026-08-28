# STEP 2 인증·Role·RBAC 설계

## 목표

Supabase Auth 세션, Next.js 서버 경계, PostgreSQL RLS의 세 계층에서 ADMIN과 USER 권한을 강제한다.

## 현재 상태

- 서버 Supabase client는 세션 쿠키를 유지하지 않는 `@supabase/supabase-js` client다.
- middleware가 없고 로그인 화면은 데모 링크만 제공한다.
- 기존 SQL은 `anon`에 core 데이터 쓰기와 `using (true)` 정책을 허용한다.
- 업무 계산과 분석 조회는 `lib/scm.ts`에 있으므로 인증 구현과 분리한다.

## 설계

### 데이터베이스

마이그레이션에서 `core.app_user`, `core.audit_log`, `core.is_admin()`을 만든다. `auth.users` INSERT trigger가 기본 USER·active 상태의 app_user를 생성하고, role 또는 active 변경 trigger가 변경 전후 JSON과 actor를 audit log에 남긴다. 관리자 mutation은 `authenticated`와 `core.is_admin()` 조건의 RLS로 제한한다.

기존 `anon` grant와 전체 허용 정책을 제거하고, 분석·업무 데이터 조회는 authenticated만 허용한다. 계산 SQL과 기존 analytics view 정의는 변경하지 않는다.

### 서버 인증

`@supabase/ssr`의 cookie client를 사용한다. `lib/auth.ts`의 `requireUser()`, `requireAdmin()`, `getRole()`은 현재 세션의 user와 `core.app_user` role/active를 조회한다. 관리자 페이지, Server Action, Route Handler는 첫 단계에서 `requireAdmin()`을 호출한다.

### 라우팅

middleware는 세션을 갱신하고 `/user/*`, `/admin/*`, `/workflow` 접근을 보호한다. 미로그인 사용자는 `/login?next=...`로 이동한다. `/admin/*`의 최종 권한 판단은 서버 helper와 DB RLS에서 수행한다.

### 사용자 관리

`/admin/users`는 ADMIN만 접근할 수 있다. role/active 변경 Server Action은 대상과 새 값을 검증하고 DB update를 요청한다. DB trigger가 audit log를 기록하며, 자기 자신의 ADMIN 제거 및 active=false 변경은 서버와 DB 양쪽에서 차단한다.

## 검증

순수 helper 테스트와 빌드 검증을 추가한다. 실제 Supabase 프로젝트에서는 anon/authenticated 요청으로 RLS와 audit log를 수동 확인한다.
