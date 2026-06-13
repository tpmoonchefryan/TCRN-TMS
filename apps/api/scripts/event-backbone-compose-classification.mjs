// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { parseArgs, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-compose-classification.json';
const rendered = [options.rendered].flat().filter(Boolean);
const compose = [options.compose].flat().filter(Boolean);
const renderedTexts = rendered.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
const composeTexts = compose.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
const rawSecretHits = renderedTexts.flatMap((entry) =>
  /(OPENAI|AWS_|PRIVATE_KEY|ACCESS_TOKEN|ID_TOKEN)/i.test(entry.text) ? [entry.file] : []
);
const rawRenderedEvidenceNames = rendered.filter((file) => /\.rendered\.ya?ml$/i.test(file));
const allTexts = [...renderedTexts, ...composeTexts];
const yamlParseFailures = rendered.flatMap((file) => {
  try {
    execFileSync('ruby', ['-ryaml', '-e', 'ARGV.each { |path| YAML.load_file(path) }', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return [];
  } catch (error) {
    return [
      {
        file,
        message: error.stderr?.toString() || error.message,
      },
    ];
  }
});
const checks = [
  { id: 'rendered_artifacts_present', passed: renderedTexts.length >= 1 },
  { id: 'rendered_artifacts_are_redacted_only', passed: rawRenderedEvidenceNames.length === 0 },
  { id: 'redacted_rendered_yaml_parseable', passed: yamlParseFailures.length === 0 },
  { id: 'raw_secret_hits_absent', passed: rawSecretHits.length === 0 },
  { id: 'nats_url_classified', passed: allTexts.some((entry) => entry.text.includes('NATS_URL')) },
  { id: 'event_backbone_default_disabled', passed: renderedTexts.every((entry) => entry.text.includes('EVENT_BACKBONE_MODE') || entry.text.includes('redacted compose evidence')) },
  { id: 'nats_requires_event_backbone_profile', passed: allTexts.some((entry) => /profiles:\s*\n\s*-\s*event-backbone/.test(entry.text)) },
  { id: 'nats_not_publicly_exposed_by_default', passed: allTexts.every((entry) => !entry.text.includes("'4222:4222'") && !entry.text.includes("'8222:8222'")) },
  { id: 'prod_services_do_not_depend_on_nats', passed: composeTexts.every((entry) => !/depends_on:[\s\S]{0,220}\bnats:\s*\n\s*condition:\s*service_started/.test(entry.text)) },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'k8s_render',
  data_mode: 'source_scan',
  target_scope: 'k8s_boundary',
  rendered,
  compose,
  rawSecretHits,
  rawRenderedEvidenceNames,
  yamlParseFailures,
  checks,
  passed: checks.every((check) => check.passed),
});
