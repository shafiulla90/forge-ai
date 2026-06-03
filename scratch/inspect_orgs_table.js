require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: orgs, error } = await supabase.from('orgs').select('*').limit(5);
  if (error) {
    console.error('Error fetching orgs:', error);
  } else {
    console.log('Orgs records:', orgs);
  }
})();
