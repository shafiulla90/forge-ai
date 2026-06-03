const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found.');
    console.error('👉 Please run the setup wizard first: `node scripts/setup.js`');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

async function validate() {
  console.log('🔍 Validating environment variables and connectivity...\n');
  loadEnv();

  const requiredVars = [
    'ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'ENCRYPTION_KEY'
  ];

  let missing = false;
  requiredVars.forEach(v => {
    if (!process.env[v]) {
      console.error(`❌ Missing variable: ${v}`);
      missing = true;
    }
  });

  if (missing) {
    console.error('\n❌ Validation failed. Please re-run the setup wizard: `node scripts/setup.js`');
    process.exit(1);
  }

  console.log('✅ Required environment variables are present.');

  // Validate Anthropic API Key format
  const antKey = process.env.ANTHROPIC_API_KEY;
  if (!antKey.startsWith('sk-ant-')) {
    console.warn('⚠️ Warning: ANTHROPIC_API_KEY does not start with standard "sk-ant-" prefix. Ensure it is correct.');
  } else {
    console.log('✅ ANTHROPIC_API_KEY format matches expected pattern.');
  }

  // Validate Encryption Key length
  const encKey = process.env.ENCRYPTION_KEY;
  if (encKey.length < 32) {
    console.error('❌ Error: ENCRYPTION_KEY is too short. It must be a secure key (at least 32 characters or hex).');
    process.exit(1);
  } else {
    console.log('✅ ENCRYPTION_KEY is secure.');
  }

  // Test Database Connection
  console.log('⏳ Testing Database connection (DATABASE_URL)...');
  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await dbClient.connect();
    const res = await dbClient.query('SELECT 1 as conn_test');
    if (res.rows[0].conn_test === 1) {
      console.log('✅ Postgres Database connection successful!');
    } else {
      throw new Error('Unexpected query response');
    }
  } catch (err) {
    console.error(`❌ Postgres Database connection failed: ${err.message}`);
    process.exit(1);
  } finally {
    await dbClient.end();
  }

  // Test Supabase API Connection
  console.log('⏳ Testing Supabase API connection...');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Attempt to connect by checking the auth settings or a mock request to Supabase rest interface
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });

    if (response.status === 200 || response.status === 404 || response.ok) {
      console.log('✅ Supabase API connection successful!');
    } else {
      throw new Error(`Returned status code: ${response.status}`);
    }
  } catch (err) {
    console.error(`❌ Supabase API connection failed: ${err.message}`);
    process.exit(1);
  }

  console.log('\n🎉 All environment checks passed! Forge AI is ready to run.');
}

validate();
