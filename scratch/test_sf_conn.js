const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const jsforce = require('jsforce');

function decrypt(text) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not defined');
  }
  const parts = text.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  const [ivHex, authTagHex, encryptedText] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: orgs } = await supabase.from('orgs').select('*');
  const org = orgs[0];
  
  try {
    const accessToken = decrypt(org.access_token);
    const refreshToken = decrypt(org.refresh_token);
    let clientId = (process.env.SALESFORCE_UAT_CLIENT_ID || process.env.SALESFORCE_CLIENT_ID || '').trim();
    let clientSecret = (process.env.SALESFORCE_UAT_CLIENT_SECRET || process.env.SALESFORCE_CLIENT_SECRET || '').trim();
    
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
    
    console.log('Querying Apex Code Coverage Aggregate...');
    const result = await conn.tooling.query(
      'SELECT ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered FROM ApexCodeCoverageAggregate ORDER BY NumLinesUncovered DESC LIMIT 5'
    );
    console.log('Low coverage classes sample:', result.records);

  } catch (err) {
    console.error('Error:', err);
  }
}
run();
