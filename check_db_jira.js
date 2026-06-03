const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function decrypt(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return '';
  }
}

async function check() {
  const userId = '70ba7467-8667-431e-8c36-268353f0b251';
  
  const { data: conn, error: connErr } = await supabase
    .from('jira_connections')
    .select('*')
    .eq('user_id', userId);
  console.log('--- jira_connections ---');
  console.log(connErr || conn);

  const { data: configs, error: configsErr } = await supabase
    .from('user_configs')
    .select('*')
    .eq('user_id', userId);
  console.log('--- user_configs ---');
  if (configs && configs.length > 0 && configs[0].jira_tokens) {
    console.log('Decrypted tokens:', decrypt(configs[0].jira_tokens));
  } else {
    console.log(configsErr || configs);
  }

  const { data: deploys, error: deploysErr } = await supabase
    .from('deployments')
    .select('*')
    .eq('user_id', userId)
    .not('jira_ticket_id', 'is', null);
  console.log('--- deployments with non-null jira_ticket_id ---');
  if (deploysErr) console.log(deploysErr);
  else if (deploys) {
    console.log(deploys.map(d => ({
      id: d.id,
      jira_ticket_id: d.jira_ticket_id,
      status: d.status,
      created_at: d.created_at
    })));
  }
}
check();
