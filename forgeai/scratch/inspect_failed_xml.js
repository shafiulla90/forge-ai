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
    console.error('Error or no steps:', error);
    return;
  }

  const step = steps[0];
  console.log('Step ID:', step.id);
  console.log('Description:', step.description);
  console.log('Status:', step.status);
  console.log('Error:', step.error_message);
  
  // Let's check if the deployment has rollback_metadata or anything with the XML.
  // Wait, let's query the table that stores flow XML or check where flow XML is stored in Supabase.
  // Wait, let's list columns in deployments or inspect recent deployments.
  console.log('Rollback metadata:', step.deployments?.rollback_metadata);
})();
