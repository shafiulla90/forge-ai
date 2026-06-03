require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const jsforce = require('jsforce');
const crypto = require('crypto');

// Mock createClient, decrypt, encrypt to match salesforce.ts implementation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function decrypt(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    if (authTag.length !== 16) {
      throw new Error('Invalid authentication tag length');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('[Encryption] Decryption failed:', err.message);
    return '';
  }
}

async function run() {
  const orgId = 'edff1e9c-aaf3-4ba1-8f83-6c4e8fbe8bc8';
  console.log('Fetching org from DB...');
  const { data: org, error } = await supabase
    .from('orgs')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    console.error('Org not found:', error);
    return;
  }

  console.log('Current alias:', org.alias);

  const accessToken = decrypt(org.access_token);
  const refreshToken = decrypt(org.refresh_token);

  console.log('Creating jsforce Connection...');
  const conn = new jsforce.Connection({
    oauth2: {
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      redirectUri: process.env.SALESFORCE_REDIRECT_URI,
      loginUrl: process.env.SALESFORCE_LOGIN_URL,
    },
    instanceUrl: org.instance_url,
    accessToken,
    refreshToken,
  });

  const isDefaultAlias = org.alias && /^Org [a-zA-Z0-9]{5}$/.test(org.alias);
  if (isDefaultAlias) {
    console.log('Detected default alias! Fetching Organization Name from Salesforce...');
    try {
      const orgQuery = await conn.query('SELECT Name FROM Organization LIMIT 1');
      if (orgQuery.records && orgQuery.records.length > 0) {
        const actualName = orgQuery.records[0].Name;
        console.log('Found Organization Name:', actualName);
        if (actualName) {
          const { error: updateError } = await supabase
            .from('orgs')
            .update({
              alias: actualName,
              updated_at: new Date().toISOString()
            })
            .eq('id', orgId);

          if (updateError) {
            console.error('Failed to update alias in DB:', updateError);
          } else {
            console.log('Successfully updated alias in DB to:', actualName);
          }
        }
      }
    } catch (err) {
      console.error('Failed to query organization name:', err);
    }
  } else {
    console.log('Alias is not default, no update needed.');
  }
}
run();
