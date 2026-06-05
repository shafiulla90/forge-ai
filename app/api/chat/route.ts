import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { detectIntent, buildSystemPrompt, streamChat, parsePlan } from '@/lib/ai';
import { searchRelevantMetadata } from '@/lib/vector';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, orgId, conversationId, attachments } = await req.json();
    if (!orgId || !messages) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const { data: newConvo } = await supabase.from('conversations').insert({
        user_id: user.id,
        org_id: orgId,
        title: messages[messages.length - 1].content.substring(0, 50) + '...'
      }).select().single();
      if (newConvo) activeConversationId = newConvo.id;
    }

    // 2. Get Org Info
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    }

    const lastMessage = messages[messages.length - 1].content;

    // 3. Detect Intent (Haiku) & Search Metadata (RAG)
    const [intent, relevantMetadata] = await Promise.all([
      detectIntent(lastMessage),
      searchRelevantMetadata(orgId, lastMessage),
    ]);

    console.log(`[Chat] Detected intent: ${intent.type} (Confidence: ${intent.confidence})`);

    // 4. Build System Prompt
    const metadataSummary = relevantMetadata
      .map((m: any) => `- ${m.metadata_type}: ${m.api_name}`)
      .join('\n');
    
    const systemPrompt = buildSystemPrompt(org.alias, metadataSummary);

    // Clean messages and format the user's latest message if it has attachments
    const cleanMessages = messages.map((m: any, idx: number) => {
      const isLastMessage = idx === messages.length - 1;
      
      if (isLastMessage && attachments && attachments.length > 0) {
        const contentBlocks: any[] = [
          { type: 'text', text: typeof m.content === 'string' ? m.content : '' }
        ];
        
        attachments.forEach((att: any) => {
          if (att.type && att.type.startsWith('image/')) {
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: att.type,
                data: att.base64
              }
            });
          } else {
            contentBlocks[0].text += `\n\n[Attachment: ${att.name}]\n${att.base64}`;
          }
        });
        
        return {
          role: m.role,
          content: contentBlocks
        };
      }
      
      return {
        role: m.role,
        content: typeof m.content === 'string' ? m.content : ''
      };
    }).filter((m: any) => {
      if (Array.isArray(m.content)) {
        return m.content.some((b: any) => b.type === 'text' ? b.text.trim() !== '' : true);
      }
      return m.content.trim() !== '';
    });

    const stream = streamChat(cleanMessages, systemPrompt);

    const responseStream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        let messageId = null;

        const adminSupabase = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Pre-create message to get an ID
        if (activeConversationId) {
          const { data: msgData } = await adminSupabase.from('messages').insert({
            role: 'assistant',
            content: '',
            conversation_id: activeConversationId
          }).select().single();
          if (msgData) messageId = msgData.id;
        }
        
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text;
            fullResponse += text;
            const payload = JSON.stringify({ type: 'content', text, id: messageId });
            controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
          }
        }

        // 6. Post-processing: Extract plan and update message
        const plan = parsePlan(fullResponse);
        
        if (plan) {
          const planPayload = JSON.stringify({ type: 'plan', plan, id: messageId });
          controller.enqueue(new TextEncoder().encode(`data: ${planPayload}\n\n`));

          // Save plan immediately to DB so the Review screen can see it instantly
          if (messageId) {
            await adminSupabase.from('messages').update({
              implementation_plan: plan
            }).eq('id', messageId);
          }
        }

        // Update message with full content and plan
        if (messageId) {
          try {
            await adminSupabase.from('messages').update({
              content: fullResponse,
              implementation_plan: plan,
              confidence_score: intent.confidence
            }).eq('id', messageId);
          } catch (e) {
            console.error('[Chat] Failed to update message', e);
          }
        }

        controller.close();
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (globalError: any) {
    console.error('CRITICAL CHAT ERROR:', globalError);
    return NextResponse.json({ error: 'Internal Server Error', details: globalError.message || String(globalError) }, { status: 500 });
  }
}
