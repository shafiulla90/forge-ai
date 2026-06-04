import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'
import jsforce from 'jsforce'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  console.log('[SF Callback] Received code:', code ? 'yes' : 'no', 'error:', error)

  // Check for errors from Salesforce
  if (error || !code) {
    const errorDesc = searchParams.get('error_description') || 'Unknown error'
    console.error('[SF Callback] OAuth error:', error, errorDesc)
    return new NextResponse(`OAuth Error from Salesforce: ${error} - ${errorDesc}`, { status: 400 })
  }

  // Verify state parameter (CSRF protection)
  const storedState = request.cookies.get('sf_oauth_state')?.value
  const codeVerifier = request.cookies.get('sf_code_verifier')?.value
  const oauthLoginUrl = request.cookies.get('sf_oauth_login_url')?.value || process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
  const customAlias = request.cookies.get('sf_oauth_alias')?.value
  const stage = request.cookies.get('sf_oauth_stage')?.value || ''
  const type = request.cookies.get('sf_oauth_type')?.value || ''

  if (!storedState || storedState !== state) {
    console.error('[SF Callback] State mismatch. Expected:', storedState, 'Got:', state)
    return new NextResponse(`State mismatch. Expected: ${storedState}, Got: ${state}`, { status: 400 })
  }

  if (!codeVerifier) {
    console.error('[SF Callback] Missing code verifier.')
    return new NextResponse(`Missing code verifier cookie. Please ensure you are not using incognito mode without allowing cookies, and try again without refreshing this page.`, { status: 400 })
  }

  try {
    // Dynamic Client ID and Secret selection based on target environment with fallback
    const defaultClientId = (process.env.SALESFORCE_CLIENT_ID || '').trim();
    const defaultClientSecret = (process.env.SALESFORCE_CLIENT_SECRET || '').trim();
    let clientId = defaultClientId;
    let clientSecret = defaultClientSecret;

    if (stage === 'uat') {
      clientId = (process.env.SALESFORCE_UAT_CLIENT_ID || '').trim() || defaultClientId;
      clientSecret = (process.env.SALESFORCE_UAT_CLIENT_SECRET || '').trim() || defaultClientSecret;
    } else if (stage === 'qa') {
      clientId = (process.env.SALESFORCE_QA_CLIENT_ID || '').trim() || defaultClientId;
      clientSecret = (process.env.SALESFORCE_QA_CLIENT_SECRET || '').trim() || defaultClientSecret;
    } else if (type === 'developer') {
      clientId = (process.env.SALESFORCE_DEV_CLIENT_ID || '').trim() || defaultClientId;
      clientSecret = (process.env.SALESFORCE_DEV_CLIENT_SECRET || '').trim() || defaultClientSecret;
    }

    const redirectUri = (process.env.SALESFORCE_REDIRECT_URI || `${appUrl}/api/auth/salesforce/callback`).trim();

    // Exchange authorization code for tokens dynamically using the target login URL domain
    const tokenUrl = `${oauthLoginUrl.trim()}/services/oauth2/token`
    console.log('[SF Callback] Exchanging code at:', tokenUrl, 'with Client ID:', clientId)

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }),
    })

    const tokens = await tokenRes.json()
    console.log('[SF Callback] Token response status:', tokenRes.status)
    console.log('[SF Callback] Token keys:', Object.keys(tokens))

    if (!tokens.access_token) {
      console.error('[SF Callback] Token exchange failed:', JSON.stringify(tokens, null, 2))
      return new NextResponse(`Token exchange failed: ${JSON.stringify(tokens)}`, { status: 400 })
    }

    // Success! Prepare token data
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      instance_url: tokens.instance_url,
      issued_at: tokens.issued_at,
    }

    // 1. Encrypt sensitive tokens
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = encrypt(tokens.refresh_token)

    // 2. Get Supabase client and user
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[SF Callback] No authenticated user found:', userError)
      return new NextResponse(`No authenticated user found in Supabase. Are you logged in? Error: ${JSON.stringify(userError)}`, { status: 401 })
    }

    // 3. Extract Org ID from the 'id' field (usually https://login.salesforce.com/id/ORG_ID/USER_ID)
    const orgIdMatch = tokens.id.match(/\/id\/([a-zA-Z0-9]+)\//)
    const salesforceOrgId = orgIdMatch ? orgIdMatch[1] : tokens.id

    // 4. Query actual Organization Name from Salesforce
    let orgName = `Org ${salesforceOrgId.substring(0, 5)}`
    try {
      const conn = new jsforce.Connection({
        instanceUrl: tokens.instance_url,
        accessToken: tokens.access_token,
      })
      const orgQuery = await conn.query('SELECT Name FROM Organization LIMIT 1')
      if (orgQuery.records && orgQuery.records.length > 0) {
        const fetchedName = (orgQuery.records[0] as any).Name
        if (fetchedName) {
          orgName = fetchedName
          console.log('[SF Callback] Retrieved actual organization name:', orgName)
        }
      }
    } catch (err) {
      console.error('[SF Callback] Failed to fetch organization name from Salesforce:', err)
    }

    // 5. Upsert into 'orgs' table (using select then insert/update to avoid constraint errors)
    const payload = {
      user_id: user.id,
      org_id: salesforceOrgId,
      alias: customAlias || orgName,
      instance_url: tokens.instance_url,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      org_type: tokens.instance_url.includes('sandbox') ? 'sandbox' : 'production',
      client_id: clientId,
      client_secret: clientSecret,
      updated_at: new Date().toISOString(),
    }

    const { data: existingOrg } = await supabase
      .from('orgs')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', salesforceOrgId)
      .maybeSingle()

    let orgData
    let dbError

    if (existingOrg) {
      const { data, error } = await supabase
        .from('orgs')
        .update(payload)
        .eq('id', existingOrg.id)
        .select()
        .single()
      orgData = data
      dbError = error
    } else {
      const { data, error } = await supabase
        .from('orgs')
        .insert(payload)
        .select()
        .single()
      orgData = data
      dbError = error
    }

    if (dbError) {
      console.error('[SF Callback] Database error:', dbError)
      return new NextResponse(`Database save failed! Error: ${JSON.stringify(dbError)}`, { status: 500 })
    }

    console.log('[SF Callback] Successfully saved org to database:', orgData.id)

    // 5. Redirect to dashboard
    const response = NextResponse.redirect(`${appUrl}/dashboard?orgId=${orgData.id}`)

    // Clear OAuth temporary cookies
    response.cookies.delete('sf_oauth_state')
    response.cookies.delete('sf_code_verifier')
    response.cookies.delete('sf_oauth_login_url')
    response.cookies.delete('sf_oauth_alias')
    response.cookies.delete('sf_oauth_stage')

    // Optional: Also set the sf_tokens cookie if the dashboard still relies on it!
    const encryptedForClient = encrypt(JSON.stringify(tokenData))
    response.cookies.set('sf_tokens', encryptedForClient, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    return response
  } catch (err: any) {
    console.error('[SF Callback] Exception during token exchange:', err)
    return new NextResponse(`Exception during token exchange: ${err.message}`, { status: 500 })
  }
}
