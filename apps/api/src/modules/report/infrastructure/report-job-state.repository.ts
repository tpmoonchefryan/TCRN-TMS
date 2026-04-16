// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';

@Injectable()
export class ReportJobStateRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  findJobById(jobId: string) {
    return this.prisma.reportJob.findUnique({
      where: { id: jobId },
    });
  }

  updateJob(jobId: string, data: Record<string, unknown>) {
    return this.prisma.reportJob.update({
      where: { id: jobId },
      data,
    });
  }

  updateExpiredJobs(now: Date) {
    return this.prisma.reportJob.updateMany({
      where: {
        status: { in: ['success', 'consumed'] },
        expiresAt: { lt: now },
      },
      data: { status: 'expired' },
    });
  }

  findDownloadState(jobId: string) {
    return this.prisma.reportJob.findUnique({
      where: { id: jobId },
      select: { status: true, expiresAt: true },
    });
  }
}
