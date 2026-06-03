require('dotenv').config({ path: '.env.local' })
console.log('Keys in env:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('URL') || k.includes('POSTGRES') || k.includes('JIRA') || k.includes('SUPABASE')))
