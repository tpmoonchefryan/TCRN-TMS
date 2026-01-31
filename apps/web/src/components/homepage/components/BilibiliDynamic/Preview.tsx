'use client';

import { AlertCircle, ExternalLink, Film, Flame, Heart, Image as ImageIcon, LayoutTemplate, Music, Newspaper, PlayCircle, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface BilibiliDynamicProps {
  uid?: string;
  title?: string;
}

export const defaultProps: BilibiliDynamicProps = {
  uid: '401742377', 
  title: 'Bilibili Dynamics'
};

export function BilibiliDynamic({ uid = '401742377', title }: BilibiliDynamicProps) {
  const t = useTranslations('homepageEditor.bilibili');
  
  // Use prop title, or fallback to translated default title if prop is missing/empty 
  // OR if prop is the hardcoded default "Bilibili Dynamics" (legacy support)
  const displayTitle = (title && title !== 'Bilibili Dynamics') ? title : t('defaultTitle');


  const [dynamics, setDynamics] = React.useState<DynamicItem[]>([]);
  const [userInfo, setUserInfo] = React.useState<{ name: string; face: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [isFallback, setIsFallback] = React.useState(false);

  // Ref to track if we have already fetched for the current UID to prevent loops
  const fetchedUidRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!uid) return;
    if (fetchedUidRef.current === uid) return;

    const fetchData = async () => {
       fetchedUidRef.current = uid; 
       setLoading(true);
       try {
           const res = await fetch(`/api/bilibili/dynamic?uid=${uid}`);
           if (res.ok) {
               const data = await res.json();
               
               if (data.fallback) {
                   // WAF blocked, but we got user info
                   setDynamics([]);
                   setUserInfo(data.userInfo);
                   setIsFallback(true);
                   setError(false);
               } else if (data.items) {
                   setDynamics(data.items);
                   setUserInfo(null);
                   setIsFallback(false);
                   setError(false);
               }
           } else {
               setError(true);
           }
       } catch {
           setError(true);
       } finally {
           setLoading(false);
       }
    };

    fetchData();
  }, [uid]);

  const visitUrl = `https://space.bilibili.com/${uid}/dynamic`;

  return (
    <div className="w-full h-full flex flex-col bg-card rounded-xl border overflow-hidden relative group/container">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30 z-10 relative">
        <div className="flex items-center gap-2">
           <div className="bg-[#fb7299] text-white p-1 rounded-md">
             <Flame size={16} fill="currentColor" />
           </div>
           <span className="font-bold text-sm">{displayTitle}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => window.open(visitUrl, '_blank')} className="h-6 px-2 text-xs text-muted-foreground hover:text-[#fb7299]">
          <ExternalLink size={14} className="mr-1"/>
          All
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-muted/5">
        {loading ? (
           <div className="grid grid-cols-1 gap-4 p-4 animate-pulse">
             <div className="h-32 bg-muted rounded-lg" />
             <div className="h-48 bg-muted rounded-lg" />
             <div className="h-24 bg-muted rounded-lg" />
           </div>
        ) : error || isFallback ? (
           <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
              {/* Background Skeleton */}
              <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden p-4">
                 <div className="grid grid-cols-1 gap-4">
                    <div className="h-32 bg-foreground/10 rounded-lg" />
                    <div className="h-48 bg-foreground/10 rounded-lg" />
                    <div className="h-24 bg-foreground/10 rounded-lg" />
                    <div className="h-40 bg-foreground/10 rounded-lg" />
                 </div>
              </div>

              {/* Frosted Glass Content */}
              <div className="bg-background/70 backdrop-blur-md p-6 rounded-xl border shadow-sm flex flex-col items-center max-w-[85%] z-10 animate-in fade-in zoom-in duration-300">
                {userInfo ? (
                  <div className="mb-3 relative group cursor-pointer" onClick={() => window.open(`https://space.bilibili.com/${uid}`, '_blank')}>
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#fb7299] shadow-md">
                      <img 
                        src={userInfo.face} 
                        alt={userInfo.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ) : (
                   <div className="w-12 h-12 bg-muted rounded-full mb-3 flex items-center justify-center">
                     <AlertCircle className="w-6 h-6 text-muted-foreground" />
                   </div>
                )}
                
                <h3 className="font-semibold text-sm mb-1">
                  {userInfo ? userInfo.name : t('unableToLoad')}
                </h3>
                
                <p className="text-xs text-muted-foreground mb-4 max-w-[200px] leading-relaxed">
                  {userInfo ? t('unableToLoad') : t('unableToLoad')}
                  <br/>
                  <span className="opacity-70 mt-1 block">
                    {t('apiRestricted')}
                  </span>
                </p>

                <Button 
                  size="sm" 
                  className="bg-[#fb7299] hover:bg-[#fb7299]/90 text-white w-full"
                  onClick={() => window.open(visitUrl, '_blank')}
                >
                  {t('viewOnBilibili')}
                  <ExternalLink size={12} className="ml-2" />
                </Button>
              </div>
           </div>
        ) : (
           <ScrollArea className="h-full">
             <div className="p-4 space-y-4">
               {dynamics.map((item) => (
                 <BilibiliCard key={item.id} item={item} />
               ))}
             </div>
           </ScrollArea>
        )}
      </div>
    </div>
  );
}


interface DynamicItem {
    id: string;
    type: string;
    title: string;
    content: string;
    images: string[];
    duration?: string;
    date: string | number;
    likes: number;
    url: string;
    author: {
        name: string;
        face: string;
    };
}

function BilibiliCard({ item }: { item: DynamicItem }) {
    const t = useTranslations('homepageEditor.bilibili');
    const hasImage = item.images && item.images.length > 0;
// ... (rest of function is fine, just changing signature)

    
    const getTypeConfig = (type: string) => {
        switch(type) {
            case 'video': return { icon: PlayCircle, label: t('typeVideo'), color: 'bg-black/50' };
            case 'article': return { icon: Newspaper, label: t('typeArticle'), color: 'bg-blue-500/80' };
            case 'live': return { icon: Radio, label: t('typeLive'), color: 'bg-rose-500/80' };
            case 'pgc': return { icon: Film, label: t('typePgc'), color: 'bg-purple-500/80' };
            case 'music': return { icon: Music, label: t('typeMusic'), color: 'bg-emerald-500/80' };
            case 'opus': return { icon: LayoutTemplate, label: t('typeOpus'), color: 'bg-amber-500/80' };
            case 'image': return { icon: ImageIcon, label: t('typeImage'), color: 'bg-black/50' };
            default: return null;
        }
    };

    const typeConfig = getTypeConfig(item.type);
    const TypeIcon = typeConfig?.icon;

    return (
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block bg-background border rounded-lg overflow-hidden hover:shadow-md transition-all group/card"
        >
            {/* Media Thumbnail */}
            {hasImage && (
                <div className="relative aspect-video bg-muted overflow-hidden">
                    <img 
                       src={item.images[0]} 
                       alt="Thumbnail" 
                       className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                       referrerPolicy="no-referrer"
                       loading="lazy"
                    />
                    
                    {/* Center Play Button for Video */}
                    {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/card:bg-black/10 transition-colors">
                            <PlayCircle className="text-white drop-shadow-md w-10 h-10" />
                        </div>
                    )}

                    {/* Type Badge */}
                    {typeConfig && (
                         <div className={`absolute top-2 right-2 ${typeConfig.color} text-white text-[10px] px-1.5 py-0.5 rounded-sm flex items-center gap-1 backdrop-blur-md shadow-sm`}>
                            {TypeIcon && <TypeIcon size={10} />}
                            <span className="font-medium">{typeConfig.label}</span>
                         </div>
                    )}
                </div>
            )}

            <div className="p-3 space-y-1.5">
                {/* Title (if valid and not same as content) */}
                {item.title && (
                  <h4 className="font-bold text-sm line-clamp-1 leading-tight text-foreground">
                    {item.title}
                  </h4>
                )}

                {/* Content/Desc */}
                <p className="text-xs line-clamp-2 text-muted-foreground leading-relaxed">
                    {item.content || '...'}
                </p>
                
                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 pt-1">
                    <span>{typeof item.date === 'number' ? new Date(item.date * 1000).toLocaleDateString() : (item.date || '')}</span>
                    <div className="flex items-center gap-1">
                         <Heart size={10} />
                         <span>{item.likes}</span>
                    </div>
                </div>
            </div>
        </a>
    );
}
