require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  // List connections
  const { data: connections, error } = await supabase
    .from('jira_connections')
    .select('*');
    
  if (error) {
    console.error("Error fetching jira_connections:", error);
  } else {
    console.log("Found", connections.length, "connections in jira_connections:");
    connections.forEach(conn => {
      console.log(`- ID: ${conn.id}, UserID: ${conn.user_id}, SiteURL: ${conn.site_url}, Project: ${conn.project_key}, CreatedAt: ${conn.created_at}`);
    });
  }

  // List user configs
  const { data: configs, error: confError } = await supabase
    .from('user_configs')
    .select('*');

  if (confError) {
    console.error("Error fetching user_configs:", confError);
  } else {
    console.log("Found", configs.length, "user configs:");
    configs.forEach(conf => {
      console.log(`- UserID: ${conf.user_id}, Has Jira Tokens: ${!!conf.jira_tokens}`);
    });
  }
}

run();
