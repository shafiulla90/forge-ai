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

    if (!orgId) {
      // If no orgId provided, try to find the first org for the user
      const { data: orgs } = await supabase.from('orgs').select('id').eq('user_id', user.id).limit(1);
      if (!orgs || orgs.length === 0) {
        return NextResponse.json({ error: 'No org connected' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const conn = await createSalesforceConnection(orgId, supabase);
    
    // Fetch all metadata types
    const describe = await conn.metadata.describe('60.0');
    
    // Sort types alphabetically
    const types = describe.metadataObjects.sort((a, b) => a.xmlName.localeCompare(b.xmlName));

    return NextResponse.json({ types });
  } catch (globalError: any) {
    console.error('[API Metadata Types] Error:', globalError);
    return NextResponse.json({ error: globalError.message || 'Internal Server Error' }, { status: 500 });
  }
}
