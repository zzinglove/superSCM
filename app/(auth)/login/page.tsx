import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  return <main className="auth-page"><section className="panel auth-card"><div className="brand-mark">OP</div><h1>월간 발주계획</h1><p className="muted">SCM Predict에 로그인하세요.</p>{params.error && <p className="text-danger" role="alert">{params.error}</p>}<form action={login} className="form-stack"><label>이메일<input className="form-input" name="email" type="email" required autoComplete="email" /></label><label>비밀번호<input className="form-input" name="password" type="password" required autoComplete="current-password" /></label><input type="hidden" name="next" value={params.next ?? '/user/dashboard'} /><button className="ui-button ui-button-primary" type="submit">로그인</button></form></section></main>;
}
