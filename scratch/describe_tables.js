require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // We can query a single row from deployments to see the keys
  const { data: dep } = await supabase
    .from('deployments')
    .select('*')
    .limit(1)
    .single();

  if (dep) {
    console.log("Deployments table columns:", Object.keys(dep));
  } else {
    console.log("No deployments records found to describe.");
  }

  // Also deployment_steps
  const { data: step } = await supabase
    .from('deployment_steps')
    .select('*')
    .limit(1)
    .single();

  if (step) {
    console.log("Deployment steps columns:", Object.keys(step));
  } else {
    console.log("No deployment steps records found to describe.");
  }
}

run();
