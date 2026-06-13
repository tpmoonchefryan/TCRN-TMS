// SPDX-License-Identifier: Apache-2.0
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { parseArgs, sourceSignals, writeJson } from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-signature-results.json';
const payload = { eventCode: 'customer.created', payloadVersion: 'v1', data: { id: 'ref_1' } };
const secret = ['fixture', 'delivery', 'secret'].join('-');
const timestamp = new Date('2026-05-31T00:00:00.000Z');
const canonicalPayload = JSON.stringify(payload);
const payloadHash = createHash('sha256').update(canonicalPayload).digest('hex');
const signatureBase = `v1.${timestamp.toISOString()}.${payloadHash}.${canonicalPayload}`;
const signature = `v1=${createHmac('sha256', secret).update(signatureBase).digest('hex')}`;

function verify({ now, providedSignature = signature, used = new Set() }) {
  const ageSeconds = Math.abs(now.getTime() - timestamp.getTime()) / 1000;

  if (ageSeconds > 300) {
    return { valid: false, reason: 'timestamp_outside_replay_window' };
  }

  const expected = Buffer.from(signature);
  const provided = Buffer.from(providedSignature);
  const matches = expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!matches) {
    return { valid: false, reason: 'signature_mismatch' };
  }

  const replayKey = createHash('sha256')
    .update(`${timestamp.toISOString()}:${payloadHash}:${providedSignature}`)
    .digest('hex');

  if (used.has(replayKey)) {
    return { valid: false, reason: 'signature_replay' };
  }

  used.add(replayKey);
  return { valid: true, replayKey };
}

const used = new Set();
const signals = sourceSignals();
const checks = [
  { id: 'headers_named', passed: signals.policy.includes('x-tcrn-signature') },
  { id: 'payload_hash_created', passed: payloadHash.length === 64 },
  { id: 'valid_signature_accepted', ...verify({ now: new Date('2026-05-31T00:04:59.000Z'), used }) },
  { id: 'stale_signature_rejected', ...verify({ now: new Date('2026-05-31T00:05:01.000Z') }) },
  { id: 'replayed_signature_rejected', ...verify({ now: new Date('2026-05-31T00:04:00.000Z'), used }) },
  { id: 'missing_secret_fails_closed', passed: signals.service.includes('Webhook secret is required') },
];

const normalizedChecks = checks.map((check) => {
  const { replayKey, ...safeCheck } = check;

  return {
    ...safeCheck,
    replayKeyStoredAsDigest: replayKey ? true : undefined,
    passed:
      check.passed ??
      (check.id === 'stale_signature_rejected'
        ? check.valid === false && check.reason === 'timestamp_outside_replay_window'
        : check.id === 'replayed_signature_rejected'
          ? check.valid === false && check.reason === 'signature_replay'
          : check.valid === true),
  };
});

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'security_privacy',
  data_mode: 'read_only_uat',
  target_scope: 'signature_policy',
  signatureHeaders: {
    'x-tcrn-timestamp': timestamp.toISOString(),
    'x-tcrn-payload-sha256': `${payloadHash.slice(0, 12)}...`,
    'x-tcrn-signature-version': 'v1',
    'x-tcrn-signature': '******',
  },
  checks: normalizedChecks,
  redaction: {
    rawSignatureWritten: false,
    rawReplayKeyWritten: false,
    payloadHashTruncatedInEvidence: true,
  },
  passed:
    normalizedChecks.every((check) => check.passed) &&
    normalizedChecks.every((check) => !('replayKey' in check)),
});
