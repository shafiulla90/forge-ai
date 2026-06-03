require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: deploys, error } = await supabase
    .from('deployments')
    .select('*, orgs(*)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching deployments:", error);
    return;
  }

  console.log("Found", deploys.length, "recent deployments:");
  for (const dep of deploys) {
    console.log(`\n=============================================`);
    console.log(`Deployment ID: ${dep.id}`);
    console.log(`Jira Ticket: ${dep.jira_ticket_id}`);
    console.log(`Status: ${dep.status}`);
    console.log(`Org Alias: ${dep.orgs?.alias || 'Unknown'}`);
    console.log(`Created At: ${dep.created_at}`);

    // Fetch steps
    const { data: steps } = await supabase
      .from('deployment_steps')
      .select('*')
      .eq('deployment_id', dep.id)
      .order('created_at', { ascending: true });

    if (steps && steps.length > 0) {
      console.log(`Steps (${steps.length}):`);
      steps.forEach((step, idx) => {
        console.log(`  [${idx + 1}] ${step.description} -- Status: ${step.status}`);
        if (step.error_message) {
          console.log(`      Error/Info: ${step.error_message.substring(0, 300)}`);
        }
      });
    } else {
      console.log(`No steps recorded.`);
    }
  }
}

run();
