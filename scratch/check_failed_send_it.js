require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: steps, error } = await supabase
    .from('deployment_steps')
    .select('*, deployments(*)')
    .like('description', '%Send_IT_Email%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !steps || steps.length === 0) {
    console.error('No step found for Send_IT_Email_Notification:', error);
    
    // Fallback: check general deployments
    const { data: deps } = await supabase
      .from('deployments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('Recent deployments:', deps.map(d => ({ id: d.id, ticket: d.jira_ticket_id, meta: d.rollback_metadata })));
    return;
  }

  const step = steps[0];
  console.log('Found step:', step.description);
  console.log('Status:', step.status);
  console.log('Error message:', step.error_message);
  
  // If the deployment has metadata or xml
  console.log('Deployment record:', step.deployments);
})();
