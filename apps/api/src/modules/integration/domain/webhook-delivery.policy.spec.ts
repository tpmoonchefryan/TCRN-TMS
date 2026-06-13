// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import { WEBHOOK_EVENT_CATALOG } from '@tcrn/shared';

import {
  buildWebhookPayloadEnvelope,
  getTcrnWebhookEventOrThrow,
  redactWebhookPayloadEnvelope,
  signWebhookPayload,
  verifyWebhookSignature,
} from './webhook-delivery.policy';

const EXPECTED_EVENT_CODES = [
  'customer.created',
  'customer.updated',
  'customer.deactivated',
  'membership.created',
  'membership.renewed',
  'membership.expired',
  'marshmallow.received',
  'marshmallow.approved',
  'report.completed',
  'report.failed',
  'import.completed',
  'import.failed',
];

describe('webhook delivery policy', () => {
  it('exposes the Phase 7 TCRN-owned event catalog with explicit payload authority', () => {
    expect(WEBHOOK_EVENT_CATALOG.map((entry) => entry.eventCode)).toEqual(EXPECTED_EVENT_CODES);

    for (const item of WEBHOOK_EVENT_CATALOG) {
      expect(item.payloadVersion).toBe('v1');
      expect(item.producer).toMatch(/\w/);
      expect(item.subscriptionEligible).toBe(true);
      expect(item.schemaRef).toBe(`webhook.payload.${item.eventCode}.v1`);
      expect(['none', 'reference', 'limited_pii']).toContain(item.piiClass);
    }
  });

  it('fails closed for provider-created or unknown event codes', () => {
    expect(() => getTcrnWebhookEventOrThrow('provider.created')).toThrow(
      "Webhook event 'provider.created' is not registered by TCRN"
    );
  });

  it('builds a versioned payload envelope and redacted delivery summary', () => {
    const envelope = buildWebhookPayloadEnvelope({
      eventId: 'evt_1',
      eventCode: 'membership.renewed',
      tenantId: '11111111-1111-4111-8111-111111111111',
      occurredAt: '2026-05-31T00:00:00.000Z',
      idempotencyKey: 'membership.renewed:sub-1:evt-1',
      correlationId: 'trace-1',
      data: {
        membershipId: 'membership-1',
        email: 'should-not-appear-in-redacted-summary@example.com',
      },
    });
    const redacted = redactWebhookPayloadEnvelope(envelope);

    expect(envelope.payloadVersion).toBe('v1');
    expect(envelope.producer).toBe('membership');
    expect(redacted.dataSummary.rawPayloadStored).toBe(false);
    expect(JSON.stringify(redacted)).not.toContain('should-not-appear');
  });

  it('signs payloads, rejects stale signatures, and tracks replayed signatures', () => {
    const payload = { eventCode: 'customer.created', payloadVersion: 'v1', data: { id: 'c_1' } };
    const timestamp = new Date('2026-05-31T00:00:00.000Z');
    const signed = signWebhookPayload(payload, 'secret', timestamp);
    const usedSignatureKeys = new Set<string>();

    expect(
      verifyWebhookSignature({
        payload,
        secret: 'secret',
        timestamp,
        signature: signed.headers['x-tcrn-signature'],
        now: new Date('2026-05-31T00:04:59.000Z'),
        usedSignatureKeys,
      })
    ).toMatchObject({ valid: true });

    expect(
      verifyWebhookSignature({
        payload,
        secret: 'secret',
        timestamp,
        signature: signed.headers['x-tcrn-signature'],
        now: new Date('2026-05-31T00:05:01.000Z'),
      })
    ).toMatchObject({ valid: false, reason: 'timestamp_outside_replay_window' });

    expect(
      verifyWebhookSignature({
        payload,
        secret: 'secret',
        timestamp,
        signature: signed.headers['x-tcrn-signature'],
        now: new Date('2026-05-31T00:04:00.000Z'),
        usedSignatureKeys,
      })
    ).toMatchObject({ valid: false, reason: 'signature_replay' });
  });
});
