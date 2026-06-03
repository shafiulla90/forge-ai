const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: depData, error } = await supabase
    .from('deployments')
    .select('id, jira_ticket_id, status, rollback_metadata')
    .not('jira_ticket_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching deployments:', error);
    return;
  }

  console.log(`Found ${depData.length} linked deployments:`);
  depData.forEach(d => {
    console.log(`- ID: ${d.id}, Ticket: ${d.jira_ticket_id}, Status: ${d.status}`);
    try {
      const meta = typeof d.rollback_metadata === 'string' ? JSON.parse(d.rollback_metadata) : d.rollback_metadata;
      console.log(`  Summary: ${meta?.summary || meta?.plan?.summary || 'N/A'}`);
      console.log(`  Steps:`, (meta?.steps || meta?.items || []).map(s => s.name || s.title || s.fullName));
    } catch (e) {
      console.log(`  Failed to parse metadata:`, e.message);
    }
  });
}
check()
