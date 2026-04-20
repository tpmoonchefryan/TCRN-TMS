import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  resolveLocaleRecord,
} from '@/platform/runtime/locale/locale-text';

type ComponentCategory = 'content' | 'core' | 'interactive' | 'layout' | 'media';

export interface HomepageEditorCopy {
  state: {
    invalidEditorsBeforeSave: string;
    invalidJson: string;
    jsonObjectRequired: string;
    loadError: string;
    loading: string;
    saveError: string;
    unavailableTitle: string;
  };
  header: {
    description: string;
    eyebrow: string;
    title: string;
  };
  actions: {
    allChangesSaved: string;
    backToManagement: string;
    routingSettings: string;
    saveDraft: string;
    savingDraft: string;
    unsavedChanges: string;
  };
  summary: {
    componentsHint: string;
    componentsLabel: string;
    homepageUrlHint: string;
    homepageUrlLabel: string;
    sourceDraft: string;
    sourceDraftHint: string;
    sourceDraftVersion: (versionNumber: number) => string;
    sourceEmpty: string;
    sourceEmptyHint: string;
    sourceLabel: string;
    sourcePublished: string;
    sourcePublishedHint: string;
    sourcePublishedVersion: (versionNumber: number) => string;
    tenantFallback: string;
    tenantHint: string;
    tenantLabel: string;
  };
  sections: {
    catalogDescription: string;
    catalogTitle: string;
    draftBlocksDescription: string;
    draftBlocksTitle: string;
    emptyBlocksDescription: string;
    emptyBlocksTitle: string;
    previewDescription: string;
    previewTitle: string;
    themeDescription: string;
    themeJsonHint: string;
    themeJsonLabel: string;
    themeTitle: string;
  };
  catalog: {
    add: string;
    categories: Record<ComponentCategory, string>;
    entries: Record<string, { description: string; label: string }>;
  };
  block: {
    hidden: string;
    indexLabel: (index: number) => string;
    jsonHint: string;
    jsonLabel: (label: string) => string;
    moveDown: (label: string) => string;
    moveUp: (label: string) => string;
    remove: string;
    visible: string;
  };
  dialogs: {
    leaveConfirm: string;
    leaveDescription: (label: string) => string;
    leaveTitle: string;
  };
  notices: {
    saveNewVersion: (versionNumber: number) => string;
    saveNoChange: (versionNumber: number) => string;
  };
}

const COPY: Record<RuntimeLocale, HomepageEditorCopy> = {
  en: {
    state: {
      invalidEditorsBeforeSave: 'Resolve invalid JSON before saving the draft.',
      invalidJson: 'Enter valid JSON before continuing.',
      jsonObjectRequired: 'Enter a valid JSON object.',
      loadError: 'Failed to load the homepage editor.',
      loading: 'Loading homepage editor…',
      saveError: 'Failed to save the homepage draft.',
      unavailableTitle: 'Homepage editor unavailable',
    },
    header: {
      description: 'Build and preview homepage drafts here, then publish them from homepage management when they are ready.',
      eyebrow: 'Talent business / Homepage',
      title: 'Homepage editor',
    },
    actions: {
      allChangesSaved: 'All changes saved',
      backToManagement: 'Back to homepage management',
      routingSettings: 'Public access settings',
      saveDraft: 'Save draft',
      savingDraft: 'Saving draft…',
      unsavedChanges: 'Unsaved changes',
    },
    summary: {
      componentsHint: 'Total homepage blocks currently included in this draft.',
      componentsLabel: 'Blocks',
      homepageUrlHint: 'Current public access address for this homepage.',
      homepageUrlLabel: 'Homepage URL',
      sourceDraft: 'Draft',
      sourceDraftHint: 'This editor is currently working on the latest draft version.',
      sourceDraftVersion: (versionNumber) => `Draft v${versionNumber}`,
      sourceEmpty: 'Empty draft',
      sourceEmptyHint: 'No draft or published version exists yet.',
      sourceLabel: 'Editing source',
      sourcePublished: 'Published',
      sourcePublishedHint: 'No draft exists yet, so the editor starts from the published version.',
      sourcePublishedVersion: (versionNumber) => `Published v${versionNumber}`,
      tenantFallback: 'Current tenant',
      tenantHint: 'Current tenant for this homepage.',
      tenantLabel: 'Tenant',
    },
    sections: {
      catalogDescription: 'Add blocks to the homepage draft from the approved component set.',
      catalogTitle: 'Component catalog',
      draftBlocksDescription: 'Edit each block in order. The preview updates after the JSON becomes valid.',
      draftBlocksTitle: 'Draft blocks',
      emptyBlocksDescription: 'Add the first block from the catalog to start composing this homepage.',
      emptyBlocksTitle: 'No homepage blocks yet',
      previewDescription: 'Review the current draft as visitors would see it after publication.',
      previewTitle: 'Draft preview',
      themeDescription: 'Adjust theme values for this draft here. Public access settings are managed separately.',
      themeJsonHint: 'The preview uses the most recent valid theme JSON from this editor.',
      themeJsonLabel: 'Theme JSON',
      themeTitle: 'Theme',
    },
    catalog: {
      add: 'Add',
      categories: {
        content: 'Content',
        core: 'Core',
        interactive: 'Interactive',
        layout: 'Layout',
        media: 'Media',
      },
      entries: {
        BilibiliDynamic: {
          label: 'Bilibili dynamic',
          description: 'Activity feed block that links visitors to the Bilibili profile.',
        },
        Divider: {
          label: 'Divider',
          description: 'Visual separator between homepage sections.',
        },
        ImageGallery: {
          label: 'Image gallery',
          description: 'Photo or key visual gallery section.',
        },
        LinkButton: {
          label: 'Link button',
          description: 'Single call-to-action button for an external destination.',
        },
        LiveStatus: {
          label: 'Live status',
          description: 'Stream status block for live or offline presence.',
        },
        MarshmallowWidget: {
          label: 'Marshmallow widget',
          description: 'Entry block that points visitors to the public marshmallow page.',
        },
        MusicPlayer: {
          label: 'Music player',
          description: 'Embedded music release or featured track player.',
        },
        ProfileCard: {
          label: 'Profile card',
          description: 'Profile header with avatar, display name, and bio.',
        },
        RichText: {
          label: 'Rich text',
          description: 'Formatted text block for announcements or narrative content.',
        },
        Schedule: {
          label: 'Schedule',
          description: 'Weekly timetable or upcoming stream plan.',
        },
        SocialLinks: {
          label: 'Social links',
          description: 'Outbound social profile links for this talent.',
        },
        Spacer: {
          label: 'Spacer',
          description: 'Vertical spacing block between homepage sections.',
        },
        VideoEmbed: {
          label: 'Video embed',
          description: 'Embedded promo video, MV, or featured clip.',
        },
      },
    },
    block: {
      hidden: 'Hidden',
      indexLabel: (index) => `Block #${index}`,
      jsonHint: 'Preview updates after this JSON parses as a valid object.',
      jsonLabel: (label) => `${label} JSON`,
      moveDown: (label) => `Move ${label} down`,
      moveUp: (label) => `Move ${label} up`,
      remove: 'Remove',
      visible: 'Visible',
    },
    dialogs: {
      leaveConfirm: 'Leave editor',
      leaveDescription: (label) => `You have unsaved changes. Leave for ${label} without saving?`,
      leaveTitle: 'Leave homepage editor?',
    },
    notices: {
      saveNewVersion: (versionNumber) => `Homepage draft saved as v${versionNumber}.`,
      saveNoChange: (versionNumber) => `Homepage draft is already up to date at v${versionNumber}.`,
    },
  },
  zh: {
    state: {
      invalidEditorsBeforeSave: '请先修复无效 JSON，再保存草稿。',
      invalidJson: '请输入合法的 JSON。',
      jsonObjectRequired: '请输入 JSON 对象。',
      loadError: '加载主页编辑器失败。',
      loading: '正在加载主页编辑器…',
      saveError: '保存主页草稿失败。',
      unavailableTitle: '主页编辑器不可用',
    },
    header: {
      description: '在这里编辑并预览主页草稿，确认无误后再回到主页管理页发布。',
      eyebrow: '艺人业务 / 主页',
      title: '主页编辑器',
    },
    actions: {
      allChangesSaved: '已全部保存',
      backToManagement: '返回主页管理',
      routingSettings: '公开访问设置',
      saveDraft: '保存草稿',
      savingDraft: '保存中…',
      unsavedChanges: '有未保存更改',
    },
    summary: {
      componentsHint: '当前草稿中包含的主页区块总数。',
      componentsLabel: '区块数',
      homepageUrlHint: '当前主页对外访问地址。',
      homepageUrlLabel: '主页链接',
      sourceDraft: '草稿',
      sourceDraftHint: '当前编辑器正在处理最新草稿版本。',
      sourceDraftVersion: (versionNumber) => `草稿 v${versionNumber}`,
      sourceEmpty: '空白草稿',
      sourceEmptyHint: '当前还没有草稿或已发布版本。',
      sourceLabel: '编辑来源',
      sourcePublished: '已发布版本',
      sourcePublishedHint: '当前还没有草稿，因此编辑器先从已发布版本开始。',
      sourcePublishedVersion: (versionNumber) => `已发布 v${versionNumber}`,
      tenantFallback: '当前租户',
      tenantHint: '当前主页所属租户。',
      tenantLabel: '租户',
    },
    sections: {
      catalogDescription: '从已提供的组件集中添加主页区块。',
      catalogTitle: '组件目录',
      draftBlocksDescription: '按顺序编辑各区块。只有 JSON 合法时，预览才会更新。',
      draftBlocksTitle: '草稿区块',
      emptyBlocksDescription: '先从组件目录中添加第一个区块，再开始编辑主页内容。',
      emptyBlocksTitle: '还没有主页区块',
      previewDescription: '按发布后用户看到的方式预览当前草稿。',
      previewTitle: '草稿预览',
      themeDescription: '在这里调整当前草稿的主题。公开访问设置会在单独页面管理。',
      themeJsonHint: '预览会使用这里最近一次解析成功的主题 JSON。',
      themeJsonLabel: '主题 JSON',
      themeTitle: '主题',
    },
    catalog: {
      add: '添加',
      categories: {
        content: '内容',
        core: '核心',
        interactive: '互动',
        layout: '布局',
        media: '媒体',
      },
      entries: {
        BilibiliDynamic: {
          label: 'Bilibili 动态',
          description: '展示并跳转至 Bilibili 主页的动态区块。',
        },
        Divider: {
          label: '分隔线',
          description: '用于区分主页内容段落的视觉分隔区块。',
        },
        ImageGallery: {
          label: '图片画廊',
          description: '展示照片或主视觉图片的画廊区块。',
        },
        LinkButton: {
          label: '链接按钮',
          description: '跳转到外部页面的单个操作按钮。',
        },
        LiveStatus: {
          label: '直播状态',
          description: '显示直播中或离线状态的区块。',
        },
        MarshmallowWidget: {
          label: '棉花糖组件',
          description: '引导访客进入公开棉花糖页面的入口区块。',
        },
        MusicPlayer: {
          label: '音乐播放器',
          description: '嵌入音乐发行内容或主推歌曲播放器。',
        },
        ProfileCard: {
          label: '资料卡片',
          description: '包含头像、名称和简介的资料头图区块。',
        },
        RichText: {
          label: '富文本',
          description: '用于公告或正文说明的富文本区块。',
        },
        Schedule: {
          label: '日程表',
          description: '展示周计划或近期直播安排的区块。',
        },
        SocialLinks: {
          label: '社交链接',
          description: '展示该艺人的对外社交主页链接。',
        },
        Spacer: {
          label: '留白',
          description: '在主页段落之间增加垂直间距的区块。',
        },
        VideoEmbed: {
          label: '视频嵌入',
          description: '嵌入宣传片、MV 或精选视频的区块。',
        },
      },
    },
    block: {
      hidden: '已隐藏',
      indexLabel: (index) => `区块 #${index}`,
      jsonHint: '当这里的 JSON 解析为合法对象后，预览会同步更新。',
      jsonLabel: (label) => `${label} JSON`,
      moveDown: (label) => `下移 ${label}`,
      moveUp: (label) => `上移 ${label}`,
      remove: '移除',
      visible: '可见',
    },
    dialogs: {
      leaveConfirm: '离开编辑器',
      leaveDescription: (label) => `当前有未保存的更改。是否不保存并前往${label}？`,
      leaveTitle: '离开主页编辑器？',
    },
    notices: {
      saveNewVersion: (versionNumber) => `主页草稿已保存为 v${versionNumber}。`,
      saveNoChange: (versionNumber) => `主页草稿当前已是最新版本 v${versionNumber}。`,
    },
  },
  ja: {
    state: {
      invalidEditorsBeforeSave: '無効な JSON を修正してから下書きを保存してください。',
      invalidJson: '有効な JSON を入力してください。',
      jsonObjectRequired: 'JSON オブジェクトを入力してください。',
      loadError: 'ホームページ編集画面の読み込みに失敗しました。',
      loading: 'ホームページ編集画面を読み込み中…',
      saveError: 'ホームページ下書きの保存に失敗しました。',
      unavailableTitle: 'ホームページ編集画面を開けません',
    },
    header: {
      description: 'ここでホームページの下書きを編集して確認し、準備ができたらホームページ管理から公開します。',
      eyebrow: 'タレント業務 / ホームページ',
      title: 'ホームページエディタ',
    },
    actions: {
      allChangesSaved: 'すべて保存済み',
      backToManagement: 'ホームページ管理へ戻る',
      routingSettings: '公開アクセス設定',
      saveDraft: '下書きを保存',
      savingDraft: '保存中…',
      unsavedChanges: '未保存の変更あり',
    },
    summary: {
      componentsHint: '現在の下書きに含まれるホームページブロック数です。',
      componentsLabel: 'ブロック数',
      homepageUrlHint: '現在の公開アクセス先です。',
      homepageUrlLabel: 'ホームページ URL',
      sourceDraft: '下書き',
      sourceDraftHint: 'このエディタは最新の下書きバージョンを編集中です。',
      sourceDraftVersion: (versionNumber) => `下書き v${versionNumber}`,
      sourceEmpty: '空の下書き',
      sourceEmptyHint: 'まだ下書きも公開版もありません。',
      sourceLabel: '編集元',
      sourcePublished: '公開版',
      sourcePublishedHint: 'まだ下書きがないため、公開中のバージョンを元に編集を開始します。',
      sourcePublishedVersion: (versionNumber) => `公開版 v${versionNumber}`,
      tenantFallback: '現在のテナント',
      tenantHint: 'このホームページが属するテナントです。',
      tenantLabel: 'テナント',
    },
    sections: {
      catalogDescription: '提供済みコンポーネントからホームページのブロックを追加します。',
      catalogTitle: 'コンポーネント一覧',
      draftBlocksDescription: 'ブロックを順番に編集します。JSON が有効になるとプレビューが更新されます。',
      draftBlocksTitle: '下書きブロック',
      emptyBlocksDescription: '最初のブロックを一覧から追加して、ホームページ編集を始めてください。',
      emptyBlocksTitle: 'ホームページブロックはまだありません',
      previewDescription: '公開後に訪問者が見る形で現在の下書きを確認します。',
      previewTitle: '下書きプレビュー',
      themeDescription: 'この下書きのテーマをここで調整します。公開アクセス設定は別画面で管理します。',
      themeJsonHint: 'プレビューにはこのエディタで最後に有効だったテーマ JSON が使われます。',
      themeJsonLabel: 'テーマ JSON',
      themeTitle: 'テーマ',
    },
    catalog: {
      add: '追加',
      categories: {
        content: 'コンテンツ',
        core: '基本',
        interactive: 'インタラクション',
        layout: 'レイアウト',
        media: 'メディア',
      },
      entries: {
        BilibiliDynamic: {
          label: 'Bilibili 動態',
          description: 'Bilibili プロフィールへ案内する動態フィードブロックです。',
        },
        Divider: {
          label: '区切り線',
          description: 'ホームページの各セクションを区切る視覚要素です。',
        },
        ImageGallery: {
          label: '画像ギャラリー',
          description: '写真やキービジュアルを見せるギャラリーブロックです。',
        },
        LinkButton: {
          label: 'リンクボタン',
          description: '外部ページへ移動する単一のアクションボタンです。',
        },
        LiveStatus: {
          label: '配信ステータス',
          description: '配信中またはオフライン状態を示すブロックです。',
        },
        MarshmallowWidget: {
          label: 'マシュマロウィジェット',
          description: '公開マシュマロページへ案内する入口ブロックです。',
        },
        MusicPlayer: {
          label: '音楽プレイヤー',
          description: 'リリース楽曲や注目曲を埋め込むプレイヤーブロックです。',
        },
        ProfileCard: {
          label: 'プロフィールカード',
          description: 'アバター、表示名、紹介文を載せるプロフィールブロックです。',
        },
        RichText: {
          label: 'リッチテキスト',
          description: '告知や説明文を掲載するためのテキストブロックです。',
        },
        Schedule: {
          label: 'スケジュール',
          description: '週間予定や今後の配信予定を表示するブロックです。',
        },
        SocialLinks: {
          label: 'SNS リンク',
          description: 'このタレントの外部 SNS プロフィールリンクを表示します。',
        },
        Spacer: {
          label: 'スペーサー',
          description: 'セクション間に縦の余白を追加するブロックです。',
        },
        VideoEmbed: {
          label: '動画埋め込み',
          description: 'MV や紹介動画を埋め込むブロックです。',
        },
      },
    },
    block: {
      hidden: '非表示',
      indexLabel: (index) => `ブロック #${index}`,
      jsonHint: 'ここが有効な JSON オブジェクトとして解釈されると、プレビューが更新されます。',
      jsonLabel: (label) => `${label} JSON`,
      moveDown: (label) => `${label} を下へ移動`,
      moveUp: (label) => `${label} を上へ移動`,
      remove: '削除',
      visible: '表示中',
    },
    dialogs: {
      leaveConfirm: 'エディタを離れる',
      leaveDescription: (label) => `未保存の変更があります。保存せずに${label}へ移動しますか？`,
      leaveTitle: 'ホームページ編集画面を離れますか？',
    },
    notices: {
      saveNewVersion: (versionNumber) => `ホームページ下書きを v${versionNumber} として保存しました。`,
      saveNoChange: (versionNumber) => `ホームページ下書きはすでに最新の v${versionNumber} です。`,
    },
  },
};

export function useHomepageEditorCopy() {
  const { currentLocale, selectedLocale } = useRuntimeLocale();

  return {
    currentLocale,
    selectedLocale,
    copy: resolveLocaleRecord(selectedLocale, COPY as Record<RuntimeLocale, HomepageEditorCopy>, currentLocale) as HomepageEditorCopy,
  };
}
