require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('*, orgs(*)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching deployments:', error);
    return;
  }

  console.log(`Found ${deployments.length} recent deployments:`);
  for (const dep of deployments) {
    console.log('--------------------------------------------------');
    console.log(`Deployment ID: ${dep.id}`);
    console.log(`Ticket Key: ${dep.jira_ticket_id}`);
    console.log(`Status: ${dep.status}`);
    console.log(`Org: ${dep.orgs?.alias || 'Unknown'} (${dep.orgs?.instance_url || ''})`);
    console.log(`Deployed At: ${dep.deployed_at}`);
    
    const { data: steps } = await supabase
      .from('deployment_steps')
      .select('*')
      .eq('deployment_id', dep.id);
      
    console.log(`Steps (${steps?.length || 0}):`);
    steps?.forEach(s => {
      console.log(` - [${s.status}] ${s.description}: ${s.error_message ? s.error_message.substring(0, 100) : ''}`);
    });
  }
})();
