import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const filename = searchParams.get('filename') || 'ai-image.png';

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    // If it's a relative URL (like /api/chat/image), construct absolute URL
    let targetUrl = url;
    if (url.startsWith('/')) {
      const origin = req.headers.get('origin') || new URL(req.url).origin;
      targetUrl = `${origin}${url}`;
    }

    const res = await fetch(targetUrl);
    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const blob = await res.blob();

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-cache'
      },
    });
  } catch (e: any) {
    console.error('[Download API] Error proxying download:', e);
    return new NextResponse(`Internal Server Error: ${e.message}`, { status: 500 });
  }
}
