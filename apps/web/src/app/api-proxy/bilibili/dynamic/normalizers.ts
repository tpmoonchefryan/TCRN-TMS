type BilibiliDynamicType =
  | 'article'
  | 'image'
  | 'live'
  | 'music'
  | 'opus'
  | 'pgc'
  | 'text'
  | 'video';

interface PrimaryFeedResponseItem {
  id_str?: string;
  basic?: {
    comment_id_str?: string;
  };
  modules?: {
    module_author?: {
      pub_time?: string | number;
      name?: string;
      face?: string;
    };
    module_dynamic?: {
      desc?: {
        text?: string;
      };
      major?: {
        type?: string;
        archive?: {
          title?: string;
          desc?: string;
          cover?: string;
          duration_text?: string;
          jump_url?: string;
        };
        draw?: {
          items?: Array<{
            src?: string;
          }>;
        };
        opus?: {
          title?: string;
          summary?: {
            text?: string;
          };
          pics?: Array<{
            url?: string;
          }>;
        };
        article?: {
          title?: string;
          desc?: string;
          covers?: string[];
          jump_url?: string;
        };
        live_rcmd?: {
          content?: string;
        };
        pgc?: {
          title?: string;
          cover?: string;
          stat?: {
            play?: string | number;
            danmaku?: string | number;
          };
        };
        music?: {
          title?: string;
          label?: string;
          cover?: string;
        };
      };
    };
    module_stat?: {
      like?: {
        count?: number;
      };
    };
  };
}

export interface PrimaryFeedResponse {
  data?: {
    items?: PrimaryFeedResponseItem[];
  };
}

interface LegacyFeedCardItem {
  card?: string;
  desc?: {
    type?: number;
    dynamic_id_str?: string;
    timestamp?: number;
    like?: number;
  };
}

export interface LegacyFeedResponse {
  data?: {
    cards?: LegacyFeedCardItem[];
  };
}

interface PrimaryLiveContent {
  live_play_info?: {
    title?: string;
    cover?: string;
  };
}

interface LegacyCardContent {
  title?: string;
  dynamic?: string;
  pic?: string;
  description?: string;
  content?: string;
  item?: {
    content?: string;
    pictures?: Array<{
      img_src?: string;
    }>;
  };
}

export interface NormalizedPrimaryDynamicItem {
  id: string;
  type: BilibiliDynamicType;
  title: string;
  content: string;
  images: string[];
  duration: string;
  date: string | number;
  likes: number;
  url: string;
  author: {
    name: string;
    face: string;
  };
}

export interface NormalizedLegacyDynamicItem {
  id: string;
  type: Extract<BilibiliDynamicType, 'image' | 'text' | 'video'>;
  content: string;
  images: string[];
  date: string;
  likes: number;
  url: string;
}

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function parseJsonObject<T>(value: string | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return isJsonRecord(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function pickStringArray<T>(items: T[] | undefined, pick: (item: T) => string | undefined): string[] {
  return (items ?? []).flatMap((item) => {
    const value = pick(item);
    return typeof value === 'string' ? [value] : [];
  });
}

function normalizePrimaryItem(item: PrimaryFeedResponseItem): NormalizedPrimaryDynamicItem {
  const author = item.modules?.module_author;
  const dynamicModule = item.modules?.module_dynamic;
  const stat = item.modules?.module_stat;
  const major = dynamicModule?.major;

  let content = '';
  let images: string[] = [];
  let type: BilibiliDynamicType = 'text';
  let title = '';
  let duration = '';

  if (major) {
    switch (major.type) {
      case 'MAJOR_TYPE_ARCHIVE':
        type = 'video';
        title = major.archive?.title ?? '';
        content = major.archive?.desc ?? '';
        images = pickStringArray([major.archive], (archive) => archive?.cover);
        duration = major.archive?.duration_text ?? '';
        break;
      case 'MAJOR_TYPE_DRAW':
        type = 'image';
        content = dynamicModule?.desc?.text ?? '';
        images = pickStringArray(major.draw?.items, (image) => image.src);
        break;
      case 'MAJOR_TYPE_OPUS':
        type = 'opus';
        title = major.opus?.title ?? '';
        content = major.opus?.summary?.text ?? '';
        images = pickStringArray(major.opus?.pics, (picture) => picture.url);
        break;
      case 'MAJOR_TYPE_ARTICLE':
        type = 'article';
        title = major.article?.title ?? '';
        content = major.article?.desc ?? '';
        images = (major.article?.covers ?? []).filter((cover): cover is string => typeof cover === 'string');
        break;
      case 'MAJOR_TYPE_LIVE_RCMD': {
        type = 'live';
        const liveData = parseJsonObject<PrimaryLiveContent>(major.live_rcmd?.content);
        title = liveData?.live_play_info?.title ?? 'Live Stream';
        images = pickStringArray([liveData?.live_play_info], (livePlayInfo) => livePlayInfo?.cover);
        break;
      }
      case 'MAJOR_TYPE_PGC':
        type = 'pgc';
        title = major.pgc?.title ?? '';
        content = `${major.pgc?.stat?.play} plays • ${major.pgc?.stat?.danmaku} danmaku`;
        images = pickStringArray([major.pgc], (pgc) => pgc?.cover);
        break;
      case 'MAJOR_TYPE_MUSIC':
        type = 'music';
        title = major.music?.title ?? '';
        content = major.music?.label ?? '';
        images = pickStringArray([major.music], (music) => music?.cover);
        break;
      default:
        content = dynamicModule?.desc?.text ?? '';
        break;
    }
  } else {
    content = dynamicModule?.desc?.text ?? '';
  }

  const jumpUrl = item.basic?.comment_id_str
    ? `https://t.bilibili.com/${item.id_str ?? ''}`
    : major?.archive?.jump_url || major?.article?.jump_url || `https://t.bilibili.com/${item.id_str ?? ''}`;

  return {
    id: item.id_str ?? '',
    type,
    title,
    content,
    images,
    duration,
    date: author?.pub_time ?? '',
    likes: stat?.like?.count ?? 0,
    url: jumpUrl,
    author: {
      name: author?.name ?? '',
      face: author?.face ?? '',
    },
  };
}

function normalizeLegacyCard(cardItem: LegacyFeedCardItem): NormalizedLegacyDynamicItem {
  const card = parseJsonObject<LegacyCardContent>(cardItem.card) ?? null;
  const desc = cardItem.desc;

  let content = '';
  let images: string[] = [];
  let type: NormalizedLegacyDynamicItem['type'] = 'text';

  if (desc?.type === 8) {
    type = 'video';
    content = card?.title ?? card?.dynamic ?? '';
    images = pickStringArray([card], (legacyCard) => legacyCard?.pic);
  } else if (desc?.type === 2) {
    type = 'image';
    content = card?.description ?? '';
    images = pickStringArray(card?.item?.pictures, (picture) => picture.img_src);
  } else {
    type = 'text';
    content = card?.item?.content ?? card?.content ?? '';
  }

  const timestamp = desc?.timestamp ?? Number.NaN;
  const dynamicId = desc?.dynamic_id_str ?? '';

  return {
    id: dynamicId,
    type,
    content,
    images,
    date: new Date(timestamp * 1000).toLocaleString(),
    likes: desc?.like ?? 0,
    url: `https://t.bilibili.com/${dynamicId}`,
  };
}

export function normalizePrimaryFeedItems(data: PrimaryFeedResponse): NormalizedPrimaryDynamicItem[] {
  return (data.data?.items ?? []).map(normalizePrimaryItem);
}

export function normalizeLegacyFeedItems(data: LegacyFeedResponse): NormalizedLegacyDynamicItem[] {
  return (data.data?.cards ?? []).map(normalizeLegacyCard);
}

export function getErrorMessage(error: unknown): string {
  if (isJsonRecord(error) && error.message) {
    return String(error.message);
  }

  return String(error);
}
