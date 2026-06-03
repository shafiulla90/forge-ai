require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('id,status,org_id')
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) { console.error('Deploy fetch error:', error); return; }
  console.log('Pending deployments:', deployments.map(d => ({ id: d.id, status: d.status })));
  if (deployments && deployments.length) {
    const depId = deployments[0].id;
    const { data: steps, error: stepError } = await supabase
      .from('deployment_steps')
      .select('id,description,status,error_message,metadata')
      .eq('deployment_id', depId);
    if (stepError) { console.error('Steps fetch error:', stepError); }
    else { console.log('Steps for deployment', depId, steps); }
  }
})();
