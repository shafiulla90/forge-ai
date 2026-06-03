require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('*, orgs(*)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching deployments:', error);
    return;
  }

  for (const dep of deployments) {
    console.log('================================================--');
    console.log(`Deployment ID: ${dep.id}`);
    console.log(`Status: ${dep.status}`);
    console.log(`Org: ${dep.orgs?.alias} (${dep.orgs?.id}) - ${dep.orgs?.instance_url}`);
    console.log(`Jira Ticket: ${dep.jira_ticket_id}`);
    
    const { data: steps } = await supabase
      .from('deployment_steps')
      .select('*')
      .eq('deployment_id', dep.id);
      
    console.log('Steps:');
    steps.forEach(s => {
      console.log(` - [${s.status}] ${s.description}: ${s.error_message || ''}`);
    });
  }
})();
