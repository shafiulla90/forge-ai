import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSalesforceConnection } from '@/lib/salesforce';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const classId = searchParams.get('classId');

    if (!orgId || !classId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const conn = await createSalesforceConnection(orgId, supabase);
    
    const record: any = await conn.tooling.sobject('ApexClass').retrieve(classId);

    return NextResponse.json({ body: record.Body });
  } catch (error: any) {
    console.error('[API Apex Read] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
