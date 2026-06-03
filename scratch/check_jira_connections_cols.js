const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabase.from('jira_connections').select('id, user_id, site_url, project_key, access_token, refresh_token, created_at').limit(1)
  console.log('Jira Connections Select Data:', data)
  console.log('Jira Connections Select Error:', error)
}
check()
