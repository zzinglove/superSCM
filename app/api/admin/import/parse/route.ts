import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createStagedBatch } from '@/lib/import/repository';
import { IMPORT_TYPES } from '@/lib/import/types';
export async function POST(request: Request) {
  try {
    const { authUser } = await requireAdmin();
    const form = await request.formData();
    const file = form.get('file');
    const importType = String(form.get('import_type') ?? '');
    const mode = String(form.get('import_mode') ?? 'append') as 'append'|'upsert'|'replace';
    if (!(file instanceof File)) return NextResponse.json({error:'FILE_REQUIRED'}, {status:400});
    if (!IMPORT_TYPES.includes(importType as typeof IMPORT_TYPES[number])) return NextResponse.json({error:'UNSUPPORTED_IMPORT_TYPE'}, {status:400});
    return NextResponse.json(await createStagedBatch({file,importType:importType as typeof IMPORT_TYPES[number],mode,userId:authUser.id}));
  } catch (error) { return NextResponse.json({error:error instanceof Error ? error.message : 'IMPORT_PARSE_FAILED'}, {status:400}); }
}
