import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchRelevantMetadata } from '@/lib/vector';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const query = searchParams.get('q');

    if (!orgId || !query) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Try semantic search via vector DB
    const results = await searchRelevantMetadata(orgId, query);

    // If results is empty, it might be because the RPC doesn't exist yet
    // or no embeddings have been generated.
    return NextResponse.json({ results: results || [] });
  } catch (globalError: any) {
    console.error('[API Metadata Search] Error:', globalError);
    return NextResponse.json({ error: globalError.message || 'Internal Server Error' }, { status: 500 });
  }
}
