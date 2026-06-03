require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const tickets = ['SCRUM-16', 'SCRUM-15'];
  
  for (const ticketKey of tickets) {
    console.log(`Deleting deployment records for ${ticketKey}...`);
    
    // First find deployment
    const { data: deploys } = await supabase
      .from('deployments')
      .select('id')
      .eq('jira_ticket_id', ticketKey);
      
    if (deploys && deploys.length > 0) {
      for (const dep of deploys) {
        // Delete steps
        const { error: stepsErr } = await supabase
          .from('deployment_steps')
          .delete()
          .eq('deployment_id', dep.id);
          
        if (stepsErr) {
          console.error(`Error deleting steps for ${dep.id}:`, stepsErr);
        }
        
        // Delete deployment
        const { error: depErr } = await supabase
          .from('deployments')
          .delete()
          .eq('id', dep.id);
          
        if (depErr) {
          console.error(`Error deleting deployment ${dep.id}:`, depErr);
        } else {
          console.log(`Deleted deployment record: ${dep.id}`);
        }
      }
    } else {
      console.log(`No deployment record found for ${ticketKey}`);
    }
  }
}

run();
