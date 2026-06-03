require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('*, orgs(*)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching deployments:', error);
    return;
  }

  console.log(`Found ${deployments.length} latest deployments:`);
  for (const dep of deployments) {
    console.log('==================================================');
    console.log(`Deployment ID: ${dep.id}`);
    console.log(`Ticket Key: ${dep.jira_ticket_id}`);
    console.log(`Status: ${dep.status}`);
    console.log(`Org: ${dep.orgs?.alias || 'Unknown'} (${dep.orgs?.instance_url || ''})`);
    console.log(`Created At: ${dep.created_at}`);
    
    const { data: steps } = await supabase
      .from('deployment_steps')
      .select('*')
      .eq('deployment_id', dep.id);
      
    console.log(`Steps (${steps?.length || 0}):`);
    steps?.forEach(s => {
      console.log(` - [${s.status}] ${s.description}`);
      if (s.error_message) {
        console.log(`   Error message: ${s.error_message}`);
      }
    });
  }
})();
