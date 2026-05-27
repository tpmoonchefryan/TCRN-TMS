// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, readProductText, writeJson } from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-prometheus-alert-lint.json';
const sourcePath = options.alerts ?? 'infra/prometheus/alerts/tcrn-alerts.yaml';
const source = readProductText(sourcePath);
const alertNames = Array.from(source.matchAll(/^\s*-\s*alert:\s*([A-Za-z0-9_]+)/gm)).map((entry) => entry[1]);
const groupNames = Array.from(source.matchAll(/^\s*-\s*name:\s*([A-Za-z0-9_-]+)/gm)).map((entry) => entry[1]);

const checks = [
  { id: 'has_groups', passed: source.includes('groups:') && groupNames.length > 0 },
  { id: 'has_alert_rules', passed: alertNames.length > 0 },
  { id: 'rules_have_expr_for_labels_annotations', passed: ['expr:', 'for:', 'labels:', 'annotations:'].every((needle) => source.includes(needle)) },
  { id: 'classified_as_readiness_only', passed: !source.includes('alertmanager') && !source.includes('prometheus_server_enabled=true') },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'alert_readiness',
  sourcePath,
  groupNames,
  alertNames,
  checks,
  passed: checks.every((check) => check.passed),
});
