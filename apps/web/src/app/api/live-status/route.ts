
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');
  const channelId = searchParams.get('channelId');

  if (!platform || !channelId) {
    return NextResponse.json({ error: 'Missing platform or channelId' }, { status: 400 });
  }

  try {
    if (platform === 'bilibili') {
      const response = await fetch(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${channelId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        next: { revalidate: 60 } // Cache for 1 minute
      });
      
      if (!response.ok) {
        throw new Error(`Bilibili API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        return NextResponse.json({ isLive: false, error: data.msg || 'Room not found' });
      }

      // data.data.live_status: 0 = offline, 1 = live, 2 = round
      const isLive = data.data.live_status === 1;
      
      return NextResponse.json({
        isLive,
        viewers: isLive ? data.data.online.toString() : '0',
        title: data.data.title,
        coverUrl: data.data.user_cover,
        platform: 'bilibili'
      });
    }

    if (platform === 'youtube') {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        // Return mock data for dev/testing if no API key is present
        // Or strictly strictly fail? Let's return a "not configured" state or just offline.
        // For better DX, let's log a warning and return offline.
        console.warn('YOUTUBE_API_KEY is not set');
        return NextResponse.json({ isLive: false, error: 'API key not configured' });
      }

      // https://developers.google.com/youtube/v3/docs/search/list?hl=zh-cn
      // GET https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={channelId}&eventType=live&type=video&key={YOUR_API_KEY}
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`,
        { next: { revalidate: 300 } } // Cache for 5 minutes
      );

      if (!response.ok) {
         throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const isLive = data.items && data.items.length > 0;
      
      // If live, we can get more details (like viewers) via videos API, but search API gives us title/thumbnail
      const liveItem = isLive ? data.items[0] : null;

      return NextResponse.json({
        isLive,
        title: liveItem ? liveItem.snippet.title : undefined,
        channelName: liveItem ? liveItem.snippet.channelTitle : undefined,
        coverUrl: liveItem ? liveItem.snippet.thumbnails?.high?.url : undefined,
        viewers: isLive ? 'LIVE' : '0', // Search API doesn't return concurrent viewers, requires separate call. Keep simple for now.
        platform: 'youtube'
      });
    }

    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });

  } catch (error) {
    console.error('Live fetch error:', error);
    return NextResponse.json({ isLive: false, error: 'Failed to fetch status' }, { status: 500 });
  }
}
