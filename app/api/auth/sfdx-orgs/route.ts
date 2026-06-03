import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
  const sfdxDir = path.join(os.homedir(), '.sfdx');
  if (!fs.existsSync(sfdxDir)) {
    return NextResponse.json({ success: true, orgs: [] });
  }

  try {
    // 1. Load aliases mapping
    let aliases: Record<string, string> = {};
    const aliasPath = path.join(sfdxDir, 'alias.json');
    if (fs.existsSync(aliasPath)) {
      try {
        const aliasData = JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
        if (aliasData && aliasData.orgs) {
          aliases = aliasData.orgs;
        }
      } catch (e) {
        console.error('Error reading alias.json:', e);
      }
    }

    // Map username to list of aliases
    const usernameToAliases: Record<string, string[]> = {};
    Object.entries(aliases).forEach(([alias, username]) => {
      const cleanUser = username.replace(/\.json$/, '');
      if (!usernameToAliases[cleanUser]) {
        usernameToAliases[cleanUser] = [];
      }
      usernameToAliases[cleanUser].push(alias);
    });

    // 2. Read all auth json files
    const files = fs.readdirSync(sfdxDir);
    const orgs = [];

    for (const file of files) {
      if (!file.endsWith('.json') || ['alias.json', 'key.json', 'sfdx-config.json', 'stash.json'].includes(file)) {
        continue;
      }

      const username = file.slice(0, -5); // remove .json
      const filePath = path.join(sfdxDir, file);
      try {
        const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const orgAliases = usernameToAliases[username] || [];
        
        orgs.push({
          username,
          aliases: orgAliases,
          instanceUrl: fileContent.instanceUrl || fileContent.loginUrl || '',
          orgId: fileContent.orgId || '',
          loginUrl: fileContent.loginUrl || '',
          isDevHub: !!fileContent.isDevHub
        });
      } catch (e) {
        console.error(`Error reading SFDX file ${file}:`, e);
      }
    }

    return NextResponse.json({ success: true, orgs });
  } catch (error: any) {
    console.error('Error listing SFDX orgs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
