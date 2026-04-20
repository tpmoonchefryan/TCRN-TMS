import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface WebSmokeFixture {
  tenantId: string;
  tenantCode: string;
  schemaName: string;
  public: {
    displayName: string;
    homepagePath: string;
    marshmallowPath: string;
    marshmallowTitle: string;
    welcomeText: string;
  };
  users: {
    standard: {
      username: string;
      password: string;
    };
  };
}

export const WEB_SMOKE_FIXTURE_PATH = path.join(os.tmpdir(), 'tcrn-playwright-web-smoke-fixture.json');

export async function writeWebSmokeFixture(fixture: WebSmokeFixture) {
  await fs.writeFile(WEB_SMOKE_FIXTURE_PATH, JSON.stringify(fixture, null, 2), 'utf8');
}

export async function readWebSmokeFixture() {
  const raw = await fs.readFile(WEB_SMOKE_FIXTURE_PATH, 'utf8');
  return JSON.parse(raw) as WebSmokeFixture;
}

export function loadWebSmokeFixtureSync() {
  return JSON.parse(readFileSync(WEB_SMOKE_FIXTURE_PATH, 'utf8')) as WebSmokeFixture;
}

export async function removeWebSmokeFixture() {
  await fs.rm(WEB_SMOKE_FIXTURE_PATH, { force: true });
}
