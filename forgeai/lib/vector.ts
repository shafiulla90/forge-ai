import { OpenAI } from 'openai';
import { createClient } from './supabase/server';

let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (e) {
  console.warn('Failed to initialize OpenAI client:', e);
}

export const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generate embedding for a text string
 */
export async function generateEmbedding(text: string) {
  if (!process.env.OPENAI_API_KEY || !openai) {
    console.warn('[Vector] OPENAI_API_KEY is not set or client failed to initialize. Skipping real embedding generation.');
    // Return a dummy embedding vector of 1536 zeros to prevent crashes
    return new Array(1536).fill(0);
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.replace(/\n/g, ' '),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('[Vector] OpenAI embedding failed:', error);
    return new Array(1536).fill(0);
  }
}

/**
 * Search for relevant metadata in the vector store
 */
export async function searchRelevantMetadata(orgId: string, query: string, limit: number = 10) {
  const embedding = await generateEmbedding(query);
  const supabase = await createClient();

  // We use a RPC (Stored Procedure) in Supabase for vector search
  // You need to create this function in Supabase SQL Editor:
  /*
  CREATE OR REPLACE FUNCTION match_metadata(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    p_org_id uuid
  )
  RETURNS TABLE (
    id uuid,
    metadata_type text,
    api_name text,
    content_text text,
    similarity float
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      me.id,
      me.metadata_type,
      me.api_name,
      me.content_text,
      1 - (me.embedding <=> query_embedding) AS similarity
    FROM metadata_embeddings me
    WHERE me.org_id = p_org_id
      AND 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
  END;
  $$;
  */

  const { data, error } = await supabase.rpc('match_metadata', {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: limit,
    p_org_id: orgId,
  });

  if (error) {
    console.error('[Vector] Search error:', error);
    return [];
  }

  return data;
}
