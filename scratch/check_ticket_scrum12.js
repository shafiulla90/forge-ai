require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const ticketKey = 'SCRUM-12';
  const { data: dep } = await supabase
    .from('deployments')
    .select('*')
    .eq('jira_ticket_id', ticketKey)
    .single();

  if (dep) {
    console.log("Deployment plan for SCRUM-12:");
    console.log(JSON.stringify(JSON.parse(dep.rollback_metadata || '{}'), null, 2));
  } else {
    console.log("No deployment record found for SCRUM-12");
  }
}

run();
