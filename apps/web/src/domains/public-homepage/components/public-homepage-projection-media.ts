import type {
  PublicPresenceProjectedSection,
  PublicPresenceProjection,
  PublicPresencePublicProjection,
} from '@tcrn/shared';

type ProjectionLike = PublicPresenceProjection | PublicPresencePublicProjection | null | undefined;

const preloadedProjectionMediaUrls = new Set<string>();

function collectSectionImageUrls(section: PublicPresenceProjectedSection): string[] {
  switch (section.sectionType) {
    case 'hero':
    case 'profileCard':
      return section.avatar?.url ? [section.avatar.url] : [];
    case 'imageGallery':
      return section.images
        .map((image) => image.url)
        .filter((url): url is string => typeof url === 'string' && url.length > 0);
    default:
      return [];
  }
}

export function collectPublicHomepageProjectionImageUrls(projection: ProjectionLike): string[] {
  if (!projection) {
    return [];
  }

  const urls = new Set<string>();

  for (const section of projection.sections) {
    for (const url of collectSectionImageUrls(section)) {
      urls.add(url);
    }
  }

  return [...urls];
}

export function resetPublicHomepageProjectionMediaPreloadCache() {
  preloadedProjectionMediaUrls.clear();
}

export async function preloadPublicHomepageProjectionMedia(
  projection: ProjectionLike,
  imageFactory: () => HTMLImageElement = () => new Image()
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const pendingUrls = collectPublicHomepageProjectionImageUrls(projection).filter(
    (url) => !preloadedProjectionMediaUrls.has(url)
  );

  if (pendingUrls.length === 0) {
    return;
  }

  await Promise.all(
    pendingUrls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const image = imageFactory();
          let settled = false;

          const settle = (loaded: boolean) => {
            if (settled) {
              return;
            }

            settled = true;

            if (loaded) {
              preloadedProjectionMediaUrls.add(url);
            }

            resolve();
          };

          image.onload = () => settle(true);
          image.onerror = () => settle(false);
          image.decoding = 'sync';
          image.src = url;

          if (image.complete && image.naturalWidth > 0) {
            settle(true);
          }
        })
    )
  );
}
