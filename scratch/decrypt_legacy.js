require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function decrypt(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    if (authTag.length !== 16) {
      throw new Error('Invalid authentication tag length');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('[Encryption] Decryption failed:', err);
    return '';
  }
}

async function run() {
  const { data: userConfig } = await supabase
    .from('user_configs')
    .select('jira_tokens')
    .eq('user_id', '70ba7467-8667-431e-8c36-268353f0b251')
    .maybeSingle();

  if (userConfig?.jira_tokens) {
    try {
      const decrypted = decrypt(userConfig.jira_tokens);
      console.log('Decrypted tokens raw:', decrypted);
    } catch (e) {
      console.error('Error decrypting:', e);
    }
  } else {
    console.log('No userConfig or jira_tokens found');
  }
}
run();
