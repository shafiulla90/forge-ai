# Troubleshooting Guide

Find solutions to common issues when installing or starting Forge AI.

---

## 🔒 1. Salesforce Connection Issues

### ❌ Error: `AuthDecryptError` or "Failed to decipher auth data"
- **Reason**: The Salesforce CLI credentials inside your `.sfdx` folder were encrypted using a local keychain that has changed, or you copied these files from another machine.
- **Resolution**:
  1. Open your terminal.
  2. Re-authenticate the target org using the Salesforce CLI:
     ```bash
     sf org login web --alias <alias>
     ```
  3. Reconnect the org in the Forge AI dashboard.

### ❌ My local org is not showing up in the setup picker list
- **Reason**: The org might not be authorized under the current operating system user, or the alias is not configured.
- **Resolution**: Run `sf org list` in your command line. If the org is not listed, authorize it using:
  ```bash
  sf org login web --alias MyOrg
  ```

---

## 💾 2. Database & Supabase Issues

### ❌ Error: `Postgres connection failed: Connection refused`
- **Reason**: The database host is unreachable, or your database password in `DATABASE_URL` is incorrect.
- **Resolution**:
  - Open `.env.local` and check that the `DATABASE_URL` matches your Supabase database connection string exactly.
  - Verify that your database password does not contain unescaped special characters (e.g. `@`, `:`, `/`). If it does, URL-encode them.

### ❌ Error: `extension "vector" is not available`
- **Reason**: Your database does not support `pgvector` or it is disabled.
- **Resolution**: Supabase supports pgvector by default. If you are using a self-hosted Postgres, install the `pgvector` extension or verify that your Postgres version is 15+.

---

## 🔑 3. API & Key Issues

### ❌ Error: `ANTHROPIC_API_KEY is not defined`
- **Reason**: The key is missing from `.env.local` or the setup script did not save it.
- **Resolution**:
  - Open `.env.local` and add: `ANTHROPIC_API_KEY=your-sk-ant-key-here`.
  - Or, run `node scripts/setup.js` to configure your keys again.
