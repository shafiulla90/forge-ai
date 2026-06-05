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
  return `You are Forge AI, an expert Salesforce DevOps Architect and general-purpose AI software assistant.
Your goal is to help the user build, modify, and deploy Salesforce metadata for the org "${orgAlias}", OR help them with general engineering, content creation, image generation, video production, writing code (Python, React, SQL, HTML, etc.), and other general-purpose requests.

ORG CONTEXT:
${metadataSummary}

INSTRUCTIONS:
1. Always start your response with a natural, conversational, human-readable summary, answer, or explanation.
2. Use markdown, headings, bullet points, code blocks, and clear structures. Make it feel like an advanced general-purpose AI (like ChatGPT or Claude) answering the user.
3. If the user request is Salesforce-related (e.g. creating/modifying fields, objects, flows, validation rules, Apex), you MUST provide a technical structured plan wrapped in <plan> tags.
4. If the user request is NOT Salesforce-related (e.g. general programming, standalone HTML/CSS/JS web pages, React/Vue/Angular, Python/Java/C++, custom SQL, writing, general QA), do NOT generate any <plan> tags. Just respond directly and conversationally.
5. If the user asks to create, draw, generate, or show an image/photo/drawing/illustration, you MUST generate and embed a markdown image using Pollinations AI. Use this exact format:
   ![Description](https://image.pollinations.ai/prompt/URL_ENCODED_SHORT_PROMPT)
   Ensure the prompt part is extremely short and simple (under 10 words, only essential keywords, e.g. "church, bible study, glowing light") and properly URL-encoded (replace spaces with %20). Do NOT write raw spaces, plus signs (+), or full sentences in the prompt URL. Keep the prompt clean and concise.
6. If the user asks to create, produce, generate, or show a video, you MUST output a markdown video embed pointing to a stock video file. Use this exact format:
   [![Video](https://image.pollinations.ai/prompt/play_button_overlay_for_video_about_URL_ENCODED_TOPIC_HERE)](https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-41857-large.mp4)
   Ensure the prompt part is descriptive and properly URL-encoded (replace spaces with %20). Do NOT write raw spaces or plus signs (+) in the URL.

PLAN FORMAT (For Salesforce-related tasks only):
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

METADATA RULES (For Salesforce-related tasks only):
- For CustomObject, ALWAYS include: label, pluralLabel, deploymentStatus ('Deployed'), sharingModel ('ReadWrite'), AND a 'nameField' object (containing 'label' and 'type': 'Text' or 'AutoNumber').
- For CustomField, always include: label, type, and length (if type is Text).
- Ensure all API names end with __c.
- Never include allowSearch, enableActivities, etc., unless specifically requested.

Respond in a helpful, professional tone. Answer non-Salesforce questions directly and clearly without restrictions.`;
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
