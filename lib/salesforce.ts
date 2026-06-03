import jsforce from 'jsforce';
import { createClient } from './supabase/server';
import { decrypt, encrypt } from './encryption';

export async function createSalesforceConnection(orgId: string, supabaseClient?: any) {
  const supabase = supabaseClient || await createClient();
  
  // 1. Fetch org from DB
  const { data: org, error } = await supabase
    .from('orgs')
    .select('*')
    .eq('id', orgId)
    .single();
    
  if (error || !org) {
    throw new Error(`Org not found: ${error?.message || 'Unknown error'}`);
  }
  
  // 2. Decrypt tokens
  const accessToken = decrypt(org.access_token);
  const refreshToken = decrypt(org.refresh_token);
  
  // Dynamic Client ID and Secret selection based on target environment URL
  let clientId = (process.env.SALESFORCE_CLIENT_ID || '').trim();
  let clientSecret = (process.env.SALESFORCE_CLIENT_SECRET || '').trim();

  const url = org.instance_url || '';
  if (url.includes('uat')) {
    clientId = (process.env.SALESFORCE_UAT_CLIENT_ID || '').trim();
    clientSecret = (process.env.SALESFORCE_UAT_CLIENT_SECRET || '').trim();
  } else if (url.includes('shafi')) {
    clientId = (process.env.SALESFORCE_QA_CLIENT_ID || '').trim();
    clientSecret = (process.env.SALESFORCE_QA_CLIENT_SECRET || '').trim();
  } else if (url.includes('forgeaidevorg')) {
    clientId = (process.env.SALESFORCE_DEV_CLIENT_ID || '').trim();
    clientSecret = (process.env.SALESFORCE_DEV_CLIENT_SECRET || '').trim();
  }

  // 4. Create Connection
  const conn = new jsforce.Connection({
    oauth2: {
      clientId,
      clientSecret,
      redirectUri: process.env.SALESFORCE_REDIRECT_URI,
      loginUrl: org.instance_url,
    },
    instanceUrl: org.instance_url,
    accessToken,
    refreshToken,
  });
  
  // 4. Handle auto-refresh
  conn.on('refresh', async (newAccessToken, res) => {
    console.log('[JSforce] Token refreshed for org:', orgId);
    
    // Encrypt new access token
    const encryptedAccessToken = encrypt(newAccessToken);
    
    // Update DB
    const { error: updateError } = await supabase
      .from('orgs')
      .update({
        access_token: encryptedAccessToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId);
      
    if (updateError) {
      console.error('[JSforce] Failed to update refreshed token in DB:', updateError);
    }
  });

  // 5. Auto-correct default alias if it's still 'Org 00Dxx' or generic 'Org XXXXX'
  const isDefaultAlias = org.alias && /^Org [a-zA-Z0-9]{5}$/.test(org.alias);
  if (isDefaultAlias) {
    // Run this asynchronously so we do not block returning the connection
    (async () => {
      try {
        const orgQuery = await conn.query('SELECT Name FROM Organization LIMIT 1');
        if (orgQuery.records && orgQuery.records.length > 0) {
          const actualName = (orgQuery.records[0] as any).Name;
          if (actualName) {
            console.log('[JSforce] Auto-correcting default alias to actual org name:', actualName);
            await supabase
              .from('orgs')
              .update({
                alias: actualName,
                updated_at: new Date().toISOString(),
              })
              .eq('id', orgId);
          }
        }
      } catch (err) {
        console.error('[JSforce] Failed to auto-correct default org alias:', err);
      }
    })();
  }
  
  return conn;
}
