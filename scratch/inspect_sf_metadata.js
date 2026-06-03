const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { decrypt } = require('../lib/encryption'); // wait, let's see how decryption works or import jsforce
const jsforce = require('jsforce');

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: orgs } = await supabase.from('orgs').select('*');
  
  if (!orgs || orgs.length === 0) {
    console.log('No orgs found in database.');
    return;
  }
  
  for (const org of orgs) {
    console.log(`\nConnecting to Org: ${org.alias} (${org.id}) - ${org.instance_url}`);
    
    // Decrypt access token using local implementation (we can import decrypt from c:\Users\SHAFIULLA\forge-ai\lib\encryption.ts)
    // Wait, let's write decryption manually or import it.
    // Let's check lib/encryption.ts implementation:
  }
}
run();
