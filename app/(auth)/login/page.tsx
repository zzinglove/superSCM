import Link from 'next/link';
export default function LoginPage() { return <main className="auth-page"><section className="panel auth-card"><div className="brand-mark">OP</div><h1>월간 발주계획</h1><p className="muted">SCM Predict에 로그인하세요.</p><Link className="ui-button ui-button-primary" href="/user/dashboard">데모 사용자로 시작</Link></section></main>; }
