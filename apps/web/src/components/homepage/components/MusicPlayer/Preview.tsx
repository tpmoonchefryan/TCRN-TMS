// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Music } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

export interface MusicPlayerProps {
  platform?: 'spotify' | 'apple' | 'soundcloud' | 'youtube_music' | 'file';
  embedValue?: string;
  // Legacy props kept for compatibility but might be unused in new mode
  title?: string;
  artist?: string;
  coverUrl?: string;
}

export const defaultProps: MusicPlayerProps = {
  platform: 'spotify',
  embedValue: '4cOdK2wGLETKBW3PvgPWqT', // Never Gonna Give You Up (Classic)
  title: 'Starry Sky',
  artist: 'Moon Chef Ryan',
};

// Helper: Extract ID or format URL for embed
const getEmbedUrl = (platform: string, value: string) => {
  if (!value) return null;

  try {
    switch (platform) {
      case 'spotify':
        // Handle full URL: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=...
        // Handle simple ID: 4cOdK2wGLETKBW3PvgPWqT
        // Handle URI: spotify:track:4cOdK2wGLETKBW3PvgPWqT
        let spotifyId = value;
        if (value.includes('open.spotify.com')) {
           const parts = value.split('/');
           spotifyId = parts[parts.length - 1].split('?')[0];
           // Determine type (track, album, playlist, artist) - mostly generic handling
           const typeIndex = parts.indexOf('track') > -1 ? 'track' : parts.indexOf('album') > -1 ? 'album' : parts.indexOf('playlist') > -1 ? 'playlist' : 'track';
           return `https://open.spotify.com/embed/${typeIndex}/${spotifyId}`;
        } else if (value.includes('spotify:')) {
           const parts = value.split(':');
           spotifyId = parts[2];
           return `https://open.spotify.com/embed/${parts[1]}/${spotifyId}`;
        }
        // Assume track ID if raw string
        return `https://open.spotify.com/embed/track/${spotifyId}`;

      case 'apple':
        // https://music.apple.com/us/album/song-name/123456?i=789012
        // Embed: https://embed.music.apple.com/us/album/song-name/123456?i=789012
        if (value.includes('music.apple.com')) {
          return value.replace('music.apple.com', 'embed.music.apple.com');
        }
        return value; // Trust the user if they know what they are doing

      case 'soundcloud':
        // SoundCloud needs the visual widget API url
        // https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true
        // If user pastes full URL to track: https://soundcloud.com/artist/track
        const encodedUrl = encodeURIComponent(value);
        return `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;

      case 'youtube_music':
        // YouTube Music uses YouTube embeds essentially
        // https://music.youtube.com/watch?v=dQw4w9WgXcQ
        let ytId = value;
        if (value.includes('youtube.com') || value.includes('youtu.be')) {
           const url = new URL(value.replace('music.youtube.com', 'www.youtube.com'));
           ytId = url.searchParams.get('v') || value.split('/').pop() || '';
        }
        return `https://www.youtube.com/embed/${ytId}`;
      
      default:
        return null;
    }
  } catch (e) {
    console.error('Failed to parse embed url', e);
    return null;
  }
};

export function MusicPlayer({ platform = 'spotify', embedValue }: MusicPlayerProps) {
  const t = useTranslations('homepageComponentEditor.musicPlayerText');
  const embedUrl = React.useMemo(() => getEmbedUrl(platform, embedValue || ''), [platform, embedValue]);

  if (!embedValue || !embedUrl) {
    return (
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl border border-dashed flex items-center justify-center p-8 text-muted-foreground gap-2">
        <Music size={20} />
        <span>{t('selectPrompt')}</span>
      </div>
    );
  }

  // Render Iframe
  return (
    <div className="w-full h-full flex flex-col justify-center">
      <div className="w-full overflow-hidden rounded-xl shadow-sm bg-card">
         {platform === 'spotify' && (
           <iframe 
             style={{ borderRadius: '12px' }} 
             src={embedUrl}
             width="100%" 
             height="152"
             frameBorder="0" 
             allowFullScreen 
             allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
             loading="lazy"
           />
         )}
  
         {platform === 'apple' && (
           <iframe 
             allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" 
             frameBorder="0" 
             height="175" 
             style={{ width: '100%', maxWidth: '660px', overflow: 'hidden', borderRadius: '10px' }}
             sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" 
             src={embedUrl}
           />
         )}
  
         {platform === 'soundcloud' && (
           <iframe 
             width="100%" 
             height="166" 
             scrolling="no" 
             frameBorder="0" 
             allow="autoplay" 
             src={embedUrl}
           />
         )}
  
        {platform === 'youtube_music' && (
           <iframe 
             width="100%" 
             height="200" // Video height
             src={embedUrl} 
             title="YouTube video player" 
             frameBorder="0" 
             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
             allowFullScreen
           />
         )}
      </div>
    </div>
  );
}
