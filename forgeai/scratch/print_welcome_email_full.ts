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

  const desc = issue.fields?.description;
  function extractText(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.text) return node.text;
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (node.content) return extractText(node.content);
    return '';
  }
  console.log('Full Text Description:');
  console.log(extractText(desc));
}

run();
