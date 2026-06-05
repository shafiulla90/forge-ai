import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  
  if (!query) {
    // Default high-quality placeholder if query is missing
    return NextResponse.redirect('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800');
  }

  try {
    // Clean query from special characters to ensure media wiki api matches
    const cleanQuery = query.replace(/[^\w\s,\-]/g, ' ').trim();
    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&origin=*&gsrlimit=5`;
    
    const res = await fetch(wikiUrl);
    const data = await res.json();
    
    if (data.query && data.query.pages) {
      const pages = Object.values(data.query.pages) as any[];
      // Find the first valid image URL
      for (const page of pages) {
        if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
          const imageUrl = page.imageinfo[0].url;
          // Set caching header so we don't query Wiki API repeatedly for the same request
          return new NextResponse(null, {
            status: 302,
            headers: {
              'Location': imageUrl,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400'
            }
          });
        }
      }
    }
  } catch (e) {
    console.error('[Image Redirect] Search failed:', e);
  }

  // Final fallback to a high-quality abstract image on unsplash if search fails
  return NextResponse.redirect('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800');
}
