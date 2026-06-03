import { createSalesforceConnection } from './salesforce';
import { generateEmbedding } from './vector';
import { createClient } from './supabase/server';

/**
 * Ingests metadata from a Salesforce Org into the vector store
 */
export async function ingestMetadata(orgId: string) {
  const conn = await createSalesforceConnection(orgId);
  const supabase = await createClient();
  
  console.log('[Ingestion] Starting metadata ingestion for org:', orgId);
  
  // 1. Describe all metadata types
  const describe = await conn.metadata.describe();
  const types = describe.metadataObjects.map(o => o.xmlName);
  
  // For MVP, we'll focus on the most important types
  const coreTypes = ['CustomObject', 'ApexClass', 'Flow', 'Layout', 'CustomField'];
  const typesToSync = types.filter(t => coreTypes.includes(t));
  
  console.log(`[Ingestion] Syncing ${typesToSync.length} core types...`);
  
  for (const type of typesToSync) {
    try {
      // 2. List members for each type
      const members = await conn.metadata.list([{ type }]);
      const memberList = Array.isArray(members) ? members : [members].filter(Boolean);
      
      console.log(`[Ingestion] Found ${memberList.length} members for type: ${type}`);
      
      for (const member of memberList) {
        if (!member || !member.fullName) continue;
        
        // 3. Create a human-readable description for embedding
        const description = `${type}: ${member.fullName} in Salesforce org.`;
        
        // 4. Generate embedding
        const embedding = await generateEmbedding(description);
        
        // 5. Upsert into Supabase
        await supabase.from('metadata_embeddings').upsert({
          org_id: orgId,
          metadata_type: type,
          api_name: member.fullName,
          content_text: description,
          embedding,
          raw_metadata: member,
        }, {
          onConflict: 'org_id, metadata_type, api_name',
        });
      }
    } catch (err) {
      console.error(`[Ingestion] Error syncing type ${type}:`, err);
    }
  }
  
  // 6. Update org status
  await supabase.from('orgs').update({
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', orgId);
  
  console.log('[Ingestion] Metadata ingestion complete for org:', orgId);
}
