# Supabase Setup Guide

Forge AI uses **Supabase** (Postgres + Realtime API) for database storage. 

---

## 🛠️ Step 1: Create a Supabase Project

1. Sign in or sign up at [Supabase](https://supabase.com/).
2. Create a new project.
3. Choose a password and region.
4. Wait for the database to provision.

---

## 🔑 Step 2: Retrieve API Keys

Once your project is ready, navigate to **Project Settings** -> **API**:
1. Copy the **Project URL** -> maps to `NEXT_PUBLIC_SUPABASE_URL`.
2. Copy the **anon / public** key -> maps to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copy the **service_role** key (secret) -> maps to `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🔌 Step 3: Retrieve Postgres Connection String

Navigate to **Project Settings** -> **Database**:
1. Locate the **Connection string** section.
2. Select the **URI** tab.
3. Copy the URI. It will look like:
   `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
4. Replace `[YOUR-PASSWORD]` with your actual database password. This maps to `DATABASE_URL`.

---

## ⚙️ Step 4: Running Migrations

When you run the installation scripts (`install.bat` / `install.sh`), the setup wizard automatically triggers `scripts/setup-database.js`. This script connects directly to Postgres and configures:

- **Extensions**: `uuid-ossp` and `vector` (for AI metadata embeddings).
- **Tables**:
  - `orgs`: Salesforce org connections and sync status.
  - `user_configs`: Settings, Jira tokens, and user preferences.
  - `jira_connections`: Linked Jira sites and configurations.
  - `deployments` & `deployment_steps`: Deployment tracking logs.
  - `conversations` & `messages`: AI chat history and plans.
  - `embeddings`: Salesforce metadata embeddings vector store.
- **Stored Procedures**: `match_metadata` vector cosine-similarity search.
- **Security**: Row-Level Security (RLS) policies enabling secure data access for authenticated users.

If you ever need to rerun migrations manually, run:
```bash
node scripts/setup-database.js
```
