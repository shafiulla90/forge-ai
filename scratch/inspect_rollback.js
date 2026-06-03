require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase
    .from('deployments')
    .select('id,rollback_metadata,status')
    .neq('status','completed')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) { console.error('Error fetching deployments', error); return; }
  for (const d of data) {
    console.log('Deployment', d.id, 'status', d.status);
    if (d.rollback_metadata) {
      try {
        const parsed = typeof d.rollback_metadata === 'string' ? JSON.parse(d.rollback_metadata) : d.rollback_metadata;
        const items = (parsed.plan || parsed).steps || (parsed.plan || parsed).items || [];
        console.log('  Items count', items.length);
        console.log('  Sample items:', items.slice(0,3));
      } catch (e) {
        console.error('  Failed to parse rollback_metadata', e);
      }
    } else {
      console.log('  No rollback_metadata');
    }
  }
})();
