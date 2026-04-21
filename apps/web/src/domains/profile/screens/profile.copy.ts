import type { SupportedUiLocale } from '@tcrn/shared';

import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  resolveLocaleRecord,
} from '@/platform/runtime/locale/locale-text';

interface ProfileCopy {
  header: {
    chipPrefix: string;
    title: string;
    description: string;
    securityTitle: string;
    securityDescription: string;
    summaryUserLabel: string;
    summaryUserHint: string;
    summaryEmailLabel: string;
    summaryEmailHint: string;
    summaryTotpLabel: string;
    summaryTotpEnabled: string;
    summaryTotpDisabled: string;
    summaryTotpHint: string;
    summarySessionsLabel: string;
      summarySessionsHint: string;
  };
  state: {
    loading: string;
    unavailableTitle: string;
    loadError: string;
    actionFailed: string;
    currentTenantFallback: string;
  };
  details: {
    title: string;
    description: string;
    reset: string;
    save: string;
    savePending: string;
    displayNameLabel: string;
    phoneLabel: string;
    preferredLanguageLabel: string;
    lastLoginLabel: string;
    lastLoginHint: string;
    passwordExpiresLabel: string;
    passwordExpiresHint: string;
    never: string;
    notScheduled: string;
    saved: string;
    saveError: string;
  };
  password: {
    title: string;
    description: string;
    action: string;
    pending: string;
    currentLabel: string;
    newLabel: string;
    confirmLabel: string;
    error: string;
  };
  totp: {
    title: string;
    description: string;
    disabledTitle: string;
    disabledDescription: string;
    prepareAction: string;
    preparePending: string;
    prepared: string;
    prepareError: string;
    setupMaterialTitle: string;
    qrCodeLabel: string;
    qrCodeHint: string;
    qrCodeAlt: string;
    accountLabel: string;
    secretLabel: string;
    otpAuthUrlLabel: string;
    enableTitle: string;
    enableDescription: string;
    codeLabel: string;
    codePlaceholder: string;
    enableAction: string;
    enablePending: string;
    enabled: string;
    enableError: string;
    disableTitle: string;
    disableDescription: string;
    disablePasswordLabel: string;
    disableAction: string;
    disablePending: string;
    disabled: string;
    disableError: string;
    regenerateTitle: string;
    regenerateDescription: string;
    regeneratePasswordLabel: string;
    regenerateAction: string;
    regeneratePending: string;
    regenerated: string;
    regenerateError: string;
    recoveryCodesTitle: string;
  };
  avatarEmail: {
    title: string;
    description: string;
    avatarTitle: string;
    avatarDescription: string;
    currentAvatarAlt: string;
    noAvatar: string;
    avatarFileLabel: string;
    uploadAction: string;
    uploadPending: string;
    uploadSuccess: string;
    uploadError: string;
    deleteAction: string;
    deletePending: string;
    deleteSuccess: string;
    deleteError: string;
    emailTitle: string;
    emailDescription: string;
    newEmailLabel: string;
    newEmailPlaceholder: string;
    requestAction: string;
    requestPending: string;
    requestError: string;
    confirmTokenLabel: string;
    confirmTokenPlaceholder: string;
    confirmAction: string;
    confirmPending: string;
    confirmError: string;
  };
  sessions: {
    title: string;
    description: string;
    columns: [string, string, string, string, string, string];
    emptyTitle: string;
    emptyDescription: string;
    unknownDevice: string;
    unavailable: string;
    currentSession: string;
    revocable: string;
    revokeAction: string;
    revokeDialogTitle: (device: string) => string;
    revokeDialogDescription: string;
    revokeDialogConfirm: string;
    revokeSuccess: string;
  };
  cards: {
    identityTitle: string;
    identityDescription: string;
    securityTitle: string;
    securityDescription: string;
    emailTitle: string;
    emailDescription: string;
  };
  dialog: {
    confirmAction: string;
  };
}

const COPY: Record<RuntimeLocale, ProfileCopy> = {
  en: {
    header: {
      chipPrefix: 'Access',
      title: 'Profile',
      description:
        'Manage your identity, password, TOTP, sessions, avatar, and email here.',
      securityTitle: 'Account Security',
      securityDescription:
        'Change your password, manage TOTP, and review current sign-in sessions.',
      summaryUserLabel: 'User',
      summaryUserHint: 'Current authenticated profile.',
      summaryEmailLabel: 'Email',
      summaryEmailHint: 'Primary account email.',
      summaryTotpLabel: 'TOTP',
      summaryTotpEnabled: 'Enabled',
      summaryTotpDisabled: 'Disabled',
      summaryTotpHint: 'Second-factor status.',
      summarySessionsLabel: 'Sessions',
      summarySessionsHint: 'Active sign-in sessions for this account.',
    },
    state: {
      loading: 'Loading profile…',
      unavailableTitle: 'Profile unavailable',
      loadError: 'Failed to load profile.',
      actionFailed: 'Profile action failed.',
      currentTenantFallback: 'Tenant',
    },
    details: {
      title: 'Profile Details',
      description: 'Update display, contact, and language preferences.',
      reset: 'Reset',
      save: 'Save profile',
      savePending: 'Saving…',
      displayNameLabel: 'Display name',
      phoneLabel: 'Phone',
      preferredLanguageLabel: 'Preferred language',
      lastLoginLabel: 'Last Login',
      lastLoginHint: 'Latest authenticated activity.',
      passwordExpiresLabel: 'Password Expires',
      passwordExpiresHint: 'Current password-policy horizon.',
      never: 'Never',
      notScheduled: 'Not scheduled',
      saved: 'Profile details saved.',
      saveError: 'Failed to save profile details.',
    },
    password: {
      title: 'Password',
      description: 'Change the current password.',
      action: 'Change password',
      pending: 'Changing…',
      currentLabel: 'Current password',
      newLabel: 'New password',
      confirmLabel: 'Confirm new password',
      error: 'Failed to change password.',
    },
    totp: {
      title: 'TOTP & Recovery Codes',
      description: 'Prepare, enable, disable, and rotate second-factor settings.',
      disabledTitle: 'TOTP is currently disabled',
      disabledDescription: 'Generate a setup secret first, then verify one authenticator code to enable it.',
      prepareAction: 'Prepare TOTP setup',
      preparePending: 'Preparing…',
      prepared: 'TOTP setup prepared. Enter the code from your authenticator app to enable it.',
      prepareError: 'Failed to prepare TOTP setup.',
      setupMaterialTitle: 'Setup material',
      qrCodeLabel: 'QR code',
      qrCodeHint: 'Scan this QR code with your authenticator app, or use the secret and OTPAuth URL below.',
      qrCodeAlt: 'TOTP setup QR code',
      accountLabel: 'Account',
      secretLabel: 'Secret',
      otpAuthUrlLabel: 'OTPAuth URL',
      enableTitle: 'Enable TOTP',
      enableDescription: 'Enter the current code from your authenticator app to complete enablement and issue recovery codes.',
      codeLabel: 'TOTP verification code',
      codePlaceholder: '123456',
      enableAction: 'Enable TOTP',
      enablePending: 'Enabling…',
      enabled: 'TOTP enabled. Save the new recovery codes now.',
      enableError: 'Failed to enable TOTP.',
      disableTitle: 'Disable TOTP',
      disableDescription: 'Enter the current password to turn off the second factor and invalidate recovery codes.',
      disablePasswordLabel: 'Disable TOTP password',
      disableAction: 'Disable TOTP',
      disablePending: 'Disabling…',
      disabled: 'TOTP disabled.',
      disableError: 'Failed to disable TOTP.',
      regenerateTitle: 'Regenerate recovery codes',
      regenerateDescription: 'Use the current password to invalidate the old set and mint a new recovery pack.',
      regeneratePasswordLabel: 'Recovery codes password',
      regenerateAction: 'Regenerate recovery codes',
      regeneratePending: 'Regenerating…',
      regenerated: 'Recovery codes regenerated. Save the new set now.',
      regenerateError: 'Failed to regenerate recovery codes.',
      recoveryCodesTitle: 'Recovery codes',
    },
    avatarEmail: {
      title: 'Avatar & Email',
      description: 'Manage avatar assets and email change.',
      avatarTitle: 'Avatar',
      avatarDescription: 'Upload a new avatar asset or remove the current one.',
      currentAvatarAlt: 'Current avatar',
      noAvatar: 'No avatar',
      avatarFileLabel: 'Avatar file',
      uploadAction: 'Upload avatar',
      uploadPending: 'Uploading…',
      uploadSuccess: 'Avatar uploaded successfully.',
      uploadError: 'Failed to upload avatar.',
      deleteAction: 'Delete avatar',
      deletePending: 'Deleting…',
      deleteSuccess: 'Avatar deleted successfully.',
      deleteError: 'Failed to delete avatar.',
      emailTitle: 'Email change',
      emailDescription: 'Request a verification email to a new address, then confirm it with the returned token.',
      newEmailLabel: 'New email',
      newEmailPlaceholder: 'new-email@example.com',
      requestAction: 'Request email change',
      requestPending: 'Requesting…',
      requestError: 'Failed to request email change.',
      confirmTokenLabel: 'Email confirmation token',
      confirmTokenPlaceholder: 'verification-token',
      confirmAction: 'Confirm email change',
      confirmPending: 'Confirming…',
      confirmError: 'Failed to confirm email change.',
    },
    sessions: {
      title: 'Active Sessions',
      description: 'List and revoke current sign-in sessions.',
      columns: ['Device', 'IP', 'Current', 'Created', 'Last Active', 'Actions'],
      emptyTitle: 'No active sessions',
      emptyDescription: 'The current user does not have any active sign-in sessions.',
      unknownDevice: 'Unknown device',
      unavailable: 'Unavailable',
      currentSession: 'Current session',
      revocable: 'Revocable',
      revokeAction: 'Revoke',
      revokeDialogTitle: (device) => `Revoke session ${device}?`,
      revokeDialogDescription: 'This invalidates the selected refresh token immediately.',
      revokeDialogConfirm: 'Revoke session',
      revokeSuccess: 'Session revoked successfully.',
    },
    cards: {
      identityTitle: 'Identity',
      identityDescription: 'Display name, contact, avatar, and language settings.',
      securityTitle: 'Security controls',
      securityDescription: 'Password and TOTP settings.',
      emailTitle: 'Email lifecycle',
      emailDescription: 'Request and confirm email changes.',
    },
    dialog: {
      confirmAction: 'Confirm',
    },
  },
  zh: {
    header: {
      chipPrefix: '访问',
      title: '个人资料',
      description: '在这里管理当前用户身份、密码、TOTP、会话、头像与邮箱变更。',
      securityTitle: '账户安全',
      securityDescription: '在这里修改密码、管理 TOTP，并查看当前活跃登录会话。',
      summaryUserLabel: '用户',
      summaryUserHint: '当前已认证用户资料。',
      summaryEmailLabel: '邮箱',
      summaryEmailHint: '主账户邮箱。',
      summaryTotpLabel: 'TOTP',
      summaryTotpEnabled: '已启用',
      summaryTotpDisabled: '未启用',
      summaryTotpHint: '双重验证状态。',
      summarySessionsLabel: '会话',
      summarySessionsHint: '当前账号的活跃登录会话数。',
    },
    state: {
      loading: '正在加载个人资料…',
      unavailableTitle: '个人资料不可用',
      loadError: '加载个人资料失败。',
      actionFailed: '个人资料操作失败。',
      currentTenantFallback: '租户',
    },
    details: {
      title: '资料详情',
      description: '更新显示名、联系方式与语言偏好。',
      reset: '重置',
      save: '保存资料',
      savePending: '保存中…',
      displayNameLabel: '显示名',
      phoneLabel: '电话',
      preferredLanguageLabel: '首选语言',
      lastLoginLabel: '最近登录',
      lastLoginHint: '最近一次成功认证活动。',
      passwordExpiresLabel: '密码到期',
      passwordExpiresHint: '当前密码策略期限。',
      never: '从未',
      notScheduled: '未安排',
      saved: '个人资料已保存。',
      saveError: '保存个人资料失败。',
    },
    password: {
      title: '密码',
      description: '修改当前密码。',
      action: '修改密码',
      pending: '修改中…',
      currentLabel: '当前密码',
      newLabel: '新密码',
      confirmLabel: '确认新密码',
      error: '修改密码失败。',
    },
    totp: {
      title: 'TOTP 与恢复码',
      description: '在同一页面中完成双重验证准备、启用、停用与恢复码轮换。',
      disabledTitle: '当前未启用 TOTP',
      disabledDescription: '先生成设置密钥，再输入一次认证器验证码即可启用。',
      prepareAction: '准备 TOTP 设置',
      preparePending: '准备中…',
      prepared: 'TOTP 设置已准备完成。请输入认证器中的验证码以启用。',
      prepareError: '准备 TOTP 设置失败。',
      setupMaterialTitle: '设置信息',
      qrCodeLabel: '二维码',
      qrCodeHint: '请使用认证器扫描二维码；如果无法扫描，也可以使用下方密钥和 OTPAuth 地址。',
      qrCodeAlt: 'TOTP 设置二维码',
      accountLabel: '账户',
      secretLabel: '密钥',
      otpAuthUrlLabel: 'OTPAuth 地址',
      enableTitle: '启用 TOTP',
      enableDescription: '输入认证器当前验证码以完成启用，并生成新的恢复码。',
      codeLabel: 'TOTP 验证码',
      codePlaceholder: '123456',
      enableAction: '启用 TOTP',
      enablePending: '启用中…',
      enabled: 'TOTP 已启用，请立即保存新的恢复码。',
      enableError: '启用 TOTP 失败。',
      disableTitle: '停用 TOTP',
      disableDescription: '输入当前密码即可关闭双重验证并使恢复码失效。',
      disablePasswordLabel: '停用 TOTP 所需密码',
      disableAction: '停用 TOTP',
      disablePending: '停用中…',
      disabled: 'TOTP 已停用。',
      disableError: '停用 TOTP 失败。',
      regenerateTitle: '重新生成恢复码',
      regenerateDescription: '使用当前密码作废旧恢复码，并签发一组新的恢复码。',
      regeneratePasswordLabel: '恢复码密码',
      regenerateAction: '重新生成恢复码',
      regeneratePending: '生成中…',
      regenerated: '恢复码已重新生成，请保存新的这一组。',
      regenerateError: '重新生成恢复码失败。',
      recoveryCodesTitle: '恢复码',
    },
    avatarEmail: {
      title: '头像与邮箱',
      description: '管理头像资源与邮箱变更流程。',
      avatarTitle: '头像',
      avatarDescription: '上传新头像，或移除当前头像。',
      currentAvatarAlt: '当前头像',
      noAvatar: '暂无头像',
      avatarFileLabel: '头像文件',
      uploadAction: '上传头像',
      uploadPending: '上传中…',
      uploadSuccess: '头像上传成功。',
      uploadError: '上传头像失败。',
      deleteAction: '删除头像',
      deletePending: '删除中…',
      deleteSuccess: '头像已删除。',
      deleteError: '删除头像失败。',
      emailTitle: '邮箱变更',
      emailDescription: '先向新邮箱请求验证邮件，再用返回的 token 完成确认。',
      newEmailLabel: '新邮箱',
      newEmailPlaceholder: 'new-email@example.com',
      requestAction: '请求变更邮箱',
      requestPending: '请求中…',
      requestError: '请求变更邮箱失败。',
      confirmTokenLabel: '邮箱确认令牌',
      confirmTokenPlaceholder: 'verification-token',
      confirmAction: '确认邮箱变更',
      confirmPending: '确认中…',
      confirmError: '确认邮箱变更失败。',
    },
    sessions: {
      title: '活跃会话',
      description: '查看并撤销当前登录会话。',
      columns: ['设备', 'IP', '当前', '创建时间', '最后活跃', '操作'],
      emptyTitle: '没有活跃会话',
      emptyDescription: '当前用户暂无任何活跃登录会话。',
      unknownDevice: '未知设备',
      unavailable: '不可用',
      currentSession: '当前会话',
      revocable: '可撤销',
      revokeAction: '撤销',
      revokeDialogTitle: (device) => `撤销会话 ${device}？`,
      revokeDialogDescription: '这会立即使所选 refresh token 失效。',
      revokeDialogConfirm: '撤销会话',
      revokeSuccess: '会话已成功撤销。',
    },
    cards: {
      identityTitle: '身份信息',
      identityDescription: '显示名、联系方式、头像与语言偏好。',
      securityTitle: '安全控制',
      securityDescription: '密码与 TOTP 设置。',
      emailTitle: '邮箱生命周期',
      emailDescription: '申请并确认邮箱变更。',
    },
    dialog: {
      confirmAction: '确认',
    },
  },
  ja: {
    header: {
      chipPrefix: 'アクセス',
      title: 'プロフィール',
      description: 'ユーザー情報、パスワード、TOTP、セッション、アバター、メール変更をここで管理します。',
      securityTitle: 'アカウントセキュリティ',
      securityDescription:
        'パスワード変更、TOTP 管理、現在のログインセッション確認をここで行います。',
      summaryUserLabel: 'ユーザー',
      summaryUserHint: '現在認証中のプロフィールです。',
      summaryEmailLabel: 'メール',
      summaryEmailHint: 'メインアカウントのメールアドレスです。',
      summaryTotpLabel: 'TOTP',
      summaryTotpEnabled: '有効',
      summaryTotpDisabled: '無効',
      summaryTotpHint: '二要素認証の状態です。',
      summarySessionsLabel: 'セッション',
      summarySessionsHint: 'このアカウントで現在有効なログインセッション数です。',
    },
    state: {
      loading: 'プロフィールを読み込み中…',
      unavailableTitle: 'プロフィールを開けません',
      loadError: 'プロフィールの読み込みに失敗しました。',
      actionFailed: 'プロフィール操作に失敗しました。',
      currentTenantFallback: 'テナント',
    },
    details: {
      title: 'プロフィール詳細',
      description: '表示名、連絡先、言語設定を更新できます。',
      reset: 'リセット',
      save: 'プロフィールを保存',
      savePending: '保存中…',
      displayNameLabel: '表示名',
      phoneLabel: '電話番号',
      preferredLanguageLabel: '優先言語',
      lastLoginLabel: '最終ログイン',
      lastLoginHint: '直近の認証済みアクティビティです。',
      passwordExpiresLabel: 'パスワード期限',
      passwordExpiresHint: '現在のパスワードポリシー期限です。',
      never: 'なし',
      notScheduled: '未設定',
      saved: 'プロフィールを保存しました。',
      saveError: 'プロフィールの保存に失敗しました。',
    },
    password: {
      title: 'パスワード',
      description: '現在のパスワードを変更できます。',
      action: 'パスワードを変更',
      pending: '変更中…',
      currentLabel: '現在のパスワード',
      newLabel: '新しいパスワード',
      confirmLabel: '新しいパスワードを確認',
      error: 'パスワード変更に失敗しました。',
    },
    totp: {
      title: 'TOTP と回復コード',
      description: '二要素認証の準備、有効化、無効化、回復コード再発行を行います。',
      disabledTitle: '現在 TOTP は無効です',
      disabledDescription: 'まず設定シークレットを生成し、その後認証アプリのコードで有効化してください。',
      prepareAction: 'TOTP 設定を準備',
      preparePending: '準備中…',
      prepared: 'TOTP 設定を準備しました。認証アプリのコードを入力して有効化してください。',
      prepareError: 'TOTP 設定の準備に失敗しました。',
      setupMaterialTitle: '設定情報',
      qrCodeLabel: 'QR コード',
      qrCodeHint: '認証アプリでこの QR コードを読み取るか、下のシークレットと OTPAuth URL を利用してください。',
      qrCodeAlt: 'TOTP 設定用 QR コード',
      accountLabel: 'アカウント',
      secretLabel: 'シークレット',
      otpAuthUrlLabel: 'OTPAuth URL',
      enableTitle: 'TOTP を有効化',
      enableDescription: '認証アプリの現在コードを入力すると、有効化と回復コード発行が完了します。',
      codeLabel: 'TOTP 確認コード',
      codePlaceholder: '123456',
      enableAction: 'TOTP を有効化',
      enablePending: '有効化中…',
      enabled: 'TOTP を有効化しました。新しい回復コードを必ず保存してください。',
      enableError: 'TOTP の有効化に失敗しました。',
      disableTitle: 'TOTP を無効化',
      disableDescription: '現在のパスワードを入力すると二要素認証を停止し、回復コードを無効化できます。',
      disablePasswordLabel: 'TOTP 無効化用パスワード',
      disableAction: 'TOTP を無効化',
      disablePending: '無効化中…',
      disabled: 'TOTP を無効化しました。',
      disableError: 'TOTP の無効化に失敗しました。',
      regenerateTitle: '回復コードを再生成',
      regenerateDescription: '現在のパスワードで古い回復コードを無効化し、新しいセットを発行します。',
      regeneratePasswordLabel: '回復コード用パスワード',
      regenerateAction: '回復コードを再生成',
      regeneratePending: '再生成中…',
      regenerated: '回復コードを再生成しました。新しいセットを保存してください。',
      regenerateError: '回復コードの再生成に失敗しました。',
      recoveryCodesTitle: '回復コード',
    },
    avatarEmail: {
      title: 'アバターとメール',
      description: 'アバター資産とメール変更フローを管理します。',
      avatarTitle: 'アバター',
      avatarDescription: '新しいアバターをアップロードするか、現在のアバターを削除できます。',
      currentAvatarAlt: '現在のアバター',
      noAvatar: 'アバターなし',
      avatarFileLabel: 'アバターファイル',
      uploadAction: 'アバターをアップロード',
      uploadPending: 'アップロード中…',
      uploadSuccess: 'アバターをアップロードしました。',
      uploadError: 'アバターのアップロードに失敗しました。',
      deleteAction: 'アバターを削除',
      deletePending: '削除中…',
      deleteSuccess: 'アバターを削除しました。',
      deleteError: 'アバターの削除に失敗しました。',
      emailTitle: 'メール変更',
      emailDescription: '新しいアドレスに確認メールを送り、返却されたトークンで確定します。',
      newEmailLabel: '新しいメール',
      newEmailPlaceholder: 'new-email@example.com',
      requestAction: 'メール変更を申請',
      requestPending: '申請中…',
      requestError: 'メール変更申請に失敗しました。',
      confirmTokenLabel: 'メール確認トークン',
      confirmTokenPlaceholder: 'verification-token',
      confirmAction: 'メール変更を確定',
      confirmPending: '確認中…',
      confirmError: 'メール変更の確定に失敗しました。',
    },
    sessions: {
      title: 'アクティブセッション',
      description: '現在のログインセッションを確認して失効できます。',
      columns: ['デバイス', 'IP', '現在', '作成日時', '最終アクティブ', '操作'],
      emptyTitle: 'アクティブセッションはありません',
      emptyDescription: '現在のユーザーには有効なログインセッションがありません。',
      unknownDevice: '不明なデバイス',
      unavailable: '利用不可',
      currentSession: '現在のセッション',
      revocable: '失効可能',
      revokeAction: '失効',
      revokeDialogTitle: (device) => `セッション ${device} を失効しますか？`,
      revokeDialogDescription: '選択した refresh token を即時に無効化します。',
      revokeDialogConfirm: 'セッションを失効',
      revokeSuccess: 'セッションを失効しました。',
    },
    cards: {
      identityTitle: '本人情報',
      identityDescription: '表示名、連絡先、アバター、言語設定。',
      securityTitle: 'セキュリティ制御',
      securityDescription: 'パスワードと TOTP の設定。',
      emailTitle: 'メールライフサイクル',
      emailDescription: 'メール変更の申請と確認。',
    },
    dialog: {
      confirmAction: '確認',
    },
  },
};

export function useProfileCopy() {
  const { currentLocale, selectedLocale } = useRuntimeLocale();

  return {
    currentLocale,
    selectedLocale,
    copy: resolveLocaleRecord(selectedLocale, COPY as Record<RuntimeLocale, ProfileCopy>, currentLocale) as ProfileCopy,
  };
}

export function formatProfileDateTime(
  value: string | null | undefined,
  locale: SupportedUiLocale | RuntimeLocale,
  fallback: string,
) {
  return formatLocaleDateTime(locale, value ?? null, fallback);
}
