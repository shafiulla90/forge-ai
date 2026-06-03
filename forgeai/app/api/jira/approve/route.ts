import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createJiraClient } from '@/lib/jira';
import { executeDeployment } from '@/lib/deploy';
import { generateAiPlan } from '@/lib/planGenerator';


function extractTextFromAdf(adf: any): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  if (adf.text) return adf.text;
  if (Array.isArray(adf)) {
    return adf.map(extractTextFromAdf).join(' ');
  }
  if (adf.content) {
    return extractTextFromAdf(adf.content);
  }
  return '';
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, decision, comment } = await req.json();

  if (!id || !decision) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const isMock = id.startsWith('mock-');

  try {
    // 1. Handle Mock Deployment Mode
    if (isMock) {
      console.log(`[Jira Approve] Mock approval processed for ID: ${id}, decision: ${decision}`);
      return NextResponse.json({
        success: true,
        message: `Mock deployment ${decision} successfully`,
        deployment: {
          id,
          status: decision === 'approved' ? 'Completed' : 'failed',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        }
      });
    }

    // 2. Resolve deployment record
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let deployment = null;
    let targetDeploymentId = id;

    if (isUuid) {
      const { data: dep, error: depFetchErr } = await adminSupabase
        .from('deployments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!depFetchErr && dep) {
        deployment = dep;
      }
    } else {
      // It is a Jira ticket key (e.g., SCRUM-6). Find if a deployment record already exists.
      const { data: dep } = await adminSupabase
        .from('deployments')
        .select('*')
        .eq('jira_ticket_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dep) {
        deployment = dep;
        targetDeploymentId = dep.id;
      } else {
        // Create a new dynamic deployment record for this ticket!
        console.log(`[Jira Approve] Creating dynamic deployment record for ticket: ${id}`);
        
        // Fetch Org
        const { data: orgs } = await adminSupabase.from('orgs').select('*').limit(1);
        const orgId = orgs && orgs.length > 0 ? orgs[0].id : null;

        const jira = await createJiraClient(user.id);
        let liveSummary = `Deployment plan for ${id}`;
        let descriptionText = '';
        try {
          const issue = await jira.getIssue(id);
          liveSummary = issue.fields?.summary || liveSummary;
          descriptionText = extractTextFromAdf(issue.fields?.description) || '';
        } catch (e: any) {
          console.warn('[Jira Approve] Failed to fetch live issue details:', e.message);
        }

        console.log(`[Jira Approve] Calling AI Plan Generator for ticket ${id}...`);
        const aiPlan = await generateAiPlan(liveSummary, descriptionText, id);
        let planData = aiPlan || {
          summary: liveSummary,
          riskLevel: 'Low',
          steps: [
            { 
              num: 1, 
              title: `Implement Salesforce updates for ${id}`, 
              detail: `Apply configurations as requested in ${id}.`, 
              api: 'Metadata API' 
            }
          ],
          acceptanceCriteria: [
            `Verification matching requirements in ${id}`,
            'All new components compile successfully in Sandbox environment'
          ]
        };

        const { data: newDep, error: insertErr } = await adminSupabase
          .from('deployments')
          .insert({
            user_id: user.id,
            org_id: orgId,
            jira_ticket_id: id,
            status: 'In review',
            rollback_metadata: JSON.stringify(planData)
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        deployment = newDep;
        targetDeploymentId = newDep.id;
      }
    }

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // 3. Save to jira_approvals table defensively
    try {
      await adminSupabase.from('jira_approvals').insert({
        deployment_id: targetDeploymentId,
        jira_ticket_key: deployment.jira_ticket_id || 'SFDC-109',
        decision,
        comment,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      });
      console.log('[Jira Approve] Approval decision successfully logged to jira_approvals table.');
    } catch (dbErr) {
      console.warn('[Jira Approve] Skipping jira_approvals insert. Using deployments table fallback.');
    }

    // 4. Update deployment state based on decision
    let finalStatus = 'In review';
    if (decision === 'approved') {
      finalStatus = 'Approved';
    } else if (decision === 'rejected') {
      finalStatus = 'failed';
    } else if (decision === 'changes_requested') {
      finalStatus = 'pending';
    }

    const { data: updatedDep, error: depUpdateErr } = await adminSupabase
      .from('deployments')
      .update({
        status: finalStatus,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', targetDeploymentId)
      .select()
      .single();

    if (depUpdateErr) throw depUpdateErr;

    // 5. Connect and push status transition & comments to Atlassian Jira cloud
    if (deployment.jira_ticket_id) {
      try {
        const jira = await createJiraClient(user.id);
        
        // Add approval comment to ticket
        const commentAuthor = user.email || 'Tech Lead';
        const jiraComment = `[Forge DevOps Audit Log]\nDecision: ${decision.toUpperCase()}\nUser: ${commentAuthor}\nComment: ${comment || 'No comment provided.'}`;
        await jira.addComment(deployment.jira_ticket_id, jiraComment);

        // Transition issue status in Jira
        const transitionName = decision === 'approved' ? 'Approved' : decision === 'rejected' ? 'Done' : 'In Review';
        await jira.transitionIssue(deployment.jira_ticket_id, transitionName);
        console.log(`[Jira Approve] Jira ticket ${deployment.jira_ticket_id} successfully updated on Atlassian cloud.`);
      } catch (jiraErr) {
        console.warn(`[Jira Approve] Failed to sync update to Atlassian cloud for ticket ${deployment.jira_ticket_id}:`, jiraErr);
      }
    }

    // 6. Trigger Salesforce Metadata compilation and deployment if approved!
    if (decision === 'approved') {
      console.log(`[Jira Approve] Invoking Salesforce deployment compiler for deployment: ${targetDeploymentId}`);
      
      // Async trigger executeDeployment inside lib/deploy
      executeDeployment(targetDeploymentId).catch(deployErr => {
        console.error('[Jira Approve] Metadata compiler execution failed in background:', deployErr);
      });
    }

    return NextResponse.json({
      success: true,
      message: decision === 'approved' ? 'Deployment triggered successfully' : 'Approval decision recorded successfully',
      deployment: {
        ...updatedDep,
        id: targetDeploymentId // Make sure to return the correct database UUID!
      }
    });

  } catch (err: any) {
    console.error('[Jira Approve] Unexpected approval error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
