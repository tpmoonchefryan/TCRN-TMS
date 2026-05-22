// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  type PublicPresenceAuthoringArtifactKind,
  type PublicPresenceAuthoringDraftRow,
  PublicPresenceAuthoringRepository,
} from '../infrastructure/public-presence-authoring.repository';

type PublicPresenceAuthoringArtifactStatus = 'draft' | 'submitted' | 'validated';
type PublicPresenceAuthoringValidationState = 'ready' | 'unvalidated' | 'warning';
type PublicPresenceAuthoringFileKind = 'code' | 'doc' | 'fixture' | 'schema';

interface PublicPresenceAuthoringFile {
  contents: string;
  kind: PublicPresenceAuthoringFileKind;
  language: string;
  path: string;
}

interface PublicPresenceAuthoringValidationSummary {
  issueCount: number;
  passCount: number;
  warnCount: number;
}

export interface PublicPresenceAuthoringDraftSummary {
  artifactKind: PublicPresenceAuthoringArtifactKind;
  artifactStatus: PublicPresenceAuthoringArtifactStatus;
  id: string;
  lastSavedAt: string;
  lastValidatedAt: string | null;
  subjectKey: string;
  submittedAt: string | null;
  updatedAt: string;
  validationState: PublicPresenceAuthoringValidationState;
}

export interface PublicPresenceAuthoringDraftResponse
  extends PublicPresenceAuthoringDraftSummary {
  sourceBundle: PublicPresenceAuthoringFile[];
  validationSummary: PublicPresenceAuthoringValidationSummary;
  version: number;
}

const AUTHORING_FILE_KINDS = new Set<PublicPresenceAuthoringFileKind>([
  'code',
  'doc',
  'fixture',
  'schema',
]);

const SUBJECT_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const AUTHORING_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

@Injectable()
export class PublicPresenceAuthoringService {
  constructor(
    private readonly publicPresenceAuthoringRepository: PublicPresenceAuthoringRepository,
  ) {}

  async getCurrentDraft(
    artifactKind: PublicPresenceAuthoringArtifactKind,
    talentId: string,
    tenantSchema: string,
    subjectKeyInput?: string | null,
  ): Promise<PublicPresenceAuthoringDraftResponse | null> {
    const subjectKey = this.normalizeSubjectKey(subjectKeyInput);
    const row = await this.publicPresenceAuthoringRepository.findBySubject(
      tenantSchema,
      talentId,
      artifactKind,
      subjectKey,
    );

    return row ? this.toDraftResponse(row) : null;
  }

  async listDrafts(
    artifactKind: PublicPresenceAuthoringArtifactKind,
    talentId: string,
    tenantSchema: string,
  ): Promise<PublicPresenceAuthoringDraftSummary[]> {
    const rows = await this.publicPresenceAuthoringRepository.listByKind(
      tenantSchema,
      talentId,
      artifactKind,
    );

    return rows.map((row) => this.toDraftSummary(row));
  }

  async saveDraft(
    artifactKind: PublicPresenceAuthoringArtifactKind,
    talentId: string,
    context: RequestContext,
    input: {
      sourceBundle: unknown;
      subjectKey?: string | null;
    },
  ): Promise<PublicPresenceAuthoringDraftResponse> {
    const sourceBundle = this.parseSourceBundle(input.sourceBundle);
    const subjectKey = this.normalizeSubjectKey(input.subjectKey);
    const row = await this.publicPresenceAuthoringRepository.upsertDraft(
      context.tenantSchema ?? '',
      {
        actorId: context.userId ?? null,
        artifactKind,
        artifactStatus: 'draft',
        lastValidatedAt: null,
        sourceBundle,
        subjectKey,
        submittedAt: null,
        talentId,
        validationState: 'unvalidated',
        validationSummary: {
          issueCount: 0,
          passCount: 0,
          warnCount: 0,
        },
      },
    );

    return this.toDraftResponse(row);
  }

  async validateDraft(
    artifactKind: PublicPresenceAuthoringArtifactKind,
    talentId: string,
    context: RequestContext,
    input: {
      sourceBundle: unknown;
      subjectKey?: string | null;
      validationSummary?: unknown;
    },
  ): Promise<PublicPresenceAuthoringDraftResponse> {
    const sourceBundle = this.parseSourceBundle(input.sourceBundle);
    const subjectKey = this.normalizeSubjectKey(input.subjectKey);
    const validationSummary = this.parseValidationSummary(input.validationSummary);
    const row = await this.publicPresenceAuthoringRepository.upsertDraft(
      context.tenantSchema ?? '',
      {
        actorId: context.userId ?? null,
        artifactKind,
        artifactStatus: 'validated',
        lastValidatedAt: new Date(),
        sourceBundle,
        subjectKey,
        submittedAt: null,
        talentId,
        validationState: validationSummary.warnCount > 0 ? 'warning' : 'ready',
        validationSummary,
      },
    );

    return this.toDraftResponse(row);
  }

  async submitDraft(
    artifactKind: PublicPresenceAuthoringArtifactKind,
    talentId: string,
    context: RequestContext,
    input: {
      sourceBundle: unknown;
      subjectKey?: string | null;
      validationSummary?: unknown;
    },
  ): Promise<PublicPresenceAuthoringDraftResponse> {
    const sourceBundle = this.parseSourceBundle(input.sourceBundle);
    const subjectKey = this.normalizeSubjectKey(input.subjectKey);
    const validationSummary = this.parseValidationSummary(input.validationSummary);
    const now = new Date();
    const row = await this.publicPresenceAuthoringRepository.upsertDraft(
      context.tenantSchema ?? '',
      {
        actorId: context.userId ?? null,
        artifactKind,
        artifactStatus: 'submitted',
        lastValidatedAt: now,
        sourceBundle,
        subjectKey,
        submittedAt: now,
        talentId,
        validationState: validationSummary.warnCount > 0 ? 'warning' : 'ready',
        validationSummary,
      },
    );

    return this.toDraftResponse(row);
  }

  private normalizeSubjectKey(subjectKeyInput?: string | null) {
    const subjectKey = (subjectKeyInput ?? 'new').trim() || 'new';

    if (!SUBJECT_KEY_PATTERN.test(subjectKey)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Authoring subject key must use letters, numbers, dashes, or underscores.',
      });
    }

    return subjectKey;
  }

  private parseSourceBundle(sourceBundle: unknown): PublicPresenceAuthoringFile[] {
    if (!Array.isArray(sourceBundle) || sourceBundle.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Authoring source bundle must include at least one file.',
      });
    }

    const seenPaths = new Set<string>();

    return sourceBundle.map((file, index) => {
      if (!file || typeof file !== 'object' || Array.isArray(file)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Authoring file ${index + 1} is invalid.`,
        });
      }

      const record = file as Record<string, unknown>;
      const path = typeof record.path === 'string' ? record.path.trim() : '';
      const language = typeof record.language === 'string' ? record.language.trim() : '';
      const contents = typeof record.contents === 'string' ? record.contents : '';
      const kind = typeof record.kind === 'string' ? record.kind : '';

      if (!path || path.length > 255 || !language || language.length > 64) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Authoring file ${index + 1} is missing a valid path or language.`,
        });
      }

      this.assertValidAuthoringPath(path, index);

      if (!AUTHORING_FILE_KINDS.has(kind as PublicPresenceAuthoringFileKind)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Authoring file ${index + 1} uses an unsupported file kind.`,
        });
      }

      if (seenPaths.has(path)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Authoring file ${index + 1} duplicates an existing workspace path.`,
        });
      }

      seenPaths.add(path);

      return {
        contents,
        kind: kind as PublicPresenceAuthoringFileKind,
        language,
        path,
      };
    });
  }

  private assertValidAuthoringPath(path: string, index: number) {
    if (
      path.startsWith('/')
      || path.startsWith('~')
      || /^[A-Za-z]:/.test(path)
      || path.includes('\\')
      || path.includes('//')
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Authoring file ${index + 1} must use a workspace-relative path.`,
      });
    }

    const segments = path.split('/');

    if (
      segments.length === 0
      || segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
      || segments.some((segment) => segment.startsWith('.'))
      || segments.some((segment) => !AUTHORING_PATH_SEGMENT_PATTERN.test(segment))
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Authoring file ${index + 1} uses a blocked workspace path.`,
      });
    }
  }

  private parseValidationSummary(
    summary: unknown,
  ): PublicPresenceAuthoringValidationSummary {
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
      return {
        issueCount: 0,
        passCount: 0,
        warnCount: 0,
      };
    }

    const record = summary as Record<string, unknown>;
    return {
      issueCount: this.readNonNegativeInteger(record.issueCount),
      passCount: this.readNonNegativeInteger(record.passCount),
      warnCount: this.readNonNegativeInteger(record.warnCount),
    };
  }

  private readNonNegativeInteger(value: unknown) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.trunc(value);
  }

  private toDraftSummary(
    row: PublicPresenceAuthoringDraftRow,
  ): PublicPresenceAuthoringDraftSummary {
    return {
      artifactKind: row.artifactKind,
      artifactStatus: row.artifactStatus as PublicPresenceAuthoringArtifactStatus,
      id: row.id,
      lastSavedAt: row.lastSavedAt.toISOString(),
      lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
      subjectKey: row.subjectKey,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      validationState: row.validationState as PublicPresenceAuthoringValidationState,
    };
  }

  private toDraftResponse(
    row: PublicPresenceAuthoringDraftRow,
  ): PublicPresenceAuthoringDraftResponse {
    return {
      ...this.toDraftSummary(row),
      sourceBundle: this.parseSourceBundle(row.sourceBundle),
      validationSummary: this.parseValidationSummary(row.validationSummary),
      version: row.version,
    };
  }
}
