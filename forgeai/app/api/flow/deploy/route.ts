import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createSalesforceConnection } from '@/lib/salesforce';
import { buildFlowZip, normalizeFlowXml } from '@/lib/flow';

export async function POST(req: NextRequest) {
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let deploymentId = '';
  let stepId = '';
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { orgId, fullName, xml } = await req.json();

    if (!orgId || !xml) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Auto-extract flow API name from XML label if not passed
    let flowName = fullName;
    if (!flowName) {
      const labelMatch = xml.match(/<label>([\s\S]*?)<\/label>/);
      if (labelMatch) {
        flowName = labelMatch[1]
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
      }
      if (!flowName) {
        flowName = 'Generated_Flow';
      }
    }

    // Initialize deployment history logs in Supabase
    try {
      const { data: deployment } = await adminSupabase.from('deployments').insert({
        org_id: orgId,
        status: 'in_progress',
        rollback_metadata: JSON.stringify({
          summary: `Deploys Screen Flow: ${flowName.replace(/_/g, ' ')}`,
          items: [
            {
              type: 'Flow',
              fullName: flowName
            }
          ]
        })
      }).select().single();

      if (deployment) {
        deploymentId = deployment.id;
        const { data: step } = await adminSupabase.from('deployment_steps').insert({
          deployment_id: deploymentId,
          description: `Deploy Flow: ${flowName}`,
          status: 'running'
        }).select().single();
        if (step) {
          stepId = step.id;
        }
      }
    } catch (dbErr) {
      console.error('Failed to create deployment record in Supabase:', dbErr);
    }

    // Auto-heal common LLM Flow XML schema errors: replace <label> with <fieldText> inside <fields> elements
    let cleanXml = xml.replace(/<fields>([\s\S]*?)<\/fields>/g, (match: string, fieldsContent: string) => {
      return `<fields>${fieldsContent.replace(/<label>([\s\S]*?)<\/label>/g, '<fieldText>$1</fieldText>')}</fields>`;
    });

    // Group elements by tag consecutively to prevent "screens is duplicated" schema error
    cleanXml = await normalizeFlowXml(cleanXml);

    const conn = await createSalesforceConnection(orgId, supabase);
    
    // 1. Build the zip file
    const zipBuffer = await buildFlowZip(flowName, cleanXml);
    
    // 2. Deploy to Salesforce
    const deployResult = await conn.metadata.deploy(zipBuffer, {
      rollbackOnError: true,
      singlePackage: true,
    });

    const deployId = deployResult.id;
    
    // Poll the status manually to prevent Next.js background JSforce timer suspension
    let statusRes = await conn.metadata.checkDeployStatus(deployId, true);
    let attempts = 0;
    while (!statusRes.done && attempts < 30) {
      await new Promise(r => setTimeout(r, 1500));
      statusRes = await conn.metadata.checkDeployStatus(deployId, true);
      attempts++;
    }

    if (statusRes.status === 'Failed') {
      let errMsg = 'Salesforce Deployment Failed';
      if (statusRes.details && statusRes.details.componentFailures) {
        const failures = Array.isArray(statusRes.details.componentFailures)
          ? statusRes.details.componentFailures
          : [statusRes.details.componentFailures];
        
        errMsg = failures
          .map((f: any) => `${f.problem || 'Unknown error'} (${f.fileName || 'flow'})`)
          .join('\n');
      } else if (statusRes.errorMessage) {
        errMsg = statusRes.errorMessage;
      }

      // Try self-healing for missing fields or objects!
      console.log(`[Flow Deploy API] First deployment failed with: ${errMsg}. Attempting self-healing...`);
      const healingRes = await healMissingFieldsAndReDeploy(conn, cleanXml, errMsg);
      if (healingRes.healed) {
        console.log(`[Flow Deploy API] Self-healing succeeded. Retrying flow deployment...`);
        // Re-build and re-deploy!
        const retryResult = await conn.metadata.deploy(zipBuffer, {
          rollbackOnError: true,
          singlePackage: true,
        });

        const retryDeployId = retryResult.id;
        statusRes = await conn.metadata.checkDeployStatus(retryDeployId, true);
        attempts = 0;
        while (!statusRes.done && attempts < 30) {
          await new Promise(r => setTimeout(r, 1500));
          statusRes = await conn.metadata.checkDeployStatus(retryDeployId, true);
          attempts++;
        }

        // Re-extract errMsg if it failed again
        if (statusRes.status === 'Failed') {
          if (statusRes.details && statusRes.details.componentFailures) {
            const failures = Array.isArray(statusRes.details.componentFailures)
              ? statusRes.details.componentFailures
              : [statusRes.details.componentFailures];
            
            errMsg = failures
              .map((f: any) => `${f.problem || 'Unknown error'} (${f.fileName || 'flow'})`)
              .join('\n');
          } else if (statusRes.errorMessage) {
            errMsg = statusRes.errorMessage;
          }
        }
      }

      if (statusRes.status === 'Failed') {
        // Update Supabase to reflect failure
        if (deploymentId) {
          if (stepId) {
            await adminSupabase.from('deployment_steps').update({
              status: 'error',
              error_message: errMsg,
              duration_ms: Date.now() - startTime
            }).eq('id', stepId);
          }
          await adminSupabase.from('deployments').update({
            status: 'failed'
          }).eq('id', deploymentId);
        }

        return NextResponse.json({ success: false, error: errMsg });
      }
    }

    // Update Supabase to reflect success
    if (deploymentId) {
      if (stepId) {
        await adminSupabase.from('deployment_steps').update({
          status: 'success',
          duration_ms: Date.now() - startTime
        }).eq('id', stepId);
      }
      await adminSupabase.from('deployments').update({
        status: 'completed',
        deployed_at: new Date().toISOString()
      }).eq('id', deploymentId);
    }

    return NextResponse.json({ success: true, result: statusRes });
  } catch (error: any) {
    console.error('[API Flow Deploy] Error:', error);
    
    // Fallback error logging to database
    if (deploymentId) {
      try {
        if (stepId) {
          await adminSupabase.from('deployment_steps').update({
            status: 'error',
            error_message: error.message,
            duration_ms: Date.now() - startTime
          }).eq('id', stepId);
        }
        await adminSupabase.from('deployments').update({
          status: 'failed'
        }).eq('id', deploymentId);
      } catch (dbErr) {
        console.error('Failed to log final error to Supabase:', dbErr);
      }
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function ensureCustomObjectExists(conn: any, objectName: string) {
  try {
    await conn.describe(objectName);
    console.log(`[Flow Self-Healing] CustomObject ${objectName} already exists.`);
  } catch (err: any) {
    const errMsg = (err.message || '').toLowerCase();
    const errCode = (err.errorCode || err.name || '').toLowerCase();
    if (
      errMsg.includes('not_found') || 
      errMsg.includes('not found') || 
      errMsg.includes('invalid_type') || 
      errMsg.includes('does not exist') ||
      errCode.includes('not_found') ||
      errCode.includes('invalid_type')
    ) {
      console.log(`[Flow Self-Healing] CustomObject ${objectName} not found. Creating it dynamically...`);
      const objMetadata = {
        fullName: objectName,
        label: objectName.replace(/__c$/, '').replace(/_/g, ' '),
        pluralLabel: objectName.replace(/__c$/, '').replace(/_/g, ' ') + 's',
        nameField: {
          type: 'Text',
          label: `${objectName.replace(/__c$/, '').replace(/_/g, ' ')} Name`
        },
        deploymentStatus: 'Deployed',
        sharingModel: 'ReadWrite'
      };
      await conn.metadata.create('CustomObject', objMetadata);
      console.log(`[Flow Self-Healing] Dynamically created CustomObject ${objectName} successfully.`);
      // Wait a moment for Salesforce to commit the new object structure
      await new Promise(resolve => setTimeout(resolve, 4000));
    } else {
      throw err;
    }
  }
}

async function healMissingFieldsAndReDeploy(conn: any, flowXml: string, errMsg: string): Promise<{ healed: boolean; error?: string }> {
  let missingField: string | null = null;
  let targetObject: string | null = null;

  // Pattern 1: The field "Status__c" for the object "Contact" doesn't exist.
  const match1 = /The field "([A-Za-z0-9_]+)" for the object "([A-Za-z0-9_]+)"/i.exec(errMsg);
  // Pattern 2: The field "Field__c" on the object "Object__c" doesn't exist.
  const match2 = /The field "([A-Za-z0-9_]+)" on the object "([A-Za-z0-9_]+)"/i.exec(errMsg);
  // Pattern 3: Field $Record.Asset_Name__c does not exist.
  const match3 = /Field \$Record\.([A-Za-z0-9_]+)/i.exec(errMsg);

  if (match1) {
    missingField = match1[1];
    targetObject = match1[2];
  } else if (match2) {
    missingField = match2[1];
    targetObject = match2[2];
  } else if (match3) {
    missingField = match3[1];
    // Find object name from flow XML <object> tag inside <start> node
    const objectMatch = /<object>([A-Za-z0-9_]+)<\/object>/i.exec(flowXml);
    if (objectMatch) {
      targetObject = objectMatch[1];
    }
  }

  if (missingField && targetObject) {
    console.log(`[Flow Self-Healing] Detected missing field: ${missingField} on object: ${targetObject}. Proactively provisioning it...`);
    
    try {
      // 1. If target object is custom, ensure it exists
      if (targetObject.endsWith('__c')) {
        await ensureCustomObjectExists(conn, targetObject);
      }

      // 2. Create the missing custom field dynamically
      if (missingField.endsWith('__c')) {
        let fieldType = 'Text';
        let label = missingField.replace(/__c$/, '').replace(/_/g, ' ');
        let valueSet: any = undefined;

        // Auto-heal field type based on keywords in name
        const fieldLower = missingField.toLowerCase();
        if (fieldLower.includes('status') || fieldLower.includes('type') || fieldLower.includes('stage')) {
          fieldType = 'Picklist';
          valueSet = {
            valueSetDefinition: {
              sorted: false,
              value: [
                { fullName: 'New', label: 'New', default: true },
                { fullName: 'Active', label: 'Active' },
                { fullName: 'Inactive', label: 'Inactive' },
                { fullName: 'Completed', label: 'Completed' },
                { fullName: 'Pending', label: 'Pending' }
              ]
            }
          };
        } else if (fieldLower.includes('date') || fieldLower.includes('scheduled') || fieldLower.includes('performed')) {
          fieldType = 'Date';
        } else if (fieldLower.includes('amount') || fieldLower.includes('revenue') || fieldLower.includes('price')) {
          fieldType = 'Currency';
        } else if (fieldLower.includes('email')) {
          fieldType = 'Email';
        } else if (fieldLower.includes('number') || fieldLower.includes('count')) {
          fieldType = 'Number';
        }

        const fieldMetadata = {
          fullName: `${targetObject}.${missingField}`,
          type: fieldType,
          label: label,
          required: false,
          length: fieldType === 'Text' ? 255 : undefined,
          precision: fieldType === 'Number' || fieldType === 'Currency' ? 18 : undefined,
          scale: fieldType === 'Number' || fieldType === 'Currency' ? 0 : undefined,
          valueSet: valueSet
        };

        console.log(`[Flow Self-Healing] Creating custom field metadata:`, JSON.stringify(fieldMetadata, null, 2));
        const createRes = await conn.metadata.create('CustomField', fieldMetadata);
        console.log(`[Flow Self-Healing] Dynamic field creation result:`, JSON.stringify(createRes, null, 2));
        
        // Wait a moment for Salesforce to commit the new field structure
        await new Promise(resolve => setTimeout(resolve, 4000));
        return { healed: true };
      }
    } catch (err: any) {
      console.error(`[Flow Self-Healing] Failed to dynamically create missing field:`, err);
      return { healed: false, error: err.message };
    }
  }

  return { healed: false };
}

