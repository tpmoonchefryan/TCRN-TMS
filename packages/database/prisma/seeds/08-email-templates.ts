// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const emailTemplates = [
  // System Templates
  {
    code: 'password_reset',
    nameEn: 'Password Reset',
    nameZh: '密码重置',
    nameJa: 'パスワードリセット',
    subjectEn: 'Reset Your Password - TCRN TMS',
    subjectZh: '重置您的密码 - TCRN TMS',
    subjectJa: 'パスワードをリセット - TCRN TMS',
    bodyHtmlEn: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Password Reset Request</h2>
  <p>Hello {{userName}},</p>
  <p>We received a request to reset your password. Click the button below to create a new password:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{resetLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
  </p>
  <p>This link will expire in {{expiresIn}}.</p>
  <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - Talent CRM Network</p>
</body>
</html>`,
    bodyHtmlZh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>密码重置请求</h2>
  <p>您好 {{userName}}，</p>
  <p>我们收到了重置您密码的请求。请点击下方按钮创建新密码：</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{resetLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">重置密码</a>
  </p>
  <p>此链接将在 {{expiresIn}} 后失效。</p>
  <p>如果您没有请求重置密码，请忽略此邮件。如有疑虑，请联系客服。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - 艺人客户关系管理网络</p>
</body>
</html>`,
    bodyHtmlJa: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>パスワードリセットのリクエスト</h2>
  <p>{{userName}} 様</p>
  <p>パスワードリセットのリクエストを受け付けました。下のボタンをクリックして新しいパスワードを作成してください：</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{resetLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">パスワードをリセット</a>
  </p>
  <p>このリンクは {{expiresIn}} 後に無効になります。</p>
  <p>パスワードリセットをリクエストしていない場合は、このメールを無視してください。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - タレントCRMネットワーク</p>
</body>
</html>`,
    bodyTextEn: `Password Reset Request

Hello {{userName}},

We received a request to reset your password. Visit the following link to create a new password:

{{resetLink}}

This link will expire in {{expiresIn}}.

If you didn't request this password reset, please ignore this email.

TCRN TMS - Talent CRM Network`,
    variables: ['userName', 'resetLink', 'expiresIn'],
    category: 'system',
  },
  {
    code: 'login_verification',
    nameEn: 'Login Verification Code',
    nameZh: '登录验证码',
    nameJa: 'ログイン認証コード',
    subjectEn: 'Your Login Verification Code - TCRN TMS',
    subjectZh: '您的登录验证码 - TCRN TMS',
    subjectJa: 'ログイン認証コード - TCRN TMS',
    bodyHtmlEn: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Login Verification</h2>
  <p>Hello {{userName}},</p>
  <p>Your verification code is:</p>
  <p style="text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; color: #4F46E5;">{{verificationCode}}</p>
  <p>This code will expire in {{expiresIn}}.</p>
  <p>If you didn't try to log in, please secure your account immediately.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - Talent CRM Network</p>
</body>
</html>`,
    bodyHtmlZh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>登录验证</h2>
  <p>您好 {{userName}}，</p>
  <p>您的验证码是：</p>
  <p style="text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; color: #4F46E5;">{{verificationCode}}</p>
  <p>此验证码将在 {{expiresIn}} 后失效。</p>
  <p>如果您没有尝试登录，请立即保护您的账户安全。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - 艺人客户关系管理网络</p>
</body>
</html>`,
    bodyHtmlJa: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>ログイン認証</h2>
  <p>{{userName}} 様</p>
  <p>認証コード：</p>
  <p style="text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; color: #4F46E5;">{{verificationCode}}</p>
  <p>このコードは {{expiresIn}} 後に無効になります。</p>
  <p>ログインを試みていない場合は、すぐにアカウントを保護してください。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - タレントCRMネットワーク</p>
</body>
</html>`,
    variables: ['userName', 'verificationCode', 'expiresIn'],
    category: 'system',
  },
  {
    code: 'security_alert',
    nameEn: 'Security Alert',
    nameZh: '安全告警',
    nameJa: 'セキュリティアラート',
    subjectEn: 'Security Alert: Unusual Login Activity - TCRN TMS',
    subjectZh: '安全告警：异常登录活动 - TCRN TMS',
    subjectJa: 'セキュリティアラート：異常なログイン - TCRN TMS',
    bodyHtmlEn: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #DC2626;">⚠️ Security Alert</h2>
  <p>Hello {{userName}},</p>
  <p>We detected an unusual login to your account:</p>
  <div style="background-color: #FEF2F2; padding: 15px; border-radius: 6px; margin: 20px 0;">
    <p><strong>Time:</strong> {{loginTime}}</p>
    <p><strong>Location:</strong> {{location}}</p>
    <p><strong>Device:</strong> {{device}}</p>
    <p><strong>IP Address:</strong> {{ipAddress}}</p>
  </div>
  <p>If this was you, you can ignore this email.</p>
  <p>If you don't recognize this activity, please secure your account immediately by changing your password.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - Talent CRM Network</p>
</body>
</html>`,
    bodyHtmlZh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #DC2626;">⚠️ 安全告警</h2>
  <p>您好 {{userName}}，</p>
  <p>我们检测到您的账户存在异常登录：</p>
  <div style="background-color: #FEF2F2; padding: 15px; border-radius: 6px; margin: 20px 0;">
    <p><strong>时间：</strong>{{loginTime}}</p>
    <p><strong>位置：</strong>{{location}}</p>
    <p><strong>设备：</strong>{{device}}</p>
    <p><strong>IP地址：</strong>{{ipAddress}}</p>
  </div>
  <p>如果这是您本人的操作，请忽略此邮件。</p>
  <p>如果您不认识此活动，请立即更改密码以保护您的账户安全。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - 艺人客户关系管理网络</p>
</body>
</html>`,
    bodyHtmlJa: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #DC2626;">⚠️ セキュリティアラート</h2>
  <p>{{userName}} 様</p>
  <p>お客様のアカウントで異常なログインが検出されました：</p>
  <div style="background-color: #FEF2F2; padding: 15px; border-radius: 6px; margin: 20px 0;">
    <p><strong>日時：</strong>{{loginTime}}</p>
    <p><strong>場所：</strong>{{location}}</p>
    <p><strong>デバイス：</strong>{{device}}</p>
    <p><strong>IPアドレス：</strong>{{ipAddress}}</p>
  </div>
  <p>これがお客様ご自身の操作であれば、このメールは無視してください。</p>
  <p>このアクティビティに心当たりがない場合は、すぐにパスワードを変更してアカウントを保護してください。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - タレントCRMネットワーク</p>
</body>
</html>`,
    variables: ['userName', 'loginTime', 'location', 'device', 'ipAddress'],
    category: 'system',
  },

  // Business Templates
  {
    code: 'marshmallow_new_message',
    nameEn: 'New Marshmallow Message',
    nameZh: '新棉花糖消息',
    nameJa: '新しいマシュマロメッセージ',
    subjectEn: 'You have a new message on Marshmallow! 🍬',
    subjectZh: '您收到了一条新的棉花糖消息！🍬',
    subjectJa: '新しいマシュマロメッセージが届きました！🍬',
    bodyHtmlEn: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>New Message on Marshmallow 🍬</h2>
  <p>Hello {{talentName}},</p>
  <p>You have received a new message on your Marshmallow page!</p>
  <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4F46E5;">
    <p style="margin: 0; font-style: italic;">"{{messagePreview}}"</p>
  </div>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{dashboardLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Message</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - Talent CRM Network</p>
</body>
</html>`,
    bodyHtmlZh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>新的棉花糖消息 🍬</h2>
  <p>您好 {{talentName}}，</p>
  <p>您在棉花糖页面收到了一条新消息！</p>
  <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4F46E5;">
    <p style="margin: 0; font-style: italic;">"{{messagePreview}}"</p>
  </div>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{dashboardLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">查看消息</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - 艺人客户关系管理网络</p>
</body>
</html>`,
    bodyHtmlJa: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>新しいマシュマロメッセージ 🍬</h2>
  <p>{{talentName}} 様</p>
  <p>マシュマロページに新しいメッセージが届きました！</p>
  <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4F46E5;">
    <p style="margin: 0; font-style: italic;">"{{messagePreview}}"</p>
  </div>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{dashboardLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">メッセージを見る</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - タレントCRMネットワーク</p>
</body>
</html>`,
    variables: ['talentName', 'messagePreview', 'dashboardLink'],
    category: 'business',
  },
  {
    code: 'membership_expiring',
    nameEn: 'Membership Expiring Soon',
    nameZh: '会员即将到期',
    nameJa: 'メンバーシップ有効期限間近',
    subjectEn: 'Your membership is expiring soon - TCRN TMS',
    subjectZh: '您的会员即将到期 - TCRN TMS',
    subjectJa: 'メンバーシップがまもなく期限切れ - TCRN TMS',
    bodyHtmlEn: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Membership Expiring Soon</h2>
  <p>Hello {{customerName}},</p>
  <p>Your <strong>{{membershipLevel}}</strong> membership with <strong>{{talentName}}</strong> will expire on <strong>{{expiryDate}}</strong>.</p>
  <p>Renew now to continue enjoying your benefits!</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{renewLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Renew Membership</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - Talent CRM Network</p>
</body>
</html>`,
    bodyHtmlZh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>会员即将到期</h2>
  <p>您好 {{customerName}}，</p>
  <p>您在 <strong>{{talentName}}</strong> 的 <strong>{{membershipLevel}}</strong> 会员将于 <strong>{{expiryDate}}</strong> 到期。</p>
  <p>立即续费以继续享受会员权益！</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{renewLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">续费会员</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - 艺人客户关系管理网络</p>
</body>
</html>`,
    bodyHtmlJa: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>メンバーシップ有効期限間近</h2>
  <p>{{customerName}} 様</p>
  <p><strong>{{talentName}}</strong> の <strong>{{membershipLevel}}</strong> メンバーシップは <strong>{{expiryDate}}</strong> に期限切れとなります。</p>
  <p>今すぐ更新して特典を引き続きお楽しみください！</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{renewLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">メンバーシップを更新</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - タレントCRMネットワーク</p>
</body>
</html>`,
    variables: ['customerName', 'membershipLevel', 'talentName', 'expiryDate', 'renewLink'],
    category: 'business',
  },
  {
    code: 'membership_expired',
    nameEn: 'Membership Expired',
    nameZh: '会员已到期',
    nameJa: 'メンバーシップ期限切れ',
    subjectEn: 'Your membership has expired - TCRN TMS',
    subjectZh: '您的会员已到期 - TCRN TMS',
    subjectJa: 'メンバーシップが期限切れ - TCRN TMS',
    bodyHtmlEn: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Membership Expired</h2>
  <p>Hello {{customerName}},</p>
  <p>Your <strong>{{membershipLevel}}</strong> membership with <strong>{{talentName}}</strong> has expired.</p>
  <p>We hope you enjoyed your time as a member! You can renew anytime to regain access to exclusive benefits.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{renewLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Rejoin Now</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - Talent CRM Network</p>
</body>
</html>`,
    bodyHtmlZh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>会员已到期</h2>
  <p>您好 {{customerName}}，</p>
  <p>您在 <strong>{{talentName}}</strong> 的 <strong>{{membershipLevel}}</strong> 会员已到期。</p>
  <p>感谢您作为会员的支持！您可以随时续费以重新获得专属权益。</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{renewLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">立即续费</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - 艺人客户关系管理网络</p>
</body>
</html>`,
    bodyHtmlJa: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>メンバーシップ期限切れ</h2>
  <p>{{customerName}} 様</p>
  <p><strong>{{talentName}}</strong> の <strong>{{membershipLevel}}</strong> メンバーシップが期限切れになりました。</p>
  <p>メンバーとしてのご利用ありがとうございました！いつでも更新して限定特典を再び利用できます。</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{renewLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">今すぐ再加入</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - タレントCRMネットワーク</p>
</body>
</html>`,
    variables: ['customerName', 'membershipLevel', 'talentName', 'renewLink'],
    category: 'business',
  },
  
  // Email Change Verification
  {
    code: 'email_change_verification',
    nameEn: 'Email Change Verification',
    nameZh: '邮箱修改验证',
    nameJa: 'メールアドレス変更確認',
    subjectEn: 'Verify Your New Email Address - TCRN TMS',
    subjectZh: '验证您的新邮箱地址 - TCRN TMS',
    subjectJa: '新しいメールアドレスを確認 - TCRN TMS',
    bodyHtmlEn: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Email Change Verification</h2>
  <p>Hello {{userName}},</p>
  <p>You have requested to change your email address to <strong>{{newEmail}}</strong>.</p>
  <p>Please click the button below to verify this email address:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{verificationLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a>
  </p>
  <p>This link will expire in {{expiresIn}}.</p>
  <p>If you didn't request this change, please ignore this email. Your email address will not be changed.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - Talent CRM Network</p>
</body>
</html>`,
    bodyHtmlZh: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>邮箱修改验证</h2>
  <p>您好 {{userName}}，</p>
  <p>您已请求将邮箱地址修改为 <strong>{{newEmail}}</strong>。</p>
  <p>请点击下方按钮验证此邮箱地址：</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{verificationLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">验证邮箱</a>
  </p>
  <p>此链接将在 {{expiresIn}} 后失效。</p>
  <p>如果您没有请求此更改，请忽略此邮件。您的邮箱地址不会被修改。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - 艺人客户关系管理网络</p>
</body>
</html>`,
    bodyHtmlJa: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>メールアドレス変更確認</h2>
  <p>{{userName}} 様</p>
  <p>メールアドレスを <strong>{{newEmail}}</strong> に変更するリクエストを受け付けました。</p>
  <p>下のボタンをクリックしてメールアドレスを確認してください：</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{verificationLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">メールを確認</a>
  </p>
  <p>このリンクは {{expiresIn}} 後に無効になります。</p>
  <p>この変更をリクエストしていない場合は、このメールを無視してください。メールアドレスは変更されません。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">TCRN TMS - タレントCRMネットワーク</p>
</body>
</html>`,
    bodyTextEn: `Email Change Verification

Hello {{userName}},

You have requested to change your email address to {{newEmail}}.

Please visit the following link to verify this email address:

{{verificationLink}}

This link will expire in {{expiresIn}}.

If you didn't request this change, please ignore this email.

TCRN TMS - Talent CRM Network`,
    variables: ['userName', 'newEmail', 'verificationLink', 'expiresIn'],
    category: 'system',
  },
];

export async function seedEmailTemplates() {
  console.log('Seeding email templates...');

  for (const template of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { code: template.code },
      update: {
        nameEn: template.nameEn,
        nameZh: template.nameZh,
        nameJa: template.nameJa,
        subjectEn: template.subjectEn,
        subjectZh: template.subjectZh,
        subjectJa: template.subjectJa,
        bodyHtmlEn: template.bodyHtmlEn,
        bodyHtmlZh: template.bodyHtmlZh,
        bodyHtmlJa: template.bodyHtmlJa,
        bodyTextEn: template.bodyTextEn,
        variables: template.variables,
        category: template.category,
      },
      create: template,
    });
    console.log(`  Created/Updated template: ${template.code}`);
  }

  console.log(`Seeded ${emailTemplates.length} email templates.`);
}

// Run if executed directly
if (require.main === module) {
  seedEmailTemplates()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
