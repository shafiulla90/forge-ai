import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  // Get currently logged in user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Fetch orgs for this user
  const { data: orgs, error } = await supabase
    .from('orgs')
    .select('id, alias, instance_url, org_id, org_type, health_score, last_synced_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    
  if (error) {
    console.error('[API Orgs] Error fetching orgs:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(orgs)
}
