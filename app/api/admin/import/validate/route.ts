import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { validateBatch } from '@/lib/import/repository';
export async function POST(request: Request) {
  try { await requireAdmin(); const body=await request.json(); if(!body.batch_id)return NextResponse.json({error:'BATCH_ID_REQUIRED'},{status:400}); return NextResponse.json(await validateBatch(String(body.batch_id), Array.isArray(body.mapping) ? body.mapping : undefined)); }
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'IMPORT_VALIDATE_FAILED'},{status:400});}
}
