import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const baseUrl = process.env.PYTHON_FORECAST_SERVICE_URL;
    if (!baseUrl) return NextResponse.json({ status: 'FAILED', message: 'PYTHON_FORECAST_SERVICE_URL is not configured.' }, { status: 503 });
    const body = await request.json().catch(() => ({}));
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/forecast/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const payload = await response.json().catch(() => ({ message: 'Python service returned invalid JSON.' }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json({ status: 'FAILED', message: error instanceof Error ? error.message : 'PYTHON_FORECAST_TRIGGER_FAILED' }, { status: 502 });
  }
}
