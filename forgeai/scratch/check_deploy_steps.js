const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const deployId = '54c16b27-424e-44a1-a1c7-a4fd573b1028';
  const { data: dep, error: depErr } = await supabase
    .from('deployments')
    .select('*')
    .eq('id', deployId)
    .maybeSingle();

  if (depErr) {
    console.error('Error fetching deployment:', depErr);
    return;
  }
  console.log('Deployment record:', dep);

  const { data: steps, error: stepsErr } = await supabase
    .from('deployment_steps')
    .select('*')
    .eq('deployment_id', deployId);

  if (stepsErr) {
    console.error('Error fetching steps:', stepsErr);
    return;
  }
  console.log(`Found ${steps ? steps.length : 0} steps for deployment:`, steps);
}
check();
