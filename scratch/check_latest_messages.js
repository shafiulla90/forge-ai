const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, content, implementation_plan, created_at')
    .not('implementation_plan', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching messages:', error);
    return;
  }

  console.log(`Found ${messages.length} messages with plans:`);
  messages.forEach((m, idx) => {
    console.log(`[${idx}] Created At: ${m.created_at}, ID: ${m.id}`);
    try {
      const plan = typeof m.implementation_plan === 'string' ? JSON.parse(m.implementation_plan) : m.implementation_plan;
      console.log(`  Summary: ${plan?.summary}`);
      console.log(`  Steps Count: ${plan?.steps?.length || plan?.items?.length || 0}`);
      console.log(`  Steps:`, (plan?.steps || plan?.items || []).map(s => s.name || s.title || s.fullName));
    } catch (e) {
      console.log(`  Parse error:`, e.message);
    }
  });
}
check()
