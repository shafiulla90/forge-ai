const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env.local');

// Helper to parse existing .env.local file
function readEnv() {
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[key] = value.trim();
      }
    });
  }
  return env;
}

// Helper to write/update .env.local file preserving existing entries
function writeEnv(newEnv) {
  let content = '';
  const existingEnv = readEnv();
  const mergedEnv = { ...existingEnv, ...newEnv };

  // If file exists, we want to try to update values in-place or append
  if (fs.existsSync(envPath)) {
    let fileLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    const updatedKeys = new Set();
    
    fileLines = fileLines.map(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        if (mergedEnv[key] !== undefined) {
          updatedKeys.add(key);
          return `${key}=${mergedEnv[key]}`;
        }
      }
      return line;
    });

    // Append any keys that weren't in the original file
    Object.keys(mergedEnv).forEach(key => {
      if (!updatedKeys.has(key)) {
        fileLines.push(`${key}=${mergedEnv[key]}`);
      }
    });

    content = fileLines.join('\n');
  } else {
    // Write fresh file
    content = Object.entries(mergedEnv)
      .map(([key, val]) => `${key}=${val}`)
      .join('\n') + '\n';
  }

  fs.writeFileSync(envPath, content, 'utf8');
}

function askQuestion(rl, query, defaultValue) {
  const displayQuery = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
  return new Promise(resolve => {
    rl.question(displayQuery, answer => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function main() {
  console.log('===================================================');
  console.log('⚡ Welcome to the Forge AI Public Setup Wizard ⚡');
  console.log('===================================================\n');
  console.log('This wizard will guide you through setting up your environment configuration.');
  console.log('Your settings will be saved to your local `.env.local` file.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const existingEnv = readEnv();

  try {
    // 1. Anthropic API Key
    const anthropicKey = await askQuestion(
      rl,
      'Enter your Anthropic API Key (ANTHROPIC_API_KEY)',
      existingEnv.ANTHROPIC_API_KEY || ''
    );

    // 2. Supabase URL
    const supabaseUrl = await askQuestion(
      rl,
      'Enter your Supabase URL (NEXT_PUBLIC_SUPABASE_URL)',
      existingEnv.NEXT_PUBLIC_SUPABASE_URL || ''
    );

    // 3. Supabase Anon Key
    const supabaseAnonKey = await askQuestion(
      rl,
      'Enter your Supabase Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)',
      existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // 4. Supabase Service Role Key
    const supabaseServiceKey = await askQuestion(
      rl,
      'Enter your Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY)',
      existingEnv.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 5. Database URL (Postgres Connection string)
    const databaseUrl = await askQuestion(
      rl,
      'Enter your Supabase Postgres Database URL (DATABASE_URL)',
      existingEnv.DATABASE_URL || ''
    );

    // Generate Encryption Key if not existing
    let encryptionKey = existingEnv.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.log('🔑 Generating random 32-byte ENCRYPTION_KEY...');
      encryptionKey = crypto.randomBytes(32).toString('hex');
    }

    // Set Default App URL if not existing
    const appUrl = existingEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const newEnv = {
      ANTHROPIC_API_KEY: anthropicKey,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
      DATABASE_URL: databaseUrl,
      ENCRYPTION_KEY: encryptionKey,
      NEXT_PUBLIC_APP_URL: appUrl
    };

    console.log('\n📝 Writing configuration to `.env.local`...');
    writeEnv(newEnv);
    console.log('✅ Configuration saved successfully!');

    // Ask if we should run migrations
    const runMigrations = await askQuestion(rl, 'Would you like to run the database migrations now? (y/n)', 'y');
    if (runMigrations.toLowerCase() === 'y' || runMigrations.toLowerCase() === 'yes') {
      console.log('\n⚙️ Executing database migrations...');
      try {
        execSync('node scripts/setup-database.js', { stdio: 'inherit' });
      } catch (err) {
        console.error('❌ Database migration failed.');
      }
    } else {
      console.log('\n⚠️ Skipped database migrations. You can run them manually later using `npm run setup-db` or `node scripts/setup-database.js`.');
    }

    console.log('\n🎉 Setup complete! You are ready to start Forge AI.');

  } catch (err) {
    console.error('❌ An error occurred during setup:', err);
  } finally {
    rl.close();
  }
}

main();
