const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('id, jira_ticket_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching deployments:', error);
    return;
  }
  console.log(`Found ${deployments.length} deployments:`);
  deployments.forEach(d => {
    console.log(`ID: ${d.id}, Ticket: ${d.jira_ticket_id}, Status: ${d.status}, Created: ${d.created_at}`);
  });
}
check();
