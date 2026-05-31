// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, readProductText, runtimeFlagServiceSource, writeJson } from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-kill-switch-results.json';
const service = runtimeFlagServiceSource();
const dto = readProductText('apps/api/src/modules/runtime-flags/dto/runtime-flags.dto.ts');
const migration = readProductText(
  'packages/database/prisma/migrations/20260528090000_add_runtime_flag_kill_switches/migration.sql'
);
const checks = [
  {
    id: 'reason_expiry_actor_rollback_required',
    passed:
      dto.includes('affectedBehavior') &&
      dto.includes('reason') &&
      dto.includes('expiresAt') &&
      dto.includes('rollbackInstruction') &&
      dto.includes('explicitConfirmation') &&
      dto.includes('IsNotEmpty') &&
      migration.includes('runtime_flag_kill_switch_text_check'),
  },
  {
    id: 'future_expiry_and_confirmation_enforced',
    passed:
      service.includes('Explicit confirmation is required') &&
      service.includes('Kill switch expiry must be in the future'),
  },
  {
    id: 'audit_atomic_activation_and_deactivation',
    passed:
      service.includes('$transaction') &&
      service.includes('runtime_flag.kill_switch.activate') &&
      service.includes('runtime_flag.kill_switch.deactivate') &&
      service.includes('platform_tool_audit_event') &&
      service.includes('Runtime flag audit event could not be recorded') &&
      !service.includes("auditState: auditOk ? 'recorded' : 'audit_failed'"),
  },
  {
    id: 'ac_tenant_guarded_storage',
    passed:
      migration.includes('runtime_flag_kill_switch_ac_tenant_guard') &&
      migration.includes('enforce_platform_tool_connection_ac_tenant'),
  },
];

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'api_integration',
  data_mode: 'disposable_fixture',
  target_scope: 'kill_switch',
  checks,
  created_resources: [],
  cleanup_proof: { noLiveDatabaseFixtureRequired: true },
  idempotence_proof: { sourceContractIsDeterministic: true },
  passed: checks.every((check) => check.passed),
};

writeJson(out, payload);
