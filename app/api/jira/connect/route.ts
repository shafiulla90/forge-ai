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
