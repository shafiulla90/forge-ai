const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Helper to load env variables from .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found. Please run the setup wizard first.');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes if any
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

async function run() {
  loadEnv();
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }

  console.log('⏳ Connecting to Supabase database to run migrations...');
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🚀 Connected successfully! Running SQL migrations...');

    const migrations = `
      -- Enable Extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "vector";

      -- Table: orgs
      CREATE TABLE IF NOT EXISTS public.orgs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          org_alias TEXT,
          org_type TEXT,
          instance_url TEXT,
          access_token TEXT,
          refresh_token TEXT,
          org_id TEXT,
          client_id TEXT,
          client_secret TEXT,
          metadata_synced_at TIMESTAMPTZ,
          object_count INT,
          field_count INT,
          apex_class_count INT,
          flow_count INT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          alias TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          health_score INT,
          last_synced_at TIMESTAMPTZ
      );

      -- Add client_id and client_secret columns if they do not exist (for existing databases)
      ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS client_id TEXT;
      ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS client_secret TEXT;

      -- Table: user_configs
      CREATE TABLE IF NOT EXISTS public.user_configs (
          user_id UUID PRIMARY KEY,
          jira_tokens TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table: jira_connections
      CREATE TABLE IF NOT EXISTS public.jira_connections (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          site_url TEXT,
          project_key TEXT,
          access_token TEXT,
          refresh_token TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table: deployments
      CREATE TABLE IF NOT EXISTS public.deployments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          status TEXT,
          rollback_metadata TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table: deployment_steps
      CREATE TABLE IF NOT EXISTS public.deployment_steps (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE,
          description TEXT,
          status TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table: conversations
      CREATE TABLE IF NOT EXISTS public.conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          jira_ticket_id TEXT,
          title TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table: messages
      CREATE TABLE IF NOT EXISTS public.messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          content TEXT,
          implementation_plan JSONB,
          confidence_score INT,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table: embeddings
      CREATE TABLE IF NOT EXISTS public.embeddings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
          metadata_type TEXT,
          api_name TEXT,
          content_text TEXT,
          embedding vector(1536),
          raw_metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Stored Procedure: match_metadata
      CREATE OR REPLACE FUNCTION public.match_metadata (
        query_embedding vector(1536),
        match_threshold float,
        match_count int,
        p_org_id uuid
      )
      RETURNS TABLE (
        id uuid,
        org_id uuid,
        metadata_type text,
        api_name text,
        content_text text,
        raw_metadata jsonb,
        similarity float
      )
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          embeddings.id,
          embeddings.org_id,
          embeddings.metadata_type,
          embeddings.api_name,
          embeddings.content_text,
          embeddings.raw_metadata,
          1 - (embeddings.embedding <=> query_embedding) AS similarity
        FROM embeddings
        WHERE embeddings.org_id = p_org_id
          AND 1 - (embeddings.embedding <=> query_embedding) > match_threshold
        ORDER BY embeddings.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$ LANGUAGE plpgsql;

      -- Enable Row Level Security (RLS) on all tables
      ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.jira_connections ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.deployment_steps ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if any
      DROP POLICY IF EXISTS allow_all ON public.orgs;
      DROP POLICY IF EXISTS allow_all ON public.user_configs;
      DROP POLICY IF EXISTS allow_all ON public.jira_connections;
      DROP POLICY IF EXISTS allow_all ON public.deployments;
      DROP POLICY IF EXISTS allow_all ON public.deployment_steps;
      DROP POLICY IF EXISTS allow_all ON public.conversations;
      DROP POLICY IF EXISTS allow_all ON public.messages;
      DROP POLICY IF EXISTS allow_all ON public.embeddings;

      -- Create public permissive policies for authenticated users
      CREATE POLICY allow_all ON public.orgs FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY allow_all ON public.user_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY allow_all ON public.jira_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY allow_all ON public.deployments FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY allow_all ON public.deployment_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY allow_all ON public.conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY allow_all ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY allow_all ON public.embeddings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    `;

    await client.query(migrations);
    console.log('✅ SQL migrations completed successfully!');
    console.log('✅ pgvector extension enabled.');
    console.log('✅ match_metadata function registered.');
    console.log('✅ RLS rules configured.');

  } catch (err) {
    console.error('❌ Migration Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
