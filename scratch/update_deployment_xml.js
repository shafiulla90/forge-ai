require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const flowXml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Contact Type Based on Email</label>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Check_Email_Domain</targetReference>
        </connector>
        <object>Contact</object>
        <recordTriggerType>CreateAndUpdate</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <decisions>
        <name>Check_Email_Domain</name>
        <label>Check Email Domain</label>
        <locationX>176</locationX>
        <locationY>150</locationY>
        <defaultConnector>
            <targetReference>Set_Business</targetReference>
        </defaultConnector>
        <defaultConnectorLabel>IsNotGmail</defaultConnectorLabel>
        <rules>
            <name>Is_Gmail</name>
            <conditionLogic>and</conditionLogic>
            <conditions>
                <leftValueReference>$Record.Email</leftValueReference>
                <operator>Contains</operator>
                <rightValue>
                    <stringValue>@gmail.com</stringValue>
                </rightValue>
            </conditions>
            <connector>
                <targetReference>Set_Personal</targetReference>
            </connector>
            <label>Is Gmail</label>
        </rules>
    </decisions>
    <recordUpdates>
        <name>Set_Personal</name>
        <label>Set Personal</label>
        <locationX>300</locationX>
        <locationY>300</locationY>
        <inputAssignments>
            <field>Contact_Type__c</field>
            <value>
                <stringValue>Personal</stringValue>
            </value>
        </inputAssignments>
        <inputReference>$Record</inputReference>
    </recordUpdates>
    <recordUpdates>
        <name>Set_Business</name>
        <label>Set Business</label>
        <locationX>100</locationX>
        <locationY>300</locationY>
        <inputAssignments>
            <field>Contact_Type__c</field>
            <value>
                <stringValue>Business</stringValue>
            </value>
        </inputAssignments>
        <inputReference>$Record</inputReference>
    </recordUpdates>
    <status>Active</status>
</Flow>`;

(async () => {
  const depId = 'dba9416b-13ba-4506-ad96-c5ca261b568a';
  
  // 1. Fetch deployment
  const { data: deployment, error: fetchErr } = await supabase
    .from('deployments')
    .select('*')
    .eq('id', depId)
    .single();
    
  if (fetchErr || !deployment) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  
  let rollbackMetadata = JSON.parse(deployment.rollback_metadata);
  
  // Update Flow step
  const plan = rollbackMetadata.plan || rollbackMetadata;
  const steps = plan.steps || plan.items || [];
  
  steps.forEach(step => {
    if (step.type === 'Flow' && step.fullName === 'Contact_Type_Based_on_Email') {
      step.metadata.processType = 'AutoLaunchedFlow';
      step.metadata.xml = flowXml;
      console.log('Updated xml metadata in step:', step.title);
    }
  });
  
  // Save back
  const { error: updateErr } = await supabase
    .from('deployments')
    .update({
      rollback_metadata: JSON.stringify(rollbackMetadata)
    })
    .eq('id', depId);
    
  if (updateErr) {
    console.error('Update error:', updateErr);
  } else {
    console.log('Successfully updated deployment record dba9416b-13ba-4506-ad96-c5ca261b568a with Flow XML.');
  }
})();
