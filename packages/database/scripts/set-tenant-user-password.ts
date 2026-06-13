// SPDX-License-Identifier: Apache-2.0
//
// Narrow local-only helper for deterministic browser/runtime proof.
// Updates a tenant-schema user password without storing plaintext secrets in repo.

import argon2 from 'argon2';

import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

const prisma = new PrismaClient();

interface CliOptions {
  schema: string;
  username: string;
  password: string;
}

function parseCliArgs(argv: string[]): CliOptions {
  let schema = '';
  let username = '';
  let password = '';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--schema') {
      schema = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg === '--username') {
      username = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg === '--password') {
      password = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!schema) {
    throw new Error('Missing required --schema');
  }

  if (!username) {
    throw new Error('Missing required --username');
  }

  if (!password) {
    throw new Error('Missing required --password');
  }

  return { schema, username, password };
}

function validatePassword(password: string) {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('must be at least 12 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('must contain an uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('must contain a lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('must contain a number');
  }

  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    errors.push('must contain a special character');
  }

  if (errors.length > 0) {
    throw new Error(`Password ${errors.join(', ')}`);
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  validatePassword(options.password);

  const users = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      SELECT id
      FROM "${options.schema}".system_user
      WHERE username = $1
      LIMIT 1
    `,
    options.username,
  );

  const userId = users[0]?.id;

  if (!userId) {
    throw new Error(`User ${options.username} was not found in ${options.schema}.`);
  }

  const passwordHash = await argon2.hash(options.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await prisma.$executeRawUnsafe(
    `
      UPDATE "${options.schema}".system_user
      SET
        password_hash = $2,
        force_reset = false,
        password_changed_at = now(),
        updated_at = now()
      WHERE id = $1::uuid
    `,
    userId,
    passwordHash,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        schema: options.schema,
        username: options.username,
        userId,
        passwordUpdated: true,
      },
      null,
      2,
    )}\n`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
