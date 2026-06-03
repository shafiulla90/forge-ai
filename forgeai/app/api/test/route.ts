import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.SALESFORCE_CLIENT_ID!.trim()
  const redirectUri = process.env.SALESFORCE_REDIRECT_URI!.trim()
  const loginUrl = process.env.SALESFORCE_LOGIN_URL!.trim()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'api refresh_token offline_access full visualforce',
    prompt: 'login',
  })

  const authUrl = `${loginUrl}/services/oauth2/authorize?${params.toString()}`
  console.log('Auth URL:', authUrl)

  return NextResponse.redirect(authUrl)
}