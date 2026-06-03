import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSalesforceConnection } from '@/lib/salesforce';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });

    const conn = await createSalesforceConnection(orgId, supabase);
    
    const records = await conn.tooling.query('SELECT Id, Name, ApiVersion, Status, LastModifiedDate FROM ApexClass WHERE NamespacePrefix = null ORDER BY Name ASC');

    return NextResponse.json({ classes: records.records });
  } catch (error: any) {
    console.error('[API Apex List] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
