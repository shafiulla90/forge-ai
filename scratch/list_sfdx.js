const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function getSfdxOrgs() {
  const sfdxDir = path.join(os.homedir(), '.sfdx');
  if (!fs.existsSync(sfdxDir)) {
    console.log('No .sfdx directory found.');
    return [];
  }

  // 1. Load aliases
  let aliases = {};
  const aliasPath = path.join(sfdxDir, 'alias.json');
  if (fs.existsSync(aliasPath)) {
    try {
      const aliasData = JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
      if (aliasData && aliasData.orgs) {
        // Map username to list of aliases
        aliases = aliasData.orgs;
      }
    } catch (e) {
      console.error('Error reading alias.json:', e);
    }
  }

  // Find all alias maps (reversing alias -> username)
  const usernameToAliases = {};
  Object.entries(aliases).forEach(([alias, username]) => {
    const cleanUser = username.replace(/\.json$/, ''); // strip .json if any
    if (!usernameToAliases[cleanUser]) {
      usernameToAliases[cleanUser] = [];
    }
    usernameToAliases[cleanUser].push(alias);
  });

  // 2. Read all json files
  const files = fs.readdirSync(sfdxDir);
  const orgs = [];

  files.forEach(file => {
    if (!file.endsWith('.json') || ['alias.json', 'key.json', 'sfdx-config.json', 'stash.json'].includes(file)) {
      return;
    }

    const username = file.slice(0, -5); // remove .json
    const filePath = path.join(sfdxDir, file);
    try {
      const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const orgAliases = usernameToAliases[username] || [];
      
      orgs.push({
        username,
        aliases: orgAliases,
        instanceUrl: fileContent.instanceUrl,
        orgId: fileContent.orgId,
        loginUrl: fileContent.loginUrl,
        isDevHub: !!fileContent.isDevHub
      });
    } catch (e) {
      console.error(`Error reading ${file}:`, e);
    }
  });

  return orgs;
}

function decryptOrg(username) {
  console.log(`\n⏳ Attempting to display org credentials for: ${username}...`);
  try {
    // Try running sf org display first
    let output;
    try {
      output = execSync(`sf org display --target-org ${username} --verbose --json`, { stdio: 'pipe' }).toString();
    } catch (e) {
      // Fallback to sfdx force:org:display
      output = execSync(`sfdx force:org:display --targetusername ${username} --verbose --json`, { stdio: 'pipe' }).toString();
    }

    const res = JSON.parse(output);
    if (res.status === 0 && res.result) {
      const result = res.result;
      
      // Parse refresh token from sfdxAuthUrl if present
      let parsedRefreshToken = '';
      if (result.sfdxAuthUrl) {
        // Format: force://<clientId>:<clientSecret>:<refreshToken>@<instanceUrl>
        // or force://<refreshToken>@<instanceUrl>
        const match = result.sfdxAuthUrl.match(/force:\/\/(?:([^:]+):([^:]*):)?([^@]+)@/);
        if (match) {
          parsedRefreshToken = match[3];
          console.log(`   Parsed refresh token: ${parsedRefreshToken.substring(0, 10)}...`);
        }
      }

      console.log('✅ Successfully retrieved org details!');
      console.log(`   Org ID: ${result.id}`);
      console.log(`   Instance URL: ${result.instanceUrl}`);
      console.log(`   Access Token: ${result.accessToken.substring(0, 15)}...`);
      return {
        success: true,
        accessToken: result.accessToken,
        refreshToken: parsedRefreshToken || result.refreshToken || '',
        instanceUrl: result.instanceUrl,
        orgId: result.id,
        clientId: result.clientId || ''
      };
    }
  } catch (e) {
    console.error(`❌ Failed to retrieve credentials for ${username}:`, e.message);
  }
  return { success: false };
}

const orgs = getSfdxOrgs();
console.log('Detected Orgs:', orgs);

if (orgs.length > 0) {
  // Test decrypting the first org
  const testUser = orgs[0].username;
  const decrypted = decryptOrg(testUser);
  console.log('Decrypted Result:', decrypted);
}
