require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const depId = 'dba9416b-13ba-4506-ad96-c5ca261b568a';
  const { data: deployment, error: depError } = await supabase
    .from('deployments')
    .select('*')
    .eq('id', depId)
    .single();
  console.log('Deployment:', deployment);

  const { data: steps, error: stepError } = await supabase
    .from('deployment_steps')
    .select('*')
    .eq('deployment_id', depId);
  console.log('Steps:', steps);
})();
