const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Service Role Key missing in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'orgs',
  'user_configs',
  'jira_connections',
  'deployments',
  'deployment_steps',
  'jira_approvals',
  'conversations',
  'messages',
  'flow_sessions',
  'jira_tickets'
];

async function fetchAll(table) {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      if (data.length < pageSize) {
        keepFetching = false;
      } else {
        page++;
      }
    } else {
      keepFetching = false;
    }
  }

  return allData;
}

async function run() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);
  
  console.log(`Starting backup of Supabase database at ${new Date().toISOString()}...`);
  console.log(`Backup target directory: ${backupDir}`);

  if (!fs.existsSync(path.join(__dirname, '..', 'backups'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'backups'));
  }
  fs.mkdirSync(backupDir);

  const manifest = {
    timestamp: new Date().toISOString(),
    tables: {},
    usersCount: 0,
    errors: {}
  };

  // 1. Backup all tables
  for (const table of tables) {
    try {
      console.log(`Fetching table: ${table}...`);
      const data = await fetchAll(table);
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      manifest.tables[table] = {
        count: data.length,
        file: `${table}.json`
      };
      console.log(`Successfully backed up ${data.length} rows from table '${table}'.`);
    } catch (err) {
      console.error(`Error backing up table '${table}':`, err.message);
      manifest.errors[table] = err.message;
    }
  }

  // 2. Backup Auth Users
  try {
    console.log("Fetching Auth Users...");
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    const filePath = path.join(backupDir, 'auth_users.json');
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
    manifest.usersCount = users.length;
    console.log(`Successfully backed up ${users.length} auth users.`);
  } catch (err) {
    console.error("Error backing up Auth Users:", err.message);
    manifest.errors['auth_users'] = err.message;
  }

  // Write manifest
  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  console.log("\nBackup Complete!");
  console.log(`Manifest saved at: ${path.join(backupDir, 'manifest.json')}`);
}

run();
