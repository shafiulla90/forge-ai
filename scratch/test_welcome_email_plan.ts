import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function test() {
  const { GET } = await import('../app/api/jira/ticket/route');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Authenticate user to get user id
  const userId = '70ba7467-8667-431e-8c36-268353f0b251';
  
  // We mock the NextRequest
  const mockUrl = new URL(`http://localhost:3000/api/jira/ticket?key=SCRUM-13`);
  const mockReq = {
    url: mockUrl.toString(),
    headers: new Headers({
      'Cookie': `sb-access-token=mock; sb-refresh-token=mock`
    })
  } as any;

  console.log('Invoking GET handler for SCRUM-13 ticket...');
  
  // Note: we can import and execute the raw API route, but since it checks auth via cookies/getUser on createClient(),
  // we might get a 401. Let's simulate the suffix condition and check the logic directly or run it.
  // Let's print out what is stashed in deployments for targetId.
  const { data: deployment, error: depErr } = await supabase
    .from('deployments')
    .select('*')
    .eq('jira_ticket_id', 'SCRUM-13')
    .single();

  if (depErr) {
    console.error('Error fetching deployment:', depErr);
    return;
  }

  console.log('Stashed deployment ID:', deployment.id);
  console.log('Rollback metadata stashed plan:', deployment.rollback_metadata);
}

test().catch(console.error);
