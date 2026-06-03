import { createSalesforceConnection } from './salesforce';
import { createClient } from './supabase/server';

/**
 * Promotes metadata from source org to target org
 */
export async function promoteMetadata(
  sourceOrgId: string, 
  targetOrgId: string, 
  items: { type: string, fullName: string }[]
) {
  const supabase = await createClient();
  
  // 1. Setup connections
  const sourceConn = await createSalesforceConnection(sourceOrgId);
  const targetConn = await createSalesforceConnection(targetOrgId);
  
  console.log(`[Pipeline] Promoting ${items.length} items from ${sourceOrgId} to ${targetOrgId}`);

  for (const item of items) {
    try {
      // 2. Read from source
      const metadata = await sourceConn.metadata.read(item.type as any, item.fullName);
      
      if (!metadata) {
        console.error(`[Pipeline] Metadata not found in source: ${item.type} ${item.fullName}`);
        continue;
      }

      // 3. Upsert to target
      await targetConn.metadata.upsert(item.type as any, metadata);
      
      console.log(`[Pipeline] Successfully promoted ${item.type}: ${item.fullName}`);
    } catch (err) {
      console.error(`[Pipeline] Failed to promote ${item.type}: ${item.fullName}`, err);
      throw err;
    }
  }
}
