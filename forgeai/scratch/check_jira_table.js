const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS for checking

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: depData, error: depError } = await supabase.from('deployments').select('*').limit(1)
  console.log('Deployments Row Keys:', depData && depData[0] ? Object.keys(depData[0]) : null)
  console.log('Deployments Select Error:', depError)
}
check()
