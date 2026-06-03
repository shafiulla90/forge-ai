const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: messages, error } = await supabase.from('messages').select('*').limit(10);
  console.log('Error:', error);
  console.log('Messages sample:', messages);
}
run();
