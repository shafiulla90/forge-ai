import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const mode = searchParams.get('mode');

  // After OAuth, redirect to the callback page so the popup can notify parent and close itself
  const redirectTarget = new URL('/jira/callback', req.nextUrl.origin);

  if (!code) {
    redirectTarget.searchParams.set('error', 'Missing OAuth code');
    return NextResponse.redirect(redirectTarget);
  }

  // Decode stashed settings from state parameter
  let siteUrl = 'https://acme-corp.atlassian.net';
  let projectKey = 'SFDC';
  let ticketType = 'Story';
  let workflow = 'auto-deploy';
  let importTicket = '';

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      if (decoded.siteUrl) siteUrl = decoded.siteUrl;
      if (decoded.projectKey) projectKey = decoded.projectKey;
      if (decoded.ticketType) ticketType = decoded.ticketType;
      if (decoded.workflow) workflow = decoded.workflow;
      if (decoded.importTicket) importTicket = decoded.importTicket;
    } catch (e) {
      console.error('[Jira Callback] Failed to decode state:', e);
    }
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirectTarget.searchParams.set('error', 'Unauthorized');
    return NextResponse.redirect(redirectTarget);
  }

  if (importTicket) {
    redirectTarget.searchParams.set('importTicket', importTicket);
  }

  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;

  // 1. Mock Connection Flow
  if (mode === 'mock' || !clientId || !clientSecret) {
    console.log('[Jira Callback] Registering mock Jira connection.');

    const mockAccessToken = 'mock_access_token_' + Math.random().toString(36).substring(2, 10);
    const mockRefreshTokenPayload = JSON.stringify({
      refresh_token: 'mock_refresh_token_123',
      default_ticket_type: ticketType,
      approval_workflow: workflow,
      importTicket
    });

    const encryptedAccess = encrypt(mockAccessToken);
    const encryptedRefresh = encrypt(mockRefreshTokenPayload);

    // Check if a connection already exists
    const { data: existing } = await supabase
      .from('jira_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('jira_connections')
        .update({
          site_url: siteUrl,
          project_key: projectKey,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
        })
        .eq('id', existing.id);
        
      if (updateErr) console.error('[Jira Callback] Update error:', updateErr);
    } else {
      const { error: insertErr } = await supabase
        .from('jira_connections')
        .insert({
          user_id: user.id,
          site_url: siteUrl,
          project_key: projectKey,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
        });

      if (insertErr) console.error('[Jira Callback] Insert error:', insertErr);
    }

    // Also update legacy user_configs table for cross-compatibility
    try {
      const legacyTokens = JSON.stringify({
        access_token: mockAccessToken,
        refresh_token: 'mock_refresh_token_123',
        site_url: siteUrl,
        project_key: projectKey,
        is_mock: true
      });
      await supabase
        .from('user_configs')
        .upsert({
          user_id: user.id,
          jira_tokens: encrypt(legacyTokens)
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('[Jira Callback] Failed to write legacy configs:', e);
    }

    redirectTarget.searchParams.set('connected', 'true');
    return NextResponse.redirect(redirectTarget);
  }

  // 2. Real OAuth Consent Flow
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/jira/callback`;
    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${errText}`);
    }

    const tokens = await tokenRes.json();
    const liveAccessToken = tokens.access_token;
    const liveRefreshToken = tokens.refresh_token;

    const refreshTokenPayload = JSON.stringify({
      refresh_token: liveRefreshToken,
      default_ticket_type: ticketType,
      approval_workflow: workflow,
      importTicket
    });

    const encryptedAccess = encrypt(liveAccessToken);
    const encryptedRefresh = encrypt(refreshTokenPayload);

    // Save to connections
    const { data: existing } = await supabase
      .from('jira_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('jira_connections')
        .update({
          site_url: siteUrl,
          project_key: projectKey,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('jira_connections')
        .insert({
          user_id: user.id,
          site_url: siteUrl,
          project_key: projectKey,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh
        });
    }

    // Legacy fallback update
    try {
      const legacyTokens = JSON.stringify({
        access_token: liveAccessToken,
        refresh_token: liveRefreshToken,
        site_url: siteUrl,
        project_key: projectKey,
        is_mock: false
      });
      await supabase
        .from('user_configs')
        .upsert({
          user_id: user.id,
          jira_tokens: encrypt(legacyTokens)
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('[Jira Callback] Legacy callback write failed:', e);
    }

    redirectTarget.searchParams.set('connected', 'true');
  } catch (err: any) {
    console.error('[Jira Callback] Live exchange failed:', err);
    redirectTarget.searchParams.set('error', err.message || 'Token exchange failed');
  }

  return NextResponse.redirect(redirectTarget);
}
