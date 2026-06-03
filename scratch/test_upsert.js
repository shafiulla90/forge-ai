const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const jsforce = require('jsforce');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

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

async function test() {
  const { data: org, error } = await supabase
    .from('orgs')
    .select('*')
    .limit(1)
    .single();

  if (error || !org) {
    console.error('No org found:', error);
    return;
  }

  const accessToken = decrypt(org.access_token);
  const refreshToken = decrypt(org.refresh_token);

  console.log('Connecting to org:', org.alias, 'at:', org.instance_url);

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

  const metadata = {
    fullName: "Account.Account_Status__c",
    label: "Account Status",
    type: "Picklist",
    required: false,
    valueSet: {
      restricted: true,
      valueSetDefinition: {
        sorted: false,
        value: [
          { fullName: "Premium Customer", default: false, label: "Premium Customer" },
          { fullName: "Standard Customer", default: false, label: "Standard Customer" }
        ]
      }
    }
  };

  try {
    const result = await conn.metadata.upsert('CustomField', metadata);
    console.log('Upsert result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Upsert failed with error:', err);
  }
}
test();
