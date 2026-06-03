import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';
import { createClient } from '@/lib/supabase/server';
import jsforce from 'jsforce';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
    }

    console.log(`[SFDX Connect] Connecting org for username: ${username}`);

    // 1. Retrieve current authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[SFDX Connect] No authenticated user found:', userError);
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Fetch credentials using SF CLI
    let accessToken = '';
    let refreshToken = '';
    let instanceUrl = '';
    let salesforceOrgId = '';
    let clientId = 'PlatformCLI';
    let sfdxAlias = '';

    try {
      let output = '';
      try {
        output = execSync(`sf org display --target-org ${username} --verbose --json`, { stdio: 'pipe' }).toString();
      } catch (e) {
        output = execSync(`sfdx force:org:display --targetusername ${username} --verbose --json`, { stdio: 'pipe' }).toString();
      }

      const res = JSON.parse(output);
      if (res.status === 0 && res.result) {
        const result = res.result;
        accessToken = result.accessToken || '';
        instanceUrl = result.instanceUrl || '';
        salesforceOrgId = result.id || '';
        clientId = result.clientId || 'PlatformCLI';
        sfdxAlias = result.alias || '';

        // Extract refresh token from sfdxAuthUrl if present
        if (result.sfdxAuthUrl) {
          const match = result.sfdxAuthUrl.match(/force:\/\/(?:([^:]+):([^:]*):)?([^@]+)@/);
          if (match) {
            refreshToken = match[3];
          }
        }
      }
    } catch (cliError: any) {
      console.warn('[SFDX Connect] SF CLI display failed, trying local file fallback...', cliError.message);

      // Fallback: Read directly from local file
      const filePath = path.join(os.homedir(), '.sfdx', `${username}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          accessToken = fileContent.accessToken || '';
          refreshToken = fileContent.refreshToken || '';
          instanceUrl = fileContent.instanceUrl || fileContent.loginUrl || '';
          salesforceOrgId = fileContent.orgId || '';
          clientId = fileContent.clientId || 'PlatformCLI';
        } catch (fileError: any) {
          console.error('[SFDX Connect] Local file reading failed:', fileError);
        }
      }
    }

    if (!accessToken || !instanceUrl) {
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve active session access token for this org.'
      }, { status: 400 });
    }

    // 3. Query actual Organization Name from Salesforce using jsforce
    let orgName = sfdxAlias || `Org ${salesforceOrgId.substring(0, 5)}`;
    try {
      const conn = new jsforce.Connection({
        instanceUrl,
        accessToken,
      });
      const orgQuery = await conn.query('SELECT Name FROM Organization LIMIT 1');
      if (orgQuery.records && orgQuery.records.length > 0) {
        const fetchedName = (orgQuery.records[0] as any).Name;
        if (fetchedName) {
          orgName = fetchedName;
          console.log('[SFDX Connect] Retrieved actual organization name:', orgName);
        }
      }
    } catch (err) {
      console.error('[SFDX Connect] Failed to fetch organization name from Salesforce:', err);
    }

    // 4. Encrypt sensitive tokens for DB storage
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : '';

    // 5. Upsert organization details in database
    const payload = {
      user_id: user.id,
      org_id: salesforceOrgId,
      alias: orgName,
      instance_url: instanceUrl,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      org_type: instanceUrl.includes('sandbox') ? 'sandbox' : 'production',
      updated_at: new Date().toISOString(),
    };

    const { data: existingOrg } = await supabase
      .from('orgs')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', salesforceOrgId)
      .maybeSingle();

    let orgData;
    let dbError;

    if (existingOrg) {
      const { data, error } = await supabase
        .from('orgs')
        .update(payload)
        .eq('id', existingOrg.id)
        .select()
        .single();
      orgData = data;
      dbError = error;
    } else {
      const { data, error } = await supabase
        .from('orgs')
        .insert(payload)
        .select()
        .single();
      orgData = data;
      dbError = error;
    }

    if (dbError || !orgData) {
      console.error('[SFDX Connect] Database upsert failed:', dbError);
      return NextResponse.json({ success: false, error: 'Database save failed' }, { status: 500 });
    }

    console.log('[SFDX Connect] Successfully saved org to database:', orgData.id);

    // 6. Construct response and set the encrypted sf_tokens cookie
    const tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      instance_url: instanceUrl,
      issued_at: Date.now().toString(),
    };

    const encryptedForClient = encrypt(JSON.stringify(tokenData));
    const response = NextResponse.json({ success: true, orgId: orgData.id });
    
    response.cookies.set('sf_tokens', encryptedForClient, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return response;
  } catch (error: any) {
    console.error('[SFDX Connect] Exception during org connection:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
