export interface ForbiddenCopyMatch {
  label: string;
  pattern: RegExp;
}

export interface CopyGuardOptions {
  surface?: string;
}

const FORBIDDEN_USER_VISIBLE_COPY: readonly ForbiddenCopyMatch[] = [
  { label: 'Prisma', pattern: /\bPrisma(?:Client\w*)?\b/iu },
  { label: '$queryRawUnsafe', pattern: /\$queryRawUnsafe/iu },
  { label: 'migration', pattern: /\bmigration\b/iu },
  { label: 'schema', pattern: /\bschema\b/iu },
  { label: 'SQL', pattern: /\bSQL\b/iu },
  { label: 'ORM', pattern: /\bORM\b/iu },
  { label: 'database table', pattern: /\bdatabase\s+table\b/iu },
  { label: 'public.custom_domain_binding', pattern: /public\.custom_domain_binding/iu },
  {
    label: 'public.custom_domain_talent_selection',
    pattern: /public\.custom_domain_talent_selection/iu,
  },
  { label: 'product decision', pattern: /\bproduct\s+decision\b/iu },
  { label: 'future scope', pattern: /\bfuture\s+scope\b/iu },
  { label: 'testing strategy', pattern: /\btesting\s+strategy\b/iu },
  { label: 'implementation rationale', pattern: /\bimplementation\s+rationale\b/iu },
];

export function findForbiddenUserVisibleCopy(text: string): string[] {
  return FORBIDDEN_USER_VISIBLE_COPY.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

export function assertNoForbiddenUserVisibleCopy(text: string, options: CopyGuardOptions = {}): void {
  const matches = findForbiddenUserVisibleCopy(text);
  if (matches.length === 0) {
    return;
  }

  const surface = options.surface ?? 'user-visible copy';
  throw new Error(`${surface} contains forbidden internal copy: ${matches.join(', ')}`);
}
