// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  PublicPresenceDocumentSchema,
  type PublicPresenceTemplateId,
} from '@tcrn/shared';

import type { PublicPresenceDocumentVersionRecord } from '../domain/public-presence-foundation.policy';

export type PublicPresenceStudioReleaseDependencyStatus = 'blocked' | 'ready';
export type PublicPresenceStudioReleaseDependencyNextAction =
  | 'none'
  | 'startActiveTalentHubDraft'
  | 'openActiveTalentHubDraft'
  | 'openActiveTalentHubReview';

export interface PublicPresenceStudioReleaseDependency {
  blocksPublish: boolean;
  id: string;
  messageKey: string;
  nextAction: PublicPresenceStudioReleaseDependencyNextAction;
  revealAutoSwitchAt: string;
  severity: 'blocker' | 'info';
  status: PublicPresenceStudioReleaseDependencyStatus;
  suggestedFix: string;
  targetTemplateId: PublicPresenceTemplateId;
  targetVersionId: string | null;
  targetVersionState: string | null;
  templateId: PublicPresenceTemplateId;
}

export interface PublicPresenceStudioReleaseReadinessSummary {
  blockingDependencyCount: number;
  dependencies: PublicPresenceStudioReleaseDependency[];
}

export const DEBUT_ACTIVE_HUB_DEPENDENCY_ID =
  'publicPresence.release.debutReveal.activeTalentHubAutoSwitch';
export const DEBUT_ACTIVE_HUB_DEPENDENCY_MESSAGE_KEY =
  'publicPresence.validation.debutRevealRequiresApprovedActiveHub';
export const DEBUT_ACTIVE_HUB_DEPENDENCY_SUGGESTED_FIX =
  'Approve the always-on hub before scheduling the debut switch.';

export function extractRevealAutoSwitchAt(
  version: PublicPresenceDocumentVersionRecord | null,
): string | null {
  if (!version || version.templateId !== 'debutReveal') {
    return null;
  }

  const document = PublicPresenceDocumentSchema.parse(version.document);
  const countdownSection = document.sections.find(
    (section) => section.kind === 'countdownReveal',
  );
  const fieldValue = countdownSection?.fields?.revealAtUtc;

  if (!fieldValue || typeof fieldValue !== 'object' || !('value' in fieldValue)) {
    return null;
  }

  return typeof fieldValue.value === 'string' && fieldValue.value.trim().length > 0
    ? fieldValue.value.trim()
    : null;
}

export function buildDebutRevealAutoSwitchDependency(input: {
  debutVersion: PublicPresenceDocumentVersionRecord | null;
  latestActiveHubVersion: PublicPresenceDocumentVersionRecord | null;
  publishReadyActiveHubVersion: PublicPresenceDocumentVersionRecord | null;
}): PublicPresenceStudioReleaseDependency | null {
  const revealAutoSwitchAt = extractRevealAutoSwitchAt(input.debutVersion);

  if (!input.debutVersion || input.debutVersion.templateId !== 'debutReveal' || !revealAutoSwitchAt) {
    return null;
  }

  const readyTarget = input.publishReadyActiveHubVersion;
  const fallbackTarget = input.latestActiveHubVersion;
  const targetVersion = readyTarget ?? fallbackTarget;
  const status: PublicPresenceStudioReleaseDependencyStatus = readyTarget
    ? 'ready'
    : 'blocked';
  const targetVersionState = targetVersion?.documentState ?? null;
  let nextAction: PublicPresenceStudioReleaseDependencyNextAction = 'none';

  if (!readyTarget) {
    if (!fallbackTarget) {
      nextAction = 'startActiveTalentHubDraft';
    } else if (
      fallbackTarget.documentState === 'draft'
      || fallbackTarget.documentState === 'changesRequested'
    ) {
      nextAction = 'openActiveTalentHubDraft';
    } else {
      nextAction = 'openActiveTalentHubReview';
    }
  }

  return {
    blocksPublish: status === 'blocked',
    id: DEBUT_ACTIVE_HUB_DEPENDENCY_ID,
    messageKey: DEBUT_ACTIVE_HUB_DEPENDENCY_MESSAGE_KEY,
    nextAction,
    revealAutoSwitchAt,
    severity: status === 'blocked' ? 'blocker' : 'info',
    status,
    suggestedFix: DEBUT_ACTIVE_HUB_DEPENDENCY_SUGGESTED_FIX,
    targetTemplateId: 'activeTalentHub',
    targetVersionId: targetVersion?.id ?? null,
    targetVersionState,
    templateId: 'debutReveal',
  };
}

export function buildStudioReleaseReadinessSummary(input: {
  latestActiveHubVersion: PublicPresenceDocumentVersionRecord | null;
  publishReadyActiveHubVersion: PublicPresenceDocumentVersionRecord | null;
  selectedVersion: PublicPresenceDocumentVersionRecord | null;
}): PublicPresenceStudioReleaseReadinessSummary {
  const debutDependency = buildDebutRevealAutoSwitchDependency({
    debutVersion: input.selectedVersion,
    latestActiveHubVersion: input.latestActiveHubVersion,
    publishReadyActiveHubVersion: input.publishReadyActiveHubVersion,
  });

  return {
    blockingDependencyCount: debutDependency?.blocksPublish ? 1 : 0,
    dependencies: debutDependency ? [debutDependency] : [],
  };
}
