// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';

import { Prisma, prisma } from '@tcrn/database';
import type { LocalizedText } from '@tcrn/shared';

import {
  readLocalizedText,
  stringifyLocalizedText,
} from '../../../platform/persistence/localized-text.persistence';
import type { SubsidiaryData } from '../domain/subsidiary-read.policy';
import type {
  SubsidiaryCreateInput,
  SubsidiaryUpdateInput,
} from '../domain/subsidiary-write.policy';

const SUBSIDIARY_SELECT_FIELDS = `
  id, parent_id as "parentId", code, path, depth,
  name,
  extra_data as "extraData",
  description,
  sort_order as "sortOrder", is_active as "isActive",
  created_at as "createdAt", updated_at as "updatedAt", version
`;

type SubsidiaryRawData = Omit<SubsidiaryData, 'name' | 'description'> & {
  name: Prisma.JsonValue;
  description: Prisma.JsonValue;
};

type SubsidiaryUpdatePersistenceInput = Omit<SubsidiaryUpdateInput, 'name' | 'description'> & {
  name?: LocalizedText;
  description?: LocalizedText;
};

const mapSubsidiaryData = (row: SubsidiaryRawData): SubsidiaryData => ({
  ...row,
  name: readLocalizedText(row.name, 'subsidiary.name'),
  description: readLocalizedText(row.description, 'subsidiary.description'),
});

@Injectable()
export class SubsidiaryWriteRepository {
  async create(
    tenantSchema: string,
    data: SubsidiaryCreateInput & {
      extraData?: Record<string, unknown> | null;
      path: string;
      depth: number;
    },
    userId: string
  ): Promise<SubsidiaryData> {
    const results = await prisma.$queryRawUnsafe<SubsidiaryRawData[]>(
      `
      INSERT INTO "${tenantSchema}".subsidiary
        (id, parent_id, code, path, depth, name, extra_data,
         description,
         sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
      VALUES
        (gen_random_uuid(), $1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, true, now(), now(), $9::uuid, $9::uuid, 1)
      RETURNING
        ${SUBSIDIARY_SELECT_FIELDS}
    `,
      data.parentId || null,
      data.code,
      data.path,
      data.depth,
      stringifyLocalizedText(data.name),
      data.extraData ? JSON.stringify(data.extraData) : null,
      stringifyLocalizedText(data.description as LocalizedText),
      data.sortOrder || 0,
      userId
    );

    return mapSubsidiaryData(results[0]);
  }

  async update(
    id: string,
    tenantSchema: string,
    data: SubsidiaryUpdatePersistenceInput,
    userId: string
  ): Promise<SubsidiaryData> {
    const updates: string[] = [];
    const params: unknown[] = [id, userId];
    let paramIndex = 3;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}::jsonb`);
      params.push(stringifyLocalizedText(data.name));
    }
    if (data.extraData !== undefined) {
      updates.push(`extra_data = $${paramIndex++}::jsonb`);
      params.push(data.extraData ? JSON.stringify(data.extraData) : null);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}::jsonb`);
      params.push(stringifyLocalizedText(data.description));
    }
    if (data.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(data.sortOrder);
    }

    updates.push('updated_at = now()');
    updates.push('updated_by = $2::uuid');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<SubsidiaryRawData[]>(
      `
      UPDATE "${tenantSchema}".subsidiary
      SET ${updates.join(', ')}
      WHERE id = $1::uuid
      RETURNING
        ${SUBSIDIARY_SELECT_FIELDS}
    `,
      ...params
    );

    return mapSubsidiaryData(results[0]);
  }

  async deactivateCascade(
    tenantSchema: string,
    path: string,
    userId: string
  ): Promise<{ subsidiaries: number; talents: number }> {
    const subsidiaries = (await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".subsidiary
      SET is_active = false, updated_at = now(), updated_by = $2::uuid
      WHERE path LIKE $1
    `,
      `${path}%`,
      userId
    )) as number;

    const talents = (await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".talent
      SET is_active = false, updated_at = now(), updated_by = $2::uuid
      WHERE path LIKE $1
    `,
      `${path}%`,
      userId
    )) as number;

    return {
      subsidiaries,
      talents,
    };
  }

  async deactivateSingle(id: string, tenantSchema: string, userId: string): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".subsidiary
      SET is_active = false, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `,
      id,
      userId
    );
  }

  async reactivate(id: string, tenantSchema: string, userId: string): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".subsidiary
      SET is_active = true, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `,
      id,
      userId
    );
  }
}
