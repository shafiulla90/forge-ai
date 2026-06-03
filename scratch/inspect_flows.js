require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { createSalesforceConnection } = require('../lib/salesforce');

async function run() {
  const qaOrgId = '14ed8e0d-dab4-4160-80e9-c066e9af7011';
  
  try {
    const conn = await createSalesforceConnection(qaOrgId, supabase);
    console.log("Connected to Salesforce QA Sandbox successfully.");

    // Query Flow definitions using Tooling API or standard query
    // In Salesforce, we can query FlowVersion or Flow
    const query = "SELECT Definition.DeveloperName, VersionNumber, Status, ProcessType FROM Flow WHERE Status = 'Active' OR Status = 'Draft' OR Status = 'Obsolete'";
    console.log("Executing query on Flow object via Tooling API...");
    const result = await conn.tooling.query(query);
    
    console.log(`Found ${result.records.length} flows:`);
    result.records.forEach(r => {
      console.log(`- Flow: ${r.Definition?.DeveloperName || 'N/A'}, Version: ${r.VersionNumber}, Status: ${r.Status}, ProcessType: ${r.ProcessType}`);
    });
  } catch (err) {
    console.error("Error inspecting Salesforce flows:", err);
  }
}

run();
