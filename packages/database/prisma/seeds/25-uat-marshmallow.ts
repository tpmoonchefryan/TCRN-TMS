// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Marshmallow Messages - Creates marshmallow config and messages for testing

import { PrismaClient } from '@prisma/client';
import { UatTenantResult } from './20-uat-tenant';
import { UatOrganizationResult } from './21-uat-organization';

// Sample messages for variety
const SAMPLE_MESSAGES = {
  positive: [
    'I love your streams! You always brighten my day.',
    'Your content is amazing! Keep up the great work!',
    'Thank you for being such an inspiration to all of us.',
    'Your singing voice is incredible! When is the next cover?',
    'I have been following you for 2 years now. Best decision ever!',
    'Your gaming skills are unmatched! Teach me your ways!',
    'The collaboration last week was absolutely epic!',
    'Your art streams are so relaxing to watch.',
    'Happy anniversary! Here is to many more years!',
    'You helped me through a tough time. Thank you so much.',
  ],
  questions: [
    'What is your favorite game to stream?',
    'Will you do a Q&A stream soon?',
    'What inspired you to become a VTuber?',
    'Do you have any advice for aspiring content creators?',
    'What is your favorite food?',
    'Are you planning any special events for the holidays?',
    'Which game would you like to try next?',
    'How do you stay so positive all the time?',
    'What is your morning routine like?',
    'Any book recommendations?',
  ],
  spam: [
    'Check out my channel!!!',
    'Follow me for free stuff',
    'Click this link for rewards',
    'Subscribe to my channel please',
    'I will give you 1000 followers if you follow me',
  ],
};

export async function seedUatMarshmallow(
  prisma: PrismaClient,
  uatTenants: UatTenantResult,
  uatOrg: UatOrganizationResult
): Promise<void> {
  console.log('  → Creating UAT marshmallow configurations and messages...');

  const systemUserId = '00000000-0000-0000-0000-000000000001';

  // ==========================================================================
  // UAT_CORP Marshmallow
  // ==========================================================================
  const corpSchema = uatTenants.corpSchemaName;
  const corpTalents = ['TALENT_SAKURA', 'TALENT_LUNA', 'TALENT_HANA', 'TALENT_MELODY'];

  for (const talentCode of corpTalents) {
    const talentId = uatOrg.talents[talentCode];
    if (!talentId) continue;

    // Create marshmallow config
    const configResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${corpSchema}".marshmallow_config 
       (id, talent_id, is_enabled, title, welcome_text, placeholder_text, thank_you_text, 
        allow_anonymous, captcha_mode, moderation_enabled, auto_approve, profanity_filter_enabled,
        external_blocklist_enabled, max_message_length, min_message_length, rate_limit_per_ip,
        rate_limit_window_hours, reactions_enabled, allowed_reactions, theme,
        created_at, updated_at, version)
       VALUES (gen_random_uuid(), $1::uuid, true, $2, $3, $4, $5, 
               true, 'auto', true, false, true, true, 500, 1, 5, 1, true, 
               ARRAY['❤️', '👍', '😊', '🎉', '💯'], '{}'::jsonb,
               now(), now(), 1)
       ON CONFLICT (talent_id) DO UPDATE SET is_enabled = true
       RETURNING id`,
      talentId,
      `Messages for ${talentCode.replace('TALENT_', '')}`,
      `Welcome! Send me a message and I will try to respond!`,
      `Write your message here...`,
      `Thank you for your message! I really appreciate it!`
    );
    const configId = configResult[0].id;

    // Create messages with different statuses
    const messagesToCreate = [
      // Pending messages (to be reviewed)
      ...Array(5).fill(null).map((_, i) => ({
        status: 'pending',
        content: SAMPLE_MESSAGES.questions[i % SAMPLE_MESSAGES.questions.length],
        isAnonymous: i % 2 === 0,
        senderName: i % 2 === 0 ? null : `Fan_${i}`,
      })),
      // Approved messages
      ...Array(8).fill(null).map((_, i) => ({
        status: 'approved',
        content: SAMPLE_MESSAGES.positive[i % SAMPLE_MESSAGES.positive.length],
        isAnonymous: i % 3 === 0,
        senderName: i % 3 === 0 ? null : `Supporter_${i}`,
        reply: i % 2 === 0 ? `Thank you so much! 💕` : null,
      })),
      // Rejected messages (spam)
      ...Array(2).fill(null).map((_, i) => ({
        status: 'rejected',
        content: SAMPLE_MESSAGES.spam[i % SAMPLE_MESSAGES.spam.length],
        isAnonymous: true,
        senderName: null,
        rejectionReason: 'spam',
      })),
    ];

    for (const msg of messagesToCreate) {
      const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const reactionCounts = { '❤️': Math.floor(Math.random() * 10), '👍': Math.floor(Math.random() * 5) };
      const moderatedBy = msg.status !== 'pending' ? systemUserId : null;
      const repliedBy = (msg as { reply?: string }).reply ? systemUserId : null;
      
      // Note: is_read defaults to false for all messages, even approved ones
      // Messages should only be marked as read when explicitly done so in streamer mode
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${corpSchema}".marshmallow_message 
         (id, config_id, talent_id, content, sender_name, is_anonymous, status, 
          rejection_reason, moderated_at, moderated_by, is_read, is_starred, is_pinned,
          reply_content, replied_at, replied_by, reaction_counts, ip_address, 
          fingerprint_hash, profanity_flags, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6,
                 $7, $8::timestamptz, ${moderatedBy ? `'${moderatedBy}'::uuid` : 'NULL'}, $9, $10, false,
                 $11, $12::timestamptz, ${repliedBy ? `'${repliedBy}'::uuid` : 'NULL'}, $13::jsonb, '192.168.1.1'::inet,
                 md5(random()::text), ARRAY[]::varchar[], $14::timestamptz)`,
        configId, talentId, msg.content, msg.senderName, msg.isAnonymous, msg.status,
        (msg as { rejectionReason?: string }).rejectionReason || null,
        msg.status !== 'pending' ? new Date().toISOString() : null,
        false, // is_read: approved messages should default to unread
        Math.random() > 0.7,
        (msg as { reply?: string }).reply || null,
        (msg as { reply?: string }).reply ? new Date().toISOString() : null,
        JSON.stringify(reactionCounts),
        createdAt.toISOString()
      );
    }
  }

  console.log(`    ✓ Created marshmallow configs and messages for 4 talents in UAT_CORP`);

  // ==========================================================================
  // UAT_SOLO Marshmallow
  // ==========================================================================
  const soloSchema = uatTenants.soloSchemaName;
  const soloTalents = ['TALENT_SOLO_STAR', 'TALENT_INDIE_CREATOR'];

  for (const talentCode of soloTalents) {
    const talentId = uatOrg.talents[talentCode];
    if (!talentId) continue;

    // Create marshmallow config
    const configResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${soloSchema}".marshmallow_config 
       (id, talent_id, is_enabled, title, welcome_text, placeholder_text, thank_you_text, 
        allow_anonymous, captcha_mode, moderation_enabled, auto_approve, profanity_filter_enabled,
        external_blocklist_enabled, max_message_length, min_message_length, rate_limit_per_ip,
        rate_limit_window_hours, reactions_enabled, allowed_reactions, theme,
        created_at, updated_at, version)
       VALUES (gen_random_uuid(), $1::uuid, true, $2, $3, $4, $5, 
               true, 'auto', true, false, true, true, 500, 1, 5, 1, true, 
               ARRAY['❤️', '👍', '😊', '🎉', '💯'], '{}'::jsonb,
               now(), now(), 1)
       ON CONFLICT (talent_id) DO UPDATE SET is_enabled = true
       RETURNING id`,
      talentId,
      `棉花糖 - ${talentCode.replace('TALENT_', '')}`,
      `欢迎留言！我会尽量回复每一条消息！`,
      `在这里写下你的留言...`,
      `感谢你的留言！我非常感激！`
    );
    const configId = configResult[0].id;

    // Create fewer messages for solo creator
    const soloMessages = [
      { status: 'pending', content: '加油！一直支持你！', isAnonymous: true },
      { status: 'pending', content: '下次直播什么时候？', isAnonymous: false, senderName: '老粉丝' },
      { status: 'approved', content: '你的视频帮助我度过了困难时期，谢谢！', isAnonymous: false, senderName: '感谢的人' },
      { status: 'approved', content: '歌声太好听了！', isAnonymous: true, reply: '谢谢你的支持！💕' },
      { status: 'rejected', content: '关注我的频道获取免费礼物', isAnonymous: true, rejectionReason: 'spam' },
    ];

    for (const msg of soloMessages) {
      const reactionCounts = { '❤️': Math.floor(Math.random() * 5) };
      const moderatedBy = msg.status !== 'pending' ? systemUserId : null;
      const repliedBy = (msg as { reply?: string }).reply ? systemUserId : null;
      
      // Note: is_read defaults to false for all messages, even approved ones
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${soloSchema}".marshmallow_message 
         (id, config_id, talent_id, content, sender_name, is_anonymous, status, 
          rejection_reason, moderated_at, moderated_by, is_read, is_starred, is_pinned,
          reply_content, replied_at, replied_by, reaction_counts, ip_address, 
          fingerprint_hash, profanity_flags, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6,
                 $7, $8::timestamptz, ${moderatedBy ? `'${moderatedBy}'::uuid` : 'NULL'}, $9, false, false,
                 $10, $11::timestamptz, ${repliedBy ? `'${repliedBy}'::uuid` : 'NULL'}, $12::jsonb, '192.168.1.1'::inet,
                 md5(random()::text), ARRAY[]::varchar[], now())`,
        configId, talentId, msg.content, (msg as { senderName?: string }).senderName || null, msg.isAnonymous, msg.status,
        (msg as { rejectionReason?: string }).rejectionReason || null,
        msg.status !== 'pending' ? new Date().toISOString() : null,
        false, // is_read: approved messages should default to unread
        (msg as { reply?: string }).reply || null,
        (msg as { reply?: string }).reply ? new Date().toISOString() : null,
        JSON.stringify(reactionCounts)
      );
    }
  }

  console.log(`    ✓ Created marshmallow configs and messages for 2 talents in UAT_SOLO`);
}
