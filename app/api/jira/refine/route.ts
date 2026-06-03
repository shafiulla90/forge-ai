import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deploymentId, prompt } = await req.json();
    if (!deploymentId || !prompt) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch current deployment record
    const { data: deployment, error: depErr } = await adminSupabase
      .from('deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    if (depErr || !deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    const currentPlanText = deployment.rollback_metadata;
    if (!currentPlanText) {
      return NextResponse.json({ error: 'No plan stashed to refine' }, { status: 400 });
    }

    // 2. Call Anthropic to refine the plan
    const systemPrompt = `You are a Salesforce DevOps Architect. Your task is to update a Salesforce Metadata Deployment Plan based on the user's instructions.
    
CRITICAL:
1. Return ONLY the modified plan inside <plan>...</plan> tags.
2. The plan must follow the same JSON schema as the input plan.
3. If the user asks to modify a field length, picklist values, flow XML, object label, or add/remove a step, apply those changes carefully.
4. Keep the steps list structured with fields: num, title, type, fullName, detail, api, and metadata.
5. If the type is Flow, ensure the XML inside metadata.xml is updated to reflect the request if applicable, while keeping it valid Salesforce Flow XML.
6. Do NOT include any explanations outside the tags.

Input Plan:
${currentPlanText}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Please refine the plan: ${prompt}` }],
    });

    const contentText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse the new plan
    const planMatch = contentText.match(/<plan>([\s\S]*?)<\/plan>/);
    if (!planMatch) {
      console.error('[Refine] Failed to locate plan tags in response:', contentText);
      return NextResponse.json({ error: 'Failed to refine plan: AI response format error' }, { status: 500 });
    }

    let refinedPlan = null;
    try {
      refinedPlan = JSON.parse(planMatch[1].trim());
    } catch (e: any) {
      console.error('[Refine] JSON parse error:', e.message, planMatch[1]);
      return NextResponse.json({ error: 'Failed to parse refined plan JSON' }, { status: 500 });
    }

    // Determine the structure to write back to the database
    const oldMetadata = typeof currentPlanText === 'string' ? JSON.parse(currentPlanText) : currentPlanText;
    
    let newRollbackMetadata = {};
    if (oldMetadata.plan) {
      newRollbackMetadata = {
        ...oldMetadata,
        plan: refinedPlan.plan || refinedPlan
      };
    } else {
      newRollbackMetadata = refinedPlan;
    }

    // 3. Update database record
    const { data: updatedDep, error: updateErr } = await adminSupabase
      .from('deployments')
      .update({
        rollback_metadata: JSON.stringify(newRollbackMetadata)
      })
      .eq('id', deploymentId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to save refined plan to database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      plan: refinedPlan.plan || refinedPlan,
      deployment: updatedDep
    });
  } catch (err: any) {
    console.error('[Refine] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
