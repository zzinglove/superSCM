import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getImportHistory } from '@/lib/import/history';
export async function GET(){try{await requireAdmin();return NextResponse.json(await getImportHistory());}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'HISTORY_FAILED'},{status:400});}}
