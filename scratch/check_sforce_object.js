require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const { createSalesforceConnection } = require('../lib/salesforce');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const qaOrgId = '8af97b72-78b0-42a0-9c1c-a0e347b4d208';
  const uatOrgId = '14ed8e0d-dab4-4160-80e9-c066e9af7011';
  
  console.log('Checking QA Sandbox:', qaOrgId);
  try {
    const conn = await createSalesforceConnection(qaOrgId, supabase);
    const describe = await conn.describe('Employee_Asset__c').catch(e => null);
    if (describe) {
      console.log('Employee_Asset__c exists in QA Sandbox!');
      console.log('Fields:', describe.fields.map(f => f.name));
    } else {
      console.log('Employee_Asset__c DOES NOT exist in QA Sandbox.');
    }
  } catch (err) {
    console.error('Error connecting/describing in QA:', err);
  }

  console.log('\nChecking UAT Sandbox:', uatOrgId);
  try {
    const conn = await createSalesforceConnection(uatOrgId, supabase);
    const describe = await conn.describe('Employee_Asset__c').catch(e => null);
    if (describe) {
      console.log('Employee_Asset__c exists in UAT Sandbox!');
      console.log('Fields:', describe.fields.map(f => f.name));
    } else {
      console.log('Employee_Asset__c DOES NOT exist in UAT Sandbox.');
    }
  } catch (err) {
    console.error('Error connecting/describing in UAT:', err);
  }
})();
