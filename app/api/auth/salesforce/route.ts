import { NextResponse } from 'next/server'
import crypto from 'crypto'

function base64URLEncode(buffer: Buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function GET(request: Request) {
  console.log('--- OAuth Init ---');
  
  // Extract type, alias and stage from query parameters
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'production';
  const alias = searchParams.get('alias') || '';
  const stage = searchParams.get('stage') || '';

  // Dynamic Client ID selection based on target environment (with fallback)
  const defaultClientId = (process.env.SALESFORCE_CLIENT_ID || '').trim();
  let clientId = defaultClientId;

  if (stage === 'uat') {
    clientId = (process.env.SALESFORCE_UAT_CLIENT_ID || '').trim() || defaultClientId;
  } else if (stage === 'qa') {
    clientId = (process.env.SALESFORCE_QA_CLIENT_ID || '').trim() || defaultClientId;
  } else if (type === 'developer') {
    clientId = (process.env.SALESFORCE_DEV_CLIENT_ID || '').trim() || defaultClientId;
  }

  if (!clientId) {
    console.error('[SF Auth] Selected Client ID is not set!');
    return new NextResponse('Server configuration error: Missing Salesforce Client ID', { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || `${requestUrl.protocol}//${requestUrl.host}`;
  const rawRedirect = (process.env.SALESFORCE_REDIRECT_URI || `${appBaseUrl}/api/auth/salesforce/callback`).trim();
  const redirectUri = rawRedirect.replace(/\/+$/, '');

  // ─── LOGIN DOMAIN ────────────────────────────────────────────────────────────
  // This is the ONLY thing that changes per org type:
  //   Production  → login.salesforce.com
  //   Developer   → login.salesforce.com  (same as production)
  //   Sandbox     → test.salesforce.com
  //   Scratch     → test.salesforce.com   (scratch orgs are sandboxes)
  let targetLoginUrl: string;
  switch (type) {
    case 'sandbox':
    case 'scratch':
      targetLoginUrl = 'https://test.salesforce.com';
      break;
    case 'production':
    case 'developer':
    default:
      targetLoginUrl = 'https://login.salesforce.com';
      break;
  }

  // ─── PKCE Generation ─────────────────────────────────────────────────────────
  const verifierBuffer = crypto.randomBytes(32);
  const codeVerifier = base64URLEncode(verifierBuffer);
  const challengeBuffer = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64URLEncode(challengeBuffer);
  const state = crypto.randomBytes(16).toString('hex');

  console.log('[SF Auth] Type:', type, '| Login URL:', targetLoginUrl);
  console.log('[SF Auth] Client ID:', clientId.substring(0, 12) + '...');
  console.log('[SF Auth] Redirect URI:', redirectUri);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'api refresh_token full',
    prompt: 'login consent',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${targetLoginUrl}/services/oauth2/authorize?${params.toString()}`;
  console.log('[SF Auth] Redirecting to:', authUrl);

  const response = NextResponse.redirect(authUrl);
  
  // Store temporary OAuth state in cookies (server-side only, never exposed to user)
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    sameSite: 'lax' as const,
    path: '/',
  };

  response.cookies.set('sf_oauth_state', state, cookieOpts);
  response.cookies.set('sf_code_verifier', codeVerifier, cookieOpts);
  response.cookies.set('sf_oauth_login_url', targetLoginUrl, cookieOpts);
  response.cookies.set('sf_oauth_type', type, cookieOpts);

  if (alias) {
    response.cookies.set('sf_oauth_alias', alias, cookieOpts);
  }
  if (stage) {
    response.cookies.set('sf_oauth_stage', stage, cookieOpts);
  }

  return response;
}
