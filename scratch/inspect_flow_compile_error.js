require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const depId = '5970709a-89e8-4d59-b695-e5b58fb7183c';
  
  const { data: steps, error } = await supabase
    .from('deployment_steps')
    .select('*')
    .eq('deployment_id', depId)
    .eq('status', 'error');

  if (error) {
    console.error('Error fetching steps:', error);
    return;
  }

  console.log('Error steps found:', steps.length);
  steps.forEach(s => {
    console.log(`Step description: ${s.description}`);
    console.log(`Error message:\n${s.error_message}`);
  });
})();
