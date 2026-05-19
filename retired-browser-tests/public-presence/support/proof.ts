import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface MentalModelProof {
  copyScanResults: Array<Record<string, unknown>>;
  duplicateLabelFindings: Array<Record<string, unknown>>;
  fieldInventory: Array<Record<string, unknown>>;
  firstViewportMetrics: Array<Record<string, unknown>>;
  generatedAt: string;
  loadingGateTimings: Array<Record<string, unknown>>;
  mutatedFieldCount: number;
  panelStackingFindings: Array<Record<string, unknown>>;
  publicRouteProof: Record<string, unknown>;
  restoredFieldCount: number;
  routeList: string[];
  viewportList: string[];
}

const evidenceRoot = path.resolve(
  process.cwd(),
  '..',
  'vault',
  'initiatives',
  'projects',
  'TCRN-TMS',
  'active',
  'public-presence-studio',
  'evidence',
  '2026-05-19-development-remediation-ar29-mental-model-ux',
);
const proofPath = path.resolve(evidenceRoot, 'mental-model-ux-proof.json');
let proofInitialized = false;

function getInitialProof(): MentalModelProof {
  return {
    copyScanResults: [],
    duplicateLabelFindings: [],
    fieldInventory: [],
    firstViewportMetrics: [],
    generatedAt: new Date().toISOString(),
    loadingGateTimings: [],
    mutatedFieldCount: 0,
    panelStackingFindings: [],
    publicRouteProof: {},
    restoredFieldCount: 0,
    routeList: [],
    viewportList: [],
  };
}

export function getEvidenceRoot() {
  mkdirSync(evidenceRoot, { recursive: true });
  return evidenceRoot;
}

export function resetMentalModelProof() {
  mkdirSync(evidenceRoot, { recursive: true });
  writeFileSync(proofPath, `${JSON.stringify(getInitialProof(), null, 2)}\n`, 'utf8');
}

export function ensureMentalModelProofInitialized() {
  if (proofInitialized) {
    return;
  }

  resetMentalModelProof();
  proofInitialized = true;
}

function readProof(): MentalModelProof {
  mkdirSync(evidenceRoot, { recursive: true });

  try {
    return JSON.parse(readFileSync(proofPath, 'utf8')) as MentalModelProof;
  } catch {
    return getInitialProof();
  }
}

export function updateMentalModelProof(
  updater: (current: MentalModelProof) => MentalModelProof,
) {
  const current = readProof();
  const next = updater(current);
  next.generatedAt = new Date().toISOString();
  writeFileSync(proofPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}
