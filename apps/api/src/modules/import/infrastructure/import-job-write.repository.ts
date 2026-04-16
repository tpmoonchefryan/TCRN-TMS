// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { type RawImportJobRecord } from '../domain/import-job.policy';
import { ImportJobStatus } from '../dto/import.dto';

interface ImportJobCreationTalentRecord {
  id: string;
  profile_store_id: string | null;
}

interface ImportConsumerRecord {
  id: string;
}

interface CancelableImportJobRecord {
  id: string;
  status: string;
}

@Injectable()
export class ImportJobWriteRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findTalentForCreation(
    tenantSchema: string,
    talentId: string,
  ): Promise<ImportJobCreationTalentRecord | null> {
    const talents = await this.prisma.$queryRawUnsafe<ImportJobCreationTalentRecord[]>(`
      SELECT id, profile_store_id
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, talentId);

    return talents[0] ?? null;
  }

  async findConsumerByCode(
    tenantSchema: string,
    consumerCode: string,
  ): Promise<ImportConsumerRecord | null> {
    const consumers = await this.prisma.$queryRawUnsafe<ImportConsumerRecord[]>(`
      SELECT id
      FROM "${tenantSchema}".consumer
      WHERE code = $1
        AND is_active = true
    `, consumerCode);

    return consumers[0] ?? null;
  }

  async createJob(
    tenantSchema: string,
    params: {
      talentId: string;
      profileStoreId: string;
      jobType: string;
      status: string;
      fileName: string;
      fileSize: number;
      consumerId: string | null;
      totalRows: number;
      userId: string;
    },
  ): Promise<RawImportJobRecord> {
    const jobs = await this.prisma.$queryRawUnsafe<RawImportJobRecord[]>(`
      INSERT INTO "${tenantSchema}".import_job (
        id, talent_id, profile_store_id, job_type, status, file_name, file_size, consumer_id,
        total_rows, processed_rows, success_rows, failed_rows, warning_rows, created_by, created_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid,
        $8, 0, 0, 0, 0, $9::uuid, NOW()
      )
      RETURNING id, job_type, status, file_name, total_rows, processed_rows, success_rows, failed_rows, warning_rows, started_at, completed_at, created_at, created_by
    `,
      params.talentId,
      params.profileStoreId,
      params.jobType,
      params.status,
      params.fileName,
      params.fileSize,
      params.consumerId,
      params.totalRows,
      params.userId,
    );

    return jobs[0];
  }

  async findCancelableJob(
    tenantSchema: string,
    jobId: string,
    talentId: string,
  ): Promise<CancelableImportJobRecord | null> {
    const jobs = await this.prisma.$queryRawUnsafe<CancelableImportJobRecord[]>(`
      SELECT id, status
      FROM "${tenantSchema}".import_job
      WHERE id = $1::uuid
        AND talent_id = $2::uuid
    `, jobId, talentId);

    return jobs[0] ?? null;
  }

  cancelJob(tenantSchema: string, jobId: string) {
    return this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".import_job
      SET status = $1, completed_at = NOW()
      WHERE id = $2::uuid
    `, ImportJobStatus.CANCELLED, jobId);
  }
}
