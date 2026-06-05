import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJiraConnection } from '@/lib/jira';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ isConnected: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const conn = await getJiraConnection(user.id, supabase);
    
    // Check if it's connected (if access token is mock, is_connected will be false or mock)
    const isMock = conn.is_mock || false;
    const isConnected = conn.is_connected && !isMock;

    return NextResponse.json({
      isConnected,
      isMock,
      siteUrl: conn.site_url,
      projectKey: conn.project_key,
      authMethod: conn.auth_method || 'oauth',
      email: conn.email || ''
    });
  } catch (err: any) {
    console.error('[Jira Status API] Error:', err);
    return NextResponse.json({ isConnected: false, error: err.message }, { status: 500 });
  }
}
