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
    lowCodeSnapshotRestored: string;
    saveError: string;
    sourceDocumentRequired: string;
    unsafeSource: string;
    unavailableTitle: string;
    visualLockedAfterEject: string;
  };
  header: {
    description: string;
    eyebrow: string;
    title: string;
  };
  actions: {
    allChangesSaved: string;
    backToManagement: string;
    exitEditor: string;
    pageInfo: string;
    openLivePreview: string;
    previewDraft: string;
    restoreLowCodeSnapshot: string;
    routingSettings: string;
    saveDraft: string;
    savingDraft: string;
    unsavedChanges: string;
  };
  modes: {
    dev: string;
    devDescription: string;
    source: string;
    sourceDescription: string;
    title: string;
    visual: string;
    visualDescription: string;
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
    addBlock: string;
    catalogDescription: string;
    catalogTitle: string;
    hideCatalog: string;
    draftBlocksDescription: string;
    draftBlocksTitle: string;
    emptyBlocksDescription: string;
    emptyBlocksTitle: string;
    devModeLayoutTitle: string;
    devModeSchemaTitle: string;
    devModeSelectedBlockTitle: string;
    devModeThemeTitle: string;
    devModeWarningsTitle: string;
    previewDescription: string;
    previewTitle: string;
    previewViewportDesktop: string;
    previewViewportHint: string;
    previewViewportLabel: string;
    previewViewportMobile: string;
    previewViewportTablet: string;
    pageInfoDescription: string;
    pageInfoTitle: string;
    editThemeJson: string;
    hideThemeJson: string;
    sourceDescription: string;
    sourceJsonHint: string;
    sourceJsonLabel: string;
    sourceTitle: string;
    themeDescription: string;
    themeJsonHint: string;
    themeJsonLabel: string;
    themeTitle: string;
  };
  preview: {
    closeLabel: string;
    drawerDescription: string;
    drawerTitle: string;
    liveBadge: string;
    liveDescription: string;
    liveTitle: string;
    liveUnavailableDescription: string;
    liveUnavailableTitle: string;
  };
  catalog: {
    add: string;
    categories: Record<ComponentCategory, string>;
    entries: Record<string, { description: string; label: string }>;
  };
  block: {
    doneEditing: string;
    doneEditingAriaLabel: (label: string) => string;
    edit: string;
    editAriaLabel: (label: string) => string;
    hidden: string;
    indexLabel: (index: number) => string;
    jsonHint: string;
    jsonLabel: (label: string) => string;
    moveDown: (label: string) => string;
    moveUp: (label: string) => string;
    remove: string;
    visible: string;
  };
  structured: {
    addImage: string;
    imageUploadFailed: string;
    imageUploading: string;
    addSocialLink: string;
    advancedJson: string;
    align: string;
    artist: string;
    day: string;
    backgroundOverlay: string;
    backgroundType: string;
    backgroundValue: string;
    bio: string;
    bioMaxLines: string;
    bold: string;
    bulletList: string;
    caption: string;
    columns: string;
    content: string;
    embedValue: string;
    events: string;
    customHeight: string;
    customWidth: string;
    displayMode: string;
    displayName: string;
    fullWidth: string;
    gap: string;
    hideAdvancedJson: string;
    height: string;
    imageAlt: string;
    imageUrl: string;
    isLive: string;
    italic: string;
    label: string;
    layout: string;
    layoutMode: string;
    link: string;
    heightPreset: string;
    platform: string;
    spotify: string;
    nameFontSize: string;
    numberedList: string;
    originalType: string;
    platformCode: string;
    paddingPreset: string;
    paddingToken: string;
    radiusToken: string;
    streamUrl: string;
    time: string;
    title: string;
    uid: string;
    removeImage: (index: number) => string;
    removeSocialLink: (index: number) => string;
    videoUrl: string;
    viewers: string;
    shape: string;
    showCaptions: string;
    showRecentCount: string;
    showSubmitButton: string;
    style: string;
    widthPreset: string;
    gapToken: string;
    textAlign: string;
    unsupportedAdvancedOnly: string;
    unsupportedCategory: string;
    url: string;
    options: Record<string, string>;
  };
  dialogs: {
    leaveConfirm: string;
    leaveCancel: string;
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
      lowCodeSnapshotRestored: 'Low-code snapshot restored. Review the visual editor before saving.',
      saveError: 'Failed to save the homepage draft.',
      sourceDocumentRequired: 'Source must contain a content object with a components array and a theme object.',
      unsafeSource: 'Source cannot include scripts, event handlers, inline style attributes, unsafe URLs, or unrestricted HTML/CSS.',
      unavailableTitle: 'Homepage editor unavailable',
      visualLockedAfterEject: 'This draft has entered Advanced source mode. Restore the low-code snapshot to return to Visual editing.',
    },
    header: {
      description: 'Build and preview homepage drafts here, then publish them from homepage management when they are ready.',
      eyebrow: 'Talent business / Homepage',
      title: 'Homepage editor',
    },
    actions: {
      allChangesSaved: 'All changes saved',
      backToManagement: 'Back to homepage management',
      exitEditor: 'Exit editor',
      pageInfo: 'Page info',
      openLivePreview: 'Open live preview',
      previewDraft: 'Preview',
      restoreLowCodeSnapshot: 'Restore low-code snapshot',
      routingSettings: 'Public access settings',
      saveDraft: 'Save draft',
      savingDraft: 'Saving draft…',
      unsavedChanges: 'Unsaved changes',
    },
    modes: {
      dev: 'Dev Mode',
      devDescription: 'Inspect the current draft, layout tokens, and schema JSON without ejecting Visual ownership.',
      source: 'Advanced source',
      sourceDescription: 'Edit the safe homepage source document directly.',
      title: 'Authoring mode',
      visual: 'Visual',
      visualDescription: 'Assemble the homepage from structured low-code blocks.',
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
      addBlock: 'Add block',
      catalogDescription: 'Open the catalog only when you need to add a new block to the draft.',
      catalogTitle: 'Component catalog',
      hideCatalog: 'Hide catalog',
      draftBlocksDescription: 'Edit each block in order. The preview updates after the JSON becomes valid.',
      draftBlocksTitle: 'Draft blocks',
      emptyBlocksDescription: 'Click a block in the catalog to insert the first component and start composing this homepage.',
      emptyBlocksTitle: 'No homepage blocks yet',
      devModeLayoutTitle: 'Layout tokens',
      devModeSchemaTitle: 'Schema JSON',
      devModeSelectedBlockTitle: 'Selected block',
      devModeThemeTitle: 'Theme tokens',
      devModeWarningsTitle: 'Validation warnings',
      previewDescription: 'Review the current draft as visitors would see it after publication.',
      previewTitle: 'Draft preview',
      previewViewportDesktop: 'Desktop',
      previewViewportHint: 'Resize the preview frame without changing the saved draft or public renderer.',
      previewViewportLabel: 'Preview viewport',
      previewViewportMobile: 'Mobile',
      previewViewportTablet: 'Tablet',
      pageInfoDescription: 'Review tenant, source, homepage URL, and block count without taking space from the editor.',
      pageInfoTitle: 'Page info',
      editThemeJson: 'Edit theme JSON',
      hideThemeJson: 'Hide theme JSON',
      sourceDescription: 'Edit the full draft source document. The preview updates after the document parses and matches the safe content/theme contract.',
      sourceJsonHint: 'This source edits the saved homepage content and theme. Scripts, event handlers, and unsafe links are still removed by the public renderer sanitizer.',
      sourceJsonLabel: 'Homepage source',
      sourceTitle: 'Advanced source',
      themeDescription: 'Theme JSON is an advanced editor for visual tokens. Public access settings are managed separately.',
      themeJsonHint: 'Open the advanced editor only when you need to change theme JSON. The preview uses the most recent valid theme JSON.',
      themeJsonLabel: 'Theme JSON',
      themeTitle: 'Theme',
    },
    preview: {
      closeLabel: 'Close homepage preview',
      drawerDescription: 'Review the current draft without squeezing the editor and preview into the same work area.',
      drawerTitle: 'Homepage preview',
      liveBadge: 'Live preview',
      liveDescription: 'This page listens for draft source updates from the editor tab on the same browser.',
      liveTitle: 'Live homepage preview',
      liveUnavailableDescription: 'Open live preview from the Homepage editor again so this page can load the latest local preview source.',
      liveUnavailableTitle: 'Live preview unavailable',
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
      doneEditing: 'Done editing',
      doneEditingAriaLabel: (label) => `Close ${label} block editor`,
      edit: 'Edit block',
      editAriaLabel: (label) => `Edit ${label} block`,
      hidden: 'Hidden',
      indexLabel: (index) => `Block #${index}`,
      jsonHint: 'Preview updates after this JSON parses as a valid object.',
      jsonLabel: (label) => `${label} JSON`,
      moveDown: (label) => `Move ${label} down`,
      moveUp: (label) => `Move ${label} up`,
      remove: 'Remove',
      visible: 'Visible',
    },
    structured: {
      addImage: 'Add image',
      imageUploadFailed: 'Image upload failed.',
      imageUploading: 'Uploading…',
      addSocialLink: 'Add social link',
      advancedJson: 'Advanced JSON',
      align: 'Alignment',
      artist: 'Artist',
      day: 'Day',
      backgroundOverlay: 'Image overlay',
      backgroundType: 'Background type',
      backgroundValue: 'Background value',
      bio: 'Bio',
      bioMaxLines: 'Bio lines',
      bold: 'Bold',
      bulletList: 'Bullet list',
      caption: 'Caption',
      columns: 'Columns',
      content: 'Content',
      embedValue: 'Embed value',
      events: 'Events',
      customHeight: 'Custom height',
      customWidth: 'Custom width',
      displayMode: 'Display mode',
      displayName: 'Display name',
      fullWidth: 'Full width',
      gap: 'Gap',
      gapToken: 'Gap token',
      hideAdvancedJson: 'Hide Advanced JSON',
      height: 'Height',
      imageAlt: 'Image alt text',
      imageUrl: 'Image URL',
      isLive: 'Live status',
      italic: 'Italic',
      label: 'Label',
      layout: 'Layout',
      layoutMode: 'Layout mode',
      link: 'Link',
      heightPreset: 'Height preset',
      nameFontSize: 'Name size',
      numberedList: 'Numbered list',
      originalType: 'Original type',
      platformCode: 'Platform code',
      platform: 'Platform',
      spotify: 'Spotify',
      paddingPreset: 'Padding preset',
      paddingToken: 'Padding token',
      radiusToken: 'Radius token',
      streamUrl: 'Stream URL',
      removeImage: (index) => `Remove image ${index}`,
      removeSocialLink: (index) => `Remove social link ${index}`,
      time: 'Time',
      title: 'Title',
      uid: 'UID',
      videoUrl: 'Video URL',
      viewers: 'Viewers',
      shape: 'Shape',
      showCaptions: 'Show captions',
      showRecentCount: 'Recent count',
      showSubmitButton: 'Show submit button',
      style: 'Style',
      widthPreset: 'Width preset',
      textAlign: 'Text align',
      unsupportedAdvancedOnly: 'This block type stays in Advanced JSON for now.',
      unsupportedCategory: 'Unsupported',
      url: 'URL',
      options: {
        auto: 'Auto',
        content: 'Content',
        custom: 'Custom',
        default: 'Default',
        button: 'Button',
        gradient: 'Gradient',
        carousel: 'Carousel',
        center: 'Center',
        circle: 'Circle',
        compact: 'Compact',
        full: 'Full',
        ghost: 'Ghost',
        grid: 'Grid',
        horizontal: 'Horizontal',
        icon: 'Icon',
        image: 'Image',
        large: 'Large',
        live: 'Live',
        dashed: 'Dashed',
        dotted: 'Dotted',
        left: 'Left',
        lg: 'Large',
        masonry: 'Masonry',
        medium: 'Medium',
        md: 'Medium',
        narrow: 'Narrow',
        outline: 'Outline',
        offline: 'Offline',
        none: 'None',
        pill: 'Pill',
        primary: 'Primary',
        right: 'Right',
        rounded: 'Rounded',
        row: 'Row',
        sm: 'Small',
        secondary: 'Secondary',
        small: 'Small',
        solid: 'Solid',
        square: 'Square',
        stack: 'Stack',
        xlarge: 'Extra large',
        vertical: 'Vertical',
        wide: 'Wide',
        xs: 'Extra small',
      },
    },
    dialogs: {
      leaveConfirm: 'Leave editor',
      leaveCancel: 'Cancel',
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
      lowCodeSnapshotRestored: '已恢复低代码快照。请在可视化编辑器中检查后再保存。',
      saveError: '保存主页草稿失败。',
      sourceDocumentRequired: '源码必须包含 content 对象、components 数组和 theme 对象。',
      unsafeSource: '源码不能包含脚本、事件处理器、内联 style 属性、不安全 URL 或未受限制的 HTML/CSS。',
      unavailableTitle: '主页编辑器不可用',
      visualLockedAfterEject: '该草稿已进入进阶源码模式。需要恢复低代码快照后才能回到可视化编辑。',
    },
    header: {
      description: '在这里编辑并预览主页草稿，确认无误后再回到主页管理页发布。',
      eyebrow: '艺人业务 / 主页',
      title: '主页编辑器',
    },
    actions: {
      allChangesSaved: '已全部保存',
      backToManagement: '返回主页管理',
      exitEditor: '退出编辑器',
      pageInfo: '页面信息',
      openLivePreview: '打开实时预览',
      previewDraft: '预览',
      restoreLowCodeSnapshot: '恢复低代码快照',
      routingSettings: '公开访问设置',
      saveDraft: '保存草稿',
      savingDraft: '保存中…',
      unsavedChanges: '有未保存更改',
    },
    modes: {
      dev: '开发模式',
      devDescription: '在不退出可视化所有权的情况下检查当前草稿、布局 token 和 schema JSON。',
      source: '进阶源码',
      sourceDescription: '直接编辑安全的主页源码文档。',
      title: '编辑模式',
      visual: '可视化',
      visualDescription: '用结构化低代码区块搭建主页。',
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
      addBlock: '添加区块',
      catalogDescription: '仅在需要新增区块时打开组件目录。',
      catalogTitle: '组件目录',
      hideCatalog: '收起目录',
      draftBlocksDescription: '按顺序编辑各区块。只有 JSON 合法时，预览才会更新。',
      draftBlocksTitle: '草稿区块',
      emptyBlocksDescription: '点击组件目录中的区块，先插入第一个组件，再开始编辑主页内容。',
      emptyBlocksTitle: '还没有主页区块',
      devModeLayoutTitle: '布局 token',
      devModeSchemaTitle: 'Schema JSON',
      devModeSelectedBlockTitle: '当前区块',
      devModeThemeTitle: '主题 token',
      devModeWarningsTitle: '校验提示',
      previewDescription: '按发布后用户看到的方式预览当前草稿。',
      previewTitle: '草稿预览',
      previewViewportDesktop: '桌面',
      previewViewportHint: '只调整预览框宽度，不改变已保存草稿或公开渲染器。',
      previewViewportLabel: '预览视口',
      previewViewportMobile: '移动端',
      previewViewportTablet: '平板',
      pageInfoDescription: '在不占用编辑器空间的情况下查看租户、编辑来源、主页链接和区块数。',
      pageInfoTitle: '页面信息',
      editThemeJson: '编辑主题 JSON',
      hideThemeJson: '收起主题 JSON',
      sourceDescription: '编辑完整草稿源码文档。文档解析成功并符合安全 content/theme 合同后，预览会同步更新。',
      sourceJsonHint: '这里会修改已保存的主页内容与主题。脚本、事件处理器和不安全链接仍会被公开渲染器清理。',
      sourceJsonLabel: '主页源码',
      sourceTitle: '进阶源码',
      themeDescription: '主题 JSON 是视觉 token 的高级编辑入口。公开访问设置会在单独页面管理。',
      themeJsonHint: '仅在需要修改主题 JSON 时打开高级编辑器。预览会使用最近一次解析成功的主题 JSON。',
      themeJsonLabel: '主题 JSON',
      themeTitle: '主题',
    },
    preview: {
      closeLabel: '关闭主页预览',
      drawerDescription: '在弹出的预览区检查当前草稿，不再把编辑区和预览区挤在同一个工作栏里。',
      drawerTitle: '主页预览',
      liveBadge: '实时预览',
      liveDescription: '该页面会监听同一浏览器中编辑页写入的草稿源码更新。',
      liveTitle: '实时主页预览',
      liveUnavailableDescription: '请从主页编辑器重新打开实时预览，以加载最新本地预览源码。',
      liveUnavailableTitle: '实时预览不可用',
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
      doneEditing: '完成编辑',
      doneEditingAriaLabel: (label) => `关闭${label}区块编辑器`,
      edit: '编辑区块',
      editAriaLabel: (label) => `编辑${label}区块`,
      hidden: '已隐藏',
      indexLabel: (index) => `区块 #${index}`,
      jsonHint: '当这里的 JSON 解析为合法对象后，预览会同步更新。',
      jsonLabel: (label) => `${label} JSON`,
      moveDown: (label) => `下移 ${label}`,
      moveUp: (label) => `上移 ${label}`,
      remove: '移除',
      visible: '可见',
    },
    structured: {
      addImage: '添加图片',
      imageUploadFailed: '图片上传失败。',
      imageUploading: '上传中…',
      addSocialLink: '添加社交链接',
      advancedJson: '高级 JSON',
      align: '对齐',
      artist: '艺人',
      day: '日期',
      backgroundOverlay: '图片叠加层',
      backgroundType: '背景类型',
      backgroundValue: '背景值',
      bio: '简介',
      bioMaxLines: '简介行数',
      bold: '加粗',
      bulletList: '项目列表',
      caption: '说明',
      columns: '列数',
      content: '内容',
      embedValue: '嵌入值',
      events: '活动',
      customHeight: '自定义高度',
      customWidth: '自定义宽度',
      displayMode: '展示模式',
      displayName: '显示名称',
      fullWidth: '占满宽度',
      gap: '间距',
      gapToken: '间距 token',
      hideAdvancedJson: '收起高级 JSON',
      height: '高度',
      imageAlt: '图片替代文本',
      imageUrl: '图片 URL',
      isLive: '直播状态',
      italic: '斜体',
      label: '标签',
      layout: '排列方式',
      layoutMode: '布局模式',
      link: '链接',
      heightPreset: '高度预设',
      nameFontSize: '名称字号',
      numberedList: '编号列表',
      originalType: '原始类型',
      platformCode: '平台代码',
      platform: '平台',
      spotify: 'Spotify',
      paddingPreset: '内边距预设',
      paddingToken: '内边距 token',
      radiusToken: '圆角 token',
      streamUrl: '直播链接',
      removeImage: (index) => `移除图片 ${index}`,
      removeSocialLink: (index) => `移除社交链接 ${index}`,
      time: '时间',
      title: '标题',
      uid: 'UID',
      videoUrl: '视频 URL',
      viewers: '观看人数',
      shape: '形状',
      showCaptions: '显示说明',
      showRecentCount: '近期数量',
      showSubmitButton: '显示提交按钮',
      style: '样式',
      widthPreset: '宽度预设',
      textAlign: '对齐',
      unsupportedAdvancedOnly: '该区块类型暂时保留在高级 JSON 中编辑。',
      unsupportedCategory: '暂不支持',
      url: 'URL',
      options: {
        auto: '自动',
        content: '内容',
        custom: '自定义',
        default: '默认',
        button: '按钮',
        gradient: '渐变',
        carousel: '轮播',
        center: '居中',
        circle: '圆形',
        compact: '紧凑',
        full: '完整',
        ghost: '弱化',
        grid: '网格',
        horizontal: '横向',
        icon: '图标',
        image: '图片',
        large: '大',
        live: '直播中',
        dashed: '虚线',
        dotted: '点线',
        left: '左对齐',
        lg: '大',
        masonry: '瀑布流',
        medium: '中',
        md: '中',
        narrow: '窄',
        outline: '描边',
        offline: '离线',
        none: '无',
        pill: '胶囊',
        primary: '主要',
        right: '右对齐',
        rounded: '圆角',
        row: '横向',
        sm: '小',
        secondary: '次要',
        small: '小',
        solid: '纯色',
        square: '方形',
        stack: '纵向',
        xlarge: '超大',
        vertical: '纵向',
        wide: '宽',
        xs: '超小',
      },
    },
    dialogs: {
      leaveConfirm: '离开编辑器',
      leaveCancel: '取消',
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
      lowCodeSnapshotRestored: 'ローコードスナップショットを復元しました。保存前にビジュアルエディタで確認してください。',
      saveError: 'ホームページ下書きの保存に失敗しました。',
      sourceDocumentRequired: 'ソースには content オブジェクト、components 配列、theme オブジェクトが必要です。',
      unsafeSource: 'ソースにはスクリプト、イベントハンドラ、インライン style 属性、安全でない URL、制限のない HTML/CSS を含められません。',
      unavailableTitle: 'ホームページ編集画面を開けません',
      visualLockedAfterEject: 'この下書きは高度なソースモードに移行済みです。ビジュアル編集へ戻るにはローコードスナップショットを復元してください。',
    },
    header: {
      description: 'ここでホームページの下書きを編集して確認し、準備ができたらホームページ管理から公開します。',
      eyebrow: 'タレント業務 / ホームページ',
      title: 'ホームページエディタ',
    },
    actions: {
      allChangesSaved: 'すべて保存済み',
      backToManagement: 'ホームページ管理へ戻る',
      exitEditor: 'エディタを閉じる',
      pageInfo: 'ページ情報',
      openLivePreview: 'ライブプレビューを開く',
      previewDraft: 'プレビュー',
      restoreLowCodeSnapshot: 'ローコードスナップショットを復元',
      routingSettings: '公開アクセス設定',
      saveDraft: '下書きを保存',
      savingDraft: '保存中…',
      unsavedChanges: '未保存の変更あり',
    },
    modes: {
      dev: 'Dev Mode',
      devDescription: 'Visual の所有権を維持したまま、現在の下書き、レイアウトトークン、schema JSON を確認します。',
      source: '高度なソース',
      sourceDescription: '安全なホームページソース文書を直接編集します。',
      title: '編集モード',
      visual: 'ビジュアル',
      visualDescription: '構造化されたローコードブロックでホームページを組み立てます。',
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
      addBlock: 'ブロックを追加',
      catalogDescription: '新しいブロックを追加するときだけコンポーネント一覧を開きます。',
      catalogTitle: 'コンポーネント一覧',
      hideCatalog: '一覧を閉じる',
      draftBlocksDescription: 'ブロックを順番に編集します。JSON が有効になるとプレビューが更新されます。',
      draftBlocksTitle: '下書きブロック',
      emptyBlocksDescription: 'コンポーネント一覧のブロックをクリックして最初のコンポーネントを挿入し、ホームページ編集を始めてください。',
      emptyBlocksTitle: 'ホームページブロックはまだありません',
      devModeLayoutTitle: 'レイアウトトークン',
      devModeSchemaTitle: 'Schema JSON',
      devModeSelectedBlockTitle: '選択中のブロック',
      devModeThemeTitle: 'テーマトークン',
      devModeWarningsTitle: '検証メモ',
      previewDescription: '公開後に訪問者が見る形で現在の下書きを確認します。',
      previewTitle: '下書きプレビュー',
      previewViewportDesktop: 'デスクトップ',
      previewViewportHint: '保存済み下書きや公開レンダラーを変更せず、プレビュー枠の幅だけを切り替えます。',
      previewViewportLabel: 'プレビュービューポート',
      previewViewportMobile: 'モバイル',
      previewViewportTablet: 'タブレット',
      pageInfoDescription: 'エディタの作業領域を圧迫せず、テナント、編集元、ホームページ URL、ブロック数を確認します。',
      pageInfoTitle: 'ページ情報',
      editThemeJson: 'テーマ JSON を編集',
      hideThemeJson: 'テーマ JSON を閉じる',
      sourceDescription: '下書き全体のソース文書を編集します。文書が解析でき、安全な content/theme 契約に一致するとプレビューへ反映されます。',
      sourceJsonHint: 'このソースは保存されるホームページ内容とテーマを編集します。スクリプト、イベントハンドラ、安全でないリンクは公開レンダラーで引き続き除去されます。',
      sourceJsonLabel: 'ホームページソース',
      sourceTitle: '高度なソース',
      themeDescription: 'テーマ JSON はビジュアル token 用の高度な編集入口です。公開アクセス設定は別画面で管理します。',
      themeJsonHint: 'テーマ JSON を変更する必要がある場合だけ高度な編集欄を開きます。プレビューには最後に有効だったテーマ JSON が使われます。',
      themeJsonLabel: 'テーマ JSON',
      themeTitle: 'テーマ',
    },
    preview: {
      closeLabel: 'ホームページプレビューを閉じる',
      drawerDescription: 'エディタとプレビューを同じ作業領域に詰め込まず、現在の下書きを確認します。',
      drawerTitle: 'ホームページプレビュー',
      liveBadge: 'ライブプレビュー',
      liveDescription: 'このページは同じブラウザのエディタタブから送られる下書きソース更新を監視します。',
      liveTitle: 'ライブホームページプレビュー',
      liveUnavailableDescription: '最新のローカルプレビューソースを読み込むため、ホームページエディタからライブプレビューをもう一度開いてください。',
      liveUnavailableTitle: 'ライブプレビューを利用できません',
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
      doneEditing: '編集を完了',
      doneEditingAriaLabel: (label) => `${label} ブロック編集を閉じる`,
      edit: 'ブロックを編集',
      editAriaLabel: (label) => `${label} ブロックを編集`,
      hidden: '非表示',
      indexLabel: (index) => `ブロック #${index}`,
      jsonHint: 'ここが有効な JSON オブジェクトとして解釈されると、プレビューが更新されます。',
      jsonLabel: (label) => `${label} JSON`,
      moveDown: (label) => `${label} を下へ移動`,
      moveUp: (label) => `${label} を上へ移動`,
      remove: '削除',
      visible: '表示中',
    },
    structured: {
      addImage: '画像を追加',
      imageUploadFailed: '画像のアップロードに失敗しました。',
      imageUploading: 'アップロード中…',
      addSocialLink: 'SNS リンクを追加',
      advancedJson: '高度な JSON',
      align: '配置',
      artist: 'アーティスト',
      day: '日付',
      backgroundOverlay: '画像オーバーレイ',
      backgroundType: '背景タイプ',
      backgroundValue: '背景値',
      bio: '紹介文',
      bioMaxLines: '紹介文の行数',
      bold: '太字',
      bulletList: '箇条書き',
      caption: 'キャプション',
      columns: '列数',
      content: '本文',
      embedValue: '埋め込み値',
      events: '予定',
      customHeight: 'カスタム高さ',
      customWidth: 'カスタム幅',
      displayMode: '表示モード',
      displayName: '表示名',
      fullWidth: '全幅',
      gap: '間隔',
      gapToken: '間隔トークン',
      hideAdvancedJson: '高度な JSON を閉じる',
      height: '高さ',
      imageAlt: '画像の代替テキスト',
      imageUrl: '画像 URL',
      isLive: '配信状態',
      italic: '斜体',
      label: 'ラベル',
      layout: '配置',
      layoutMode: 'レイアウト',
      link: 'リンク',
      heightPreset: '高さプリセット',
      nameFontSize: '名前サイズ',
      numberedList: '番号付きリスト',
      originalType: '元のタイプ',
      platformCode: 'プラットフォームコード',
      platform: 'プラットフォーム',
      spotify: 'Spotify',
      paddingPreset: '余白プリセット',
      paddingToken: '余白トークン',
      radiusToken: '角丸トークン',
      streamUrl: '配信 URL',
      removeImage: (index) => `画像 ${index} を削除`,
      removeSocialLink: (index) => `SNS リンク ${index} を削除`,
      time: '時間',
      title: 'タイトル',
      uid: 'UID',
      videoUrl: '動画 URL',
      viewers: '視聴者数',
      shape: '形状',
      showCaptions: 'キャプションを表示',
      showRecentCount: '最近の件数',
      showSubmitButton: '送信ボタンを表示',
      style: 'スタイル',
      widthPreset: '幅プリセット',
      textAlign: 'テキスト揃え',
      unsupportedAdvancedOnly: 'このブロックタイプは現時点では高度な JSON で編集します。',
      unsupportedCategory: '未対応',
      url: 'URL',
      options: {
        auto: '自動',
        content: 'コンテンツ',
        custom: 'カスタム',
        default: 'デフォルト',
        button: 'ボタン',
        gradient: 'グラデーション',
        carousel: 'カルーセル',
        center: '中央',
        circle: '円形',
        compact: 'コンパクト',
        full: 'フル',
        ghost: 'ゴースト',
        grid: 'グリッド',
        horizontal: '横並び',
        icon: 'アイコン',
        image: '画像',
        large: '大',
        live: '配信中',
        dashed: '破線',
        dotted: '点線',
        left: '左',
        lg: '大',
        masonry: 'メイソンリー',
        medium: '中',
        md: '中',
        narrow: '狭め',
        outline: 'アウトライン',
        offline: 'オフライン',
        none: 'なし',
        pill: 'ピル',
        primary: 'プライマリ',
        right: '右',
        rounded: '角丸',
        row: '横方向',
        sm: '小',
        secondary: 'セカンダリ',
        small: '小',
        solid: '単色',
        square: '四角',
        stack: '縦方向',
        xlarge: '特大',
        vertical: '縦並び',
        wide: '広め',
        xs: '極小',
      },
    },
    dialogs: {
      leaveConfirm: 'エディタを離れる',
      leaveCancel: 'キャンセル',
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
