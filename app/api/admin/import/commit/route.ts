import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { commitBatch } from '@/lib/import/repository';
export async function POST(request: Request) {
  try { await requireAdmin(); const body=await request.json(); if(!body.batch_id)return NextResponse.json({error:'BATCH_ID_REQUIRED'},{status:400}); return NextResponse.json(await commitBatch(String(body.batch_id),body.replace_confirmed===true)); }
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'IMPORT_COMMIT_FAILED'},{status:400});}
}
