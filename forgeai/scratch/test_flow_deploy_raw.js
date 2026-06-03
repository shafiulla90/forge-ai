require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const { createSalesforceConnection } = require('../lib/salesforce');
const { buildMetadataZip } = require('../lib/apex');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const flowXml = `<?xml version="1.0" encoding="UTF-8"?>
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

(async () => {
  const uatOrgId = '14ed8e0d-dab4-4160-80e9-c066e9af7011';
  console.log('Connecting to UAT Org...');
  const conn = await createSalesforceConnection(uatOrgId, supabase);
  
  console.log('Building zip bundle...');
  const metadata = {
    fullName: 'Employee_Asset_Return_Process',
    xml: flowXml
  };
  const zipBuffer = await buildMetadataZip('Flow', 'Employee_Asset_Return_Process', metadata);
  
  console.log('Deploying flow metadata to Salesforce...');
  const deployLocator = conn.metadata.deploy(zipBuffer, {
    rollbackOnError: true,
    singlePackage: true,
    checkOnly: false
  });
  
  const initialResult = await deployLocator;
  const deployId = initialResult.id;
  console.log('Deployment ID:', deployId);
  
  let deployResult = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    deployResult = await conn.metadata.checkDeployStatus(deployId, true);
    console.log(`Polling status: ${deployResult.status} (done: ${deployResult.done})`);
    if (deployResult.done) break;
  }
  
  console.log('\n--- Full Deployment Result ---');
  console.log(JSON.stringify(deployResult, null, 2));
})();
