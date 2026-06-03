import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createJiraClient } from '@/lib/jira';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketKey, text } = await req.json();
    if (!ticketKey || !text) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const jira = await createJiraClient(user.id);
    const result = await jira.addComment(ticketKey, text);

    return NextResponse.json({
      success: true,
      comment: {
        id: result.id,
        author: user.email || 'Tech Lead',
        text: text,
        created: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error('[API Jira Comment] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
