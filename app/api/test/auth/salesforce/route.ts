import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SALESFORCE_CLIENT_ID!,
    redirect_uri: process.env.SALESFORCE_REDIRECT_URI!,
    scope: 'api refresh_token offline_access full visualforce',
    prompt: 'login',
  })

  // For Developer Edition orgs created from ISV partner org
  const authUrl = `https://forgeaidevorg-dev-ed.develop.my.salesforce.com/services/oauth2/authorize?${params.toString()}`
  
  return NextResponse.redirect(authUrl)
}