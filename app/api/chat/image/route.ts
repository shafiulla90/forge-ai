import { NextRequest, NextResponse } from 'next/server';

const stopWords = new Set([
  'please', 'give', 'me', 'the', 'a', 'for', 'at', 'pm', 'today', 'night',
  'image', 'thumbnail', 'show', 'draw', 'create', 'photo', 'picture', 'of',
  'with', 'in', 'on', 'an', 'to', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'about', 'some', 'any', 'can', 'you', 'would', 'should', 'could', 'want', 'like',
  'i', 'my', 'your', 'his', 'her', 'their', 'our', 'it', 'its', 'us', 'them',
  'generate', 'make', 'get', 'need', 'require', 'illustration', 'drawing', 'painting',
  'vector', 'design'
]);

function extractKeywords(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s\-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word))
    .join(' ');
}

const VALID_IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg|webp)$/i;

async function queryWiki(searchTerm: string): Promise<string | null> {
  const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm)}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&origin=*&gsrlimit=10`;
  
  try {
    const res = await fetch(wikiUrl);
    const data = await res.json();
    
    if (data.query && data.query.pages) {
      const pages = Object.values(data.query.pages) as any[];
      // Sort pages by the API's search relevance index
      const sortedPages = [...pages].sort((a, b) => (a.index || 0) - (b.index || 0));
      
      for (const page of sortedPages) {
        if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
          const url = page.imageinfo[0].url;
          if (VALID_IMAGE_EXTENSIONS.test(url)) {
            return url;
          }
        }
      }
    }
  } catch (e) {
    console.error(`[Image API] Wiki search failed for "${searchTerm}":`, e);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const isFallback = searchParams.get('fallback') === 'true';
  const defaultFallback = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
  
  if (!query) {
    return NextResponse.redirect(defaultFallback);
  }

  // If not a fallback request, redirect to Pollinations AI for high-quality generated creative images
  if (!isFallback) {
    try {
      const cleanPrompt = query.trim();
      if (cleanPrompt) {
        const seed = Math.floor(Math.random() * 1000000);
        // Use enhance=true to expand short prompts for premium creative thumbnails, and safe=true for safe content
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=768&nologo=true&private=true&enhance=true&safe=true&seed=${seed}`;
        
        return new NextResponse(null, {
          status: 302,
          headers: {
            'Location': pollinationsUrl,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        });
      }
    } catch (e) {
      console.error('[Image Redirect] Pollinations redirect failed:', e);
    }
  }

  // Fallback mode: query Wikimedia Commons for high-quality stock photo/graphic
  try {
    const cleanQuery = extractKeywords(query);
    if (cleanQuery) {
      // 1. Try search with all cleaned keywords
      let imageUrl = await queryWiki(cleanQuery);
      if (imageUrl) {
        return new NextResponse(null, {
          status: 302,
          headers: {
            'Location': imageUrl,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400'
          }
        });
      }

      // 2. Fallback: if no match, split keywords and search sub-queries
      const words = cleanQuery.split(' ');
      if (words.length > 1) {
        // Try first 2 words
        const subset1 = words.slice(0, 2).join(' ');
        imageUrl = await queryWiki(subset1);
        if (imageUrl) {
          return new NextResponse(null, {
            status: 302,
            headers: {
              'Location': imageUrl,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400'
            }
          });
        }

        // Try last 2 words
        const subset2 = words.slice(-2).join(' ');
        imageUrl = await queryWiki(subset2);
        if (imageUrl) {
          return new NextResponse(null, {
            status: 302,
            headers: {
              'Location': imageUrl,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400'
            }
          });
        }

        // Try individual words
        for (const word of words) {
          if (word.length > 2) {
            imageUrl = await queryWiki(word);
            if (imageUrl) {
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
      }
    }
  } catch (e) {
    console.error('[Image Redirect] Fallback search failed:', e);
  }

  // Final fallback to a high-quality abstract image on unsplash if search fails
  return NextResponse.redirect(defaultFallback);
}

