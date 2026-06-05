import { Anthropic } from '@anthropic-ai/sdk';

/**
 * Dynamically generates a complete, high-quality, executable Salesforce implementation plan using Claude.
 */
export async function generateAiPlan(summary: string, descriptionText: string, key: string): Promise<any> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[AI Plan Generator] Anthropic API Key not configured; falling back to stub plan.');
    return null;
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `You are a Salesforce Architect and DevOps Expert.
Analyze the following Jira ticket:
Key: ${key}
Summary: ${summary}
Description: ${descriptionText}

Based on this ticket, generate a concrete, high-quality Salesforce implementation plan.
The plan MUST contain actual executable steps for metadata creation/modification. Do NOT generate descriptive-only steps if actual Salesforce metadata (Objects, Fields, Flows, Tabs, Apex classes, triggers, or validation rules) needs to be created or modified.

The return value must be a single, valid JSON object matching the following structure:
{
  "summary": "Detailed technical summary of the implementation",
  "riskLevel": "Low" | "Medium" | "High",
  "steps": [
    {
      "num": 1,
      "title": "Title of the step (e.g. Create Picklist Field: Asset_Status__c on Employee_Asset__c)",
      "type": "CustomField" | "CustomObject" | "Flow" | "CustomTab" | "ApexClass" | "ApexTrigger" | "ValidationRule" | "EmailTemplate",
      "fullName": "API Name of the component (e.g. Employee_Asset__c.Asset_Status__c, or Employee_Asset_Return_Process, or unfiled$public/MyTemplate)",
      "detail": "Description of the step",
      "api": "Metadata API · CustomField" (or other Metadata API type),
      "action": "create" | "modify" | "delete",
      "metadata": {
        // Fully-formed metadata payload for JSforce metadata API.
        // For CustomField:
        // { "fullName": "Employee_Asset__c.Asset_Status__c", "type": "Picklist", "label": "Asset Status", "required": false, "valueSet": { "valueSetDefinition": { "sorted": false, "value": [{ "fullName": "New", "label": "New" }] } } }
        // For CustomObject:
        // { "fullName": "Employee_Asset__c", "label": "Employee Asset", "pluralLabel": "Employee Assets", "nameField": { "type": "Text", "label": "Employee Asset Name" }, "sharingModel": "ReadWrite", "deploymentStatus": "Deployed" }
        // For Flow:
        // { "fullName": "Employee_Asset_Return_Process", "status": "Active", "label": "Employee Asset Return Process", "processType": "AutoLaunchedFlow", "xml": "<?xml ... complete valid Flow XML ...>" }
        // For ApexClass:
        // { "fullName": "MyClass", "body": "public class MyClass { ... }" }
        // For ApexTrigger:
        // { "fullName": "MyTrigger", "body": "trigger MyTrigger on Account (after insert) { ... }" }
        // For CustomTab:
        // { "fullName": "Employee_Asset__c", "customObject": true, "motif": "Custom19: People" }
        // For EmailTemplate:
        // { "fullName": "unfiled$public/MyTemplate", "type": "html", "subject": "Hello", "content": "Body content", "name": "MyTemplate" }
      }
    }
  ],
  "acceptanceCriteria": [
    "Verification criteria 1",
    "Verification criteria 2"
  ]
}

CRITICAL RULES FOR METADATA GENERATION:
1. Ensure all custom objects and fields have the correct "__c" suffix.
2. For Picklist fields, ALWAYS provide a "valueSet" containing a "valueSetDefinition" with a "value" array of objects.
3. For Record-Triggered Flows, ALWAYS set "processType" to "AutoLaunchedFlow", and ensure the XML is perfectly valid, with correct starting trigger criteria.
4. Ensure all visual elements in Flows have <locationX>150</locationX> and <locationY>150</locationY> elements.
5. In generated Flow XML, do NOT output <filterLogic>, <filters>, <object>, or <recordTriggerType> at the root of the Flow node. They must only be inside <start> or filter/action elements where valid.
6. Return ONLY the JSON object. Do not include markdown wraps (like \`\`\`json) or any preamble or explanation.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', // Use the supported Sonnet model version
      max_tokens: 4000,
      system: 'You are a professional Salesforce DevOps engine. You only reply with raw, valid JSON.',
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from AI');
    }

    let rawJson = content.text.trim();
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedPlan = JSON.parse(rawJson);
    return parsedPlan;
  } catch (err: any) {
    console.error('[generateAiPlan] Error generating AI plan:', err);
    return null;
  }
}
