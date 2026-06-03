require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const depId = 'dba9416b-13ba-4506-ad96-c5ca261b568a';
  const { data: steps, error } = await supabase
    .from('deployment_steps')
    .select('*')
    .eq('deployment_id', depId);
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Steps:');
  steps.forEach(s => {
    console.log(`- Step: "${s.description}"`);
    console.log(`  Status: ${s.status}`);
    console.log(`  Error Message: ${s.error_message}`);
  });
})();
