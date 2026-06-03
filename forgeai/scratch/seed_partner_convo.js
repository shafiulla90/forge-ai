const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 1. Get orgs and active user
  const { data: orgs, error: orgsError } = await supabase.from('orgs').select('*');
  if (orgsError || !orgs || orgs.length === 0) {
    console.error('No orgs found:', orgsError);
    return;
  }
  
  // Use the covenant synergy sandbox org and active user
  const org = orgs[0];
  const userId = org.user_id;

  console.log(`Active Org: ${org.alias} (${org.id})`);
  console.log(`Active User ID: ${userId}`);

  // 2. Cleanup existing seed conversations if any
  const titlesToClean = ['Partner referral tracking', 'Fix AccountTrigger SOQL', 'Renewal reminder flow'];
  const { data: oldConvos } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .in('title', titlesToClean);

  if (oldConvos && oldConvos.length > 0) {
    const oldIds = oldConvos.map(c => c.id);
    console.log(`Cleaning up ${oldIds.length} old seeded conversations...`);
    await supabase.from('messages').delete().in('conversation_id', oldIds);
    await supabase.from('conversations').delete().in('id', oldIds);
  }

  // 3. Insert "Partner referral tracking"
  console.log('Seeding "Partner referral tracking"...');
  const { data: convo1, error: e1 } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      org_id: org.id,
      title: 'Partner referral tracking'
    })
    .select()
    .single();

  if (e1 || !convo1) {
    console.error('Failed to create convo1:', e1);
    return;
  }

  // Insert messages for convo1
  const userMsg1 = {
    conversation_id: convo1.id,
    role: 'user',
    content: 'We need to track which partner referred each Opportunity. Partners are already Accounts in our org with a Partner record type.'
  };

  const assistantMsg1 = {
    conversation_id: convo1.id,
    role: 'assistant',
    content: `I've analysed your org metadata. I can see:\n• Account object with record type Partner (RT Id: 012X00000...)\n• Opportunity has 24 custom fields — none is a referral/partner lookup yet\n• Your Opportunity page layout is "Opportunity Layout" on the Sales app\n\n**My plan:**\n1. Create Referral_Partner__c — Lookup to Account (Partner record type only)\n2. Add field to "Opportunity Layout" in the Key Information section\n3. Build a Report: "Pipeline by Partner" — Summary report grouped by Referral_Partner__c\n\nShall I proceed? Or would you like to adjust anything first?`,
    implementation_plan: {
      items: [
        {
          fullName: 'Referral_Partner__c',
          type: 'CustomField',
          metadata: {
            type: 'Lookup',
            label: 'Referred by Partner',
            required: false
          }
        },
        {
          fullName: 'Opportunity Layout',
          type: 'Layout',
          metadata: {}
        },
        {
          fullName: 'Pipeline by Referral Partner',
          type: 'Report',
          metadata: {}
        }
      ]
    }
  };

  await supabase.from('messages').insert([userMsg1, assistantMsg1]);

  // 4. Insert "Fix AccountTrigger SOQL"
  console.log('Seeding "Fix AccountTrigger SOQL"...');
  const { data: convo2, error: e2 } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      org_id: org.id,
      title: 'Fix AccountTrigger SOQL'
    })
    .select()
    .single();

  if (e2 || !convo2) {
    console.error('Failed to create convo2:', e2);
    return;
  }

  const userMsg2 = {
    conversation_id: convo2.id,
    role: 'user',
    content: 'Fix the SOQL inside the loop in AccountTrigger.cls.'
  };

  const assistantMsg2 = {
    conversation_id: convo2.id,
    role: 'assistant',
    content: `I have analyzed AccountTrigger.cls. The SOQL query on line 23 is inside a for loop. This triggers the Salesforce governor limit (100 SOQL queries per transaction) when bulk operations run.\n\n**My plan:**\n1. Modify AccountTrigger.cls to query Opportunity and Account records outside of the loop.\n2. Bulkify trigger processing logic using Maps.\n3. Run all Apex unit tests to ensure deployment safety.`
  };

  await supabase.from('messages').insert([userMsg2, assistantMsg2]);

  // 5. Insert "Renewal reminder flow"
  console.log('Seeding "Renewal reminder flow"...');
  const { data: convo3, error: e3 } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      org_id: org.id,
      title: 'Renewal reminder flow'
    })
    .select()
    .single();

  if (e3 || !convo3) {
    console.error('Failed to create convo3:', e3);
    return;
  }

  const userMsg3 = {
    conversation_id: convo3.id,
    role: 'user',
    content: 'Create a Flow that sends a renewal reminder email 30 days before the contract end date.'
  };

  const assistantMsg3 = {
    conversation_id: convo3.id,
    role: 'assistant',
    content: `I will build a Schedule-Triggered Flow to handle contract renewals.\n\n**My plan:**\n1. Create a Scheduled Flow that queries Contract records where EndDate is 30 days from today.\n2. Add an Action block to trigger the Contract_Renewal_Reminder email template.\n3. Log activity history on the Contract record when email is sent.`
  };

  await supabase.from('messages').insert([userMsg3, assistantMsg3]);

  console.log('Seed completed successfully!');
}
run();
