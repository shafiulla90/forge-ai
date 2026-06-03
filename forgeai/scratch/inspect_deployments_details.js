require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('*')
    .in('status', ['In review', 'failed', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching deployments:', error);
    return;
  }

  for (const dep of deployments) {
    console.log('--------------------------------------------------');
    console.log(`Deployment ID: ${dep.id}`);
    console.log(`Status: ${dep.status}`);
    console.log(`Org ID: ${dep.org_id}`);
    console.log(`Jira Ticket: ${dep.jira_ticket_id}`);
    
    try {
      const rollback = typeof dep.rollback_metadata === 'string' ? JSON.parse(dep.rollback_metadata) : dep.rollback_metadata;
      console.log('Metadata:', JSON.stringify(rollback, null, 2));
    } catch (e) {
      console.log('Metadata (raw):', dep.rollback_metadata);
    }
    
    const { data: steps } = await supabase
      .from('deployment_steps')
      .select('*')
      .eq('deployment_id', dep.id);
      
    console.log('Steps:', steps);
  }
})();
