require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Querying deployments for SCRUM-13...');
  const { data: deps, error: depsErr } = await supabase
    .from('deployments')
    .select('*')
    .eq('jira_ticket_id', 'SCRUM-13')
    .order('created_at', { ascending: false });

  if (depsErr) {
    console.error('Error fetching deployments:', depsErr);
    return;
  }

  for (const dep of deps) {
    console.log('\n=======================================');
    console.log(`Deployment ID: ${dep.id}`);
    console.log(`Status: ${dep.status}`);
    console.log(`Created At: ${dep.created_at}`);

    const { data: steps, error: stepsErr } = await supabase
      .from('deployment_steps')
      .select('*')
      .eq('deployment_id', dep.id)
      .order('created_at', { ascending: true });

    if (stepsErr) {
      console.error('Error fetching steps:', stepsErr);
      continue;
    }

    console.log(`Steps (${steps.length}):`);
    steps.forEach(step => {
      console.log(`- Step: "${step.description}"`);
      console.log(`  Status: ${step.status}`);
      console.log(`  Duration: ${step.duration_ms} ms`);
      console.log(`  Error: ${step.error_message}`);
    });
  }
}
run();
