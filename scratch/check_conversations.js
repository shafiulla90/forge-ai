require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !conversations) {
    console.error('Error fetching conversations:', error);
    return;
  }

  console.log(`Found ${conversations.length} conversations:`);
  conversations.forEach(c => {
    console.log(`Conv ID: ${c.id}, Updated At: ${c.updated_at}, Ticket Key: ${c.ticket_key}`);
    const metaStr = JSON.stringify(c.messages || []);
    if (metaStr.includes('Send_IT_Email')) {
      console.log('--- FOUND TICKET WITH Send_IT_Email ---');
      const flowMsg = c.messages.find(m => JSON.stringify(m).includes('Send_IT_Email'));
      if (flowMsg) {
        console.log('AI Message containing XML:', JSON.stringify(flowMsg, null, 2));
      }
    }
  });
})();
