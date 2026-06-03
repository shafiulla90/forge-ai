require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orgs, error } = await supabase.from('orgs').select('id, user_id, org_id, alias, instance_url, updated_at');
  if (error) {
    console.error('Error fetching orgs:', error);
  } else {
    console.log('Connected Orgs:');
    orgs.forEach(org => {
      console.log({
        id: org.id,
        user_id: org.user_id,
        org_id: org.org_id,
        alias: org.alias,
        instance_url: org.instance_url,
        updated_at: org.updated_at
      });
    });
  }
}
run();
