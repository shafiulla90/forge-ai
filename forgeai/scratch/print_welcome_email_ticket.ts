import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const { createJiraClient } = await import('../lib/jira');
  const userId = '70ba7467-8667-431e-8c36-268353f0b251';
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const jira = await createJiraClient(userId, supabase);
  const issue = await jira.getIssue('10172');

  console.log('Jira Issue Key:', issue.key);
  console.log('Summary:', issue.fields?.summary);
  console.log('Description:', JSON.stringify(issue.fields?.description, null, 2));
}

run();
