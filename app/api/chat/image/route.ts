import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const defaultFallback = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
  
  if (!query) {
    console.log('[Image API Debug] Missing query, redirecting to default fallback.');
    return NextResponse.redirect(defaultFallback);
  }

  try {
    const cleanPrompt = query.trim();
    if (cleanPrompt) {
      const seed = Math.floor(Math.random() * 1000000);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=768&nologo=true&private=true&enhance=true&safe=true&seed=${seed}`;
      
      console.log('[Image API Debug] Fetching from Pollinations:', pollinationsUrl);
      
      const imageRes = await fetch(pollinationsUrl);
      if (imageRes.ok) {
        const blob = await imageRes.blob();
        return new NextResponse(blob, {
          headers: {
            'Content-Type': imageRes.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400'
          }
        });
      } else {
        console.warn(`[Image API Warning] Pollinations returned status ${imageRes.status}`);
      }
    }
  } catch (e) {
    console.error('[Image API Error] Pollinations fetch failed:', e);
  }

  console.log('[Image API Debug] Fallback to default unsplash image.');
  return NextResponse.redirect(defaultFallback);
}
