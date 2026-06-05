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

  let activeDeploymentId = deploymentId;
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // If targetOrgId is provided, this is a promotion to QA or UAT sandbox
  if (targetOrgId) {
    // 1. Fetch the original developer deployment to copy details
    const { data: originalDep } = await adminSupabase
      .from('deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    if (originalDep) {
      // 2. Check if a deployment record already exists for this ticket and target org
      const { data: existingPromo } = await adminSupabase
        .from('deployments')
        .select('*')
        .eq('user_id', user.id)
        .eq('org_id', targetOrgId)
        .eq('jira_ticket_id', originalDep.jira_ticket_id)
        .maybeSingle();

      if (existingPromo) {
        activeDeploymentId = existingPromo.id;
        await adminSupabase.from('deployments').update({
          status: 'queued',
          rollback_metadata: originalDep.rollback_metadata || (plan ? JSON.stringify(plan) : null),
          deployed_at: null
        }).eq('id', activeDeploymentId);
      } else {
        // Create a new promotion deployment record
        const { data: newPromo } = await adminSupabase.from('deployments').insert({
          org_id: targetOrgId,
          user_id: user.id,
          jira_ticket_id: originalDep.jira_ticket_id,
          status: 'queued',
          rollback_metadata: originalDep.rollback_metadata || (plan ? JSON.stringify(plan) : null),
        }).select().single();

        if (newPromo) {
          activeDeploymentId = newPromo.id;
        }
      }
    }
  }

  // 2. Save plan to steps table using admin client (to avoid RLS issues)
  if (plan) {
    const { error: stepError } = await adminSupabase.from('deployment_steps').insert({
      deployment_id: activeDeploymentId,
      description: 'AI Generated Plan',
      status: 'pending'
    });
    
    // Also update the deployment record with the plan if missing
    await adminSupabase.from('deployments').update({
      rollback_metadata: JSON.stringify(plan)
    }).eq('id', activeDeploymentId);

    if (stepError) {
      console.error('[API Deploy] Failed to save plan to steps:', stepError);
    }
  }

  // 3. Trigger Execution (Async)
  executeDeployment(activeDeploymentId, targetOrgId).catch(err => {
    console.error('[API Deploy] Background execution error:', err);
  });

  return NextResponse.json({
    success: true,
    deploymentId: activeDeploymentId,
    message: 'Deployment queued successfully',
  });
}
