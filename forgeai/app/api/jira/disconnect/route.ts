import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await supabase.from('jira_connections').delete().eq('user_id', user.id);
    await supabase.from('user_configs').update({ jira_tokens: null }).eq('user_id', user.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[Jira Disconnect] Error:', e);
    return NextResponse.json({ success: false, error: 'Failed to disconnect' }, { status: 500 });
  }
}
