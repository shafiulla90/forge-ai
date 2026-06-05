import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { siteUrl, email, apiToken, projectKey, ticketType, workflow } = await req.json();

    if (!siteUrl || !email || !apiToken) {
      return NextResponse.json({ error: 'Missing required parameters: siteUrl, email, and apiToken are required.' }, { status: 400 });
    }

    // Standardize site URL format
    let cleanSiteUrl = siteUrl.trim();
    if (!cleanSiteUrl.startsWith('http://') && !cleanSiteUrl.startsWith('https://')) {
      cleanSiteUrl = 'https://' + cleanSiteUrl;
    }
    try {
      const u = new URL(cleanSiteUrl);
      cleanSiteUrl = u.origin;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid Jira Site URL format.' }, { status: 400 });
    }

    // Validate Basic Auth credentials against Jira
    console.log(`[Basic Connect] Verifying credentials for ${email} on ${cleanSiteUrl}`);
    const authHeader = `Basic ${Buffer.from(`${email.trim()}:${apiToken.trim()}`).toString('base64')}`;
    
    // We fetch the 'myself' endpoint, which returns profile details if authenticated
    const verifyRes = await fetch(`${cleanSiteUrl}/rest/api/3/myself`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!verifyRes.ok) {
      const status = verifyRes.status;
      const errText = await verifyRes.text();
      console.warn(`[Basic Connect] Validation failed with status ${status}:`, errText);
      return NextResponse.json({ 
        error: `Failed to authenticate with Jira: ${status === 401 ? 'Unauthorized (Invalid Email or API Token)' : `Jira API error (status ${status})`}` 
      }, { status: 400 });
    }

    // If validated, encrypt the credentials
    const encryptedAccess = encrypt(apiToken.trim());
    const refreshTokenPayload = JSON.stringify({
      auth_method: 'basic',
      email: email.trim(),
      api_token: apiToken.trim(),
      default_ticket_type: ticketType || 'Story',
      approval_workflow: workflow || 'auto-deploy',
      importTicket: ''
    });
    const encryptedRefresh = encrypt(refreshTokenPayload);

    // Check if user has an existing connection row
    const { data: existing } = await supabase
      .from('jira_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const cleanProjectKey = (projectKey || 'SFDC').trim().toUpperCase();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('jira_connections')
        .update({
          site_url: cleanSiteUrl,
          project_key: cleanProjectKey,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
        })
        .eq('id', existing.id);
        
      if (updateErr) throw new Error(`Failed to update connection: ${updateErr.message}`);
    } else {
      const { error: insertErr } = await supabase
        .from('jira_connections')
        .insert({
          user_id: user.id,
          site_url: cleanSiteUrl,
          project_key: cleanProjectKey,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
        });

      if (insertErr) throw new Error(`Failed to save connection: ${insertErr.message}`);
    }

    // Sync legacy user_configs for compatibility
    try {
      const legacyTokens = JSON.stringify({
        access_token: apiToken.trim(),
        refresh_token: refreshTokenPayload,
        site_url: cleanSiteUrl,
        project_key: cleanProjectKey,
        is_mock: false
      });
      await supabase
        .from('user_configs')
        .upsert({
          user_id: user.id,
          jira_tokens: encrypt(legacyTokens)
        }, { onConflict: 'user_id' });
    } catch (e: any) {
      console.warn('[Basic Connect] Legacy config write failed:', e.message);
    }

    console.log(`[Basic Connect] Successfully linked Basic Auth Jira workspace for user ${user.id}`);
    return NextResponse.json({ success: true, siteUrl: cleanSiteUrl, projectKey: cleanProjectKey });
  } catch (err: any) {
    console.error('[Basic Connect] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
