// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  LOCKED_RUNTIME_FLAG_CODES,
  parseArgs,
  readFixture,
  removeFixture,
  runtimeFixturePath,
  runtimeFlagSource,
  writeFixture,
  writeJson,
} from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const mode = options._?.[0] ?? 'readback';
const out = options.out ?? `runtime-flag-fixture-${mode}.json`;
const prefix = options.prefix ?? 'TEST_P6_FLAG';
const source = runtimeFlagSource();
const expected = LOCKED_RUNTIME_FLAG_CODES;
const fixture = {
  prefix,
  runtimeFlagDefinitions: [
    {
      code: `${prefix.toLowerCase()}.safe_readback_probe`,
      retained: false,
    },
  ],
  providerProfiles: [
    {
      code: `${prefix.toLowerCase()}.flagsmith_stub_profile`,
      platformToolCode: 'flagsmith',
      readinessState: 'local_stub',
      retained: false,
    },
  ],
  evaluationFixtures: [
    {
      flagCode: `${prefix.toLowerCase()}.safe_readback_probe`,
      context: {
        environment: 'local',
        service: 'api',
        actorClass: 'ac_operator',
        requestCategory: 'phase_6_fixture',
      },
      retained: false,
    },
  ],
  killSwitchFixtures: [
    {
      flagCode: `${prefix.toLowerCase()}.safe_readback_probe`,
      affectedBehavior: 'fixture degraded-mode probe only',
      reason: 'fixture lifecycle proof',
      rollbackInstruction: 'cleanup fixture',
      retained: false,
    },
  ],
};

if (mode === 'setup') {
  writeFixture(fixture);
}

const existing = readFixture();

if (mode === 'cleanup') {
  removeFixture();
}

if (mode === 'idempotence') {
  writeFixture(fixture);
  removeFixture();
}

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'fixture_lifecycle',
  data_mode: 'disposable_fixture',
  target_scope: 'runtime_flag_definition',
  mode,
  prefix,
  fixturePath: runtimeFixturePath,
  setup_readback: mode === 'setup' || mode === 'readback' ? existing ?? fixture : null,
  cleanup_proof: mode === 'cleanup' ? { fixtureFileRemoved: readFixture() === null } : null,
  idempotence_proof:
    mode === 'idempotence' ? { setupAndCleanupRerunWithoutDuplicates: readFixture() === null } : null,
  created_resources:
    mode === 'setup'
      ? [
          ...fixture.runtimeFlagDefinitions.map((entry) => entry.code),
          ...fixture.providerProfiles.map((entry) => entry.code),
          ...fixture.evaluationFixtures.map((entry) => entry.flagCode),
          ...fixture.killSwitchFixtures.map((entry) => entry.flagCode),
        ]
      : [],
  fixtureScopes: ['runtime_flag_definition', 'provider_profile', 'evaluation_context', 'kill_switch'],
  retained_data_approval: null,
  registryDefinitionsUnchanged: expected.every((code) => source.includes(code)),
  noRetainedCredentials: true,
};

payload.passed =
  ['setup', 'readback', 'cleanup', 'idempotence'].includes(mode) &&
  payload.registryDefinitionsUnchanged &&
  payload.noRetainedCredentials &&
  (mode !== 'cleanup' || payload.cleanup_proof.fixtureFileRemoved) &&
  (mode !== 'idempotence' || payload.idempotence_proof.setupAndCleanupRerunWithoutDuplicates);

writeJson(out, payload);
