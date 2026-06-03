const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('embeddings').select('*').limit(5);
  console.log('Error:', error);
  console.log('Embeddings sample:', data);
  if (data) {
    const { count } = await supabase.from('embeddings').select('*', { count: 'exact', head: true });
    console.log('Total count in embeddings table:', count);
  }
}
run();
