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
