// SPDX-License-Identifier: Apache-2.0
import { createLocalizedText, type LocalizedText } from '../constants/locale';
import { HOMEPAGE_COMPONENT_TYPES, type HomepageComponentType } from '../types/homepage/schema';
import {
  PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
  PUBLIC_PRESENCE_TEMPLATE_TYPE_BY_TEMPLATE_ID,
  type PublicPresenceAssetManifest,
  type PublicPresenceAssetOwnerType,
  type PublicPresenceAssetRuntimeAuthority,
  type PublicPresenceComponentAssetManifest,
  type PublicPresenceComponentSourceManifest,
  type PublicPresenceSourceBundleFile,
  type PublicPresenceTemplateAssetManifest,
  type PublicPresenceTemplateSourceManifest,
} from './assets';
import {
  PUBLIC_PRESENCE_COMPONENT_SEED_BLUEPRINTS,
  PUBLIC_PRESENCE_SEED_METADATA,
  PUBLIC_PRESENCE_STAGE_SECTION_SEED_BLUEPRINTS,
  PUBLIC_PRESENCE_TEMPLATE_SEED_BLUEPRINTS,
} from './registry';
import type { PublicPresenceTemplateId } from './types';

const TEMPLATE_LOCALIZED_TEXT = {
  activeTalentHub: {
    description: {
      en: 'System starter for always-on fan homepage publishing.',
      zh_HANS: '用于常驻粉丝主页发布的系统起始模板。',
      zh_HANT: '用於常駐粉絲主頁發佈的系統起始模板。',
      ja: '常設ファンホームページ公開向けのシステムスターターです。',
      ko: '상시 팬 홈페이지 공개용 시스템 스타터입니다.',
      fr: 'Starter système pour la publication d’une homepage fan permanente.',
    },
    name: {
      en: 'Active Talent Hub',
      zh_HANS: '常驻艺人主页',
      zh_HANT: '常駐藝人主頁',
      ja: '常設タレントハブ',
      ko: '상시 탤런트 허브',
      fr: 'Hub talent actif',
    },
  },
  debutReveal: {
    description: {
      en: 'System starter for reveal and countdown fan homepage publishing.',
      zh_HANS: '用于揭晓与倒计时粉丝主页发布的系统起始模板。',
      zh_HANT: '用於揭曉與倒計時粉絲主頁發佈的系統起始模板。',
      ja: '公開・カウントダウン向けファンホームページ公開のシステムスターターです。',
      ko: '리빌과 카운트다운 팬 홈페이지 공개용 시스템 스타터입니다.',
      fr: 'Starter système pour la publication d’une homepage fan reveal et countdown.',
    },
    name: {
      en: 'Debut Reveal',
      zh_HANS: '出道揭晓页',
      zh_HANT: '出道揭曉頁',
      ja: 'デビュー公開ページ',
      ko: '데뷔 리빌 페이지',
      fr: 'Reveal de debut',
    },
  },
} as const satisfies Record<
  PublicPresenceTemplateId,
  {
    description: LocalizedText;
    name: LocalizedText;
  }
>;

const COMPONENT_LOCALIZED_NAMES = {
  ProfileCard: createLocalizedText({
    en: 'Profile Card',
    zh_HANS: '资料卡',
    zh_HANT: '資料卡',
    ja: 'プロフィールカード',
    ko: '프로필 카드',
    fr: 'Carte profil',
  }),
  SocialLinks: createLocalizedText({
    en: 'Social Links',
    zh_HANS: '社交链接',
    zh_HANT: '社交連結',
    ja: 'ソーシャルリンク',
    ko: '소셜 링크',
    fr: 'Liens sociaux',
  }),
  ImageGallery: createLocalizedText({
    en: 'Image Gallery',
    zh_HANS: '图片画廊',
    zh_HANT: '圖片畫廊',
    ja: '画像ギャラリー',
    ko: '이미지 갤러리',
    fr: 'Galerie d’images',
  }),
  VideoEmbed: createLocalizedText({
    en: 'Video Embed',
    zh_HANS: '视频嵌入',
    zh_HANT: '影片嵌入',
    ja: '動画埋め込み',
    ko: '비디오 임베드',
    fr: 'Integration video',
  }),
  RichText: createLocalizedText({
    en: 'Rich Text',
    zh_HANS: '富文本',
    zh_HANT: '富文本',
    ja: 'リッチテキスト',
    ko: '리치 텍스트',
    fr: 'Texte enrichi',
  }),
  LinkButton: createLocalizedText({
    en: 'Link Button',
    zh_HANS: '链接按钮',
    zh_HANT: '連結按鈕',
    ja: 'リンクボタン',
    ko: '링크 버튼',
    fr: 'Bouton lien',
  }),
  MarshmallowWidget: createLocalizedText({
    en: 'Marshmallow Widget',
    zh_HANS: 'Marshmallow 组件',
    zh_HANT: 'Marshmallow 元件',
    ja: 'Marshmallow ウィジェット',
    ko: 'Marshmallow 위젯',
    fr: 'Widget Marshmallow',
  }),
  Schedule: createLocalizedText({
    en: 'Schedule',
    zh_HANS: '日程',
    zh_HANT: '日程',
    ja: 'スケジュール',
    ko: '일정',
    fr: 'Planning',
  }),
  MusicPlayer: createLocalizedText({
    en: 'Music Player',
    zh_HANS: '音乐播放器',
    zh_HANT: '音樂播放器',
    ja: 'ミュージックプレイヤー',
    ko: '뮤직 플레이어',
    fr: 'Lecteur audio',
  }),
  LiveStatus: createLocalizedText({
    en: 'Live Status',
    zh_HANS: '直播状态',
    zh_HANT: '直播狀態',
    ja: '配信ステータス',
    ko: '라이브 상태',
    fr: 'Statut live',
  }),
  Divider: createLocalizedText({
    en: 'Divider',
    zh_HANS: '分隔线',
    zh_HANT: '分隔線',
    ja: '区切り線',
    ko: '구분선',
    fr: 'Separateur',
  }),
  Spacer: createLocalizedText({
    en: 'Spacer',
    zh_HANS: '留白间距',
    zh_HANT: '留白間距',
    ja: 'スペーサー',
    ko: '스페이서',
    fr: 'Espacement',
  }),
  BilibiliDynamic: createLocalizedText({
    en: 'Bilibili Dynamic',
    zh_HANS: 'Bilibili 动态',
    zh_HANT: 'Bilibili 動態',
    ja: 'Bilibili ダイナミック',
    ko: 'Bilibili 다이내믹',
    fr: 'Flux Bilibili',
  }),
} as const satisfies Record<HomepageComponentType, LocalizedText>;

function getComponentSeedDescription(componentType: HomepageComponentType): LocalizedText {
  const componentName = COMPONENT_LOCALIZED_NAMES[componentType];

  return createLocalizedText({
    en: `System starter component for ${componentName.en.toLowerCase()} rendering.`,
    zh_HANS: `${componentName.zh_HANS} 系统起始组件。`,
    zh_HANT: `${componentName.zh_HANT} 系統起始元件。`,
    ja: `${componentName.ja} のシステムスターターコンポーネントです。`,
    ko: `${componentName.ko} 시스템 스타터 컴포넌트입니다.`,
    fr: `Composant systeme de depart pour ${componentName.fr.toLowerCase()}.`,
  });
}

function createJsonSourceFile(
  path: string,
  kind: PublicPresenceSourceBundleFile['kind'],
  payload: unknown
): PublicPresenceSourceBundleFile {
  return {
    contents: `${JSON.stringify(payload, null, 2)}\n`,
    kind,
    language: 'json',
    path,
  };
}

function createTextSourceFile(
  path: string,
  kind: PublicPresenceSourceBundleFile['kind'],
  language: string,
  contents: string
): PublicPresenceSourceBundleFile {
  return {
    contents: contents.endsWith('\n') ? contents : `${contents}\n`,
    kind,
    language,
    path,
  };
}

export interface PublicPresenceAssetSeedText {
  description: LocalizedText;
  name: LocalizedText;
}

export interface BuildPublicPresenceAssetManifestOptions {
  assetCode?: string | null;
  assetId?: string | null;
  assetRevisionId?: string | null;
  description?: LocalizedText | null;
  name?: LocalizedText | null;
  ownerId?: string | null;
  ownerType?: PublicPresenceAssetOwnerType | null;
}

export interface PublicPresenceSystemAssetSeedDefinition {
  assetKind: PublicPresenceAssetManifest['assetKind'];
  code: string;
  componentType?: HomepageComponentType;
  description: LocalizedText;
  manifest: PublicPresenceAssetManifest;
  name: LocalizedText;
  sourceBundle: PublicPresenceSourceBundleFile[];
  templateId?: PublicPresenceTemplateId;
}

export function getPublicPresenceTemplateSeedText(
  templateId: PublicPresenceTemplateId
): PublicPresenceAssetSeedText {
  return TEMPLATE_LOCALIZED_TEXT[templateId];
}

export function getPublicPresenceComponentSeedText(
  componentType: HomepageComponentType
): PublicPresenceAssetSeedText {
  return {
    description: getComponentSeedDescription(componentType),
    name: COMPONENT_LOCALIZED_NAMES[componentType],
  };
}

export function buildPublicPresenceTemplateAssetManifest(
  templateId: PublicPresenceTemplateId,
  options: BuildPublicPresenceAssetManifestOptions = {}
): PublicPresenceTemplateAssetManifest {
  const definition = PUBLIC_PRESENCE_TEMPLATE_SEED_BLUEPRINTS[templateId];

  return {
    assetCode: options.assetCode ?? null,
    assetId: options.assetId ?? null,
    assetKind: 'template',
    assetRevisionId: options.assetRevisionId ?? null,
    defaultSectionOrder: [...definition.defaultSectionOrder],
    description: options.description ?? null,
    label: definition.label,
    lockedSections: [...definition.lockedSections],
    name: options.name ?? null,
    optionalSections: [...definition.optionalSections],
    ownerId: options.ownerId ?? null,
    ownerType: options.ownerType ?? null,
    personaKitFields: [...definition.personaKitFields],
    policyReferences: [...definition.policyReferences],
    recommendedSections: [...definition.recommendedSections],
    requiredSections: [...definition.requiredSections],
    runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
    templateId: definition.templateId,
    templateTypeCode: PUBLIC_PRESENCE_TEMPLATE_TYPE_BY_TEMPLATE_ID[definition.templateId],
    useCase: definition.useCase,
    validationRules: [...definition.validationRules],
  };
}

export function buildPublicPresenceComponentAssetManifest(
  componentType: HomepageComponentType,
  options: BuildPublicPresenceAssetManifestOptions = {}
): PublicPresenceComponentAssetManifest {
  const definition = PUBLIC_PRESENCE_COMPONENT_SEED_BLUEPRINTS[componentType];

  return {
    aiPatchAllowlist: [...definition.aiPatchAllowlist],
    assetCode: options.assetCode ?? null,
    assetId: options.assetId ?? null,
    assetKind: 'component',
    assetRevisionId: options.assetRevisionId ?? null,
    componentType: definition.componentType,
    defaultProps: structuredClone(definition.defaultProps),
    description: options.description ?? null,
    fieldKeys: definition.fieldDefinitions.map((field) => field.fieldKey),
    name: options.name ?? null,
    ownerId: options.ownerId ?? null,
    ownerType: options.ownerType ?? null,
    projectionMode: definition.publicProjectionMode,
    propsSchemaKey: definition.propsSchemaKey,
    rendererSupport: definition.rendererSupport,
    runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
    safetyPolicyReferences: [...definition.safetyPolicyReferences],
    sourcePolicy: definition.sourcePolicy,
    unknownFieldPolicy: definition.unknownFieldPolicy,
    visualSupport: definition.visualSupport,
  };
}

export function buildPublicPresenceTemplateSourceManifest(
  templateId: PublicPresenceTemplateId,
  options: BuildPublicPresenceAssetManifestOptions = {}
): PublicPresenceTemplateSourceManifest {
  const manifest = buildPublicPresenceTemplateAssetManifest(templateId, options);
  const sectionKinds = Array.from(
    new Set([
      ...manifest.requiredSections,
      ...manifest.recommendedSections,
      ...manifest.optionalSections,
      ...manifest.lockedSections,
      ...manifest.defaultSectionOrder,
    ])
  );

  return {
    ...manifest,
    registryVersion: PUBLIC_PRESENCE_SEED_METADATA.registryVersion,
    safetyPolicyVersion: PUBLIC_PRESENCE_SEED_METADATA.safetyPolicyVersion,
    stageSections: sectionKinds.map((sectionKind) =>
      structuredClone(
        PUBLIC_PRESENCE_STAGE_SECTION_SEED_BLUEPRINTS[
          sectionKind as keyof typeof PUBLIC_PRESENCE_STAGE_SECTION_SEED_BLUEPRINTS
        ]
      )
    ),
  };
}

export function buildPublicPresenceComponentSourceManifest(
  componentType: HomepageComponentType,
  options: BuildPublicPresenceAssetManifestOptions = {}
): PublicPresenceComponentSourceManifest {
  const manifest = buildPublicPresenceComponentAssetManifest(componentType, options);
  const definition = PUBLIC_PRESENCE_COMPONENT_SEED_BLUEPRINTS[componentType];

  return {
    aiPatchAllowlist: [...(manifest.aiPatchAllowlist ?? [])],
    assetCode: manifest.assetCode,
    assetId: manifest.assetId,
    assetKind: 'component',
    assetRevisionId: manifest.assetRevisionId,
    collectionOperations: structuredClone(definition.collectionOperations ?? []),
    componentType: manifest.componentType,
    defaultProps: structuredClone(manifest.defaultProps ?? {}),
    description: manifest.description,
    fieldDefinitions: structuredClone(definition.fieldDefinitions),
    fieldKeys: [...(manifest.fieldKeys ?? [])],
    lockedSourceOwnedPolicy: definition.lockedSourceOwnedPolicy,
    name: manifest.name,
    ownerId: manifest.ownerId,
    ownerType: manifest.ownerType,
    projectionMode: manifest.projectionMode ?? definition.publicProjectionMode,
    propsSchemaKey: manifest.propsSchemaKey ?? definition.propsSchemaKey,
    registryVersion: PUBLIC_PRESENCE_SEED_METADATA.registryVersion,
    rendererSupport: manifest.rendererSupport,
    runtimeContractVersion: manifest.runtimeContractVersion,
    safetyPolicyReferences: [...(manifest.safetyPolicyReferences ?? [])],
    safetyPolicyVersion: PUBLIC_PRESENCE_SEED_METADATA.safetyPolicyVersion,
    sourcePolicy: manifest.sourcePolicy ?? definition.sourcePolicy,
    unknownFieldPolicy: manifest.unknownFieldPolicy ?? definition.unknownFieldPolicy,
    visualSupport: manifest.visualSupport,
  };
}

export function buildBlankPublicPresenceAssetSourceBundle(input: {
  assetCode: string;
  assetKind: PublicPresenceAssetManifest['assetKind'];
  componentType?: HomepageComponentType;
  manifest: PublicPresenceAssetManifest;
  name: LocalizedText;
  templateId?: PublicPresenceTemplateId;
}) {
  const sourceManifest =
    input.assetKind === 'template'
      ? buildPublicPresenceTemplateSourceManifest(input.templateId!, {
          assetCode: input.manifest.assetCode ?? input.assetCode,
          assetId: input.manifest.assetId ?? null,
          assetRevisionId: input.manifest.assetRevisionId ?? null,
          description: input.manifest.description ?? null,
          name: input.manifest.name ?? null,
          ownerId: input.manifest.ownerId ?? null,
          ownerType: input.manifest.ownerType ?? null,
        })
      : buildPublicPresenceComponentSourceManifest(input.componentType!, {
          assetCode: input.manifest.assetCode ?? input.assetCode,
          assetId: input.manifest.assetId ?? null,
          assetRevisionId: input.manifest.assetRevisionId ?? null,
          description: input.manifest.description ?? null,
          name: input.manifest.name ?? null,
          ownerId: input.manifest.ownerId ?? null,
          ownerType: input.manifest.ownerType ?? null,
        });
  const manifestFile = createJsonSourceFile('manifest.json', 'schema', {
    ...sourceManifest,
    authoring: {
      assetCode: input.assetCode,
      starter: input.assetKind === 'template' ? 'templateAsset' : 'componentAsset',
    },
  });

  if (input.assetKind === 'template') {
    return [
      manifestFile,
      createTextSourceFile(
        'src/index.tsx',
        'code',
        'tsx',
        `export function ${toPascalCase(input.assetCode)}Template() {\n  return null;\n}`
      ),
      createJsonSourceFile('fixtures/default.json', 'fixture', {
        templateId: input.templateId,
        title: input.name.en,
      }),
      createTextSourceFile(
        'docs/README.md',
        'doc',
        'markdown',
        `# ${input.name.en}\n\nTemplate asset workspace starter for ${input.templateId}.`
      ),
    ];
  }

  return [
    manifestFile,
    createTextSourceFile(
      'src/index.tsx',
      'code',
      'tsx',
      `export function ${toPascalCase(input.assetCode)}Component() {\n  return null;\n}`
    ),
    createJsonSourceFile('fixtures/default.json', 'fixture', {
      componentType: input.componentType,
      props: input.manifest.assetKind === 'component' ? (input.manifest.defaultProps ?? {}) : {},
    }),
    createTextSourceFile(
      'docs/README.md',
      'doc',
      'markdown',
      `# ${input.name.en}\n\nComponent asset workspace starter for ${input.componentType}.`
    ),
  ];
}

export function buildPublicPresenceSystemTemplateSeed(
  templateId: PublicPresenceTemplateId
): PublicPresenceSystemAssetSeedDefinition {
  const text = getPublicPresenceTemplateSeedText(templateId);
  const manifest = buildPublicPresenceTemplateAssetManifest(templateId, {
    assetCode: templateId,
    description: text.description,
    name: text.name,
    ownerId: null,
    ownerType: 'system',
  });

  return {
    assetKind: 'template',
    code: templateId,
    description: text.description,
    manifest,
    name: text.name,
    sourceBundle: buildBlankPublicPresenceAssetSourceBundle({
      assetCode: templateId,
      assetKind: 'template',
      manifest,
      name: text.name,
      templateId,
    }),
    templateId,
  };
}

export function buildPublicPresenceSystemComponentSeed(
  componentType: HomepageComponentType
): PublicPresenceSystemAssetSeedDefinition {
  const text = getPublicPresenceComponentSeedText(componentType);
  const code = toKebabCase(componentType);
  const manifest = buildPublicPresenceComponentAssetManifest(componentType, {
    assetCode: code,
    description: text.description,
    name: text.name,
    ownerId: null,
    ownerType: 'system',
  });

  return {
    assetKind: 'component',
    code,
    componentType,
    description: text.description,
    manifest,
    name: text.name,
    sourceBundle: buildBlankPublicPresenceAssetSourceBundle({
      assetCode: code,
      assetKind: 'component',
      componentType,
      manifest,
      name: text.name,
    }),
  };
}

export function buildPublicPresenceSeedRuntimeAuthority(
  templateId: PublicPresenceTemplateId
): PublicPresenceAssetRuntimeAuthority {
  const template = structuredClone(PUBLIC_PRESENCE_TEMPLATE_SEED_BLUEPRINTS[templateId]);
  const allowedSectionKinds = Array.from(
    new Set([
      ...template.requiredSections,
      ...template.recommendedSections,
      ...template.optionalSections,
      ...template.lockedSections,
      ...template.defaultSectionOrder,
    ])
  );

  return {
    components: structuredClone(PUBLIC_PRESENCE_COMPONENT_SEED_BLUEPRINTS),
    registryVersion: PUBLIC_PRESENCE_SEED_METADATA.registryVersion,
    safetyPolicyVersion: PUBLIC_PRESENCE_SEED_METADATA.safetyPolicyVersion,
    stageSections: Object.fromEntries(
      allowedSectionKinds.map((sectionKind) => [
        sectionKind,
        structuredClone(PUBLIC_PRESENCE_STAGE_SECTION_SEED_BLUEPRINTS[sectionKind]),
      ])
    ),
    template,
  };
}

export function getPublicPresenceSystemAssetSeeds(): PublicPresenceSystemAssetSeedDefinition[] {
  return [
    ...Object.keys(PUBLIC_PRESENCE_TEMPLATE_SEED_BLUEPRINTS).map((templateId) =>
      buildPublicPresenceSystemTemplateSeed(templateId as PublicPresenceTemplateId)
    ),
    ...HOMEPAGE_COMPONENT_TYPES.map((componentType) =>
      buildPublicPresenceSystemComponentSeed(componentType)
    ),
  ];
}

function toKebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function toPascalCase(value: string) {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1)}`)
    .join('');
}

export * from './assets';
