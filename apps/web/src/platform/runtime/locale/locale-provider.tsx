'use client';

import {
  normalizeSupportedUiLocale,
  resolveTrilingualLocaleFamily,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from 'react';

import { useSession } from '@/platform/runtime/session/session-provider';

export type RuntimeLocale = 'en' | 'zh' | 'ja';

export interface RuntimeLocaleCopy {
  common: {
    accountMenuLabel: string;
    authenticatedUser: string;
    currentTenant: string;
    languageSwitcherLabel: string;
    mainNavigationLabel: string;
    myProfile: string;
    securitySessions: string;
    signOut: string;
    signingOut: string;
    talentScope: string;
    workspaceSettings: string;
  };
  auth: {
    login: {
      appName: string;
      boundaryNote: string;
      brandEyebrow: string;
      confirmNewPasswordLabel: string;
      confirmNewPasswordPlaceholder: string;
      credentialsDescription: string;
      credentialsTitle: string;
      errorFallback: string;
      heroDescription: string;
      heroTitle: string;
      newPasswordLabel: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      passwordResetDescription: string;
      passwordResetTitle: string;
      rememberMe: string;
      setNewPassword: string;
      signIn: string;
      submitPending: string;
      surfaceNote: string;
      tenantCodeLabel: string;
      totpDescription: string;
      totpLabel: string;
      totpPlaceholder: string;
      totpTitle: string;
      usernameLabel: string;
      usernamePlaceholder: string;
      verifyTotp: string;
    };
  };
  ac: {
    banner: string;
    nav: {
      integrationManagement: string;
      observability: string;
      profile: string;
      systemDictionary: string;
      tenantManagement: string;
      userManagement: string;
    };
    shellLabel: string;
    shellSubtitle: string;
    titles: {
      integrationManagement: string;
      observability: string;
      profile: string;
      systemDictionary: string;
      tenantManagement: string;
      userManagement: string;
    };
  };
  talentBusiness: {
    banner: string;
    nav: {
      customers: string;
      homepage: string;
      marshmallow: string;
      overview: string;
      reports: string;
    };
    shellLabel: string;
    shellSubtitle: string;
    titles: {
      customers: string;
      homepage: string;
      marshmallow: string;
      overview: string;
      reports: string;
      settings: string;
    };
  };
  tenantGovernance: {
    banner: string;
    nav: {
      integrationManagement: string;
      observability: string;
      organizationStructure: string;
      profile: string;
      security: string;
      tenantSettings: string;
      userManagement: string;
    };
    shellLabel: string;
    shellSubtitle: string;
    titles: {
      integrationManagement: string;
      observability: string;
      organizationStructure: string;
      profile: string;
      security: string;
      subsidiarySettings: string;
      tenantSettings: string;
      userManagement: string;
      workspaceLanding: string;
    };
  };
  publicHomepage: {
    avatarSuffix: string;
    badge: string;
    bilibiliDescription: string;
    bilibiliDynamic: string;
    currentlyOffline: string;
    dayLabel: string;
    embeddedVideo: string;
    failedDescription: string;
    failedTitle: string;
    gallery: string;
    galleryImageLabel: string;
    liveNow: string;
    liveStatus: string;
    loading: string;
    marshmallow: string;
    marshmallowDescription: string;
    music: string;
    noScheduleEntries: string;
    nowPlaying: string;
    openLink: string;
    openStream: string;
    openVideoInNewTab: string;
    profileAvatar: string;
    publishedBlocksLabel: string;
    schedule: string;
    socialLinks: string;
    timezoneLabel: string;
    unavailableDescription: string;
    unavailableTitle: string;
    unsupportedDescription: string;
    untitledEvent: string;
    untitledProfile: string;
    updatedLabel: string;
    video: string;
    viewBilibiliDynamics: string;
    watchingSuffix: string;
  };
  publicMarshmallow: {
    anonymousBadgeAllowed: string;
    anonymousSender: string;
    avatarSuffix: string;
    badge: string;
    captchaModeAuto: string;
    captchaModeAlways: string;
    captchaModeLabel: string;
    captchaModeNever: string;
    completeCaptchaError: string;
    displayNameLabel: string;
    emptyDescription: string;
    emptyTitle: string;
    failedDescription: string;
    failedTitle: string;
    feedEyebrow: string;
    feedTitle: string;
    loadMore: string;
    loadMorePending: string;
    loadOlderFailed: string;
    loadedCountLabel: string;
    loading: string;
    messageFeedFailed: string;
    messageLabel: string;
    messagePlaceholder: string;
    missingCaptchaDisabledNotice: string;
    missingCaptchaError: string;
    namedFanFallback: string;
    namedOnlyBadge: string;
    privacyLabel: string;
    reactionUpdateFailed: string;
    replyLabel: string;
    sendButton: string;
    sendButtonPending: string;
    sendSectionEyebrow: string;
    sendSectionTitle: string;
    submitAnonymously: string;
    submitFailed: string;
    termsLabel: string;
    titleSuffix: string;
    turnstileLabel: string;
    unavailableDescription: string;
    unavailableTitle: string;
  };
  customerManagement: {
    actionsColumn: string;
    activeProfilesHint: string;
    activeProfilesLabel: string;
    activityAll: string;
    activityActive: string;
    activityInactive: string;
    badge: string;
    customerColumn: string;
    customerLedgerUnavailableTitle: string;
    currentTenantFallback: string;
    deactivateConfirm: string;
    deactivateDescription: string;
    deactivateLabel: string;
    deactivateLoadFallback: string;
    deactivatePending: string;
    deactivateRequestFallback: string;
    description: string;
    directCustomerRecord: string;
    emptyDescription: string;
    emptyTitle: string;
    languageUnset: string;
    loadLedgerFallback: string;
    loading: string;
    membershipAll: string;
    membershipColumn: string;
    membershipNone: string;
    membershipOnlyMembers: string;
    membershipOnlyNonMembers: string;
    membershipRecordsLabel: string;
    membershipVisibleHint: string;
    profileTypeColumn: string;
    profileTypeCompany: string;
    profileTypeIndividual: string;
    reactivateConfirm: string;
    reactivateDescription: string;
    reactivateLabel: string;
    reactivatePending: string;
    reactivateRequestFallback: string;
    searchPlaceholder: string;
    statusActive: string;
    statusColumn: string;
    statusInactive: string;
    tenantHint: string;
    tenantLabel: string;
    title: string;
    updatedColumn: string;
    visibleCustomersHint: string;
    visibleCustomersLabel: string;
    workspaceSettingsLink: string;
  };
}

interface RuntimeLocaleContextValue {
  copy: RuntimeLocaleCopy;
  currentLocale: RuntimeLocale;
  selectedLocale: SupportedUiLocale;
  localeOptions: Array<{ code: SupportedUiLocale; label: string }>;
  setLocale: (localeCode: string) => void;
}

const LOCALE_OPTIONS: Array<{ code: SupportedUiLocale; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'zh_HANS', label: '简体中文' },
  { code: 'zh_HANT', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
];

const LOCALE_OVERRIDE_STORAGE_KEY = 'tcrn.web.locale.override';

const FAMILY_LOCALE_COPY: Record<RuntimeLocale, RuntimeLocaleCopy> = {
  en: {
    common: {
      accountMenuLabel: 'Account menu',
      authenticatedUser: 'Authenticated user',
      currentTenant: 'Tenant',
      languageSwitcherLabel: 'Change language',
      mainNavigationLabel: 'Main navigation',
      myProfile: 'My Profile',
      securitySessions: 'Password & Security',
      signOut: 'Sign Out',
      signingOut: 'Signing out...',
      talentScope: 'Talent Scope',
      workspaceSettings: 'Settings',
    },
    auth: {
      login: {
        appName: 'TCRN TMS',
        boundaryNote: '',
        brandEyebrow: '',
        confirmNewPasswordLabel: 'Confirm new password',
        confirmNewPasswordPlaceholder: 'Repeat the new password',
        credentialsDescription: 'Enter your credentials.',
        credentialsTitle: 'Sign in',
        errorFallback: 'Authentication failed.',
        heroDescription: 'Record every drop of sweat behind the spotlight.',
        heroTitle: 'Welcome to TCRN TMS',
        newPasswordLabel: 'New password',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Minimum 12 characters',
        passwordResetDescription:
          'Your account requires a password change before you can continue.',
        passwordResetTitle: 'Set new password',
        rememberMe: 'Keep me signed in on this device',
        setNewPassword: 'Set new password',
        signIn: 'Sign in',
        submitPending: 'Working…',
        surfaceNote: '',
        tenantCodeLabel: 'Tenant code',
        totpDescription: 'Enter the six-digit code from your authenticator app to complete sign-in.',
        totpLabel: 'TOTP code',
        totpPlaceholder: '000000',
        totpTitle: 'Verify TOTP',
        usernameLabel: 'Username or email',
        usernamePlaceholder: 'admin@example.com',
        verifyTotp: 'Verify TOTP',
      },
    },
    ac: {
      banner: '',
      nav: {
        integrationManagement: 'Integration Management',
        observability: 'Observability',
        profile: 'Profile',
        systemDictionary: 'System Dictionary',
        tenantManagement: 'Tenant Management',
        userManagement: 'User Management',
      },
      shellLabel: 'Platform',
      shellSubtitle: 'Administration',
      titles: {
        integrationManagement: 'Integration Management',
        observability: 'Observability',
        profile: 'Profile',
        systemDictionary: 'System Dictionary',
        tenantManagement: 'Tenant Management',
        userManagement: 'User Management',
      },
    },
    talentBusiness: {
      banner: '',
      nav: {
        customers: 'Customers',
        homepage: 'Homepage',
        marshmallow: 'Marshmallow',
        overview: 'Overview',
        reports: 'Reports',
      },
      shellLabel: 'Talent',
      shellSubtitle: 'Talent operations',
      titles: {
        customers: 'Customer Management',
        homepage: 'Homepage Management',
        marshmallow: 'Marshmallow Management',
        overview: 'Overview',
        reports: 'Reports',
        settings: 'Settings',
      },
    },
    tenantGovernance: {
      banner: '',
      nav: {
        integrationManagement: 'Integration Management',
        observability: 'Observability',
        organizationStructure: 'Organization Structure',
        profile: 'Profile',
        security: 'Security',
        tenantSettings: 'Tenant Settings',
        userManagement: 'User Management',
      },
      shellLabel: 'Tenant',
      shellSubtitle: 'Management',
      titles: {
        integrationManagement: 'Integration Management',
        observability: 'Observability',
        organizationStructure: 'Organization Structure',
        profile: 'Profile',
        security: 'Security',
        subsidiarySettings: 'Subsidiary Settings',
        tenantSettings: 'Tenant Settings',
        userManagement: 'User Management',
        workspaceLanding: 'Choose Talent',
      },
    },
    publicHomepage: {
      avatarSuffix: 'avatar',
      badge: 'Public Homepage',
      bilibiliDescription:
        'This block links to the source Bilibili profile.',
      bilibiliDynamic: 'Bilibili Dynamic',
      currentlyOffline: 'Currently offline',
      dayLabel: 'Day',
      embeddedVideo: 'Embedded video',
      failedDescription: 'The homepage could not be loaded.',
      failedTitle: 'Homepage failed to load',
      gallery: 'Gallery',
      galleryImageLabel: 'Gallery image',
      liveNow: 'Live now',
      liveStatus: 'Live Status',
      loading: 'Loading public homepage',
      marshmallow: 'Marshmallow',
      marshmallowDescription:
        'This homepage includes a marshmallow block. Public messages remain available on the dedicated /m/<path> page.',
      music: 'Music',
      noScheduleEntries: 'No public schedule entries have been published yet.',
      nowPlaying: 'Now playing',
      openLink: 'Open link',
      openStream: 'Open stream',
      openVideoInNewTab: 'Open video in a new tab',
      profileAvatar: 'Profile avatar',
      publishedBlocksLabel: 'Published blocks',
      schedule: 'Schedule',
      socialLinks: 'Social Links',
      timezoneLabel: 'Timezone',
      unavailableDescription: 'The homepage is not published, not reachable, or has been disabled.',
      unavailableTitle: 'Homepage unavailable',
      unsupportedDescription: 'Some homepage content is shown here in a simplified view.',
      untitledEvent: 'Untitled event',
      untitledProfile: 'Untitled profile',
      updatedLabel: 'Updated',
      video: 'Video',
      viewBilibiliDynamics: 'View Bilibili dynamics',
      watchingSuffix: 'watching',
    },
    publicMarshmallow: {
      anonymousBadgeAllowed: 'Anonymous submissions allowed',
      anonymousSender: 'Anonymous',
      avatarSuffix: 'avatar',
      badge: 'Public Marshmallow',
      captchaModeAuto: 'Adaptive',
      captchaModeAlways: 'Always',
      captchaModeLabel: 'Captcha mode',
      captchaModeNever: 'Disabled',
      completeCaptchaError: 'Complete the Turnstile challenge before submitting your message.',
      displayNameLabel: 'Display name',
      emptyDescription: 'Approved public questions will appear here once the talent publishes them.',
      emptyTitle: 'No public messages yet',
      failedDescription: 'The public marshmallow page could not be loaded.',
      failedTitle: 'Public marshmallow failed to load',
      feedEyebrow: 'Public feed',
      feedTitle: 'Approved messages',
      loadMore: 'Load more',
      loadMorePending: 'Loading older messages…',
      loadOlderFailed: 'Failed to load older messages.',
      loadedCountLabel: 'loaded',
      loading: 'Loading public marshmallow',
      messageFeedFailed: 'The public message feed failed to load.',
      messageLabel: 'Message',
      messagePlaceholder: 'Write your message here',
      missingCaptchaDisabledNotice:
        'This page requires Turnstile, but captcha is not configured. Submission is unavailable.',
      missingCaptchaError:
        'This public page requires Turnstile, but captcha is not configured.',
      namedFanFallback: 'Named fan',
      namedOnlyBadge: 'Named submissions only',
      privacyLabel: 'Privacy',
      reactionUpdateFailed: 'Failed to update the reaction.',
      replyLabel: 'Reply',
      sendButton: 'Send message',
      sendButtonPending: 'Sending…',
      sendSectionEyebrow: 'Send a message',
      sendSectionTitle: 'Ask publicly, delivered privately',
      submitAnonymously: 'Submit anonymously',
      submitFailed: 'Failed to submit your message.',
      termsLabel: 'Terms',
      titleSuffix: 'Marshmallow',
      turnstileLabel: 'Turnstile verification',
      unavailableDescription: 'The public marshmallow page is not published, not enabled, or no longer reachable.',
      unavailableTitle: 'Public marshmallow unavailable',
    },
    customerManagement: {
      actionsColumn: 'Actions',
      activeProfilesHint: 'Lifecycle changes only affect active and inactive visibility.',
      activeProfilesLabel: 'Active Profiles',
      activityAll: 'all',
      activityActive: 'active',
      activityInactive: 'inactive',
      badge: 'Customers',
      customerColumn: 'Customer',
      customerLedgerUnavailableTitle: 'Customer records unavailable',
      currentTenantFallback: 'Tenant',
      deactivateConfirm: 'Deactivate customer',
      deactivateDescription:
        'This customer will be hidden from active customer lists until reactivated.',
      deactivateLabel: 'Deactivate',
      deactivateLoadFallback: 'Failed to load customer details for deactivation.',
      deactivatePending: 'Preparing…',
      deactivateRequestFallback: 'Failed to deactivate customer.',
      description:
        'Review customers, membership visibility, and lifecycle status for this talent.',
      directCustomerRecord: 'Direct customer record',
      emptyDescription: 'Change the current search or membership filters to widen the visible customer set.',
      emptyTitle: 'No customers match this filter',
      languageUnset: 'language unset',
      loadLedgerFallback: 'Failed to load customer records.',
      loading: 'Loading customer management…',
      membershipAll: 'all memberships',
      membershipColumn: 'Membership',
      membershipNone: 'No membership records',
      membershipOnlyMembers: 'members',
      membershipOnlyNonMembers: 'non-members',
      membershipRecordsLabel: 'Membership Records',
      membershipVisibleHint: 'visible profiles belong to company customers.',
      profileTypeColumn: 'Profile Type',
      profileTypeCompany: 'company',
      profileTypeIndividual: 'individual',
      reactivateConfirm: 'Reactivate customer',
      reactivateDescription:
        'Reactivating returns this customer to active customer lists and keeps membership history intact.',
      reactivateLabel: 'Reactivate',
      reactivatePending: 'Reactivating…',
      reactivateRequestFallback: 'Failed to reactivate customer.',
      searchPlaceholder: 'Search nickname or customer tags',
      statusActive: 'Active',
      statusColumn: 'Status',
      statusInactive: 'Inactive',
      tenantHint: 'Customer records are managed in this workspace.',
      tenantLabel: 'Tenant',
      title: 'Customer Management',
      updatedColumn: 'Updated',
      visibleCustomersHint: 'Count reflects the current page and filters.',
      visibleCustomersLabel: 'Visible Customers',
      workspaceSettingsLink: 'Settings',
    },
  },
  zh: {
    common: {
      accountMenuLabel: '账户菜单',
      authenticatedUser: '当前用户',
      currentTenant: '租户',
      languageSwitcherLabel: '切换语言',
      mainNavigationLabel: '主导航',
      myProfile: '我的资料',
      securitySessions: '密码与安全',
      signOut: '退出登录',
      signingOut: '正在退出…',
      talentScope: '艺人范围',
      workspaceSettings: '设置',
    },
    auth: {
      login: {
        appName: 'TCRN TMS',
        boundaryNote: '',
        brandEyebrow: '',
        confirmNewPasswordLabel: '确认新密码',
        confirmNewPasswordPlaceholder: '再次输入新密码',
        credentialsDescription: '输入登录信息。',
        credentialsTitle: '登录',
        errorFallback: '认证失败。',
        heroDescription: '记录闪耀背后的每一滴汗水',
        heroTitle: '欢迎登陆TCRN TMS',
        newPasswordLabel: '新密码',
        passwordLabel: '密码',
        passwordPlaceholder: '至少 12 个字符',
        passwordResetDescription: '当前账号需要先更新密码，之后才能继续。',
        passwordResetTitle: '设置新密码',
        rememberMe: '在此设备上保持登录状态',
        setNewPassword: '设置新密码',
        signIn: '登录',
        submitPending: '处理中…',
        surfaceNote: '',
        tenantCodeLabel: '租户代码',
        totpDescription: '请输入认证器应用中的六位验证码以完成登录。',
        totpLabel: 'TOTP 验证码',
        totpPlaceholder: '000000',
        totpTitle: '验证 TOTP',
        usernameLabel: '用户名或邮箱',
        usernamePlaceholder: 'admin@example.com',
        verifyTotp: '验证 TOTP',
      },
    },
    ac: {
      banner: '',
      nav: {
        integrationManagement: '集成管理',
        observability: '可观测性',
        profile: '个人资料',
        systemDictionary: '系统词典',
        tenantManagement: '租户管理',
        userManagement: '用户管理',
      },
      shellLabel: '平台',
      shellSubtitle: '平台管理',
      titles: {
        integrationManagement: '集成管理',
        observability: '可观测性',
        profile: '个人资料',
        systemDictionary: '系统词典',
        tenantManagement: '租户管理',
        userManagement: '用户管理',
      },
    },
    talentBusiness: {
      banner: '',
      nav: {
        customers: '客户',
        homepage: '主页',
        marshmallow: '棉花糖',
        overview: '概览',
        reports: '报表',
      },
      shellLabel: '艺人',
      shellSubtitle: '艺人业务',
      titles: {
        customers: '客户管理',
        homepage: '主页管理',
        marshmallow: '棉花糖管理',
        overview: '概览',
        reports: '报表',
        settings: '设置',
      },
    },
    tenantGovernance: {
      banner: '',
      nav: {
        integrationManagement: '集成管理',
        observability: '可观测性',
        organizationStructure: '组织架构',
        profile: '个人资料',
        security: '安全',
        tenantSettings: '租户设置',
        userManagement: '用户管理',
      },
      shellLabel: '租户',
      shellSubtitle: '租户管理',
      titles: {
        integrationManagement: '集成管理',
        observability: '可观测性',
        organizationStructure: '组织架构',
        profile: '个人资料',
        security: '安全',
        subsidiarySettings: '分目录设置',
        tenantSettings: '租户设置',
        userManagement: '用户管理',
        workspaceLanding: '选择艺人',
      },
    },
    publicHomepage: {
      avatarSuffix: '头像',
      badge: '公开主页',
      bilibiliDescription: '该区块会跳转到对应的 Bilibili 主页。',
      bilibiliDynamic: 'B站动态',
      currentlyOffline: '当前离线',
      dayLabel: '日期',
      embeddedVideo: '嵌入视频',
      failedDescription: '公开主页加载失败。',
      failedTitle: '主页加载失败',
      gallery: '图集',
      galleryImageLabel: '图集图片',
      liveNow: '直播中',
      liveStatus: '直播状态',
      loading: '正在加载公开主页',
      marshmallow: '棉花糖',
      marshmallowDescription:
        '当前主页包含一个棉花糖区块。公开消息可通过专用的 /m/<path> 页面访问。',
      music: '音乐',
      noScheduleEntries: '当前还没有已发布的公开日程。',
      nowPlaying: '当前播放',
      openLink: '打开链接',
      openStream: '打开直播',
      openVideoInNewTab: '在新标签页中打开视频',
      profileAvatar: '资料头像',
      publishedBlocksLabel: '已发布区块',
      schedule: '日程',
      socialLinks: '社交链接',
      timezoneLabel: '时区',
      unavailableDescription: '当前主页尚未发布、暂时不可达，或已被停用。',
      unavailableTitle: '主页不可用',
      unsupportedDescription: '部分主页内容会在这里以简化视图展示。',
      untitledEvent: '未命名事件',
      untitledProfile: '未命名资料',
      updatedLabel: '更新时间',
      video: '视频',
      viewBilibiliDynamics: '查看 B 站动态',
      watchingSuffix: '人正在观看',
    },
    publicMarshmallow: {
      anonymousBadgeAllowed: '允许匿名投稿',
      anonymousSender: '匿名',
      avatarSuffix: '头像',
      badge: '公开棉花糖',
      captchaModeAuto: '自适应',
      captchaModeAlways: '始终开启',
      captchaModeLabel: '验证码模式',
      captchaModeNever: '已关闭',
      completeCaptchaError: '请先完成 Turnstile 验证，再提交消息。',
      displayNameLabel: '显示名称',
      emptyDescription: '待艺人发布通过审核的公开提问后，这里会显示对应内容。',
      emptyTitle: '暂无公开消息',
      failedDescription: '运行时错误导致公开棉花糖页面无法加载。',
      failedTitle: '公开棉花糖加载失败',
      feedEyebrow: '公开消息流',
      feedTitle: '已公开消息',
      loadMore: '加载更多',
      loadMorePending: '正在加载更早的消息…',
      loadOlderFailed: '加载更早消息失败。',
      loadedCountLabel: '已加载',
      loading: '正在加载公开棉花糖',
      messageFeedFailed: '公开消息流加载失败。',
      messageLabel: '消息内容',
      messagePlaceholder: '在这里写下你的消息',
      missingCaptchaDisabledNotice:
        '当前页面要求启用 Turnstile，但验证码尚未配置，因此暂时无法提交。',
      missingCaptchaError: '当前公开页面要求启用 Turnstile，但验证码尚未配置。',
      namedFanFallback: '署名粉丝',
      namedOnlyBadge: '仅允许署名投稿',
      privacyLabel: '隐私说明',
      reactionUpdateFailed: '更新互动反应失败。',
      replyLabel: '回复',
      sendButton: '发送消息',
      sendButtonPending: '发送中…',
      sendSectionEyebrow: '发送一条消息',
      sendSectionTitle: '公开提问，私下送达',
      submitAnonymously: '匿名提交',
      submitFailed: '提交消息失败。',
      termsLabel: '使用条款',
      titleSuffix: '棉花糖',
      turnstileLabel: 'Turnstile 验证',
      unavailableDescription: '当前公开棉花糖页面尚未发布、未启用，或暂时不可达。',
      unavailableTitle: '公开棉花糖不可用',
    },
    customerManagement: {
      actionsColumn: '操作',
      activeProfilesHint: '生命周期操作只会切换活跃与停用可见性。',
      activeProfilesLabel: '活跃档案',
      activityAll: '全部',
      activityActive: '活跃',
      activityInactive: '停用',
      badge: '客户',
      customerColumn: '客户',
      customerLedgerUnavailableTitle: '客户记录不可用',
      currentTenantFallback: '当前租户',
      deactivateConfirm: '停用客户',
      deactivateDescription: '该客户会从当前活跃客户列表中隐藏，直到被重新激活。',
      deactivateLabel: '停用',
      deactivateLoadFallback: '加载待停用客户详情失败。',
      deactivatePending: '准备中…',
      deactivateRequestFallback: '停用客户失败。',
      description: '查看当前艺人下的客户、会员可见性与生命周期状态。',
      directCustomerRecord: '直接客户档案',
      emptyDescription: '请调整当前搜索词或会员筛选条件，以扩大可见客户集合。',
      emptyTitle: '没有匹配当前筛选条件的客户',
      languageUnset: '语言未设置',
      loadLedgerFallback: '加载客户记录失败。',
      loading: '正在加载客户管理…',
      membershipAll: '全部会员状态',
      membershipColumn: '会员',
      membershipNone: '暂无会员记录',
      membershipOnlyMembers: '仅会员',
      membershipOnlyNonMembers: '非会员',
      membershipRecordsLabel: '会员记录',
      membershipVisibleHint: '当前可见档案中属于公司客户。',
      profileTypeColumn: '档案类型',
      profileTypeCompany: '公司',
      profileTypeIndividual: '个人',
      reactivateConfirm: '重新激活客户',
      reactivateDescription: '重新激活后，该客户会重新出现在活跃客户列表中，并保留既有会员历史。',
      reactivateLabel: '重新激活',
      reactivatePending: '重新激活中…',
      reactivateRequestFallback: '重新激活客户失败。',
      searchPlaceholder: '搜索昵称或客户标签',
      statusActive: '活跃',
      statusColumn: '状态',
      statusInactive: '停用',
      tenantHint: '客户档案统一在这里管理。',
      tenantLabel: '租户',
      title: '客户管理',
      updatedColumn: '更新时间',
      visibleCustomersHint: '这里反映的是当前搜索与筛选条件下已加载的页面结果。',
      visibleCustomersLabel: '当前可见客户',
      workspaceSettingsLink: '设置',
    },
  },
  ja: {
    common: {
      accountMenuLabel: 'アカウントメニュー',
      authenticatedUser: '認証済みユーザー',
      currentTenant: 'テナント',
      languageSwitcherLabel: '言語を変更',
      mainNavigationLabel: 'メインナビゲーション',
      myProfile: 'マイプロフィール',
      securitySessions: 'パスワードとセキュリティ',
      signOut: 'サインアウト',
      signingOut: 'サインアウト中…',
      talentScope: 'タレントスコープ',
      workspaceSettings: '設定',
    },
    auth: {
      login: {
        appName: 'TCRN TMS',
        boundaryNote: '',
        brandEyebrow: '',
        confirmNewPasswordLabel: '新しいパスワードを確認',
        confirmNewPasswordPlaceholder: '新しいパスワードを再入力',
        credentialsDescription: '認証情報を入力してください。',
        credentialsTitle: 'サインイン',
        errorFallback: '認証に失敗しました。',
        heroDescription: '輝きの裏にある一滴の汗まで記録する',
        heroTitle: 'TCRN TMS へようこそ',
        newPasswordLabel: '新しいパスワード',
        passwordLabel: 'パスワード',
        passwordPlaceholder: '12 文字以上',
        passwordResetDescription:
          '続行する前に、このアカウントはパスワード変更を完了する必要があります。',
        passwordResetTitle: '新しいパスワードを設定',
        rememberMe: 'この端末でサインイン状態を保持する',
        setNewPassword: '新しいパスワードを設定',
        signIn: 'サインイン',
        submitPending: '処理中…',
        surfaceNote: '',
        tenantCodeLabel: 'テナントコード',
        totpDescription: 'サインインを完了するため、認証アプリの 6 桁コードを入力してください。',
        totpLabel: 'TOTP コード',
        totpPlaceholder: '000000',
        totpTitle: 'TOTP を検証',
        usernameLabel: 'ユーザー名またはメール',
        usernamePlaceholder: 'admin@example.com',
        verifyTotp: 'TOTP を検証',
      },
    },
    ac: {
      banner: '',
      nav: {
        integrationManagement: '連携管理',
        observability: 'オブザーバビリティ',
        profile: 'プロフィール',
        systemDictionary: 'システム辞書',
        tenantManagement: 'テナント管理',
        userManagement: 'ユーザー管理',
      },
      shellLabel: 'プラットフォーム',
      shellSubtitle: 'プラットフォーム管理',
      titles: {
        integrationManagement: '連携管理',
        observability: 'オブザーバビリティ',
        profile: 'プロフィール',
        systemDictionary: 'システム辞書',
        tenantManagement: 'テナント管理',
        userManagement: 'ユーザー管理',
      },
    },
    talentBusiness: {
      banner: '',
      nav: {
        customers: '顧客',
        homepage: 'ホームページ',
        marshmallow: 'マシュマロ',
        overview: '概要',
        reports: 'レポート',
      },
      shellLabel: 'タレント',
      shellSubtitle: 'タレント業務',
      titles: {
        customers: '顧客管理',
        homepage: 'ホームページ管理',
        marshmallow: 'マシュマロ管理',
        overview: '概要',
        reports: 'レポート',
        settings: '設定',
      },
    },
    tenantGovernance: {
      banner: '',
      nav: {
        integrationManagement: '連携管理',
        observability: 'オブザーバビリティ',
        organizationStructure: '組織構造',
        profile: 'プロフィール',
        security: 'セキュリティ',
        tenantSettings: 'テナント設定',
        userManagement: 'ユーザー管理',
      },
      shellLabel: 'テナント',
      shellSubtitle: 'テナント管理',
      titles: {
        integrationManagement: '連携管理',
        observability: 'オブザーバビリティ',
        organizationStructure: '組織構造',
        profile: 'プロフィール',
        security: 'セキュリティ',
        subsidiarySettings: '子会社設定',
        tenantSettings: 'テナント設定',
        userManagement: 'ユーザー管理',
        workspaceLanding: 'タレントを選択',
      },
    },
    publicHomepage: {
      avatarSuffix: 'アバター',
      badge: '公開ホームページ',
      bilibiliDescription:
        'このブロックから元の Bilibili プロフィールへ移動できます。',
      bilibiliDynamic: 'Bilibili 動態',
      currentlyOffline: '現在オフライン',
      dayLabel: '日付',
      embeddedVideo: '埋め込み動画',
      failedDescription: '公開ホームページを読み込めませんでした。',
      failedTitle: 'ホームページの読み込みに失敗しました',
      gallery: 'ギャラリー',
      galleryImageLabel: 'ギャラリー画像',
      liveNow: '配信中',
      liveStatus: '配信ステータス',
      loading: '公開ホームページを読み込み中',
      marshmallow: 'マシュマロ',
      marshmallowDescription:
        'このホームページにはマシュマロブロックが含まれています。公開メッセージは専用の /m/<path> ページから利用できます。',
      music: '音楽',
      noScheduleEntries: '公開済みのスケジュールはまだありません。',
      nowPlaying: '再生中',
      openLink: 'リンクを開く',
      openStream: '配信を開く',
      openVideoInNewTab: '新しいタブで動画を開く',
      profileAvatar: 'プロフィールアバター',
      publishedBlocksLabel: '公開中ブロック数',
      schedule: 'スケジュール',
      socialLinks: 'ソーシャルリンク',
      timezoneLabel: 'タイムゾーン',
      unavailableDescription: 'このホームページは未公開、到達不可、または無効化されています。',
      unavailableTitle: 'ホームページを利用できません',
      unsupportedDescription: '一部のホームページ内容はここで簡易表示されます。',
      untitledEvent: '無題のイベント',
      untitledProfile: '無題のプロフィール',
      updatedLabel: '更新日時',
      video: '動画',
      viewBilibiliDynamics: 'Bilibili 動態を見る',
      watchingSuffix: '人が視聴中',
    },
    publicMarshmallow: {
      anonymousBadgeAllowed: '匿名投稿を許可',
      anonymousSender: '匿名',
      avatarSuffix: 'アバター',
      badge: '公開マシュマロ',
      captchaModeAuto: '自動',
      captchaModeAlways: '常時有効',
      captchaModeLabel: 'CAPTCHA モード',
      captchaModeNever: '無効',
      completeCaptchaError: 'メッセージを送信する前に Turnstile 認証を完了してください。',
      displayNameLabel: '表示名',
      emptyDescription: 'タレントが公開を許可したメッセージはここに表示されます。',
      emptyTitle: '公開メッセージはまだありません',
      failedDescription: 'ランタイムエラーにより公開マシュマロページを読み込めませんでした。',
      failedTitle: '公開マシュマロの読み込みに失敗しました',
      feedEyebrow: '公開フィード',
      feedTitle: '公開済みメッセージ',
      loadMore: 'さらに読み込む',
      loadMorePending: '過去のメッセージを読み込み中…',
      loadOlderFailed: '過去のメッセージの読み込みに失敗しました。',
      loadedCountLabel: '読み込み済み',
      loading: '公開マシュマロを読み込み中',
      messageFeedFailed: '公開メッセージフィードの読み込みに失敗しました。',
      messageLabel: 'メッセージ',
      messagePlaceholder: 'ここにメッセージを入力してください',
      missingCaptchaDisabledNotice:
        'このページでは Turnstile が必須ですが、captcha が設定されていないため送信できません。',
      missingCaptchaError:
        'この公開ページでは Turnstile が必要ですが、captcha が設定されていません。',
      namedFanFallback: '署名付きファン',
      namedOnlyBadge: '記名投稿のみ',
      privacyLabel: 'プライバシー',
      reactionUpdateFailed: 'リアクションの更新に失敗しました。',
      replyLabel: '返信',
      sendButton: 'メッセージを送信',
      sendButtonPending: '送信中…',
      sendSectionEyebrow: 'メッセージを送る',
      sendSectionTitle: '公開で質問し、非公開で届ける',
      submitAnonymously: '匿名で送信',
      submitFailed: 'メッセージの送信に失敗しました。',
      termsLabel: '利用規約',
      titleSuffix: 'マシュマロ',
      turnstileLabel: 'Turnstile 認証',
      unavailableDescription: 'この公開マシュマロページは未公開、無効、または現在到達できません。',
      unavailableTitle: '公開マシュマロを利用できません',
    },
    customerManagement: {
      actionsColumn: '操作',
      activeProfilesHint: 'ライフサイクル操作では、アクティブ/非アクティブの表示を切り替えます。',
      activeProfilesLabel: 'アクティブプロフィール',
      activityAll: 'すべて',
      activityActive: '有効',
      activityInactive: '無効',
      badge: '顧客',
      customerColumn: '顧客',
      customerLedgerUnavailableTitle: '顧客記録を利用できません',
      currentTenantFallback: '現在のテナント',
      deactivateConfirm: '顧客を無効化',
      deactivateDescription:
        'この顧客は、再有効化されるまでアクティブな顧客一覧から非表示になります。',
      deactivateLabel: '無効化',
      deactivateLoadFallback: '無効化対象の顧客詳細を読み込めませんでした。',
      deactivatePending: '準備中…',
      deactivateRequestFallback: '顧客の無効化に失敗しました。',
      description:
        'このタレントに紐づく顧客、会員可視性、ライフサイクル状態を確認します。',
      directCustomerRecord: '直接顧客レコード',
      emptyDescription: '現在の検索語またはメンバーシップフィルターを変更して、表示対象の顧客集合を広げてください。',
      emptyTitle: 'この条件に一致する顧客はいません',
      languageUnset: '言語未設定',
      loadLedgerFallback: '顧客記録の読み込みに失敗しました。',
      loading: '顧客管理を読み込み中…',
      membershipAll: 'すべての会員状態',
      membershipColumn: '会員情報',
      membershipNone: '会員記録なし',
      membershipOnlyMembers: '会員のみ',
      membershipOnlyNonMembers: '非会員',
      membershipRecordsLabel: '会員記録',
      membershipVisibleHint: '件の表示中プロフィールが法人顧客です。',
      profileTypeColumn: 'プロフィール種別',
      profileTypeCompany: '法人',
      profileTypeIndividual: '個人',
      reactivateConfirm: '顧客を再有効化',
      reactivateDescription:
        '再有効化すると、この顧客はアクティブな顧客一覧へ戻り、既存の会員履歴は保持されます。',
      reactivateLabel: '再有効化',
      reactivatePending: '再有効化中…',
      reactivateRequestFallback: '顧客の再有効化に失敗しました。',
      searchPlaceholder: 'ニックネームまたは顧客タグで検索',
      statusActive: '有効',
      statusColumn: '状態',
      statusInactive: '無効',
      tenantHint: 'このワークスペースで顧客レコードを管理します。',
      tenantLabel: 'テナント',
      title: '顧客管理',
      updatedColumn: '更新日時',
      visibleCustomersHint: '現在の検索とフィルター条件で読み込まれたページ結果を反映します。',
      visibleCustomersLabel: '表示中の顧客',
      workspaceSettingsLink: '設定',
    },
  },
};

interface RuntimeLocaleCopyOverrides {
  common?: Partial<RuntimeLocaleCopy['common']>;
  auth?: {
    login?: Partial<RuntimeLocaleCopy['auth']['login']>;
  };
  ac?: Partial<Omit<RuntimeLocaleCopy['ac'], 'nav' | 'titles'>> & {
    nav?: Partial<RuntimeLocaleCopy['ac']['nav']>;
    titles?: Partial<RuntimeLocaleCopy['ac']['titles']>;
  };
  talentBusiness?: Partial<Omit<RuntimeLocaleCopy['talentBusiness'], 'nav' | 'titles'>> & {
    nav?: Partial<RuntimeLocaleCopy['talentBusiness']['nav']>;
    titles?: Partial<RuntimeLocaleCopy['talentBusiness']['titles']>;
  };
  tenantGovernance?: Partial<Omit<RuntimeLocaleCopy['tenantGovernance'], 'nav' | 'titles'>> & {
    nav?: Partial<RuntimeLocaleCopy['tenantGovernance']['nav']>;
    titles?: Partial<RuntimeLocaleCopy['tenantGovernance']['titles']>;
  };
  publicHomepage?: Partial<RuntimeLocaleCopy['publicHomepage']>;
  publicMarshmallow?: Partial<RuntimeLocaleCopy['publicMarshmallow']>;
  customerManagement?: Partial<RuntimeLocaleCopy['customerManagement']>;
}

function extendRuntimeCopy(
  base: RuntimeLocaleCopy,
  overrides: RuntimeLocaleCopyOverrides,
): RuntimeLocaleCopy {
  return {
    common: {
      ...base.common,
      ...overrides.common,
    },
    auth: {
      login: {
        ...base.auth.login,
        ...overrides.auth?.login,
      },
    },
    ac: {
      ...base.ac,
      ...overrides.ac,
      nav: {
        ...base.ac.nav,
        ...overrides.ac?.nav,
      },
      titles: {
        ...base.ac.titles,
        ...overrides.ac?.titles,
      },
    },
    talentBusiness: {
      ...base.talentBusiness,
      ...overrides.talentBusiness,
      nav: {
        ...base.talentBusiness.nav,
        ...overrides.talentBusiness?.nav,
      },
      titles: {
        ...base.talentBusiness.titles,
        ...overrides.talentBusiness?.titles,
      },
    },
    tenantGovernance: {
      ...base.tenantGovernance,
      ...overrides.tenantGovernance,
      nav: {
        ...base.tenantGovernance.nav,
        ...overrides.tenantGovernance?.nav,
      },
      titles: {
        ...base.tenantGovernance.titles,
        ...overrides.tenantGovernance?.titles,
      },
    },
    publicHomepage: {
      ...base.publicHomepage,
      ...overrides.publicHomepage,
    },
    publicMarshmallow: {
      ...base.publicMarshmallow,
      ...overrides.publicMarshmallow,
    },
    customerManagement: {
      ...base.customerManagement,
      ...overrides.customerManagement,
    },
  };
}

const LOCALE_COPY: Record<SupportedUiLocale, RuntimeLocaleCopy> = {
  en: FAMILY_LOCALE_COPY.en,
  zh_HANS: FAMILY_LOCALE_COPY.zh,
  zh_HANT: extendRuntimeCopy(FAMILY_LOCALE_COPY.zh, {
    common: {
      accountMenuLabel: '帳戶選單',
      authenticatedUser: '目前使用者',
      currentTenant: '租戶',
      languageSwitcherLabel: '切換語言',
      mainNavigationLabel: '主導航',
      myProfile: '我的資料',
      securitySessions: '密碼與安全',
      signOut: '登出',
      signingOut: '正在登出…',
      talentScope: '藝人範圍',
      workspaceSettings: '設定',
    },
    auth: {
      login: {
        confirmNewPasswordLabel: '確認新密碼',
        confirmNewPasswordPlaceholder: '再次輸入新密碼',
        credentialsDescription: '輸入登入資訊。',
        credentialsTitle: '登入',
        errorFallback: '驗證失敗。',
        heroDescription: '記錄閃耀背後的每一滴汗水',
        heroTitle: '歡迎登入 TCRN TMS',
        newPasswordLabel: '新密碼',
        passwordLabel: '密碼',
        passwordPlaceholder: '至少 12 個字元',
        passwordResetDescription: '目前帳號需要先更新密碼，之後才能繼續。',
        passwordResetTitle: '設定新密碼',
        rememberMe: '在此裝置上保持登入狀態',
        setNewPassword: '設定新密碼',
        signIn: '登入',
        submitPending: '處理中…',
        tenantCodeLabel: '租戶代碼',
        totpDescription: '請輸入驗證器應用程式中的六位驗證碼以完成登入。',
        totpLabel: 'TOTP 驗證碼',
        totpTitle: '驗證 TOTP',
        usernameLabel: '使用者名稱或信箱',
        verifyTotp: '驗證 TOTP',
      },
    },
    ac: {
      nav: {
        observability: '可觀測性',
        profile: '個人資料',
        systemDictionary: '系統詞典',
        tenantManagement: '租戶管理',
        userManagement: '使用者管理',
      },
      shellSubtitle: '平台管理',
      titles: {
        observability: '可觀測性',
        profile: '個人資料',
        systemDictionary: '系統詞典',
        tenantManagement: '租戶管理',
        userManagement: '使用者管理',
      },
    },
    talentBusiness: {
      nav: {
        customers: '客戶',
        homepage: '主頁',
        marshmallow: '棉花糖',
        overview: '總覽',
        reports: '報表',
      },
      shellSubtitle: '藝人業務',
      titles: {
        customers: '客戶管理',
        homepage: '主頁管理',
        marshmallow: '棉花糖管理',
        overview: '總覽',
        reports: '報表',
        settings: '設定',
      },
    },
    tenantGovernance: {
      nav: {
        organizationStructure: '組織架構',
        profile: '個人資料',
        security: '安全',
        tenantSettings: '租戶設定',
        userManagement: '使用者管理',
      },
      shellSubtitle: '租戶管理',
      titles: {
        organizationStructure: '組織架構',
        profile: '個人資料',
        security: '安全',
        subsidiarySettings: '分目錄設定',
        tenantSettings: '租戶設定',
        userManagement: '使用者管理',
        workspaceLanding: '選擇藝人',
      },
    },
    publicHomepage: {
      avatarSuffix: '頭像',
      badge: '公開主頁',
      bilibiliDescription: '此區塊會連到對應的 Bilibili 主頁。',
      bilibiliDynamic: 'Bilibili 動態',
      currentlyOffline: '目前離線',
      dayLabel: '日期',
      embeddedVideo: '嵌入影片',
      failedDescription: '公開主頁載入失敗。',
      failedTitle: '主頁載入失敗',
      gallery: '圖集',
      galleryImageLabel: '圖集圖片',
      liveNow: '直播中',
      liveStatus: '直播狀態',
      loading: '正在載入公開主頁',
      marshmallow: '棉花糖',
      marshmallowDescription:
        '此主頁包含一個棉花糖區塊。公開訊息可透過專用的 /m/<path> 頁面查看。',
      music: '音樂',
      noScheduleEntries: '目前還沒有已發佈的公開行程。',
      nowPlaying: '目前播放',
      openLink: '打開連結',
      openStream: '打開直播',
      openVideoInNewTab: '在新分頁中開啟影片',
      profileAvatar: '資料頭像',
      publishedBlocksLabel: '已發佈區塊',
      schedule: '行程',
      socialLinks: '社群連結',
      timezoneLabel: '時區',
      unavailableDescription: '目前主頁尚未發佈、暫時不可達，或已被停用。',
      unavailableTitle: '主頁不可用',
      unsupportedDescription: '部分主頁內容會在這裡以簡化視圖顯示。',
      untitledEvent: '未命名事件',
      untitledProfile: '未命名資料',
      updatedLabel: '更新時間',
      video: '影片',
      viewBilibiliDynamics: '查看 Bilibili 動態',
      watchingSuffix: '人正在觀看',
    },
    publicMarshmallow: {
      anonymousBadgeAllowed: '允許匿名投稿',
      anonymousSender: '匿名',
      avatarSuffix: '頭像',
      badge: '公開棉花糖',
      captchaModeAuto: '自適應',
      captchaModeAlways: '永遠開啟',
      captchaModeLabel: '驗證碼模式',
      captchaModeNever: '已關閉',
      completeCaptchaError: '請先完成 Turnstile 驗證，再提交訊息。',
      displayNameLabel: '顯示名稱',
      emptyDescription: '待藝人公開通過審核的提問後，這裡會顯示對應內容。',
      emptyTitle: '尚無公開訊息',
      failedDescription: '公開棉花糖頁面載入失敗。',
      failedTitle: '公開棉花糖載入失敗',
      feedEyebrow: '公開訊息流',
      feedTitle: '已公開訊息',
      loadMore: '載入更多',
      loadMorePending: '正在載入更早的訊息…',
      loadOlderFailed: '載入更早訊息失敗。',
      loadedCountLabel: '已載入',
      loading: '正在載入公開棉花糖',
      messageFeedFailed: '公開訊息流載入失敗。',
      messageLabel: '訊息內容',
      messagePlaceholder: '在這裡寫下你的訊息',
      missingCaptchaDisabledNotice:
        '此頁面要求啟用 Turnstile，但驗證碼尚未設定，因此暫時無法提交。',
      missingCaptchaError: '此公開頁面要求啟用 Turnstile，但驗證碼尚未設定。',
      namedFanFallback: '署名粉絲',
      namedOnlyBadge: '僅允許署名投稿',
      privacyLabel: '隱私說明',
      reactionUpdateFailed: '更新互動反應失敗。',
      replyLabel: '回覆',
      sendButton: '送出訊息',
      sendButtonPending: '送出中…',
      sendSectionEyebrow: '送出一則訊息',
      sendSectionTitle: '公開提問，私下送達',
      submitAnonymously: '匿名提交',
      submitFailed: '提交訊息失敗。',
      termsLabel: '使用條款',
      titleSuffix: '棉花糖',
      turnstileLabel: 'Turnstile 驗證',
      unavailableDescription: '此公開棉花糖頁面尚未發佈、未啟用，或暫時不可達。',
      unavailableTitle: '公開棉花糖不可用',
    },
  }),
  ja: FAMILY_LOCALE_COPY.ja,
  ko: extendRuntimeCopy(FAMILY_LOCALE_COPY.en, {
    common: {
      accountMenuLabel: '계정 메뉴',
      authenticatedUser: '인증 사용자',
      currentTenant: '테넌트',
      languageSwitcherLabel: '언어 변경',
      mainNavigationLabel: '주 탐색',
      myProfile: '내 프로필',
      securitySessions: '비밀번호 및 보안',
      signOut: '로그아웃',
      signingOut: '로그아웃 중…',
      talentScope: '탤런트 범위',
      workspaceSettings: '설정',
    },
    auth: {
      login: {
        credentialsTitle: '로그인',
        heroTitle: 'TCRN TMS에 오신 것을 환영합니다',
        heroDescription: '무대 뒤의 모든 땀방울을 기록합니다.',
        signIn: '로그인',
        submitPending: '처리 중…',
        rememberMe: '이 기기에서 로그인 상태 유지',
        tenantCodeLabel: '테넌트 코드',
      },
    },
    ac: {
      nav: {
        integrationManagement: '연동 관리',
        observability: '관측성',
        profile: '프로필',
        systemDictionary: '시스템 사전',
        tenantManagement: '테넌트 관리',
        userManagement: '사용자 관리',
      },
      shellLabel: '플랫폼',
      shellSubtitle: '관리',
      titles: {
        integrationManagement: '연동 관리',
        observability: '관측성',
        profile: '프로필',
        systemDictionary: '시스템 사전',
        tenantManagement: '테넌트 관리',
        userManagement: '사용자 관리',
      },
    },
    talentBusiness: {
      nav: {
        customers: '고객',
        homepage: '홈페이지',
        marshmallow: '마시멜로',
        overview: '개요',
        reports: '보고서',
      },
      shellLabel: '탤런트',
      shellSubtitle: '탤런트 운영',
      titles: {
        customers: '고객 관리',
        homepage: '홈페이지 관리',
        marshmallow: '마시멜로 관리',
        overview: '개요',
        reports: '보고서',
        settings: '설정',
      },
    },
    tenantGovernance: {
      nav: {
        integrationManagement: '연동 관리',
        observability: '관측성',
        organizationStructure: '조직 구조',
        profile: '프로필',
        security: '보안',
        tenantSettings: '테넌트 설정',
        userManagement: '사용자 관리',
      },
      shellLabel: '테넌트',
      shellSubtitle: '관리',
      titles: {
        integrationManagement: '연동 관리',
        observability: '관측성',
        organizationStructure: '조직 구조',
        profile: '프로필',
        security: '보안',
        subsidiarySettings: '자회사 설정',
        tenantSettings: '테넌트 설정',
        userManagement: '사용자 관리',
        workspaceLanding: '탤런트 선택',
      },
    },
    publicHomepage: {
      avatarSuffix: '아바타',
      badge: '공개 홈페이지',
      bilibiliDescription: '이 블록은 해당 Bilibili 프로필로 이동합니다.',
      bilibiliDynamic: 'Bilibili 동향',
      currentlyOffline: '현재 오프라인',
      dayLabel: '날짜',
      embeddedVideo: '삽입된 동영상',
      failedDescription: '공개 홈페이지를 불러오지 못했습니다.',
      failedTitle: '홈페이지 로드 실패',
      gallery: '갤러리',
      galleryImageLabel: '갤러리 이미지',
      liveNow: '생방송 중',
      liveStatus: '라이브 상태',
      loading: '공개 홈페이지를 불러오는 중',
      marshmallow: '마시멜로',
      marshmallowDescription:
        '이 홈페이지에는 마시멜로 블록이 포함되어 있습니다. 공개 메시지는 전용 /m/<path> 페이지에서 확인할 수 있습니다.',
      music: '음악',
      noScheduleEntries: '아직 공개된 일정이 없습니다.',
      nowPlaying: '현재 재생 중',
      openLink: '링크 열기',
      openStream: '스트림 열기',
      openVideoInNewTab: '새 탭에서 동영상 열기',
      profileAvatar: '프로필 아바타',
      publishedBlocksLabel: '게시된 블록',
      schedule: '일정',
      socialLinks: '소셜 링크',
      timezoneLabel: '시간대',
      unavailableDescription: '이 홈페이지는 아직 게시되지 않았거나, 접근할 수 없거나, 비활성화되었습니다.',
      unavailableTitle: '홈페이지를 사용할 수 없습니다',
      unsupportedDescription: '일부 홈페이지 콘텐츠는 여기에서 단순화된 보기로 표시됩니다.',
      untitledEvent: '제목 없는 일정',
      untitledProfile: '제목 없는 프로필',
      updatedLabel: '업데이트됨',
      video: '동영상',
      viewBilibiliDynamics: 'Bilibili 동향 보기',
      watchingSuffix: '명 시청 중',
    },
    publicMarshmallow: {
      anonymousBadgeAllowed: '익명 제출 허용',
      anonymousSender: '익명',
      avatarSuffix: '아바타',
      badge: '공개 마시멜로',
      captchaModeAuto: '자동',
      captchaModeAlways: '항상',
      captchaModeLabel: '캡차 모드',
      captchaModeNever: '사용 안 함',
      completeCaptchaError: '메시지를 보내기 전에 Turnstile 인증을 완료하세요.',
      displayNameLabel: '표시 이름',
      emptyDescription: '탤런트가 공개 승인한 메시지가 있으면 여기에 표시됩니다.',
      emptyTitle: '아직 공개 메시지가 없습니다',
      failedDescription: '공개 마시멜로 페이지를 불러오지 못했습니다.',
      failedTitle: '공개 마시멜로 로드 실패',
      feedEyebrow: '공개 피드',
      feedTitle: '승인된 메시지',
      loadMore: '더 불러오기',
      loadMorePending: '이전 메시지를 불러오는 중…',
      loadOlderFailed: '이전 메시지를 불러오지 못했습니다.',
      loadedCountLabel: '로드됨',
      loading: '공개 마시멜로를 불러오는 중',
      messageFeedFailed: '공개 메시지 피드를 불러오지 못했습니다.',
      messageLabel: '메시지',
      messagePlaceholder: '여기에 메시지를 입력하세요',
      missingCaptchaDisabledNotice:
        '이 페이지는 Turnstile이 필요하지만 캡차가 구성되지 않아 제출할 수 없습니다.',
      missingCaptchaError: '이 공개 페이지는 Turnstile이 필요하지만 캡차가 구성되지 않았습니다.',
      namedFanFallback: '이름 공개 팬',
      namedOnlyBadge: '기명 제출만 허용',
      privacyLabel: '개인정보',
      reactionUpdateFailed: '반응 업데이트에 실패했습니다.',
      replyLabel: '답글',
      sendButton: '메시지 보내기',
      sendButtonPending: '전송 중…',
      sendSectionEyebrow: '메시지 보내기',
      sendSectionTitle: '공개로 묻고, 비공개로 전달하기',
      submitAnonymously: '익명으로 제출',
      submitFailed: '메시지 제출에 실패했습니다.',
      termsLabel: '이용 약관',
      titleSuffix: '마시멜로',
      turnstileLabel: 'Turnstile 인증',
      unavailableDescription: '이 공개 마시멜로 페이지는 아직 게시되지 않았거나, 비활성화되었거나, 현재 접근할 수 없습니다.',
      unavailableTitle: '공개 마시멜로를 사용할 수 없습니다',
    },
  }),
  fr: extendRuntimeCopy(FAMILY_LOCALE_COPY.en, {
    common: {
      accountMenuLabel: 'Menu du compte',
      authenticatedUser: 'Utilisateur authentifié',
      currentTenant: 'Tenant',
      languageSwitcherLabel: 'Changer de langue',
      mainNavigationLabel: 'Navigation principale',
      myProfile: 'Mon profil',
      securitySessions: 'Mot de passe et sécurité',
      signOut: 'Se déconnecter',
      signingOut: 'Déconnexion…',
      talentScope: 'Portée talent',
      workspaceSettings: 'Paramètres',
    },
    auth: {
      login: {
        credentialsTitle: 'Se connecter',
        heroTitle: 'Bienvenue sur TCRN TMS',
        heroDescription: 'Enregistrez chaque goutte de sueur derrière les projecteurs.',
        signIn: 'Se connecter',
        submitPending: 'Traitement…',
        rememberMe: 'Rester connecté sur cet appareil',
        tenantCodeLabel: 'Code tenant',
      },
    },
    ac: {
      nav: {
        integrationManagement: 'Gestion des intégrations',
        observability: 'Observabilité',
        profile: 'Profil',
        systemDictionary: 'Dictionnaire système',
        tenantManagement: 'Gestion des tenants',
        userManagement: 'Gestion des utilisateurs',
      },
      shellLabel: 'Plateforme',
      shellSubtitle: 'Administration',
      titles: {
        integrationManagement: 'Gestion des intégrations',
        observability: 'Observabilité',
        profile: 'Profil',
        systemDictionary: 'Dictionnaire système',
        tenantManagement: 'Gestion des tenants',
        userManagement: 'Gestion des utilisateurs',
      },
    },
    talentBusiness: {
      nav: {
        customers: 'Clients',
        homepage: "Page d'accueil",
        marshmallow: 'Marshmallow',
        overview: "Vue d'ensemble",
        reports: 'Rapports',
      },
      shellLabel: 'Talent',
      shellSubtitle: 'Opérations talent',
      titles: {
        customers: 'Gestion des clients',
        homepage: "Gestion de la page d'accueil",
        marshmallow: 'Gestion Marshmallow',
        overview: "Vue d'ensemble",
        reports: 'Rapports',
        settings: 'Paramètres',
      },
    },
    tenantGovernance: {
      nav: {
        integrationManagement: 'Gestion des intégrations',
        observability: 'Observabilité',
        organizationStructure: 'Structure organisationnelle',
        profile: 'Profil',
        security: 'Sécurité',
        tenantSettings: 'Paramètres du tenant',
        userManagement: 'Gestion des utilisateurs',
      },
      shellLabel: 'Tenant',
      shellSubtitle: 'Administration',
      titles: {
        integrationManagement: 'Gestion des intégrations',
        observability: 'Observabilité',
        organizationStructure: 'Structure organisationnelle',
        profile: 'Profil',
        security: 'Sécurité',
        subsidiarySettings: 'Paramètres de filiale',
        tenantSettings: 'Paramètres du tenant',
        userManagement: 'Gestion des utilisateurs',
        workspaceLanding: 'Choisir un talent',
      },
    },
    publicHomepage: {
      avatarSuffix: 'avatar',
      badge: "Page d'accueil publique",
      bilibiliDescription: 'Ce bloc renvoie vers le profil Bilibili source.',
      bilibiliDynamic: 'Actualités Bilibili',
      currentlyOffline: 'Hors ligne actuellement',
      dayLabel: 'Jour',
      embeddedVideo: 'Vidéo intégrée',
      failedDescription: "La page d'accueil publique n'a pas pu être chargée.",
      failedTitle: "Échec du chargement de la page d'accueil",
      gallery: 'Galerie',
      galleryImageLabel: 'Image de galerie',
      liveNow: 'En direct',
      liveStatus: 'Statut du direct',
      loading: "Chargement de la page d'accueil publique",
      marshmallow: 'Marshmallow',
      marshmallowDescription:
        'Cette page contient un bloc marshmallow. Les messages publics restent accessibles via la page dédiée /m/<path>.',
      music: 'Musique',
      noScheduleEntries: "Aucun événement public n'a encore été publié.",
      nowPlaying: 'Lecture en cours',
      openLink: 'Ouvrir le lien',
      openStream: 'Ouvrir le direct',
      openVideoInNewTab: 'Ouvrir la vidéo dans un nouvel onglet',
      profileAvatar: 'Avatar du profil',
      publishedBlocksLabel: 'Blocs publiés',
      schedule: 'Planning',
      socialLinks: 'Liens sociaux',
      timezoneLabel: 'Fuseau horaire',
      unavailableDescription: "Cette page d'accueil n'est pas publiée, n'est pas accessible ou a été désactivée.",
      unavailableTitle: "Page d'accueil indisponible",
      unsupportedDescription: 'Une partie du contenu est affichée ici sous une forme simplifiée.',
      untitledEvent: 'Événement sans titre',
      untitledProfile: 'Profil sans titre',
      updatedLabel: 'Mis à jour',
      video: 'Vidéo',
      viewBilibiliDynamics: 'Voir les actualités Bilibili',
      watchingSuffix: 'en train de regarder',
    },
    publicMarshmallow: {
      anonymousBadgeAllowed: 'Envois anonymes autorisés',
      anonymousSender: 'Anonyme',
      avatarSuffix: 'avatar',
      badge: 'Marshmallow public',
      captchaModeAuto: 'Adaptatif',
      captchaModeAlways: 'Toujours',
      captchaModeLabel: 'Mode captcha',
      captchaModeNever: 'Désactivé',
      completeCaptchaError: 'Terminez le défi Turnstile avant d’envoyer votre message.',
      displayNameLabel: 'Nom affiché',
      emptyDescription: 'Les questions publiques approuvées apparaîtront ici une fois publiées par le talent.',
      emptyTitle: 'Aucun message public pour le moment',
      failedDescription: 'La page marshmallow publique n’a pas pu être chargée.',
      failedTitle: 'Échec du chargement du marshmallow public',
      feedEyebrow: 'Flux public',
      feedTitle: 'Messages approuvés',
      loadMore: 'Charger plus',
      loadMorePending: 'Chargement des anciens messages…',
      loadOlderFailed: 'Impossible de charger les anciens messages.',
      loadedCountLabel: 'chargé(s)',
      loading: 'Chargement du marshmallow public',
      messageFeedFailed: 'Le flux de messages publics n’a pas pu être chargé.',
      messageLabel: 'Message',
      messagePlaceholder: 'Écrivez votre message ici',
      missingCaptchaDisabledNotice:
        'Cette page exige Turnstile, mais le captcha n’est pas configuré. L’envoi est indisponible.',
      missingCaptchaError: 'Cette page publique exige Turnstile, mais le captcha n’est pas configuré.',
      namedFanFallback: 'Fan identifié',
      namedOnlyBadge: 'Envois nominatifs uniquement',
      privacyLabel: 'Confidentialité',
      reactionUpdateFailed: 'Impossible de mettre à jour la réaction.',
      replyLabel: 'Réponse',
      sendButton: 'Envoyer le message',
      sendButtonPending: 'Envoi…',
      sendSectionEyebrow: 'Envoyer un message',
      sendSectionTitle: 'Poser en public, livrer en privé',
      submitAnonymously: 'Envoyer anonymement',
      submitFailed: 'Échec de l’envoi du message.',
      termsLabel: 'Conditions',
      titleSuffix: 'Marshmallow',
      turnstileLabel: 'Vérification Turnstile',
      unavailableDescription: 'Cette page marshmallow publique n’est pas publiée, pas activée ou actuellement inaccessible.',
      unavailableTitle: 'Marshmallow public indisponible',
    },
  }),
};

const runtimeLocaleContext = createContext<RuntimeLocaleContextValue | null>(null);

export function normalizeRuntimeLocale(input?: string | null): RuntimeLocale | null {
  return resolveTrilingualLocaleFamily(input);
}

function normalizeUiLocale(input?: string | null): SupportedUiLocale | null {
  return normalizeSupportedUiLocale(input);
}

function readBrowserLocale() {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return normalizeUiLocale(navigator.language);
}

function readStoredLocaleOverride() {
  if (typeof window === 'undefined') {
    return null;
  }

  return normalizeUiLocale(window.localStorage.getItem(LOCALE_OVERRIDE_STORAGE_KEY));
}

function storeLocaleOverride(locale: SupportedUiLocale | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!locale) {
    window.localStorage.removeItem(LOCALE_OVERRIDE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(LOCALE_OVERRIDE_STORAGE_KEY, locale);
}

export function RuntimeLocaleProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session } = useSession();
  const [browserLocale, setBrowserLocale] = useState<SupportedUiLocale>(() => readBrowserLocale() ?? 'en');
  const [overrideLocale, setOverrideLocale] = useState<SupportedUiLocale | null>(() => readStoredLocaleOverride());
  const sessionIdentityKey = session ? `${session.tenantId}:${session.user.id}` : 'anonymous';

  useEffect(() => {
    const nextLocale = readBrowserLocale();

    if (nextLocale) {
      setBrowserLocale(nextLocale);
    }
  }, []);

  useEffect(() => {
    setOverrideLocale(readStoredLocaleOverride());
  }, [sessionIdentityKey]);

  function setLocale(localeCode: string) {
    const nextLocale = normalizeUiLocale(localeCode);

    if (!nextLocale) {
      return;
    }

    storeLocaleOverride(nextLocale);
    startTransition(() => {
      setOverrideLocale(nextLocale);
    });
  }

  const selectedLocale =
    overrideLocale
    ?? normalizeUiLocale(session?.user.preferredLanguage)
    ?? browserLocale;
  const currentLocale = normalizeRuntimeLocale(selectedLocale) ?? 'en';

  const value = useMemo<RuntimeLocaleContextValue>(
    () => ({
      copy: LOCALE_COPY[selectedLocale] ?? LOCALE_COPY.en,
      currentLocale,
      selectedLocale,
      localeOptions: LOCALE_OPTIONS,
      setLocale,
    }),
    [currentLocale, selectedLocale],
  );

  return <runtimeLocaleContext.Provider value={value}>{children}</runtimeLocaleContext.Provider>;
}

export function useRuntimeLocale() {
  const value = useContext(runtimeLocaleContext);

  if (!value) {
    throw new Error('useRuntimeLocale must be used inside RuntimeLocaleProvider');
  }

  return value;
}
