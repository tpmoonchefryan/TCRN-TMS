import { describe, expect, it } from 'vitest';

import {
  getErrorMessage,
  normalizeLegacyFeedItems,
  normalizePrimaryFeedItems,
  type LegacyFeedResponse,
  type PrimaryFeedResponse,
} from './normalizers';

describe('bilibili dynamic normalizers', () => {
  it('normalizes a primary live recommendation item from the current feed payload', () => {
    const response: PrimaryFeedResponse = {
      data: {
        items: [
          {
            id_str: '999',
            modules: {
              module_author: {
                pub_time: 1710000000,
                name: 'Sora',
                face: 'https://img.example.com/avatar.jpg',
              },
              module_dynamic: {
                major: {
                  type: 'MAJOR_TYPE_LIVE_RCMD',
                  live_rcmd: {
                    content: JSON.stringify({
                      live_play_info: {
                        title: 'Live now',
                        cover: 'https://img.example.com/live-cover.jpg',
                      },
                    }),
                  },
                },
              },
              module_stat: {
                like: {
                  count: 42,
                },
              },
            },
          },
        ],
      },
    };

    expect(normalizePrimaryFeedItems(response)).toEqual([
      {
        id: '999',
        type: 'live',
        title: 'Live now',
        content: '',
        images: ['https://img.example.com/live-cover.jpg'],
        duration: '',
        date: 1710000000,
        likes: 42,
        url: 'https://t.bilibili.com/999',
        author: {
          name: 'Sora',
          face: 'https://img.example.com/avatar.jpg',
        },
      },
    ]);
  });

  it('normalizes a legacy image item from the historical dynamic payload', () => {
    const response: LegacyFeedResponse = {
      data: {
        cards: [
          {
            card: JSON.stringify({
              description: 'Image post',
              item: {
                pictures: [
                  { img_src: 'https://img.example.com/1.jpg' },
                  { img_src: 'https://img.example.com/2.jpg' },
                ],
              },
            }),
            desc: {
              type: 2,
              dynamic_id_str: '12345',
              timestamp: 1710000000,
              like: 7,
            },
          },
        ],
      },
    };

    const [item] = normalizeLegacyFeedItems(response);

    expect(item.id).toBe('12345');
    expect(item.type).toBe('image');
    expect(item.content).toBe('Image post');
    expect(item.images).toEqual([
      'https://img.example.com/1.jpg',
      'https://img.example.com/2.jpg',
    ]);
    expect(item.likes).toBe(7);
    expect(item.url).toBe('https://t.bilibili.com/12345');
  });

  it('extracts error messages from both Error instances and unknown values', () => {
    expect(getErrorMessage(new Error('primary failed'))).toBe('primary failed');
    expect(getErrorMessage({ message: 'legacy failed' })).toBe('legacy failed');
    expect(getErrorMessage({ code: 500 })).toBe('[object Object]');
  });
});
