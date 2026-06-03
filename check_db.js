const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.rpc('match_metadata', {
    query_embedding: new Array(1536).fill(0),
    match_threshold: 0.5,
    match_count: 5,
    p_org_id: '00000000-0000-0000-0000-000000000000'
  })
  console.log('RPC Result:', data)
  console.log('RPC Error:', error)
}
check()
