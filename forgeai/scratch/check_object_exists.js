require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const jsforce = require('jsforce');
const crypto = require('crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function decrypt(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '';
  }
}

async function checkOrg(orgId, label) {
  console.log(`Checking Salesforce Org: ${label} (${orgId})...`);
  try {
    const { data: org, error } = await supabase.from('orgs').select('*').eq('id', orgId).single();
    if (error || !org) {
      console.error(`Org ${orgId} not found in DB`);
      return;
    }

    const accessToken = decrypt(org.access_token);
    const refreshToken = decrypt(org.refresh_token);

    const conn = new jsforce.Connection({
      oauth2: {
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        redirectUri: process.env.SALESFORCE_REDIRECT_URI,
        loginUrl: org.instance_url,
      },
      instanceUrl: org.instance_url,
      accessToken,
      refreshToken,
    });

    console.log(`- Describing Employee_Asset_Request__c...`);
    try {
      const res = await conn.describe('Employee_Asset_Request__c');
      console.log(`  SUCCESS: Employee_Asset_Request__c exists in ${label}!`);
      console.log(`  Fields:`, res.fields.map(f => f.name));
    } catch (e) {
      console.log(`  NOT FOUND: Employee_Asset_Request__c does not exist in ${label}! Error: ${e.message}`);
    }

    console.log(`- Describing Auto_Update_Account_Status flow...`);
    try {
      const res = await conn.metadata.read('Flow', 'Auto_Update_Account_Status');
      if (res && res.fullName) {
        console.log(`  SUCCESS: Flow Auto_Update_Account_Status exists in ${label}! Status: ${res.status}`);
      } else {
        console.log(`  NOT FOUND: Flow Auto_Update_Account_Status does not exist in ${label}`);
      }
    } catch (e) {
      console.log(`  Flow read failed in ${label}: ${e.message}`);
    }

  } catch (err) {
    console.error(`Failed to connect/check ${label}:`, err.message);
  }
}

async function run() {
  // 1. Dev Org
  await checkOrg('edff1e9c-aaf3-4ba1-8f83-6c4e8fbe8bc8', 'Dev Org');
  console.log('====================================');
  // 2. QA Org
  await checkOrg('8af97b72-78b0-42a0-9c1c-a0e347b4d208', 'QA Sandbox');
  console.log('====================================');
  // 3. UAT Org
  await checkOrg('14ed8e0d-dab4-4160-80e9-c066e9af7011', 'UAT Sandbox');
}

run();
