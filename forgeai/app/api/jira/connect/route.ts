import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  // Extract query parameters for connection settings
  const { searchParams } = new URL(req.url);
  const siteUrl = searchParams.get('siteUrl') || '';
  const projectKey = searchParams.get('projectKey') || '';
  const ticketType = searchParams.get('ticketType') || '';
  const workflow = searchParams.get('workflow') || '';
  const importTicket = searchParams.get('importTicket') || '';

  // Check if user already has a Jira connection; if so, skip the OAuth flow
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!authError && user) {
    const { data: conn } = await supabase
      .from('jira_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (conn) {
      // Already connected – redirect to the callback page so the popup closes and parent knows
      const callbackUrl = new URL('/jira/callback', req.url);
      callbackUrl.searchParams.set('connected', 'true');
      return NextResponse.redirect(callbackUrl.toString());
    }
  }

  // No existing connection – proceed to Atlassian OAuth flow
  // Forward the connection settings to the auth endpoint so they can be persisted after OAuth
  const authUrl = new URL('/api/auth/jira', req.url);
  if (siteUrl) authUrl.searchParams.set('siteUrl', siteUrl);
  if (projectKey) authUrl.searchParams.set('projectKey', projectKey);
  if (ticketType) authUrl.searchParams.set('ticketType', ticketType);
  if (workflow) authUrl.searchParams.set('workflow', workflow);
  if (importTicket) authUrl.searchParams.set('importTicket', importTicket);
  return NextResponse.redirect(authUrl.toString());
}
