require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('deployments')
    .select('id, org_id, status, created_at, rollback_metadata')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching deployments:', error);
    return;
  }

  console.log('Latest deployments:');
  for (const d of data) {
    console.log(`- ID: ${d.id}, Org: ${d.org_id}, Status: ${d.status}, Created: ${d.created_at}`);
    
    // Fetch steps
    const { data: steps, error: stepsErr } = await supabase
      .from('deployment_steps')
      .select('id, description, status, error_message')
      .eq('deployment_id', d.id);
      
    if (stepsErr) {
      console.error(`  Error fetching steps for ${d.id}:`, stepsErr);
    } else {
      console.log(`  Steps (${steps.length}):`);
      steps.forEach(s => {
        console.log(`    * [${s.status}] ${s.description}${s.error_message ? ' - Error: ' + s.error_message : ''}`);
      });
    }
  }
}

run();
