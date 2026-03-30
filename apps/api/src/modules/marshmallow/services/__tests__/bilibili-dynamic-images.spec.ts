import { describe, expect, it } from 'vitest';

import { extractBilibiliImagesFromModules } from '../../utils/bilibili-dynamic-images';

describe('extractBilibiliImagesFromModules', () => {
  const normalizeUrl = (url: string) => url.replace('http://', 'https://');

  it('extracts supported image sources in order', () => {
    expect(
      extractBilibiliImagesFromModules(
        [
          {
            module_dynamic: {
              major: {
                opus: {
                  pics: [{ url: 'http://opus.example/1.jpg' }, { url: 'https://opus.example/2.jpg' }],
                },
                draw: {
                  items: [{ src: 'http://draw.example/1.png' }],
                },
                article: {
                  covers: ['http://article.example/1.webp'],
                },
                archive: {
                  cover: 'http://archive.example/1.jpg',
                },
              },
            },
            module_content: {
              pics: [{ url: 'http://content.example/1.jpg' }],
            },
          },
        ],
        normalizeUrl,
      ),
    ).toEqual([
      'https://opus.example/1.jpg',
      'https://opus.example/2.jpg',
      'https://draw.example/1.png',
      'https://article.example/1.webp',
      'https://archive.example/1.jpg',
      'https://content.example/1.jpg',
    ]);
  });

  it('ignores unsupported or malformed module values', () => {
    expect(
      extractBilibiliImagesFromModules(
        [
          null,
          {
            module_dynamic: {
              major: {
                opus: {
                  pics: [{ url: '' }, { url: undefined }],
                },
                draw: {
                  items: [{ src: undefined }],
                },
              },
            },
          },
        ],
        normalizeUrl,
      ),
    ).toEqual([]);

    expect(extractBilibiliImagesFromModules(null, normalizeUrl)).toEqual([]);
  });
});
