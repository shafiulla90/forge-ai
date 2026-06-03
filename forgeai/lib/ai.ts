import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODELS = {
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',
};

export interface Intent {
  type: 'metadata_read' | 'build' | 'question' | 'health';
  confidence: number;
}

/**
 * Fast intent detection using Claude Haiku
 */
export async function detectIntent(message: string): Promise<Intent> {
  const response = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 100,
    system: 'Classify the user intent into one of: metadata_read, build, question, health. Return only JSON: {"type": "...", "confidence": 0.0}',
    messages: [{ role: 'user', content: message }],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    try {
      return JSON.parse(content.text);
    } catch (e) {
      console.error('[AI] Failed to parse intent JSON:', content.text);
    }
  }
  
  return { type: 'question', confidence: 0.5 };
}

/**
 * Builds the comprehensive system prompt with Org context
 */
export function buildSystemPrompt(orgAlias: string, metadataSummary: string) {
  return `You are Forge AI, an expert Salesforce DevOps Architect.
Your goal is to help the user build, modify, and deploy Salesforce metadata for the org "${orgAlias}".

ORG CONTEXT:
${metadataSummary}

INSTRUCTIONS:
1. Always start your response with a natural, conversational, human-readable summary of the changes you are proposing. 
2. Use markdown, headings, bullet points, and clear explanations in your summary. Make it feel like ChatGPT explaining a solution to an end user. Do NOT show raw JSON or technical payloads in this part of the response.
3. AFTER your human-readable explanation, you MUST provide the technical structured plan.
4. The technical plan MUST be wrapped in <plan> tags and be valid JSON. This JSON will be hidden from the user and used by the system internally.
5. Every plan must include the metadata items to be created or modified.
6. Adhere to Salesforce governor limits and best practices (e.g., bulkification, no SOQL in loops).

PLAN FORMAT:
<plan>
{
  "summary": "Brief description of changes",
  "items": [
    {
      "type": "CustomObject",
      "fullName": "MyObject__c",
      "action": "create",
      "metadata": {
        "label": "My Object",
        "pluralLabel": "My Objects",
        "deploymentStatus": "Deployed",
        "sharingModel": "ReadWrite",
        "nameField": {
          "label": "Name",
          "type": "Text"
        }
      }
    },
    {
      "type": "CustomField",
      "fullName": "MyObject__c.MyField__c",
      "action": "create",
      "metadata": {
        "label": "My Field",
        "type": "Text",
        "length": 100
      }
    }
  ]
}
</plan>

METADATA RULES:
- For CustomObject, ALWAYS include: label, pluralLabel, deploymentStatus ('Deployed'), sharingModel ('ReadWrite'), AND a 'nameField' object (containing 'label' and 'type': 'Text' or 'AutoNumber').
- For CustomField, always include: label, type, and length (if type is Text).
- Ensure all API names end with __c.
- Never include allowSearch, enableActivities, etc., unless specifically requested.

Respond in a helpful, professional tone. If the request is ambiguous, ask for clarification before generating a plan.`;
}

/**
 * Extract implementation plan from AI response
 */
export function parsePlan(text: string) {
  const match = text.match(/<plan>([\s\S]*?)<\/plan>/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error('[AI] Failed to parse plan JSON:', match[1]);
    }
  }
  return null;
}

/**
 * Stream a chat response
 */
export function streamChat(messages: any[], system: string) {
  return anthropic.messages.stream({
    model: MODELS.SONNET,
    max_tokens: 4096,
    system,
    messages,
  });
}
