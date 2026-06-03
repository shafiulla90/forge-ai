import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    let query = supabase.from('deployments').select('id, status', { count: 'exact' });

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count || 0;
    const rolledBack = data?.filter(d => d.status === 'rolled_back').length || 0;
    const failed = data?.filter(d => d.status === 'failed').length || 0;
    const completed = data?.filter(d => d.status === 'completed').length || 0;

    return NextResponse.json({ 
      total, 
      rolledBack,
      failed,
      completed
    });
  } catch (globalError: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
