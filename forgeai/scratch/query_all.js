require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: configs, error: err1 } = await supabase.from('user_configs').select('*');
  console.log('User Configs:', configs || err1);

  const { data: conns, error: err2 } = await supabase.from('jira_connections').select('*');
  console.log('Jira Connections:', conns || err2);
  
  const { data: users, error: err3 } = await supabase.auth.admin.listUsers();
  if (users) {
    console.log('Users count:', users.users?.length);
    users.users?.forEach(u => console.log('User:', u.id, u.email));
  } else {
    console.log('Users Error:', err3);
  }
}
run();
