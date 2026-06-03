require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const targetId = '0ce1845e-0163-46ce-8b26-85f299adfad5';
  const duplicateId = 'cef5f4c1-024a-4f2c-b660-36a61857a598';

  console.log('Starting reset/cleanup of deployments for SCRUM-13...');

  // 1. Delete all deployment steps for both deployments
  const { error: errSteps1 } = await supabase.from('deployment_steps').delete().eq('deployment_id', targetId);
  if (errSteps1) console.error('Error deleting steps for targetId:', errSteps1);
  else console.log('Deleted steps for targetId');

  const { error: errSteps2 } = await supabase.from('deployment_steps').delete().eq('deployment_id', duplicateId);
  if (errSteps2) console.error('Error deleting steps for duplicateId:', errSteps2);
  else console.log('Deleted steps for duplicateId');

  // 2. Delete duplicate deployment
  const { error: errDelDup } = await supabase.from('deployments').delete().eq('id', duplicateId);
  if (errDelDup) console.error('Error deleting duplicate deployment:', errDelDup);
  else console.log('Deleted duplicate deployment:', duplicateId);

  // 3. Reset target deployment status and clear rollback_metadata
  const { data: updatedDep, error: errUpdateTarget } = await supabase
    .from('deployments')
    .update({
      status: 'In review',
      rollback_metadata: null,
      approved_by: null,
      approved_at: null,
      deployed_at: null
    })
    .eq('id', targetId)
    .select();

  if (errUpdateTarget) console.error('Error resetting target deployment:', errUpdateTarget);
  else console.log('Successfully reset target deployment:', JSON.stringify(updatedDep, null, 2));

  console.log('Cleanup finished.');
}
run();
