require('dotenv').config({ path: '.env.local' });
const { executeDeployment } = require('../lib/deploy');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const deploymentId = 'adbac2ab-e3de-4cff-8d78-07c4b4803c8c'; // SCRUM-12 deployment ID
  const qaOrgId = '8af97b72-78b0-42a0-9c1c-a0e347b4d208'; // QA Sandbox
  
  console.log(`Triggering direct test deployment for ${deploymentId} to QA Sandbox...`);
  
  // 1. Manually insert the stashed plan into rollback_metadata if missing/corrupt
  const mockPlan = [
    {
      title: 'Create custom field: Follow_Up_Required__c on Opportunity',
      type: 'CustomField',
      fullName: 'Opportunity.Follow_Up_Required__c',
      action: 'create'
    },
    {
      title: 'Create Record-Triggered Flow: Auto_Create_Follow_Up_Task',
      type: 'Flow',
      fullName: 'Auto_Create_Follow_Up_Task',
      action: 'create'
    }
  ];
  
  await supabase.from('deployments').update({
    rollback_metadata: JSON.stringify(mockPlan),
    status: 'queued'
  }).eq('id', deploymentId);
  
  console.log('- Database stashed plan updated.');
  
  // 2. Execute
  try {
    await executeDeployment(deploymentId, qaOrgId);
    console.log('SUCCESS: test deployment execute completed successfully!');
  } catch (err) {
    console.error('FAILED: test deployment execute failed:', err.message);
  }
}

run();
