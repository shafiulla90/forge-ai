import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { executeDeployment } from '@/lib/deploy';

export async function POST(req: NextRequest) {
  console.log('[API Deploy] POST request received');
  const supabase = await createClient();
  
  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { deploymentId, plan, targetOrgId } = await req.json();
  console.log(`[API Deploy] Starting deployment for ID: ${deploymentId}${targetOrgId ? ' (target org: ' + targetOrgId + ')' : ''}`);
  
  if (!deploymentId) {
    return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 });
  }

  // 2. Save plan to steps table using admin client (to avoid RLS issues)
  if (plan) {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error: stepError } = await adminSupabase.from('deployment_steps').insert({
      deployment_id: deploymentId,
      description: 'AI Generated Plan',
      status: 'pending'
    });
    
    // Also update the deployment record with the plan if missing
    await adminSupabase.from('deployments').update({
      rollback_metadata: JSON.stringify(plan)
    }).eq('id', deploymentId);

    if (stepError) {
      console.error('[API Deploy] Failed to save plan to steps:', stepError);
    }
  }

  // 3. Trigger Execution (Async)
  // In a production environment, this should be sent to a queue (like SQS, Upstash QStash, etc.)
  // For this implementation, we trigger it and don't await it to return the response quickly.
  executeDeployment(deploymentId, targetOrgId).catch(err => {
    console.error('[API Deploy] Background execution error:', err);
  });

  return NextResponse.json({
    success: true,
    deploymentId: deploymentId,
    message: 'Deployment queued successfully',
  });
}
