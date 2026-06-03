require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const targetId = '0ce1845e-0163-46ce-8b26-85f299adfad5';
  const duplicateId = '825b611d-2c10-486e-ab6c-ff3b788a10a1';

  console.log('Starting reset/cleanup v2 of deployments for SCRUM-13...');

  // 1. Delete all deployment steps for both deployments
  await supabase.from('deployment_steps').delete().eq('deployment_id', targetId);
  await supabase.from('deployment_steps').delete().eq('deployment_id', duplicateId);
  console.log('Deleted deployment steps.');

  // 2. Delete duplicate deployment record
  const { error: errDelDup } = await supabase.from('deployments').delete().eq('id', duplicateId);
  if (errDelDup) console.error('Error deleting duplicate deployment:', errDelDup);
  else console.log('Deleted duplicate deployment:', duplicateId);

  // 3. Define the 6-step plan
  const plan = {
    summary: 'Create Customer__c object with fields and a welcome email Flow.',
    riskLevel: 'Low',
    steps: [
      {
        num: 1,
        title: 'Create Custom Object: Customer__c',
        type: 'CustomObject',
        fullName: 'Customer__c',
        detail: 'Creates the Customer custom object in Salesforce with Customer Name ID as the primary name field.',
        api: 'Metadata API · CustomObject',
        metadata: {
          fullName: 'Customer__c',
          label: 'Customer',
          pluralLabel: 'Customers',
          sharingModel: 'ReadWrite',
          deploymentStatus: 'Deployed',
          nameField: {
            type: 'Text',
            label: 'Customer Name ID'
          }
        }
      },
      {
        num: 2,
        title: 'Create field: Customer_Name__c on Customer__c',
        type: 'CustomField',
        fullName: 'Customer__c.Customer_Name__c',
        detail: 'Required Text field (length 100) to capture the customer\'s name.',
        api: 'Metadata API · CustomField',
        metadata: {
          fullName: 'Customer__c.Customer_Name__c',
          type: 'Text',
          label: 'Customer Name',
          length: 100,
          required: true
        }
      },
      {
        num: 3,
        title: 'Create field: Customer_Email__c on Customer__c',
        type: 'CustomField',
        fullName: 'Customer__c.Customer_Email__c',
        detail: 'Required Email field to store customer contact address and trigger welcome notifications.',
        api: 'Metadata API · CustomField',
        metadata: {
          fullName: 'Customer__c.Customer_Email__c',
          type: 'Email',
          label: 'Customer Email',
          required: true
        }
      },
      {
        num: 4,
        title: 'Create field: Customer_Status__c on Customer__c',
        type: 'CustomField',
        fullName: 'Customer__c.Customer_Status__c',
        detail: 'Picklist field with values: New (default), Active, and Inactive to track customer lifecycle status.',
        api: 'Metadata API · CustomField',
        metadata: {
          fullName: 'Customer__c.Customer_Status__c',
          type: 'Picklist',
          label: 'Customer Status',
          required: false,
          valueSet: {
            valueSetDefinition: {
              sorted: false,
              value: [
                { fullName: 'New', label: 'New', default: true },
                { fullName: 'Active', label: 'Active' },
                { fullName: 'Inactive', label: 'Inactive' }
              ]
            }
          }
        }
      },
      {
        num: 5,
        title: 'Create Record-Triggered Flow: Auto_Send_Welcome_Email',
        type: 'Flow',
        fullName: 'Auto_Send_Welcome_Email',
        detail: 'Record-Triggered Flow executing after-save when a Customer record is created. Automatically sends a welcome email and transitions the Customer Status to Active.',
        api: 'Metadata API · Flow',
        metadata: {
          fullName: 'Auto_Send_Welcome_Email',
          status: 'Active',
          label: 'Auto Send Welcome Email',
          processType: 'AutoLaunchedFlow',
          triggerType: 'RecordAfterSave',
          start: {
            object: 'Customer__c',
            recordTriggerType: 'Create',
            triggerPath: 'AfterSave'
          },
          xml: `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Auto Send Welcome Email</label>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <locationX>150</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Send_Welcome_Email</targetReference>
        </connector>
        <object>Customer__c</object>
        <recordTriggerType>Create</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <actionCalls>
        <name>Send_Welcome_Email</name>
        <label>Send Welcome Email</label>
        <locationX>150</locationX>
        <locationY>250</locationY>
        <actionName>emailSimple</actionName>
        <actionType>emailSimple</actionType>
        <connector>
            <targetReference>Update_Customer_Status</targetReference>
        </connector>
        <inputParameters>
            <name>emailAddresses</name>
            <value>
                <elementReference>$Record.Customer_Email__c</elementReference>
            </value>
        </inputParameters>
        <inputParameters>
            <name>emailSubject</name>
            <value>
                <stringValue>Welcome to Our Platform!</stringValue>
            </value>
        </inputParameters>
        <inputParameters>
            <name>emailBody</name>
            <value>
                <stringValue>Hello, Welcome to our platform! We are excited to have you.</stringValue>
            </value>
        </inputParameters>
    </actionCalls>
    <recordUpdates>
        <name>Update_Customer_Status</name>
        <label>Update Customer Status</label>
        <locationX>150</locationX>
        <locationY>450</locationY>
        <inputAssignments>
            <field>Customer_Status__c</field>
            <value>
                <stringValue>Active</stringValue>
            </value>
        </inputAssignments>
        <inputReference>$Record</inputReference>
    </recordUpdates>
    <status>Active</status>
</Flow>`
        }
      },
      {
        num: 6,
        title: 'Create Custom Tab: Customer__c',
        type: 'CustomTab',
        fullName: 'Customer__c',
        detail: 'Creates a Custom Tab using the People motif for the Customer__c custom object to make it visible in navigation.',
        api: 'Metadata API · CustomTab',
        metadata: {
          fullName: 'Customer__c',
          customObject: true,
          motif: 'Custom19: People'
        }
      }
    ],
    acceptanceCriteria: [
      'Customer__c custom object is successfully created in Salesforce Sandbox',
      'Fields Customer_Name__c, Customer_Email__c, and Customer_Status__c are present',
      'Flow triggers on new Customer creation, sending welcome emails and updating status to Active',
      'Flow is active and validated in Salesforce Sandbox'
    ]
  };

  const rollback_metadata = {
    summary: 'Auto Send Welcome Email for New Customer Records',
    plan: plan,
    ticket_key: 'SCRUM-13',
    ticket_link: 'https://mrshafiulla143.atlassian.net/browse/SCRUM-13'
  };

  // 4. Reset primary deployment record
  const { data: updatedDep, error: errUpdateTarget } = await supabase
    .from('deployments')
    .update({
      status: 'In review',
      rollback_metadata: JSON.stringify(rollback_metadata),
      approved_by: null,
      approved_at: null,
      deployed_at: null
    })
    .eq('id', targetId)
    .select();

  if (errUpdateTarget) console.error('Error resetting target deployment:', errUpdateTarget);
  else console.log('Successfully reset target deployment:', JSON.stringify(updatedDep, null, 2));

  console.log('Cleanup and Reset v2 finished.');
}
run();
