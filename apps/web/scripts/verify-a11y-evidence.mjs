// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const options = {
    routes: ['/ac/<acTenantId>/platform-tools'],
    out: 'a11y-summary.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--route' && next) {
      options.routes.push(next);
      index += 1;
    } else if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    }
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const platformToolsPath = path.join(
  webRoot,
  'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
);
const observabilityPath = path.join(
  webRoot,
  'src/domains/observability/screens/ObservabilityScreen.tsx'
);
const runtimeFlagsPath = path.join(
  webRoot,
  'src/domains/runtime-flags/screens/RuntimeFlagsScreen.tsx'
);
const integrationManagementPath = path.join(
  webRoot,
  'src/domains/integration-management/screens/IntegrationManagementScreen.tsx'
);
const platformToolsPagePath = path.join(webRoot, 'src/app/ac/[tenantId]/platform-tools/page.tsx');
const shellPath = path.join(webRoot, 'src/platform/routing/AcShell.tsx');
const platformToolsText = readFileSync(platformToolsPath, 'utf8');
const observabilityText = readFileSync(observabilityPath, 'utf8');
const runtimeFlagsText = readFileSync(runtimeFlagsPath, 'utf8');
const integrationManagementText = readFileSync(integrationManagementPath, 'utf8');
const platformToolsPageText = readFileSync(platformToolsPagePath, 'utf8');
const shellText = readFileSync(shellPath, 'utf8');
const runtimeFlagRoutesRequested = options.routes.some((route) => route.includes('runtime-flags'));
const webhookDeliveryRoutesRequested = options.routes.some((route) =>
  route.includes('webhook-management')
);
const eventBackboneRoutesRequested = options.routes.some(
  (route) => route.includes('event_backbone') || route.includes('event-backbone')
);
const checks = [
  {
    id: 'icon_buttons_have_aria_labels',
    passed:
      platformToolsText.includes('aria-label={`${copy.actions.inspect}') &&
      platformToolsText.includes('aria-label={`${copy.actions.configure}') &&
      platformToolsText.includes('aria-label={`${copy.actions.runCheck}') &&
      platformToolsText.includes('aria-label={`${item.connection.enabled') &&
      (!eventBackboneRoutesRequested ||
        platformToolsText.includes('aria-label={copy.eventBackbone.title}')) &&
      observabilityText.includes('Open external observability handoff') &&
      (!runtimeFlagRoutesRequested ||
        (runtimeFlagsText.includes('aria-label={`${copy.actions.preview}') &&
          runtimeFlagsText.includes('aria-label={`${copy.actions.activate}'))),
  },
  {
    id: 'drawer_has_close_label',
    passed:
      platformToolsText.includes('closeButtonAriaLabel={copy.actions.close}') &&
      observabilityText.includes('closeButtonAriaLabel={closeDetailsLabel}') &&
      (!runtimeFlagRoutesRequested ||
        runtimeFlagsText.includes('closeButtonAriaLabel={copy.actions.close}')),
  },
  {
    id: 'status_region_exists',
    passed:
      platformToolsText.includes('role="status"') &&
      platformToolsText.includes('aria-live="polite"') &&
      observabilityText.includes('role="status"') &&
      observabilityText.includes('aria-live="polite"') &&
      (!runtimeFlagRoutesRequested ||
        (runtimeFlagsText.includes('role="status"') &&
          runtimeFlagsText.includes('aria-live="polite"'))),
  },
  {
    id: 'mobile_touch_targets_are_explicit',
    passed:
      platformToolsText.includes('h-11 w-11') &&
      platformToolsText.includes('sm:h-9 sm:w-9') &&
      observabilityText.includes('h-11 w-11') &&
      (!runtimeFlagRoutesRequested || runtimeFlagsText.includes('h-11 w-11')),
  },
  {
    id: 'mobile_uses_true_list_not_desktop_table',
    passed:
      platformToolsText.includes('md:hidden') &&
      platformToolsText.includes('hidden md:block') &&
      (!eventBackboneRoutesRequested ||
        (platformToolsText.includes('data-event-backbone-summary="ac-readiness"') &&
          platformToolsText.includes('data-overflow-check="event-backbone-stream-table"') &&
          platformToolsText.includes('data-overflow-check="event-backbone-consumer-table"'))) &&
      observabilityText.includes('md:grid-cols-2') &&
      (!runtimeFlagRoutesRequested ||
        (runtimeFlagsText.includes('data-runtime-flags-mobile-list') &&
          runtimeFlagsText.includes('hidden overflow-x-auto md:block'))),
  },
  {
    id: 'mobile_nav_route_has_shell_entry',
    passed:
      shellText.includes("key: 'platform-tools'") &&
      shellText.includes('/platform-tools') &&
      (!eventBackboneRoutesRequested ||
        platformToolsPageText.includes("rawFamily === 'event_backbone'")) &&
      (!runtimeFlagRoutesRequested ||
        (shellText.includes("key: 'runtime-flags'") && shellText.includes('/runtime-flags'))),
  },
  {
    id: 'horizontal_overflow_is_bounded',
    passed:
      (platformToolsText.includes('overflow-x-auto') || platformToolsText.includes('min-w-[860px]')) &&
      (!eventBackboneRoutesRequested ||
        (platformToolsText.includes('min-w-[620px]') &&
          platformToolsText.includes('min-w-[700px]') &&
          platformToolsText.includes('break-all'))) &&
      observabilityText.includes('grid gap-3 md:grid-cols-2 xl:grid-cols-3') &&
      (!runtimeFlagRoutesRequested ||
        (runtimeFlagsText.includes('data-runtime-flags-mobile-list') &&
          runtimeFlagsText.includes('break-words'))),
  },
  {
    id: 'no_iframe_dashboard_clone',
    passed:
      !platformToolsText.includes('<iframe') &&
      !observabilityText.includes('<iframe') &&
      !runtimeFlagsText.includes('<iframe'),
  },
  {
    id: 'runtime_flag_kill_switch_confirmation',
    passed:
      !runtimeFlagRoutesRequested ||
      (runtimeFlagsText.includes('data-runtime-kill-switch-confirmation') &&
        runtimeFlagsText.includes('explicitConfirmation') &&
        runtimeFlagsText.includes('disabled={!canSubmitKillSwitch}')),
  },
];
checks.push(
  runtimeFlagRoutesRequested
    ? {
        id: 'runtime_flag_absence_and_state_markers',
        passed:
          runtimeFlagsText.includes('data-runtime-flags-state') &&
          runtimeFlagsText.includes('data-runtime-provider-readiness') &&
          runtimeFlagsText.includes('data-runtime-kill-switch-panel'),
      }
    : {
        id: 'tenant_external_observability_absence_marker',
        passed: observabilityText.includes('data-external-observability-absent'),
      }
);
if (eventBackboneRoutesRequested) {
  checks.push(
    {
      id: 'event_backbone_ac_summary_markers',
      passed:
        platformToolsText.includes('data-event-backbone-summary="ac-readiness"') &&
        platformToolsText.includes('data-event-backbone-stream=') &&
        platformToolsText.includes('data-event-backbone-consumer='),
    },
    {
      id: 'event_backbone_raw_payload_copy_and_no_iframe',
      passed:
        platformToolsText.includes('copy.eventBackbone.noRawPayload') &&
        platformToolsText.includes('rawPayloadAccess') &&
        !platformToolsText.includes('<iframe'),
    },
    {
      id: 'event_backbone_query_route_supported',
      passed:
        platformToolsPageText.includes("rawFamily === 'event_backbone'") &&
        platformToolsPageText.includes("'event_backbone'"),
    }
  );
}
if (webhookDeliveryRoutesRequested) {
  checks.push(
    {
      id: 'webhook_delivery_drawer_has_close_label',
      passed: integrationManagementText.includes('Close delivery attempts drawer'),
    },
    {
      id: 'webhook_delivery_reason_prevents_empty_replay',
      passed:
        integrationManagementText.includes('Enter a reason before creating a test delivery') &&
        integrationManagementText.includes('Enter a reason before replaying a delivery attempt'),
    },
    {
      id: 'webhook_delivery_no_provider_iframe',
      passed: !integrationManagementText.includes('<iframe'),
    },
    {
      id: 'webhook_delivery_mobile_drawer_uses_flow_content',
      passed:
        integrationManagementText.includes('Attempt Timeline') &&
        integrationManagementText.includes('grid gap-3 text-sm sm:grid-cols-2'),
    }
  );
}
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: webhookDeliveryRoutesRequested
    ? 'webhook-delivery-adapter'
    : eventBackboneRoutesRequested
      ? 'event-backbone-adapter'
      : runtimeFlagRoutesRequested
        ? 'runtime-feature-flag-adapter'
        : 'observability_adapter_foundation',
  routes: Array.from(new Set(options.routes)),
  files: [
    path.relative(webRoot, platformToolsPath),
    path.relative(webRoot, observabilityPath),
    path.relative(webRoot, runtimeFlagsPath),
    path.relative(webRoot, integrationManagementPath),
    path.relative(webRoot, platformToolsPagePath),
    path.relative(webRoot, shellPath),
  ],
  checks,
  passed: checks.every((check) => check.passed),
};

mkdirSync(path.dirname(options.out), { recursive: true });
writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
