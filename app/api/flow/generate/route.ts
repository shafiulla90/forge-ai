import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { buildFlowSystemPrompt, parseFlowXmlToNodes, normalizeFlowXml } from '@/lib/flow';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API Key not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', // Use the supported Sonnet model version
      max_tokens: 4000,
      system: buildFlowSystemPrompt(),
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    // Extract XML from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from AI');
    }

    let xml = content.text;
    // Clean up if Claude included markdown blocks despite instructions
    xml = xml.replace(/```xml/g, '').replace(/```/g, '').trim();

    // Auto-heal common LLM Flow XML schema errors: replace <label> with <fieldText> inside <fields> elements
    xml = xml.replace(/<fields>([\s\S]*?)<\/fields>/g, (match, fieldsContent) => {
      return `<fields>${fieldsContent.replace(/<label>([\s\S]*?)<\/label>/g, '<fieldText>$1</fieldText>')}</fields>`;
    });

    // Normalize and group sibling elements (e.g. screens, recordCreates) to comply with Salesforce schema order rules
    xml = await normalizeFlowXml(xml);

    // Parse the generated XML into structured visual nodes for FlowBuilder UI
    const nodes = await parseFlowXmlToNodes(xml);

    return NextResponse.json({ xml, nodes });
  } catch (error: any) {
    console.error('[API Flow Generate] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
