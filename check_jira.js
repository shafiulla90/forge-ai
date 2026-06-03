require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const userId = '70ba7467-8667-431e-8c36-268353f0b251';
  const res = await supabase.from('jira_connections').delete().eq('user_id', userId).eq('site_url', 'test');
  console.log('Delete Result:', res);
}
check();
