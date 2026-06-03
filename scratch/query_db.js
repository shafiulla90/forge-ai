require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('jira_connections').select('*');
  if (error) {
    console.error('Error fetching jira_connections:', error);
  } else {
    console.log('Jira Connections:');
    data.forEach(conn => {
      // Don't log full tokens for security, just lengths or hints
      console.log({
        id: conn.id,
        user_id: conn.user_id,
        site_url: conn.site_url,
        project_key: conn.project_key,
        created_at: conn.created_at,
        access_token_len: conn.access_token?.length,
        refresh_token_len: conn.refresh_token?.length,
      });
    });
  }
}
run();
