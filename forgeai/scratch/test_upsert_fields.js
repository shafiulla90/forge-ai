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

async function run() {
  const orgId = '8af97b72-78b0-42a0-9c1c-a0e347b4d208'; // QA Sandbox
  const { data: org } = await supabase.from('orgs').select('*').eq('id', orgId).single();
  const conn = new jsforce.Connection({
    oauth2: {
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      redirectUri: process.env.SALESFORCE_REDIRECT_URI,
      loginUrl: org.instance_url,
    },
    instanceUrl: org.instance_url,
    accessToken: decrypt(org.access_token),
    refreshToken: decrypt(org.refresh_token),
  });

  const fieldsToTest = [
    {
      fullName: 'Employee_Asset_Request__c.Employee_ID__c',
      type: 'AutoNumber',
      label: 'Employee ID',
      displayFormat: 'EMP-{0000}',
      startingNumber: 1
    },
    {
      fullName: 'Employee_Asset_Request__c.Priority__c',
      type: 'Picklist',
      label: 'Priority',
      valueSet: {
        valueSetDefinition: {
          sorted: false,
          value: [
            { fullName: 'Low', label: 'Low' },
            { fullName: 'Medium', label: 'Medium', default: true },
            { fullName: 'High', label: 'High' }
          ]
        }
      }
    },
    {
      fullName: 'Employee_Asset_Request__c.Request_Date__c',
      type: 'Date',
      label: 'Request Date',
      defaultValue: 'TODAY()'
    },
    {
      fullName: 'Employee_Asset_Request__c.Manager_Approval__c',
      type: 'Checkbox',
      label: 'Manager Approval',
      defaultValue: 'false'
    },
    {
      fullName: 'Employee_Asset_Request__c.Comments__c',
      type: 'LongTextArea',
      label: 'Comments',
      length: 500,
      visibleLines: 3
    }
  ];

  for (const field of fieldsToTest) {
    console.log(`Upserting field ${field.fullName}...`);
    try {
      const res = await conn.metadata.upsert('CustomField', field);
      console.log(`Result:`, JSON.stringify(res));
    } catch (e) {
      console.error(`Error upserting ${field.fullName}:`, e.message);
    }
  }
}

run();
