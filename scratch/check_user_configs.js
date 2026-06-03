const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabase.from('user_configs').select('*').limit(1)
  console.log('User Configs Row:', data && data[0] ? Object.keys(data[0]) : null)
  console.log('User Configs Select Error:', error)
}
check()
