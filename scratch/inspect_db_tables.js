require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Query Supabase for recent flow session logs or tickets
  const { data: sessions, error } = await supabase
    .from('flow_sessions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching flow_sessions:', error);
    
    // Let's try listing all tables using a standard SQL query if RLS/RPC is available
    // But since we can query tables directly, let's see if tickets or other tables have it
    const { data: tickets } = await supabase
      .from('jira_tickets')
      .select('*')
      .limit(5);
    console.log('Jira tickets count or metadata:', tickets ? tickets.length : 0);
    return;
  }

  console.log('Found flow sessions:', sessions.length);
  sessions.forEach(s => {
    console.log('--------------------------------------------------');
    console.log(`Session ID: ${s.id}`);
    console.log(`Updated At: ${s.updated_at}`);
    console.log(`Prompt: ${s.prompt}`);
    console.log(`Nodes:`, JSON.stringify(s.nodes || [], null, 2));
    console.log(`Flow Name: ${s.flow_name}`);
    console.log(`XML snippet:`, s.flow_xml ? s.flow_xml.substring(0, 500) : 'null');
  });
})();
