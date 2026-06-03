require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { createSalesforceConnection } = require('../lib/salesforce');

async function run() {
  const qaOrgId = '8af97b72-78b0-42a0-9c1c-a0e347b4d208'; // covenant synergy private limited QA sandbox ID
  
  try {
    const conn = await createSalesforceConnection(qaOrgId, supabase);
    console.log("Connected to Salesforce successfully.");

    // Query Flow definitions using Tooling API
    const query = "SELECT Definition.DeveloperName, VersionNumber, Status, ProcessType FROM Flow WHERE Definition.DeveloperName = 'Contact_Description_Automation'";
    console.log("Querying flow 'Contact_Description_Automation'...");
    const result = await conn.tooling.query(query);
    
    console.log(`Found ${result.records.length} flows:`);
    result.records.forEach(r => {
      console.log(`- Flow: ${r.Definition?.DeveloperName || 'N/A'}, Version: ${r.VersionNumber}, Status: ${r.Status}, ProcessType: ${r.ProcessType}`);
    });
  } catch (err) {
    console.error("Error querying Salesforce flow:", err);
  }
}

run();
