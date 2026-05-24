import { pickLocaleText } from '@/platform/runtime/locale/locale-text';

export function resolvePublicHomepageFallbackTitle(locale: string, title: string) {
  if (title === 'Debut preview' || title === '__debutPreview__') {
    return pickLocaleText(locale, {
      en: 'Debut preview',
      zh_HANS: '出道预告',
      zh_HANT: '出道預告',
      ja: 'デビュー予告',
      ko: '데뷔 프리뷰',
      fr: 'Apercu des debuts',
    });
  }

  if (title === 'Debut reveal' || title === '__debutReveal__') {
    return pickLocaleText(locale, {
      en: 'Debut reveal',
      zh_HANS: '出道揭晓',
      zh_HANT: '出道揭曉',
      ja: 'デビュー公開',
      ko: '데뷔 공개',
      fr: 'Revelation des debuts',
    });
  }

  if (title === 'Public Presence' || title === '__publicPresence__') {
    return pickLocaleText(locale, {
      en: 'Public Presence',
      zh_HANS: '公开形象页',
      zh_HANT: '公開形象頁',
      ja: '公開プレゼンス',
      ko: '퍼블릭 프레즌스',
      fr: 'Presence publique',
    });
  }

  if (title === 'Reveal is live' || title === '__revealLive__') {
    return pickLocaleText(locale, {
      en: 'Reveal is live',
      zh_HANS: '揭晓已上线',
      zh_HANT: '揭曉已上線',
      ja: '公開中',
      ko: '리빌이 시작되었습니다',
      fr: 'La revelation est en ligne',
    });
  }

  if (title === 'Reveal countdown' || title === '__revealCountdown__') {
    return pickLocaleText(locale, {
      en: 'Reveal countdown',
      zh_HANS: '揭晓倒计时',
      zh_HANT: '揭曉倒數計時',
      ja: '公開カウントダウン',
      ko: '리빌 카운트다운',
      fr: 'Compte a rebours avant la revelation',
    });
  }

  return title;
}

export function resolvePublicHomepageFallbackDescription(
  locale: string,
  description: string | null
) {
  if (!description) {
    return null;
  }

  switch (description) {
    case 'Official streams, updates, and fan links in one place.':
      return pickLocaleText(locale, {
        en: 'Official streams, updates, and fan links in one place.',
        zh_HANS: '在这里集中查看官方直播、最新动态和粉丝入口。',
        zh_HANT: '在這裡集中查看官方直播、最新動態與粉絲入口。',
        ja: '公式配信、最新情報、ファン向けリンクをここでまとめて確認できます。',
        ko: '공식 방송, 최신 소식, 팬 링크를 이 한곳에서 확인할 수 있습니다.',
        fr: 'Retrouvez ici les diffusions officielles, les dernieres nouvelles et les liens pour les fans.',
      });
    case 'Countdown updates, reveal moments, and launch links for fans.':
      return pickLocaleText(locale, {
        en: 'Countdown updates, reveal moments, and launch links for fans.',
        zh_HANS: '在这里查看倒计时动态、揭晓时刻和面向粉丝的上线入口。',
        zh_HANT: '在這裡查看倒數動態、揭曉時刻與面向粉絲的上線入口。',
        ja: 'カウントダウンの更新、公開の瞬間、ファン向けの参加リンクをここで確認できます。',
        ko: '카운트다운 소식, 공개 순간, 팬 참여 링크를 이곳에서 확인할 수 있습니다.',
        fr: 'Retrouvez ici le compte a rebours, le moment de revelation et les liens de lancement pour les fans.',
      });
    case 'Public talent homepage':
      return pickLocaleText(locale, {
        en: 'Public talent homepage',
        zh_HANS: '公开艺人主页',
        zh_HANT: '公開藝人主頁',
        ja: '公開タレントホームページ',
        ko: '공개 탤런트 홈페이지',
        fr: 'Page publique du talent',
      });
    default:
      return description;
  }
}
