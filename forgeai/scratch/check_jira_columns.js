const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('jira_connections').select('*').limit(1)
  console.log('Jira Connections Row Keys:', data && data[0] ? Object.keys(data[0]) : null)
  console.log('Jira Connections Select Error:', error)
}
check()
