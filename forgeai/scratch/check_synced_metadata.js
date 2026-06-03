const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orgs } = await supabase.from('orgs').select('id, alias');
  console.log('Orgs:', orgs);
  for (const org of orgs || []) {
    const { count, error } = await supabase
      .from('metadata_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id);
    console.log(`Org ${org.alias} (${org.id}) has ${count} metadata embeddings. Error:`, error);
  }
}
run();
