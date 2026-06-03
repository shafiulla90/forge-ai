import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSalesforceConnection } from '@/lib/salesforce';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const fullName = searchParams.get('fullName');

    if (!orgId || !fullName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const conn = await createSalesforceConnection(orgId, supabase);
    
    // Describe the SObject
    const metadata = await conn.sobject(fullName).describe();

    return NextResponse.json({ metadata });
  } catch (globalError: any) {
    console.error('[API Metadata Describe] Error:', globalError);
    return NextResponse.json({ error: globalError.message || 'Internal Server Error' }, { status: 500 });
  }
}
