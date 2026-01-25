// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import React, { useMemo } from 'react';

import { VideoEmbedProps } from './schema';

import { cn } from '@/lib/utils';

// Helper to extract embed ID and platform
function parseVideoUrl(url: string | undefined) {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) return { platform: 'youtube', id: ytMatch[1] };

  // Bilibili (BV or AV)
  const bMatch = url.match(/(BV[0-9a-zA-Z]+|av[0-9]+)/);
  if (bMatch) return { platform: 'bilibili', id: bMatch[1] };

  return null;
}

export const VideoEmbed: React.FC<VideoEmbedProps & { className?: string }> = ({
  videoUrl,
  aspectRatio,
  autoplay,
  showControls,
  className,
}) => {
  const videoData = useMemo(() => parseVideoUrl(videoUrl), [videoUrl]);
  
  if (!videoData) {
    if (!videoUrl) return null;
    // Fallback for unknown URL? or minimal display
    return (
       <div className={cn("p-4 bg-gray-100 dark:bg-gray-800 rounded text-center text-sm text-muted-foreground", className)}>
         Invalid or unsupported video URL
       </div>
    );
  }

  // Calculate padding-bottom based on aspect ratio
  const paddingBottom = {
    '16:9': '56.25%',
    '4:3': '75%',
    '1:1': '100%',
    '9:16': '177.78%',
  }[aspectRatio];

  let src = '';
  if (videoData.platform === 'youtube') {
    const params = new URLSearchParams();
    if (autoplay) params.set('autoplay', '1');
    if (!showControls) params.set('controls', '0');
    src = `https://www.youtube.com/embed/${videoData.id}?${params.toString()}`;
  } else if (videoData.platform === 'bilibili') {
    const params = new URLSearchParams();
    if (autoplay) params.set('autoplay', '1');
    // Bilibili player params might differ
    src = `https://player.bilibili.com/player.html?bvid=${videoData.id}&page=1&high_quality=1&${params.toString()}`;
  }

  return (
    <div className={cn("w-full overflow-hidden rounded-lg shadow-sm border border-border/50 bg-black", className)}>
      <div className="relative w-full h-0" style={{ paddingBottom }}>
        <iframe
          src={src}
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video Player"
          sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups" // Added sandbox for safety
        />
      </div>
    </div>
  );
};
