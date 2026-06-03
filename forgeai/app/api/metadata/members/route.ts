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
    const type = searchParams.get('type');

    if (!orgId || !type) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const conn = await createSalesforceConnection(orgId, supabase);
    
    // List members for the given type
    const members = await conn.metadata.list([{ type, folder: undefined }], '60.0');
    
    // JSforce returns a single object if only one member exists
    const membersArray = Array.isArray(members) ? members : (members ? [members] : []);

    return NextResponse.json({ members: membersArray });
  } catch (globalError: any) {
    console.error('[API Metadata Members] Error:', globalError);
    return NextResponse.json({ error: globalError.message || 'Internal Server Error' }, { status: 500 });
  }
}
