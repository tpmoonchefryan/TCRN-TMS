// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

interface BilibiliPicture {
  url?: string;
}

interface BilibiliDrawItem {
  src?: string;
}

interface BilibiliMajorModule {
  opus?: {
    pics?: BilibiliPicture[];
  };
  draw?: {
    items?: BilibiliDrawItem[];
  };
  article?: {
    covers?: string[];
  };
  archive?: {
    cover?: string;
  };
}

interface BilibiliDynamicModule {
  module_dynamic?: {
    major?: BilibiliMajorModule;
  };
  module_content?: {
    pics?: BilibiliPicture[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asBilibiliDynamicModule(value: unknown): BilibiliDynamicModule | null {
  return isRecord(value) ? (value as BilibiliDynamicModule) : null;
}

function pushNormalized(
  images: string[],
  value: string | undefined,
  normalizeUrl: (url: string) => string,
) {
  if (typeof value === 'string' && value.length > 0) {
    images.push(normalizeUrl(value));
  }
}

export function extractBilibiliImagesFromModules(
  modules: unknown,
  normalizeUrl: (url: string) => string,
): string[] {
  if (!Array.isArray(modules)) {
    return [];
  }

  const images: string[] = [];

  for (const rawModule of modules) {
    const module = asBilibiliDynamicModule(rawModule);
    if (!module) {
      continue;
    }

    const major = module.module_dynamic?.major;

    for (const picture of major?.opus?.pics ?? []) {
      pushNormalized(images, picture.url, normalizeUrl);
    }

    for (const picture of major?.draw?.items ?? []) {
      pushNormalized(images, picture.src, normalizeUrl);
    }

    for (const cover of major?.article?.covers ?? []) {
      pushNormalized(images, cover, normalizeUrl);
    }

    pushNormalized(images, major?.archive?.cover, normalizeUrl);

    for (const picture of module.module_content?.pics ?? []) {
      pushNormalized(images, picture.url, normalizeUrl);
    }
  }

  return images;
}
