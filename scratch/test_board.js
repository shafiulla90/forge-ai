require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// We'll mimic the route.ts GET handler logic:
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
  const siteUrl = connection.site_url;
  const projectKey = connection.project_key;

  // Resolve Cloud ID
  let cloudId = '';
  try {
    console.log('Fetching accessible resources...');
    const profileRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { 'Authorization': `Bearer ${access}` }
    });
    console.log('profileRes status:', profileRes.status);
    const profileText = await profileRes.text();
    console.log('profileRes body:', profileText);
    const sites = JSON.parse(profileText);
    if (Array.isArray(sites) && sites.length > 0) {
      cloudId = sites[0].id;
    }
  } catch (err) {
    console.error('Error fetching Cloud ID:', err);
  }

  const baseUrl = cloudId ? `https://api.atlassian.com/ex/jira/${cloudId}` : siteUrl;
  const jql = projectKey ? `project = "${projectKey}" ORDER BY created DESC` : `ORDER BY created DESC`;

  console.log('Site URL:', siteUrl);
  console.log('Base URL:', baseUrl);
  console.log('Project Key:', projectKey);
  console.log('JQL:', jql);

  let issues = [];
  try {
    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status,priority,assignee,created,updated,issuetype`;
    console.log('Requesting URL:', url);
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${access}`, 'Accept': 'application/json' }
    });
    console.log('Response status:', res.status);
    const resText = await res.text();
    if (res.ok) {
      const data = JSON.parse(resText);
      issues = data.issues || [];
      console.log('Response total:', data.total);
    } else {
      console.error('Fetch failed:', resText);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }

  console.log(`Fetched ${issues.length} issues from Jira.`);

  // Load deployments
  const deploymentMap = new Map();
  const { data: deployments } = await supabase
    .from('deployments')
    .select('jira_ticket_id, status')
    .eq('user_id', userId);
  
  if (Array.isArray(deployments)) {
    deployments.forEach((d) => {
      if (d.jira_ticket_id) deploymentMap.set(d.jira_ticket_id, d);
    });
  }

  // Categorize
  const columns = { todo: [], review: [], approved: [], deployed: [] };

  for (const issue of issues) {
    const displayName = issue.fields?.assignee?.displayName || '';
    const initials = displayName
      .split(' ')
      .map((part) => part[0] || '')
      .join('') || 'RK';

    const jiraStatus = issue.fields?.status?.name || 'To Do';
    const deploymentStatus = deploymentMap.get(issue.key)?.status;
    const effectiveStatusRaw = (deploymentStatus && deploymentStatus.toLowerCase() !== 'failed') ? deploymentStatus : jiraStatus;
    const effectiveStatus = effectiveStatusRaw.toLowerCase();

    const ticket = {
      key: issue.key,
      title: issue.fields?.summary || 'No title',
      status: effectiveStatusRaw,
    };

    if (
      effectiveStatus.includes('todo') ||
      effectiveStatus.includes('to do') ||
      effectiveStatus.includes('backlog') ||
      effectiveStatus.includes('open')
    ) {
      columns.todo.push(ticket);
    } else if (
      effectiveStatus.includes('review') ||
      effectiveStatus.includes('in review') ||
      effectiveStatus.includes('in progress') ||
      effectiveStatus.includes('progress')
    ) {
      columns.review.push(ticket);
    } else if (
      effectiveStatus.includes('approved') ||
      effectiveStatus.includes('done') ||
      effectiveStatus.includes('closed') ||
      effectiveStatus.includes('resolved')
    ) {
      columns.approved.push(ticket);
    } else if (
      effectiveStatus.includes('deployed') ||
      effectiveStatus.includes('released') ||
      effectiveStatus.includes('production') ||
      effectiveStatus.includes('completed') ||
      effectiveStatus.includes('success')
    ) {
      columns.deployed.push(ticket);
    } else {
      columns.todo.push(ticket);
    }
  }

  console.log('\n--- Kanban Columns ---');
  console.log('TO DO:', columns.todo.map(t => `${t.key} (${t.status}) - ${t.title}`));
  console.log('IN REVIEW:', columns.review.map(t => `${t.key} (${t.status})`));
  console.log('APPROVED:', columns.approved.map(t => `${t.key} (${t.status})`));
  console.log('DEPLOYED:', columns.deployed.map(t => `${t.key} (${t.status})`));
}

run();
