import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org_id from query params if available, otherwise just fetch all for user
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    let query = supabase
      .from('deployments')
      .select(`
        id,
        status,
        deployed_at,
        created_at,
        rollback_metadata,
        orgs (
          id,
          alias
        ),
        deployment_steps (
          id,
          status,
          description,
          error_message
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data: deployments, error } = await query;

    if (error) {
      console.error('[API History] Error fetching deployments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data for UI
    const formattedHistory = deployments.map((d: any) => {
      let title = `Deployment ${d.id.substring(0, 8)}`;
      let desc = 'No description available.';
      let tags: string[] = [];
      let coverage = '';
      
      try {
        if (d.rollback_metadata) {
          const meta = typeof d.rollback_metadata === 'string' 
            ? JSON.parse(d.rollback_metadata) 
            : d.rollback_metadata;
            
          if (meta.summary) desc = meta.summary;
          
          const items = meta.items || [];
          if (items.length > 0) {
            title = `${items.length} Metadata change${items.length > 1 ? 's' : ''}`;
            tags = Array.from(new Set(items.map((i: any) => i.type)));
          }
        }
      } catch (e) {
        // ignore parse error
      }

      const hasError = d.status === 'failed' || d.deployment_steps?.some((s: any) => s.status === 'error');
      const isRolledBack = d.status === 'rolled_back';
      
      let displayStatus = 'Pending';
      let statusColor = '#e2e8f0';
      
      if (d.status === 'completed') {
        displayStatus = 'Success';
        statusColor = '#4ade80';
      } else if (hasError) {
        displayStatus = 'Failed';
        statusColor = '#f87171';
      } else if (isRolledBack) {
        displayStatus = 'Rolled back';
        statusColor = '#f87171';
      } else if (d.status === 'in_progress') {
        displayStatus = 'Deploying...';
        statusColor = '#00A1E0';
      }

      return {
        id: d.id,
        title,
        time: new Date(d.created_at).toLocaleString(),
        desc,
        tags,
        status: displayStatus,
        statusColor,
        borderColor: statusColor,
        rollback: d.status === 'completed',
        raw: d
      };
    });

    return NextResponse.json({ deployments: formattedHistory });
  } catch (globalError: any) {
    console.error('CRITICAL HISTORY ERROR:', globalError);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
