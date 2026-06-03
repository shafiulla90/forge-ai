import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  let siteUrl = searchParams.get('siteUrl') || 'https://acme-corp.atlassian.net';
  let projectKey = searchParams.get('projectKey') || 'SFDC';
  const ticketType = searchParams.get('ticketType') || 'Story';
  const workflow = searchParams.get('workflow') || 'auto-deploy';
  let importTicket = searchParams.get('importTicket') || '';

  // Automatically clean up user inputs if they pasted a browse URL or long project title
  let extractedKey = '';
  const browseMatch = siteUrl.match(/\/browse\/(([A-Z0-9]+)-[0-9]+)/i);
  if (browseMatch) {
    importTicket = browseMatch[1].toUpperCase();
    extractedKey = browseMatch[2].toUpperCase();
  }

  const domainMatch = siteUrl.match(/^(https?:\/\/[^\/]+)/i);
  if (domainMatch) {
    siteUrl = domainMatch[1];
  }

  if (extractedKey) {
    projectKey = extractedKey;
  } else if (projectKey.length > 10) {
    projectKey = 'SCRUM';
  }

  // Package settings in the state parameter
  const stateData = { siteUrl, projectKey, ticketType, workflow, importTicket };
  const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

  const clientId = process.env.JIRA_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/jira/callback`;

  // Fallback to Mock flow if Client ID is not configured
  if (!clientId) {
    console.log('[Jira OAuth] Client credentials not found. Falling back to simulated connection.');
    const mockCallbackUrl = new URL('/api/auth/jira/callback', req.nextUrl.origin);
    mockCallbackUrl.searchParams.set('code', 'mock_auth_code_987');
    mockCallbackUrl.searchParams.set('state', encodedState);
    mockCallbackUrl.searchParams.set('mode', 'mock');
    return NextResponse.redirect(mockCallbackUrl);
  }

  // Real OAuth consent redirect
  const authUrl = new URL('https://auth.atlassian.com/authorize');
  authUrl.searchParams.set('audience', 'api.atlassian.com');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', 'read:jira-work write:jira-work read:jira-user offline_access');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', encodedState);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}
