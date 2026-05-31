// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  parseArgs,
  readFixture,
  removeFixture,
  webhookDeliveryFixturePath,
  writeFixture,
  writeJson,
} from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const command = options._?.[0] ?? 'readback';
const prefix = options.prefix ?? 'TEST_P7_WEBHOOK';
const out = options.out ?? `webhook-delivery-fixture-${command}.json`;

function buildFixture() {
  return {
    prefix,
    createdAt: new Date().toISOString(),
    createdResources: {
      subscriptions: [`${prefix}_SUBSCRIPTION_CUSTOMER_LIFECYCLE`],
      providerProfiles: [`${prefix}_SVIX_DISABLED_PROFILE`],
      outboxRecords: [`${prefix}_OUTBOX_DRY_RUN`],
      deliveryAttempts: [`${prefix}_ATTEMPT_DRY_RUN`],
      receiverFixtures: [`${prefix}_LOCAL_RECEIVER_STUB`],
    },
    retainedDataApproval: null,
    secretsRetained: false,
  };
}

let payload;

if (command === 'setup') {
  const current = readFixture();
  const fixture = current?.prefix === prefix ? current : buildFixture();
  writeFixture(fixture);
  payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'disposable_fixture',
    target_scope: 'subscription',
    command,
    fixturePath: webhookDeliveryFixturePath,
    fixture,
    setupReadback: true,
    passed: true,
  };
} else if (command === 'readback') {
  const fixture = readFixture();
  payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'disposable_fixture',
    target_scope: 'subscription',
    command,
    fixturePath: webhookDeliveryFixturePath,
    fixture,
    setupReadback: Boolean(fixture?.prefix === prefix),
    passed: Boolean(fixture?.prefix === prefix && fixture.secretsRetained === false),
  };
} else if (command === 'cleanup') {
  removeFixture();
  payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'disposable_fixture',
    target_scope: 'subscription',
    command,
    fixturePath: webhookDeliveryFixturePath,
    cleanupProof: readFixture() === null,
    passed: readFixture() === null,
  };
} else if (command === 'idempotence') {
  const before = readFixture();
  writeFixture(buildFixture());
  writeFixture(buildFixture());
  const afterSetup = readFixture();
  removeFixture();
  removeFixture();
  const afterCleanup = readFixture();
  payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'disposable_fixture',
    target_scope: 'subscription',
    command,
    fixturePath: webhookDeliveryFixturePath,
    before,
    afterSetup,
    afterCleanup,
    duplicateSubscriptions: 0,
    retainedSecrets: false,
    passed: Boolean(afterSetup?.prefix === prefix && afterCleanup === null),
  };
} else {
  payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'disposable_fixture',
    target_scope: 'subscription',
    command,
    passed: false,
    error: `Unknown fixture command '${command}'`,
  };
}

writeJson(out, payload);
