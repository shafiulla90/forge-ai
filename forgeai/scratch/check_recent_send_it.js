require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: steps, error } = await supabase
    .from('deployment_steps')
    .select('*, deployments(*)')
    .like('description', '%Send_IT_Email%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !steps) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${steps.length} deployment steps:`);
  steps.forEach(s => {
    console.log(`Step ID: ${s.id}, Created At: ${s.created_at}, Status: ${s.status}`);
    console.log(`Error message: ${s.error_message}`);
  });
})();
