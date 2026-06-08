import { NextRequest, NextResponse } from 'next/server';

const stopWords = new Set([
  'please', 'give', 'me', 'the', 'a', 'for', 'at', 'pm', 'today', 'night',
  'image', 'thumbnail', 'show', 'draw', 'create', 'photo', 'picture', 'of',
  'with', 'in', 'on', 'an', 'to', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'about', 'some', 'any', 'can', 'you', 'would', 'should', 'could', 'want', 'like',
  'i', 'my', 'your', 'his', 'her', 'their', 'our', 'it', 'its', 'us', 'them',
  'generate', 'make', 'get', 'need', 'require', 'illustration', 'drawing', 'painting',
  'vector', 'design', 'video', 'movie', 'clip', 'short', 'vids', 'vid'
]);

function extractKeywords(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s\-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word))
    .join(' ');
}

const VALID_VIDEO_EXTENSIONS = /\.(mp4|webm|ogv|ogg)$/i;

async function queryWiki(searchTerm: string): Promise<string[]> {
  const query = `${searchTerm} filetype:video`;
  const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&origin=*&gsrlimit=20`;
  
  try {
    const res = await fetch(wikiUrl);
    const data = await res.json();
    
    if (data.query && data.query.pages) {
      const pages = Object.values(data.query.pages) as any[];
      const sortedPages = [...pages].sort((a, b) => (a.index || 0) - (b.index || 0));
      
      const results: string[] = [];
      for (const page of sortedPages) {
        if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
          const url = page.imageinfo[0].url;
          if (VALID_VIDEO_EXTENSIONS.test(url)) {
            results.push(url);
          }
        }
      }
      return results;
    }
  } catch (e) {
    console.error(`[Video API] Wiki search failed for "${searchTerm}":`, e);
  }
  return [];
}

const CATEGORY_VIDEOS = [
  {
    keywords: ['church', 'worship', 'bible', 'gospel', 'faith', 'pray', 'jesus', 'god', 'religion', 'spiritual'],
    url: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4'
  },
  {
    keywords: ['nature', 'scenic', 'landscape', 'mountain', 'river', 'forest', 'tree', 'sun', 'sky', 'clouds', 'ocean', 'water', 'sea', 'fish'],
    url: 'https://vjs.zencdn.net/v/oceans.mp4'
  },
  {
    keywords: ['action', 'car', 'race', 'speed', 'drive', 'street', 'road', 'vehicle', 'wheels', 'fast', 'chase'],
    url: 'https://media.w3.org/2010/05/bunny/trailer.mp4'
  },
  {
    keywords: ['tech', 'computer', 'code', 'laser', 'abstract', 'futuristic', 'digital', 'neon', 'cyberpunk', 'background', 'design'],
    url: 'https://www.w3schools.com/html/mov_bbb.mp4'
  }
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const checkOnly = searchParams.get('check') === 'true';
  const defaultFallback = 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4';
  
  if (!query) {
    console.log('[Video API Debug] No query parameter provided.');
    if (checkOnly) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.redirect(defaultFallback);
  }

  const cleanedQuery = extractKeywords(query);
  const words = cleanedQuery.split(' ');
  let resolvedUrl: string | null = null;
  let resolvedProvider = 'None';

  // 1. Check direct category mappings
  if (cleanedQuery) {
    for (const category of CATEGORY_VIDEOS) {
      if (category.keywords.some(kw => cleanedQuery.includes(kw) || words.includes(kw))) {
        resolvedUrl = category.url;
        resolvedProvider = 'Category Map';
        break;
      }
    }
  }

  // 2. Query Wikimedia Commons
  if (!resolvedUrl && cleanedQuery) {
    try {
      const urls = await queryWiki(cleanedQuery);
      if (urls.length > 0) {
        const mp4OrWebm = urls.find(url => /\.(mp4|webm)$/i.test(url));
        resolvedUrl = mp4OrWebm || urls[0];
        resolvedProvider = 'Wikimedia Commons';
      } else if (words.length > 1) {
        const subset = words.slice(0, 2).join(' ');
        const subsetUrls = await queryWiki(subset);
        if (subsetUrls.length > 0) {
          const mp4OrWebm = subsetUrls.find(url => /\.(mp4|webm)$/i.test(url));
          resolvedUrl = mp4OrWebm || subsetUrls[0];
          resolvedProvider = 'Wikimedia Commons (Subset)';
        }
      }
    } catch (e) {
      console.error('[Video Redirect Error] Commons lookup failed:', e);
    }
  }

  // Handle server-side check
  if (checkOnly) {
    if (resolvedUrl) {
      console.log('[Video API Debug check] Video resolved for check request:', resolvedUrl);
      return NextResponse.json({
        exists: true,
        url: `/api/chat/video?q=${encodeURIComponent(query)}`
      });
    } else {
      console.log('[Video API Debug check] No video found for check request.');
      return NextResponse.json({ exists: false }, { status: 404 });
    }
  }

  // Regular redirect request
  if (resolvedUrl) {
    console.log('[Video API Debug] Redirecting to:', resolvedUrl, 'Provider:', resolvedProvider);
    return new NextResponse(null, {
      status: 302,
      headers: {
        'Location': resolvedUrl,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400'
      }
    });
  }

  console.log('[Video API Debug] No matching video found for prompt. Returning 404.');
  return new NextResponse('Video not found', { status: 404 });
}
