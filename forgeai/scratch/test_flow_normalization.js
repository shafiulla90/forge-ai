const { normalizeFlowXml } = require('../lib/flow');

const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Test Flow</label>
    <processType>Flow</processType>
    <recordTriggerType>CreateAndUpdate</recordTriggerType>
    <triggerType>RecordAfterSave</triggerType>
    <object>Account</object>
    <filterLogic>and</filterLogic>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
    </start>
    <actionCalls>
        <name>Send_IT_Email_Notification</name>
        <label>Send IT Email Notification</label>
        <actionName>emailSimple</actionName>
        <actionType>emailSimple</actionType>
        <filterLogic>and</filterLogic>
        <filters>
            <field>Id</field>
            <operator>EqualTo</operator>
        </filters>
        <object>Account</object>
    </actionCalls>
    <recordUpdates>
        <name>Set_Premium_Customer</name>
        <label>Set Premium Customer</label>
        <inputAssignments>
            <field>Account_Status__c</field>
            <value>
                <stringValue>Premium Customer</stringValue>
            </value>
        </inputAssignments>
        <inputReference>$Record</inputReference>
        <filterLogic>and</filterLogic>
        <filters>
            <field>Id</field>
            <operator>EqualTo</operator>
        </filters>
        <object>Account</object>
    </recordUpdates>
    <recordLookups>
        <name>Get_Contact</name>
        <label>Get Contact</label>
        <filterLogic>or</filterLogic>
        <object>Contact</object>
    </recordLookups>
</Flow>`;

async function run() {
  console.log("Input XML filterLogic / filters / object state:");
  console.log(" - Root-level filterLogic present");
  console.log(" - ActionCalls has filterLogic, filters, object");
  console.log(" - Start filterLogic present, but no filters");
  console.log(" - recordUpdates has inputReference AND filterLogic, filters, object");
  console.log(" - recordLookups has filterLogic, object, but no filters");
  console.log("\nNormalizing...");
  
  const outputXml = await normalizeFlowXml(testXml);
  
  console.log("\nOutput XML result:\n");
  console.log(outputXml);
  
  const hasRootFilterLogic = outputXml.match(/<Flow[^>]*>[\s\S]*?<filterLogic>/) && !outputXml.substring(outputXml.indexOf('<Flow')).split('<start>')[0].includes('<filterLogic>');
  const hasFilterLogicInActionCalls = outputXml.includes('<actionCalls>') && outputXml.substring(outputXml.indexOf('<actionCalls>')).split('</actionCalls>')[0].includes('<filterLogic>');
  const hasFiltersInActionCalls = outputXml.includes('<actionCalls>') && outputXml.substring(outputXml.indexOf('<actionCalls>')).split('</actionCalls>')[0].includes('<filters>');
  const hasObjectInActionCalls = outputXml.includes('<actionCalls>') && outputXml.substring(outputXml.indexOf('<actionCalls>')).split('</actionCalls>')[0].includes('<object>');
  
  const hasFilterLogicInStart = outputXml.includes('<start>') && outputXml.substring(outputXml.indexOf('<start>')).split('</start>')[0].includes('<filterLogic>');
  const hasFilterLogicInUpdates = outputXml.includes('<recordUpdates>') && outputXml.substring(outputXml.indexOf('<recordUpdates>')).split('</recordUpdates>')[0].includes('<filterLogic>');
  const hasFiltersInUpdates = outputXml.includes('<recordUpdates>') && outputXml.substring(outputXml.indexOf('<recordUpdates>')).split('</recordUpdates>')[0].includes('<filters>');
  const hasObjectInUpdates = outputXml.includes('<recordUpdates>') && outputXml.substring(outputXml.indexOf('<recordUpdates>')).split('</recordUpdates>')[0].includes('<object>');
  const hasFilterLogicInLookups = outputXml.includes('<recordLookups>') && outputXml.substring(outputXml.indexOf('<recordLookups>')).split('</recordLookups>')[0].includes('<filterLogic>');
  
  console.log("Assertions:");
  console.log("1. Root has no filterLogic:", !outputXml.replace(/<start>[\s\S]*<\/start>/, '').replace(/<recordUpdates>[\s\S]*<\/recordUpdates>/, '').includes('<filterLogic>') ? "PASS" : "FAIL");
  console.log("2. ActionCalls has no filterLogic:", !hasFilterLogicInActionCalls ? "PASS" : "FAIL");
  console.log("3. ActionCalls has no filters:", !hasFiltersInActionCalls ? "PASS" : "FAIL");
  console.log("4. ActionCalls has no object:", !hasObjectInActionCalls ? "PASS" : "FAIL");
  console.log("5. Start has no filterLogic:", !hasFilterLogicInStart ? "PASS" : "FAIL");
  console.log("6. Updates has no filterLogic:", !hasFilterLogicInUpdates ? "PASS" : "FAIL");
  console.log("7. Updates has no filters:", !hasFiltersInUpdates ? "PASS" : "FAIL");
  console.log("8. Updates has no object:", !hasObjectInUpdates ? "PASS" : "FAIL");
  console.log("9. Lookups has no filterLogic:", !hasFilterLogicInLookups ? "PASS" : "FAIL");
}

run().catch(console.error);
