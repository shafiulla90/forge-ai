require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// We need to import the actual createJiraClient from our project.
// In Next.js/TS/ESM project, we can import or require files. Let's write a simple implementation or load lib/jira.
const crypto = require('crypto');

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

async function run() {
  const userId = '70ba7467-8667-431e-8c36-268353f0b251';
  const { data: connection } = await supabase
    .from('jira_connections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection) {
    console.log('No connection found');
    return;
  }

  const access = decrypt(connection.access_token);
  const refresh = decrypt(connection.refresh_token);
  const siteUrl = connection.site_url;
  const projectKey = connection.project_key;

  console.log('Connection site_url:', siteUrl);
  console.log('Project Key:', projectKey);

  // Let's resolve the Cloud ID like in lib/jira.ts
  let cloudId = '';
  try {
    const accessibleUrl = 'https://api.atlassian.com/oauth/token/accessible-resources';
    const profileRes = await fetch(accessibleUrl, {
      headers: { 'Authorization': `Bearer ${access}` }
    });
    const sites = await profileRes.json();
    console.log('Accessible resources response:', sites);
    if (Array.isArray(sites) && sites.length > 0) {
      cloudId = sites[0].id;
      console.log('Found Cloud ID:', cloudId);
    } else {
      console.log('No Cloud ID found, or response is not array.');
    }
  } catch (err) {
    console.error('Accessible resources error:', err);
  }

  const baseUrl = cloudId 
    ? `https://api.atlassian.com/ex/jira/${cloudId}` 
    : siteUrl;

  console.log('Base URL:', baseUrl);

  const jql = projectKey
    ? `project = "${projectKey}" ORDER BY created DESC`
    : `ORDER BY created DESC`;

  console.log('Querying JQL:', jql);
  const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status,priority,assignee,created,updated,issuetype`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${access}`,
        'Accept': 'application/json'
      }
    });
    console.log('Response Status:', res.status, res.statusText);
    if (!res.ok) {
      const errText = await res.text();
      console.log('Error Body:', errText);
    } else {
      const data = await res.json();
      console.log('Keys of response:', Object.keys(data));
      console.log('total:', data.total);
      console.log('results count:', data.issues ? data.issues.length : 'none');
      if (data.issues) {
        console.log('Issues summary list:');
        data.issues.forEach(iss => {
          console.log(`- [${iss.key}] [${iss.fields?.status?.name}] ${iss.fields?.summary}`);
        });
      }
    }
  } catch (err) {
    console.error('Fetch issue search failed:', err);
  }
}

run();
