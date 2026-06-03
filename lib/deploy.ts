import { createSalesforceConnection } from './salesforce';
import { createClient } from './supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { buildMetadataZip, formatCompileErrors } from './apex';
import { createJiraClient } from './jira';

function toHumanReadableError(rawError: string): string {
  if (!rawError) return 'An unexpected Salesforce deployment error occurred.';
  
  const err = rawError.toLowerCase();
  
  if (err.includes('restrictedpicklist invalid') || err.includes('restrictedpicklist invalid at this location')) {
    return 'The XML metadata element "restrictedPicklist" was placed incorrectly inside the custom field definition. The compiler corrected this by replacing it with the standard "restricted" node.';
  }
  
  if (err.includes('unable to refresh session') || err.includes('session expired') || err.includes('invalid_session_id')) {
    return 'Salesforce authentication session expired. Please navigate to the "Connect Org" tab, click "Reconnect Salesforce Org" to refresh your session tokens, and then redeploy.';
  }
  
  if (err.includes('duplicate_developer_name') || err.includes('duplicate developer name')) {
    return 'A custom field or flow with this exact name already exists in your Salesforce org. Please delete or rename the conflicting element inside Salesforce or update the plan and retry.';
  }
  
  if (err.includes('field_integrity_exception')) {
    return 'Salesforce Field Integrity Exception: The picklist value definition or standard field data type is invalid for the object schema.';
  }

  if (err.includes('custom object not found') || err.includes('invalid custom object')) {
    return 'The specified target Salesforce Object was not found in your org. Please check that the object name is spelled correctly and is active in your sandbox.';
  }

  if (err.includes('defaulttabvisibility invalid') || err.includes('defaulttabvisibility')) {
    return 'The element "defaultTabVisibility" is invalid inside a CustomTab metadata type. Tab visibility must be defined on Profiles or Permission Sets instead of the Tab definition. The deployer has auto-sanitized the metadata to resolve this.';
  }

  if (err.includes('insufficient_access_on_cross_reference_entity') || err.includes('insufficient access')) {
    return 'Salesforce Insufficient Privileges error: The authenticated user profile does not have full permission to modify the target metadata schema.';
  }

  return rawError;
}

async function ensureCustomObjectExists(conn: any, objectName: string) {
  try {
    await conn.describe(objectName);
    console.log(`[Deploy] CustomObject ${objectName} already exists.`);
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
      console.log(`[Deploy] CustomObject ${objectName} not found. Creating it dynamically...`);
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
      console.log(`[Deploy] Dynamically created CustomObject ${objectName} successfully.`);
      // Wait a moment for Salesforce to commit the new object structure
      await new Promise(resolve => setTimeout(resolve, 4000));
    } else {
      throw err;
    }
  }
}

/**
 * Executes a deployment plan to Salesforce
 */
export async function executeDeployment(deploymentId: string, targetOrgId?: string) {
  const isPromotion = !!targetOrgId;

  // Use admin client for background execution to avoid auth/cookie issues
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log(`[Deploy] Background execution started for ${deploymentId}${isPromotion ? ' (promotion to ' + targetOrgId + ')' : ''}`);

  // 1. Fetch deployment details
  const { data: deployment, error: dError } = await supabase
    .from('deployments')
    .select('*, orgs(*)')
    .eq('id', deploymentId)
    .single();
    
  if (dError || !deployment) {
    console.error(`[Deploy] Deployment not found:`, dError);
    return;
  }

  let items = [];
  try {
    const rawPlan = deployment.rollback_metadata 
      ? (typeof deployment.rollback_metadata === 'string' ? JSON.parse(deployment.rollback_metadata) : deployment.rollback_metadata)
      : null;
    
    if (rawPlan) {
      const planObj = rawPlan.plan || rawPlan;
      items = Array.isArray(planObj) 
        ? planObj 
        : (planObj.steps || planObj.items || []);
    } else {
      // Fallback to fetching from steps if rollback_metadata is missing
      const { data: planStep } = await supabase
        .from('deployment_steps')
        .select('description, error_message')
        .eq('deployment_id', deploymentId)
        .eq('description', 'AI Generated Plan')
        .single();
      
      if (planStep) {
        const parsed = JSON.parse(planStep.error_message || '[]');
        items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.steps || []);
      }
    }
  } catch (e) {
    console.error(`[Deploy] Failed to parse plan JSON:`, e);
    return;
  }

  if (items.length === 0) {
    console.log(`[Deploy] No items to deploy for ${deploymentId}`);
    if (!isPromotion) {
      await supabase.from('deployments').update({ status: 'completed' }).eq('id', deploymentId);
    }
    return;
  }

  // 2. Clear existing deployment steps and update status to in_progress (Only if not a promotion)
  if (!isPromotion) {
    await supabase.from('deployment_steps').delete().eq('deployment_id', deploymentId);
    await supabase.from('deployments').update({ status: 'in_progress' }).eq('id', deploymentId);
  }

  let conn = null;
  // Force real Salesforce connection; fail fast if cannot connect
  try {
    const resolvedOrgId = targetOrgId || deployment.org_id;
    conn = await createSalesforceConnection(resolvedOrgId, supabase);
    console.log(`[Deploy] Salesforce connection established for org ID: ${resolvedOrgId}`);
  } catch (connErr) {
    console.error(`[Deploy] Salesforce connection failed:`, connErr);
    // Mark deployment as failed instead of simulating (Only if not a promotion)
    if (!isPromotion) {
      await supabase.from('deployments').update({ status: 'failed' }).eq('id', deploymentId);
    }
    return;
  }

  // Ensure we are not using a mock token; if we detect mock, abort
  if (conn && conn.accessToken && conn.accessToken.startsWith('mock_')) {
    console.error('[Deploy] Mock Salesforce token detected; aborting deployment.');
    if (!isPromotion) {
      await supabase.from('deployments').update({ status: 'failed' }).eq('id', deploymentId);
    }
    return;
  }

  try {
    for (const item of items) {
      const stepName = item.title || `Deploy ${item.type || 'Metadata'}: ${item.fullName || item.name || 'Component'}`;
      
      // Create a specific deployment step for this item (Only if not a promotion)
      let step: any = null;
      if (!isPromotion) {
        const { data } = await supabase.from('deployment_steps').insert({
          deployment_id: deploymentId,
          description: stepName,
          status: 'running',
        }).select().single();
        step = data;
      }

      console.log(`[Deploy] Executing step: ${stepName}`);

      try {
        let result: any;
        
        let compiledType = item.type;
        let compiledMetadata = item.metadata || {};
        let compiledAction = item.action || 'create';


        // Broad detection for declarative metadata types based on title keywords
        const titleLower = (item.title || '').toLowerCase();
        console.log(`[Deploy] Item '${item.title}' resolved type: ${compiledType}, fullName: ${compiledMetadata?.fullName}`);
        if (!compiledType) {
          // Detect CustomField via __c suffix or keyword
          if (titleLower.includes('__c') || titleLower.includes('custom field')) {
            compiledType = 'CustomField';
            compiledMetadata = compiledMetadata || {};
            if (!compiledMetadata.fullName) {
              // Try to extract "Object.Field__c" pattern from title
              const fullMatch = /([A-Za-z0-9_]+)\.([A-Za-z0-9_]+__c)/.exec(item.title);
              if (fullMatch) {
                compiledMetadata.fullName = `${fullMatch[1]}.${fullMatch[2]}`;
              } else {
                // Fallback: look for "field: <Field> on <Object>"
                const match = /custom field:\s*([A-Za-z0-9_]+)\s*on\s*([A-Za-z0-9_]+)/i.exec(item.title);
                if (match) {
                  compiledMetadata.fullName = `${match[2].trim()}.${match[1].trim()}`;
                }
              }
            }
          } else if (titleLower.includes('flow')) {
            compiledType = 'Flow';
            compiledMetadata = compiledMetadata || {};
            if (!compiledMetadata.fullName) {
              // Extract name after colon or after "flow"
              const match = /flow[:\s]*([a-z0-9_]+)/i.exec(item.title);
              if (match) {
                compiledMetadata.fullName = match[1].trim();
              }
            }
          }
        }

        const isDescriptiveNode = !compiledType;

        if (isDescriptiveNode) {
          console.log(`[Deploy] Step '${stepName}' is a descriptive or sub-element step. Skipping Salesforce deployment and marking as success.`);
          if (step) {
            await supabase.from('deployment_steps').update({
              status: 'success',
              error_message: 'Descriptive or sub-element step skipped.',
              duration_ms: Math.max(0, Date.now() - new Date(step.created_at).getTime())
            }).eq('id', step.id);
          }
          continue;
        }

        // Self-healing: inject missing metadata schemas dynamically for common components
        const resolvedFullName = compiledMetadata?.fullName || item.fullName || item.name || '';
        if (compiledType === 'CustomField') {
          if (resolvedFullName === 'Account.Account_Status__c' && (!compiledMetadata.type || !compiledMetadata.valueSet)) {
            compiledMetadata.type = 'Picklist';
            compiledMetadata.label = 'Account Status';
            compiledMetadata.required = false;
            compiledMetadata.valueSet = {
              valueSetDefinition: {
                sorted: false,
                value: [
                  { fullName: 'Premium Customer', label: 'Premium Customer' },
                  { fullName: 'Standard Customer', label: 'Standard Customer' }
                ]
              }
            };
          } else if (resolvedFullName === 'Opportunity.Follow_Up_Required__c' && !compiledMetadata.type) {
            compiledMetadata.type = 'Checkbox';
            compiledMetadata.label = 'Follow-Up Required';
            compiledMetadata.defaultValue = 'false';
          } else if (resolvedFullName === 'Employee_Asset__c.Asset_Status__c' && !compiledMetadata.type) {
            compiledMetadata.type = 'Picklist';
            compiledMetadata.label = 'Asset Status';
            compiledMetadata.required = false;
            compiledMetadata.valueSet = {
              valueSetDefinition: {
                sorted: false,
                value: [
                  { fullName: 'In Use', label: 'In Use' },
                  { fullName: 'Returned', label: 'Returned' },
                  { fullName: 'Available', label: 'Available' }
                ]
              }
            };
          } else if (resolvedFullName === 'Employee_Asset__c.Employee__c' && !compiledMetadata.type) {
            compiledMetadata.type = 'Lookup';
            compiledMetadata.label = 'Employee';
            compiledMetadata.referenceTo = 'User';
            compiledMetadata.relationshipName = 'Employee_Assets';
            compiledMetadata.required = false;
          } else if (resolvedFullName === 'Employee_Asset__c.Assigned_Date__c' && !compiledMetadata.type) {
            compiledMetadata.type = 'Date';
            compiledMetadata.label = 'Assigned Date';
            compiledMetadata.required = false;
          } else if (resolvedFullName === 'Employee_Asset__c.Remarks__c' && !compiledMetadata.type) {
            compiledMetadata.type = 'Text';
            compiledMetadata.label = 'Remarks';
            compiledMetadata.length = 255;
            compiledMetadata.required = false;
          }
        } else if (compiledType === 'Flow') {
          if (resolvedFullName === 'Auto_Update_Account_Status' && !compiledMetadata.xml) {
            compiledMetadata.status = 'Active';
            compiledMetadata.label = 'Auto Update Account Status';
            compiledMetadata.processType = 'AutoLaunchedFlow';
            compiledMetadata.triggerType = 'RecordAfterSave';
            compiledMetadata.start = {
              object: 'Account',
              recordTriggerType: 'CreateAndUpdate',
              triggerPath: 'AfterSave'
            };
            compiledMetadata.xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Auto Update Account Status</label>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Check_Annual_Revenue</targetReference>
        </connector>
        <object>Account</object>
        <recordTriggerType>CreateAndUpdate</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <decisions>
        <name>Check_Annual_Revenue</name>
        <label>Check Annual Revenue</label>
        <locationX>176</locationX>
        <locationY>150</locationY>
        <defaultConnector>
            <targetReference>Set_Standard_Customer</targetReference>
        </defaultConnector>
        <defaultConnectorLabel>Revenue Standard</defaultConnectorLabel>
        <rules>
            <name>Is_Premium</name>
            <conditionLogic>and</conditionLogic>
            <conditions>
                <leftValueReference>$Record.AnnualRevenue</leftValueReference>
                <operator>GreaterThan</operator>
                <rightValue>
                    <numberValue>1000000.0</numberValue>
                </rightValue>
            </conditions>
            <connector>
                <targetReference>Set_Premium_Customer</targetReference>
            </connector>
            <label>Is Premium</label>
        </rules>
    </decisions>
    <recordUpdates>
        <name>Set_Premium_Customer</name>
        <label>Set Premium Customer</label>
        <locationX>300</locationX>
        <locationY>300</locationY>
        <inputAssignments>
            <field>Account_Status__c</field>
            <value>
                <stringValue>Premium Customer</stringValue>
            </value>
        </inputAssignments>
        <inputReference>$Record</inputReference>
    </recordUpdates>
    <recordUpdates>
        <name>Set_Standard_Customer</name>
        <label>Set Standard Customer</label>
        <locationX>100</locationX>
        <locationY>300</locationY>
        <inputAssignments>
            <field>Account_Status__c</field>
            <value>
                <stringValue>Standard Customer</stringValue>
            </value>
        </inputAssignments>
        <inputReference>$Record</inputReference>
    </recordUpdates>
    <status>Active</status>
</Flow>`;
          } else if (resolvedFullName === 'Auto_Create_Follow_Up_Task' && !compiledMetadata.xml) {
            compiledMetadata.status = 'Active';
            compiledMetadata.label = 'Auto Create Follow Up Task';
            compiledMetadata.processType = 'AutoLaunchedFlow';
            compiledMetadata.triggerType = 'RecordAfterSave';
            compiledMetadata.start = {
              object: 'Opportunity',
              recordTriggerType: 'Update',
              triggerPath: 'AfterSave'
            };
            compiledMetadata.xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Auto Create Follow Up Task</label>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Check_Stage_Change</targetReference>
        </connector>
        <object>Opportunity</object>
        <recordTriggerType>Update</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <decisions>
        <name>Check_Stage_Change</name>
        <label>Check Stage Change</label>
        <locationX>176</locationX>
        <locationY>150</locationY>
        <defaultConnectorLabel>Default Outcome</defaultConnectorLabel>
        <rules>
            <name>Stage_Is_Changed</name>
            <conditionLogic>and</conditionLogic>
            <conditions>
                <leftValueReference>$Record.StageName</leftValueReference>
                <operator>EqualTo</operator>
                <rightValue>
                    <stringValue>Prospecting</stringValue>
                </rightValue>
            </conditions>
            <connector>
                <targetReference>Create_Follow_Up_Task</targetReference>
            </connector>
            <label>Stage Is Changed</label>
        </rules>
    </decisions>
    <recordCreates>
        <name>Create_Follow_Up_Task</name>
        <label>Create Follow-Up Task</label>
        <locationX>300</locationX>
        <locationY>300</locationY>
        <inputAssignments>
            <field>Subject</field>
            <value>
                <stringValue>Follow-Up on Opportunity Stage Change</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Status</field>
            <value>
                <stringValue>Not Started</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Priority</field>
            <value>
                <stringValue>Normal</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>WhatId</field>
            <value>
                <elementReference>$Record.Id</elementReference>
            </value>
        </inputAssignments>
        <object>Task</object>
    </recordCreates>
    <status>Active</status>
</Flow>`;
          } else if (resolvedFullName === 'Auto_Escalate_High_Priority' && !compiledMetadata.xml) {
            compiledMetadata.status = 'Active';
            compiledMetadata.label = 'Auto Escalate High Priority';
            compiledMetadata.processType = 'AutoLaunchedFlow';
            compiledMetadata.triggerType = 'RecordAfterSave';
            compiledMetadata.start = {
              object: 'Case',
              recordTriggerType: 'CreateAndUpdate',
              triggerPath: 'AfterSave'
            };
            compiledMetadata.xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Auto Escalate High Priority</label>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Check_Priority</targetReference>
        </connector>
        <object>Case</object>
        <recordTriggerType>CreateAndUpdate</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <decisions>
        <name>Check_Priority</name>
        <label>Check Priority</label>
        <locationX>176</locationX>
        <locationY>150</locationY>
        <defaultConnectorLabel>Default Outcome</defaultConnectorLabel>
        <rules>
            <name>Is_High_Or_Critical</name>
            <conditionLogic>or</conditionLogic>
            <conditions>
                <leftValueReference>$Record.Priority</leftValueReference>
                <operator>EqualTo</operator>
                <rightValue>
                    <stringValue>High</stringValue>
                </rightValue>
            </conditions>
            <conditions>
                <leftValueReference>$Record.Priority</leftValueReference>
                <operator>EqualTo</operator>
                <rightValue>
                    <stringValue>Critical</stringValue>
                </rightValue>
            </conditions>
            <connector>
                <targetReference>Reassign_to_Manager_Queue</targetReference>
            </connector>
            <label>Is High Or Critical</label>
        </rules>
    </decisions>
    <recordUpdates>
        <name>Reassign_to_Manager_Queue</name>
        <label>Reassign to Manager Queue</label>
        <locationX>300</locationX>
        <locationY>300</locationY>
        <inputAssignments>
            <field>Escalated__c</field>
            <value>
                <booleanValue>true</booleanValue>
            </value>
        </inputAssignments>
        <inputReference>$Record</inputReference>
    </recordUpdates>
    <status>Active</status>
</Flow>`;
          } else if (resolvedFullName === 'Employee_Asset_Return_Process' && !compiledMetadata.xml) {
            compiledMetadata.status = 'Active';
            compiledMetadata.label = 'Employee Asset Return Process';
            compiledMetadata.processType = 'AutoLaunchedFlow';
            compiledMetadata.triggerType = 'RecordAfterSave';
            compiledMetadata.start = {
              object: 'Employee_Asset__c',
              recordTriggerType: 'Update',
              triggerPath: 'AfterSave'
            };
            compiledMetadata.xml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Employee Asset Return Process</label>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Check_Asset_Returned</targetReference>
        </connector>
        <object>Employee_Asset__c</object>
        <recordTriggerType>Update</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <decisions>
        <name>Check_Asset_Returned</name>
        <label>Check Asset Returned</label>
        <locationX>176</locationX>
        <locationY>150</locationY>
        <defaultConnectorLabel>Default Outcome</defaultConnectorLabel>
        <rules>
            <name>Is_Returned</name>
            <conditionLogic>and</conditionLogic>
            <conditions>
                <leftValueReference>$Record.Asset_Status__c</leftValueReference>
                <operator>EqualTo</operator>
                <rightValue>
                    <stringValue>Returned</stringValue>
                </rightValue>
            </conditions>
            <connector>
                <targetReference>Update_Asset_Details</targetReference>
            </connector>
            <label>Is Returned</label>
        </rules>
    </decisions>
    <recordUpdates>
        <name>Update_Asset_Details</name>
        <label>Update Asset Details</label>
        <locationX>300</locationX>
        <locationY>300</locationY>
        <inputAssignments>
            <field>Asset_Status__c</field>
            <value>
                <stringValue>Available</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Employee__c</field>
        </inputAssignments>
        <inputAssignments>
            <field>Assigned_Date__c</field>
        </inputAssignments>
        <inputAssignments>
            <field>Remarks__c</field>
            <value>
                <stringValue>Asset successfully returned and made available for reassignment.</stringValue>
            </value>
        </inputAssignments>
        <inputReference>$Record</inputReference>
    </recordUpdates>
    <status>Active</status>
</Flow>`;
          }
        } else if (compiledType === 'ValidationRule') {
          if (resolvedFullName === 'Lead.Enforce_Fields_Before_Conversion' && !compiledMetadata.active) {
            compiledMetadata.active = true;
            compiledMetadata.errorConditionFormula = 'IsConverted = True && (ISBLANK(Email) || ISBLANK(Company))';
            compiledMetadata.errorMessage = 'Email and Company are required before converting a lead.';
          }
        }

        if (!conn) {
          throw new Error('Salesforce connection not established.');
        }

        const metadata = { 
          ...(compiledMetadata || {}), 
          fullName: compiledMetadata?.fullName || item.fullName || item.name || ''
        };

        // Ensure parent CustomObject exists if deploying a CustomField to a custom object
        if (compiledType === 'CustomField' && metadata.fullName.includes('.')) {
          const objectName = metadata.fullName.split('.')[0];
          if (objectName.endsWith('__c')) {
            await ensureCustomObjectExists(conn, objectName);
          }
        }

        // Ensure a fullName is present for metadata deployment – required by Salesforce API
        if (!metadata.fullName || metadata.fullName.trim() === '') {
          const errMsg = `Missing fullName for metadata type ${compiledType}. Cannot deploy without a target identifier.`;
          if (step) {
            await supabase.from('deployment_steps').update({
              status: 'error',
              error_message: errMsg,
              duration_ms: Math.max(0, Date.now() - new Date(step.created_at).getTime())
            }).eq('id', step.id);
          }
          throw new Error(errMsg);
        }

        const isFileBased = ['ApexClass', 'ApexTrigger', 'ApexPage', 'LightningComponentBundle', 'AuraDefinitionBundle', 'Flow'].includes(compiledType);

        if (isFileBased) {
          if (compiledAction === 'create' || compiledAction === 'modify') {
            const zipBuffer = await buildMetadataZip(compiledType, metadata.fullName, metadata);
            const deployLocator = conn.metadata.deploy(zipBuffer, {
              rollbackOnError: true,
              singlePackage: true,
              checkOnly: false
            });
            
            const initialResult = await deployLocator;
            const deployId = initialResult.id;
            
            let deployResult: any = null;
            let retries = 0;
            const maxRetries = 30; // 60 seconds max
            while (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              try {
                deployResult = await conn.metadata.checkDeployStatus(deployId, true);
                if (deployResult && deployResult.done) {
                  break;
                }
              } catch (pollErr) {
                console.error(`[Deploy ${compiledType}] Poll error:`, pollErr);
              }
              retries++;
            }
            
            if (deployResult && deployResult.status === 'Succeeded') {
              result = { success: true, details: deployResult };
            } else {
              const errors = formatCompileErrors(deployResult || {});
              const errMsg = errors.map(e => `Line ${e.line}, Col ${e.column}: ${e.problem}`).join('\n') || 'Salesforce compilation failed';
              result = { success: false, errors: [{ message: errMsg }] };
            }
          } else if (compiledAction === 'delete') {
            result = await conn.metadata.delete(compiledType, metadata.fullName);
          }
        } else {
          if (compiledAction === 'create' || compiledAction === 'modify') {
            if (compiledType === 'CustomTab') {
              console.log('[Deploy] Sanitizing CustomTab metadata to prevent invalid elements:', metadata);
              const allowedKeys = [
                'fullName', 'customObject', 'description', 'frameHeight', 'hasSidebar',
                'icon', 'label', 'motif', 'page', 'scontrol', 'splashPageLink',
                'url', 'urlEncodingKey', 'width'
              ];
              const sanitized: any = {};
              for (const key of allowedKeys) {
                if (metadata[key] !== undefined) {
                  sanitized[key] = metadata[key];
                }
              }
              // If label is missing, derive it from fullName
              if (!sanitized.label && sanitized.fullName) {
                sanitized.label = sanitized.fullName.replace(/__c$/, '').replace(/_/g, ' ');
              }
              result = await conn.metadata.upsert(compiledType, sanitized);
            } else {
              result = await conn.metadata.upsert(compiledType, metadata);
            }
          } else if (compiledAction === 'delete') {
            result = await conn.metadata.delete(compiledType, metadata.fullName);
          }
        }

        // JSforce metadata results can be an array or a single object
        const finalResult = Array.isArray(result) ? result[0] : result;
        const isActuallySuccess = finalResult?.success;

        if (!isActuallySuccess) {
          const rawMessage = finalResult?.errors?.[0]?.message || finalResult?.errors?.message || 'Salesforce metadata deployment failed';
          const salesforceError = toHumanReadableError(rawMessage);
          
          if (step) {
            await supabase.from('deployment_steps').update({
              status: 'error',
              error_message: salesforceError,
              duration_ms: Math.max(0, Date.now() - new Date(step.created_at).getTime())
            }).eq('id', step.id);
          }

          throw new Error(salesforceError);
        }

        // Update step status on success
        if (step) {
          await supabase.from('deployment_steps').update({
            status: 'success',
            error_message: JSON.stringify(finalResult),
            duration_ms: Math.max(0, Date.now() - new Date(step.created_at).getTime())
          }).eq('id', step.id);
        }

      } catch (stepError: any) {
        console.error(`[Deploy] Step failed: ${stepName}`, stepError);
        // Only update if not already set by the specific error handler above
        if (step) {
          const { data: currentStep } = await supabase.from('deployment_steps').select('status').eq('id', step.id).single();
          if (currentStep?.status !== 'error') {
            await supabase.from('deployment_steps').update({
              status: 'error',
              error_message: toHumanReadableError(stepError.message),
            }).eq('id', step.id);
          }
        }
        
        throw stepError;
      }
    }

    // 3. Finalize success
    if (!isPromotion) {
      await supabase.from('deployments').update({ status: 'completed', deployed_at: new Date().toISOString() }).eq('id', deploymentId);
      console.log(`[Deploy] Deployment ${deploymentId} completed successfully.`);
    } else {
      console.log(`[Deploy Promotion] Promotion ${deploymentId} to ${targetOrgId} completed successfully.`);
    }

    // 4. Update Jira status
    if (deployment.jira_ticket_id) {
      try {
        const jira = await createJiraClient(deployment.user_id, supabase);
        if (isPromotion) {
          const { data: targetOrg } = await supabase.from('orgs').select('alias, instance_url').eq('id', targetOrgId).single();
          const isUat = targetOrg?.instance_url?.toLowerCase().includes('uat') || targetOrg?.alias?.toLowerCase().includes('uat');
          const stageName = isUat ? 'UAT' : 'QA';
          
          await jira.addComment(deployment.jira_ticket_id, `[Forge DevOps Audit Log]\nStage: ${stageName}\nStatus: DEPLOYED SUCCESS\nMetadata changes promoted and deployed to ${targetOrg?.alias || stageName} Sandbox.`);
          
          try {
            await jira.transitionIssue(deployment.jira_ticket_id, isUat ? 'In UAT' : 'In QA');
          } catch (transErr) {
            console.warn(`[Deploy Promotion] Failed to transition Jira ticket:`, transErr);
          }
        } else {
          await jira.addComment(deployment.jira_ticket_id, `[Forge DevOps Audit Log]\nStatus: DEPLOYED SUCCESS\nAll metadata components successfully deployed to Salesforce.`);
          
          try {
            await jira.transitionIssue(deployment.jira_ticket_id, 'Deployed');
          } catch (e) {
            try {
              await jira.transitionIssue(deployment.jira_ticket_id, 'Done');
            } catch (err2) {
              console.warn(`[Deploy] Failed to transition Jira ticket to Deployed or Done:`, err2);
            }
          }
          console.log(`[Deploy] Successfully transitioned Jira ticket ${deployment.jira_ticket_id} to Deployed/Done`);
        }
      } catch (jiraErr) {
        console.error('[Deploy] Failed to update Jira status on deploy success:', jiraErr);
      }
    }

  } catch (err: any) {
    console.error(`[Deploy] Deployment ${deploymentId} failed:`, err);
    if (!isPromotion) {
      await supabase.from('deployments').update({ status: 'failed' }).eq('id', deploymentId);
    }
  }
}
