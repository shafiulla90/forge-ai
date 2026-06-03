require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const ticketKey = 'SCRUM-16';
  
  // We can fetch ticket details from jira_tickets or by invoking the local api
  // Let's query the jira_tickets table or deployments
  const { data: dep } = await supabase
    .from('deployments')
    .select('*')
    .eq('jira_ticket_id', ticketKey)
    .single();

  if (dep) {
    console.log("Deployment plan (rollback_metadata):");
    console.log(JSON.stringify(JSON.parse(dep.rollback_metadata || '{}'), null, 2));
  } else {
    console.log("No deployment record found for ticket:", ticketKey);
  }
}

run();
