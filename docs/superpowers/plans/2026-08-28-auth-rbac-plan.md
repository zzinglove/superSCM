# STEP 2 인증·RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Supabase Auth와 PostgreSQL RLS를 연결해 ADMIN/USER 권한을 세 계층에서 강제한다.

**Architecture:** SSR cookie session은 middleware와 server helper가 공유한다. role과 active의 진실은 `core.app_user`이며, PostgreSQL `core.is_admin()`과 RLS가 최종 방어선이다. 관리자 변경은 일반 authenticated session으로 실행하되 DB 정책과 trigger로 권한·감사 기록을 강제한다.

**Tech Stack:** Next.js App Router, `@supabase/ssr`, Supabase Auth, PostgreSQL trigger/RLS, Server Actions.

**Spec:** `docs/superpowers/specs/2026-08-28-auth-rbac-design.md`

## Global Constraints

- service role key는 브라우저에 노출하지 않는다.
- anon에게 core 데이터 write를 허용하지 않는다.
- 화면의 메뉴 숨김을 보안 수단으로 사용하지 않는다.
- 기존 계산 SQL과 `lib/scm.ts`의 계산 로직은 변경하지 않는다.
- 계산 불가 값은 0으로 치환하지 않는다.

### Task 1: DB 인증 모델과 RLS

**Files:** Create `supabase/migrations/20260828000100_add_auth_rbac.sql`; Modify `sql/01-grants.sql`, `sql/02-policies.sql`.

- [ ] `core.app_user`, `core.audit_log`와 인덱스를 만든다.
- [ ] `core.is_admin()`을 `SECURITY DEFINER`로 만들고 `search_path`를 고정한다.
- [ ] auth user 생성, app_user 변경 감사 trigger를 만든다.
- [ ] anon grant/write policy를 제거하고 authenticated 조회·ADMIN mutation 정책을 만든다.
- [ ] 자기 계정 role/active 변경을 DB 정책에서 차단한다.

### Task 2: SSR session과 auth helper

**Files:** Modify `lib/supabase/server.ts`; Create `lib/auth.ts`, `lib/supabase/update-session.ts`; Modify `lib/supabase.ts` exports if needed.

- [ ] cookie 기반 server client를 구현한다.
- [ ] `getRole()`, `requireUser()`, `requireAdmin()`의 반환 타입과 redirect/forbidden 동작을 정의한다.
- [ ] 서비스 키를 import하거나 브라우저 번들로 유입시키지 않는다.

### Task 3: middleware와 인증 화면

**Files:** Create `middleware.ts`; Modify `app/(auth)/login/page.tsx`; Create login/logout actions as server-only files.

- [ ] 보호 경로를 검사하고 `next` query를 보존한다.
- [ ] 이메일/비밀번호 로그인, 실패 메시지, 성공 후 next 복귀를 구현한다.
- [ ] 로그아웃은 서버에서 세션을 제거한다.

### Task 4: 관리자 사용자 관리

**Files:** Create `app/(admin)/admin/users/page.tsx`, `app/(admin)/admin/users/actions.ts`; Modify `lib/menu.ts`.

- [ ] 사용자 목록을 authenticated server query로 가져온다.
- [ ] `requireAdmin()`으로 페이지와 각 action 시작부를 보호한다.
- [ ] role/active 변경 form action과 오류 메시지를 구현한다.
- [ ] 자기 자신의 ADMIN 제거와 비활성화를 명시적으로 거부한다.

### Task 5: 테스트와 문서

**Files:** Create/update `lib/auth.test.ts`, `README.md`, `design.md` if needed.

- [ ] auth helper의 비로그인·USER·ADMIN 분기 테스트를 작성한다.
- [ ] npm test와 npm run build를 실행한다.
- [ ] Supabase Dashboard에서 migration, RLS, audit log 수동 확인 절차를 문서화한다.
