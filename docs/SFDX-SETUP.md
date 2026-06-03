# SFDX local integration Guide

Forge AI leverages your local **Salesforce CLI (SFDX)** configuration to connect to your organizations instantly. This eliminates the need to configure Salesforce Connected Apps, manage consumer keys, or enter passwords manually.

---

## 🔍 How it Works

Salesforce CLI stores authorized credentials in your home directory:
- **Windows**: `C:\Users\<Username>\.sfdx\`
- **macOS / Linux**: `~/.sfdx/`

Inside this folder, SFDX maintains:
1. `alias.json`: Maps local aliases (e.g. `MyDevOrg`) to Salesforce usernames.
2. `<username>.json`: Stores encrypted access tokens, refresh tokens, login URLs, and org metadata.

When you open the Forge AI setup page:
1. Our backend scans the `.sfdx` folder.
2. It parses the files and maps usernames to their aliases.
3. When you connect an org, our API invokes the local `sf` or `sfdx` CLI in a secure background process to decrypt the active session tokens.
4. The tokens are then encrypted using your secret `ENCRYPTION_KEY` and saved to the database.

---

## 🛠️ Adding Orgs to the List

If you want an organization to show up in the Forge AI picker:
1. Install the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli).
2. Authorize your org in your terminal:
   ```bash
   # For Sandboxes
   sf org login web --instance-url https://test.salesforce.com --alias MySandbox
   
   # For Production or Dev Editions
   sf org login web --alias MyProdOrg
   ```
3. Refresh the Forge AI setup page (`http://localhost:3000/setup`). The newly authorized org will automatically appear in the list.

---

## 🔒 Security & Privacy

- **Local Processing**: Token decryption happens purely on your local machine using your own Salesforce CLI.
- **DB Encryption**: All tokens are encrypted using AES-256-GCM via the `ENCRYPTION_KEY` defined in your `.env.local` before database persistence.
- **No External Sharing**: Your credentials never leave your configured Next.js server and database.
